-- Chat: conversations, participants, messages
CREATE TABLE IF NOT EXISTS "ChatConversation" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ChatParticipant" (
    "id" SERIAL NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "lastReadAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatParticipant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ChatMessage" (
    "id" SERIAL NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "senderId" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ChatParticipant_conversationId_userId_key"
  ON "ChatParticipant"("conversationId", "userId");

CREATE INDEX IF NOT EXISTS "ChatParticipant_userId_idx"
  ON "ChatParticipant"("userId");

CREATE INDEX IF NOT EXISTS "ChatMessage_conversationId_createdAt_idx"
  ON "ChatMessage"("conversationId", "createdAt");

CREATE INDEX IF NOT EXISTS "ChatMessage_senderId_idx"
  ON "ChatMessage"("senderId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ChatParticipant_conversationId_fkey'
  ) THEN
    ALTER TABLE "ChatParticipant"
      ADD CONSTRAINT "ChatParticipant_conversationId_fkey"
      FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ChatParticipant_userId_fkey'
  ) THEN
    ALTER TABLE "ChatParticipant"
      ADD CONSTRAINT "ChatParticipant_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ChatMessage_conversationId_fkey'
  ) THEN
    ALTER TABLE "ChatMessage"
      ADD CONSTRAINT "ChatMessage_conversationId_fkey"
      FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ChatMessage_senderId_fkey'
  ) THEN
    ALTER TABLE "ChatMessage"
      ADD CONSTRAINT "ChatMessage_senderId_fkey"
      FOREIGN KEY ("senderId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
