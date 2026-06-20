export interface TelegramChatCursor {
  id: number;
  chatId?: string;
  lastMessageId: number;
  lastSyncedAt: Date;
  enabled: boolean;
}
