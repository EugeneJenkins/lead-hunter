-- CreateTable
CREATE TABLE "TelegramChatCursor" (
    "id" SERIAL NOT NULL,
    "chatId" TEXT,
    "chatRef" TEXT NOT NULL,
    "title" TEXT,
    "lastMessageId" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramChatCursor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelegramChatCursor_chatId_key" ON "TelegramChatCursor"("chatId");

-- CreateIndex
CREATE INDEX "TelegramChatCursor_chatRef_idx" ON "TelegramChatCursor"("chatRef");
