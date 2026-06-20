type TelegramHistoryMessage = Api.Message | Api.MessageService;
type TelegramChatRef = string | number;

@injectable()
export class TelegramSourceModule implements SourceModule {
  public readonly name = 'telegram';

  private readonly config: TelegramModuleConfig;
  private client?: TelegramClient;
  private syncRunning = false;
  private stopped = true;

  public constructor(
    @inject(TOKENS.ConfigService) configService: ConfigService,
    @inject(TOKENS.EventBus) private readonly eventBus: EventBus,
    @inject(TOKENS.Logger) private readonly logger: AppLogger,
    @inject(TOKENS.PrismaService) private readonly prismaService: PrismaService,
    @inject(TOKENS.Scheduler) private readonly scheduler: SchedulerService,
  ) {
    this.config = configService.modules.telegram;
  }

  public async start(): Promise<void> {
    if (!this.config.apiId || !this.config.apiHash || !this.config.session) {
      this.logger.warn(
        {
          module: this.name,
          hasApiId: Boolean(this.config.apiId),
          hasApiHash: Boolean(this.config.apiHash),
          hasSession: Boolean(this.config.session),
        },
        'Telegram sync skipped because configuration is incomplete',
      );
      return;
    }

    try {
      this.client = new TelegramClient(
        { apiId: this.config.apiId, apiHash: this.config.apiHash },
        new StringSession(this.config.session),
      );

      await this.client.start();
      this.logger.info({ module: this.name }, 'Telegram client started');

      await this.syncConfiguredChats();
    } catch (error) {
      this.logger.error({ error, module: this.name }, 'Failed to start Telegram client');
    }
  }

  public async stop(): Promise<void> {
    this.stopped = true;

    if (this.client?.connected) {
      await this.client.disconnect();
    }

    this.client = undefined;
    this.logger.info({ module: this.name }, 'Telegram module stopped');
  }

  private async syncConfiguredChats(): Promise<void> {
    if (this.syncRunning) {
      this.logger.warn(
        { module: this.name },
        'Telegram sync skipped because previous run is active',
      );
      return;
    }

    if (!this.client) {
      this.logger.error({ module: this.name }, 'Telegram client is not initialized');
      return;
    }

    this.syncRunning = true;

    try {
      for (const chatRef of this.config.chats) {
        await this.syncChat(chatRef);
      }
    } finally {
      this.syncRunning = false;
    }
  }

  private async syncChat(chatRef: string): Promise<void> {
    const client = this.requireClient();
    const entity = await client.getEntity(this.parseChatRef(chatRef));
    const chatId = await client.getPeerId(entity);
    const title = this.getEntityTitle(entity);

    let cursor = await this.prismaService.client.telegramChatCursor.findUnique({
      where: { chatId },
    });

    if (!cursor) {
      // Chat not configured, fetch the latest message and start syncing from there
      const messages = await client.getHistory(entity, { limit: 1 });
      if (messages.messages.length > 0) {
        cursor = {
          chatId,
          lastMessageId: messages.messages[0].id,
          lastSyncedAt: new Date(),
        };
        await this.prismaService.client.telegramChatCursor.create({ data: cursor });
      } else {
        cursor = {
          chatId,
          lastMessageId: 0,
          lastSyncedAt: new Date(),
        };
        await this.prismaService.client.telegramChatCursor.create({ data: cursor });
      }
    }

    let lastMessageId = cursor.lastMessageId;

    while (true) {
      const messages = await client.getHistory(entity, { limit: 100, offsetId: lastMessageId + 1 });
      if (!messages.messages.length) break;

      for (const message of messages.messages) {
        if (this.isHistoryMessage(message)) {
          await this.publishMessage(chatRef, chatId, title, message);
          lastMessageId = message.id;
        }
      }

      await this.updateCursor(chatId, lastMessageId);
    }
  }

  private async publishMessage(
    chatRef: string,
    chatId: string,
    chatTitle: string | undefined,
    message: TelegramHistoryMessage,
  ): Promise<void> {
    const url = this.createMessageUrl(chatRef, message.id);
    const rawPayload = this.createRawPayload(chatRef, chatId, chatTitle, message, url);

    const event: SourceLeadDiscoveredEvent = createSourceLeadDiscoveredEvent({
      source: 'telegram',
      externalId: `${chatId}-${message.id}`,
      title: chatTitle,
      description: message.message || '',
      url,
      rawPayload,
    });

    await this.eventBus.publish(event);
  }

  private async updateCursor(chatId: string, lastMessageId: number): Promise<void> {
    await this.prismaService.client.telegramChatCursor.update({
      where: { chatId },
      data: {
        lastMessageId,
        lastSyncedAt: new Date(),
      },
    });
  }

  private createRawPayload(
    chatRef: string,
    chatId: string,
    chatTitle: string | undefined,
    message: TelegramHistoryMessage,
    messageUrl: string | undefined,
  ): JsonValue {
    return {
      chatRef,
      chatId,
      chatTitle,
      messageId: message.id,
      messageUrl,
      text: message.message || '',
      sender: message.sender ? this.valueToString(message.sender) : undefined,
      timestamp: new Date(message.date * 1000),
    };
  }

  private createMessageUrl(chatRef: string, messageId: number): string | undefined {
    const publicName = chatRef.startsWith('@')
      ? chatRef.slice(1)
      : chatRef.match(/^https:\/\/t\.me\/([^/]+)$/)?.[1];

    if (!publicName || publicName.startsWith('+')) {
      return undefined;
    }

    return `https://t.me/${publicName}/${messageId}`;
  }

  private parseChatRef(chatRef: string): TelegramChatRef {
    if (!/^-?\d+$/.test(chatRef)) {
      return chatRef;
    }

    const numericChatRef = Number(chatRef);

    return Number.isSafeInteger(numericChatRef) ? numericChatRef : chatRef;
  }

  private getEntityTitle(entity: unknown): string | undefined {
    if (!entity || typeof entity !== 'object') {
      return undefined;
    }

    const maybeEntity = entity as { title?: unknown; username?: unknown };

    if (typeof maybeEntity.title === 'string' && maybeEntity.title.trim()) {
      return maybeEntity.title;
    }

    if (typeof maybeEntity.username === 'string' && maybeEntity.username.trim()) {
      return `@${maybeEntity.username}`;
    }

    return undefined;
  }

  private requireClient(): TelegramClient {
    if (!this.client) {
      throw new Error('Telegram client is not initialized');
    }

    return this.client;
  }

  private truncate(value: string, maxLength: number): string {
    if (value.length <= maxLength) {
      return value;
    }

    return `${value.slice(0, maxLength - 1)}...`;
  }

  private getErrorDetails(error: unknown): Record<string, unknown> {
    if (!error || typeof error !== 'object') {
      return { error };
    }

    const maybeError = error as {
      name?: unknown;
      message?: unknown;
      code?: unknown;
      meta?: unknown;
    };

    return {
      name: maybeError.name,
      message: maybeError.message,
      code: maybeError.code,
      meta: maybeError.meta,
    };
  }

  private valueToString(value: unknown): string | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    if (typeof value === 'object' && 'toString' in value) {
      const stringified = (value as { toString(): string }).toString();
      return stringified === '[object Object]' ? undefined : stringified;
    }

    return undefined;
  }

  private isHistoryMessage(message: unknown): message is TelegramHistoryMessage {
    return (
      message !== null &&
      typeof message === 'object' &&
      'id' in message &&
      typeof (message as { id?: unknown }).id === 'number'
    );
  }
}
