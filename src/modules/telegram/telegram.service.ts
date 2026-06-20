import {inject, injectable} from 'tsyringe';
import {TelegramClient, type Api} from 'telegram';
import {StringSession} from 'telegram/sessions';

import {ConfigService} from '../../core/config/config.service';
import type {EventBus} from '../../core/events/event-bus';
import type {AppLogger} from '../../core/logger/logger';
import type {SourceModule} from '../../core/modules/source-module';
import {TOKENS} from '../../core/di/tokens';
import {PrismaService} from '../../database/prisma.service';
import {createSourceLeadDiscoveredEvent} from '../../lead-engine/domain/lead-events';
import {SchedulerService} from '../../scheduler/scheduler.service';
import {ConfigurationError} from '../../shared/errors/configuration-error';
import type {JsonObject} from '../../shared/types/json';
import type {TelegramModuleConfig} from './telegram.config';
import {PrismaPromise} from "@prisma/client";
import {TelegramChatCursor} from "./interfaces/telegram-chat-cursor.interface";

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
    this.config = configService.config.modules.telegram;
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
        'telegram module skipped because api credentials or session are missing',
      );
      return;
    }

    const chats = await this.getAllChats();

    if (chats.length === 0) {
      this.logger.warn({module: this.name}, 'telegram module skipped because no chats configured');
      return;
    }

    this.stopped = false;
    this.client = new TelegramClient(
      new StringSession(this.config.session),
      this.config.apiId,
      this.config.apiHash,
      {
        connectionRetries: 5,
      },
    );

    await this.client.connect();

    if (!(await this.client.checkAuthorization())) {
      throw new ConfigurationError('Telegram session is not authorized. Provide TELEGRAM_SESSION.');
    }

    this.scheduler.register({
      name: 'telegram.sync',
      intervalMs: this.config.syncIntervalMs,
      run: () => this.syncConfiguredChats(chats),
    });

    this.logger.info(
      {
        module: this.name,
        chatCount: this.config.chats.length,
        syncIntervalMs: this.config.syncIntervalMs,
      },
      'telegram module initialized',
    );

    await this.syncConfiguredChats(chats);
  }

  public async stop(): Promise<void> {
    this.stopped = true;

    if (this.client?.connected) {
      await this.client.disconnect();
    }

    this.client = undefined;
    this.logger.info({module: this.name}, 'telegram module stopped');
  }

  private async syncConfiguredChats(chats: TelegramChatCursor[]): Promise<void> {
    if (this.syncRunning) {
      this.logger.warn({module: this.name}, 'telegram sync skipped because previous run is active');
      return;
    }

    if (!this.client) {
      return;
    }

    this.syncRunning = true;

    try {
      for (const chat of chats) {
        if (this.stopped) {
          return;
        }

        try {
          await this.syncChat(chat);
        } catch (error) {
          this.logger.error({error, module: this.name, chatTitle: chat.title}, 'telegram chat sync failed');
        }
      }
    } finally {
      this.syncRunning = false;
    }
  }

  private async syncChat(chat: TelegramChatCursor): Promise<void> {
    const client = this.requireClient();
    const entity = await client.getEntity(this.parseChatRef(chat.chatRef));
    const chatId = await client.getPeerId(entity);
    const title = this.getEntityTitle(entity);

    if (!chat.chatId){
      this.updateChatInfo()
    }

    let processedCount = 0;
    let failedCount = 0;
    let highestMessageId = cursor.lastMessageId;

    for await (const message of client.iterMessages(entity, {
      minId: cursor.lastMessageId,
      reverse: true,
      waitTime: 1,
    })) {
      if (this.stopped) {
        break;
      }

      if (!this.isHistoryMessage(message)) {
        continue;
      }

      highestMessageId = Math.max(highestMessageId, message.id);

      try {
        await this.publishMessage(chatRef, chatId, title, message);
        processedCount += 1;
      } catch (error) {
        failedCount += 1;
        this.logger.error(
          {
            ...this.getErrorDetails(error),
            module: this.name,
            chatRef,
            chatId,
            messageId: message.id,
            textLength: message.message?.length ?? 0,
            hasMedia: Boolean(message.media),
            isServiceMessage: Boolean(message.action),
          },
          'telegram message processing failed',
        );
      }

      if (processedCount % this.config.batchSize === 0) {
        await this.updateCursor(chatId, highestMessageId);
      }
    }

    await this.updateCursor(chatId, highestMessageId);
    this.logger.info(
      {
        module: this.name,
        chatRef,
        chatId,
        processedCount,
        failedCount,
        lastMessageId: highestMessageId,
      },
      'telegram chat synced',
    );
  }

  private async publishMessage(
    chatRef: string,
    chatId: string,
    chatTitle: string | undefined,
    message: TelegramHistoryMessage,
  ): Promise<void> {
    const text = message.message?.trim() || undefined;
    const messageUrl = this.createMessageUrl(chatRef, message.id);

    await this.eventBus.publish(
      createSourceLeadDiscoveredEvent({
        source: this.name,
        externalId: `${chatId}:${message.id}`,
        title: text ? this.truncate(text, 140) : `Telegram message #${message.id}`,
        description: text,
        url: messageUrl,
        rawPayload: this.createRawPayload(chatRef, chatId, chatTitle, message, messageUrl),
      }),
    );
  }

  private async updateCursor(chatId: string, lastMessageId: number): Promise<void> {
    await this.prismaService.client.telegramChatCursor.update({
      where: {chatId},
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
  ): JsonObject {
    return {
      chatRef,
      chatId,
      chatTitle: chatTitle ?? null,
      messageId: message.id,
      messageUrl: messageUrl ?? null,
      text: message.message || null,
      date: message.date ? new Date(message.date * 1_000).toISOString() : null,
      senderId: this.peerToString(message.fromId) ?? null,
      peerId: this.peerToString(message.peerId) ?? null,
      views: message.views ?? null,
      forwards: message.forwards ?? null,
      hasMedia: Boolean(message.media),
      isServiceMessage: Boolean(message.action),
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
      return maybeEntity.username;
    }

    return undefined;
  }

  private peerToString(peer: unknown): string | undefined {
    if (!peer || typeof peer !== 'object') {
      return undefined;
    }

    const maybePeer = peer as {
      userId?: unknown;
      chatId?: unknown;
      channelId?: unknown;
    };

    return this.valueToString(maybePeer.userId ?? maybePeer.chatId ?? maybePeer.channelId);
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
      return {error};
    }

    const maybeError = error as {
      name?: unknown;
      message?: unknown;
      code?: unknown;
      meta?: unknown;
      clientVersion?: unknown;
      stack?: unknown;
    };

    return {
      errorName: maybeError.name,
      errorMessage: maybeError.message,
      errorCode: maybeError.code,
      errorMeta: maybeError.meta,
      prismaClientVersion: maybeError.clientVersion,
      errorStack: maybeError.stack,
    };
  }

  private getAllChats(): PrismaPromise<TelegramChatCursor[]> {
    return this.prismaService.client.telegramChatCursor.findMany({
      where: {
        enabled: true,
      },
      select: {
        id: true,
        chatId: true,
        chatRef: true,
        title: true,
        lastMessageId: true,
        lastSyncedAt: true,
        enabled: true
      },
    });
  }

  private updateChatInfo(id: number, chatId: string, title: string): void
  {
    const cursor = await this.prismaService.client.telegramChatCursor.update({
      where: {id: id},
      data: {
        chatId,
        title,
        lastSyncedAt: new Date(),
      },
    });
  }
}
