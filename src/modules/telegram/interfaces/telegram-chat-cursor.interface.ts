export interface TelegramChatCursor {
  id: number;
  title?: string | null;
  chatId?: string | null;
  chatRef: string;
  lastMessageId: number;
  lastSyncedAt: Date;
  enabled: boolean;
}
