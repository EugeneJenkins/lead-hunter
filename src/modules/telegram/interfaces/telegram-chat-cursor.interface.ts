export interface TelegramChatCursor {
  id: number;
  title?: string | null;
  chatId?: string;
  chatRef: string;
  lastMessageId: number;
  lastSyncedAt: Date;
  enabled: boolean;
}
