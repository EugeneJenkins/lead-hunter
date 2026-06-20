CREATE TABLE "TelegramChatCursor" (
    "chatId" TEXT NOT NULL,
    "chatRef" TEXT NOT NULL,
    "title" TEXT,
    "lastMessageId" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramChatCursor_pkey" PRIMARY KEY ("chatId")
);

CREATE INDEX "TelegramChatCursor_chatRef_idx" ON "TelegramChatCursor"("chatRef");
