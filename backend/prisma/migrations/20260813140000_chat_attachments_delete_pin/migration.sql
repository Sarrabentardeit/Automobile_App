-- ChatMessage: soft delete + empty body allowed
ALTER TABLE "ChatMessage" ALTER COLUMN "body" SET DEFAULT '';
ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "deletedById" INTEGER;

-- ChatConversation: pin
ALTER TABLE "ChatConversation" ADD COLUMN IF NOT EXISTS "pinnedMessageId" INTEGER;
ALTER TABLE "ChatConversation" ADD COLUMN IF NOT EXISTS "pinnedAt" TIMESTAMP(3);
ALTER TABLE "ChatConversation" ADD COLUMN IF NOT EXISTS "pinnedById" INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS "ChatConversation_pinnedMessageId_key" ON "ChatConversation"("pinnedMessageId");

-- ChatAttachment
CREATE TABLE IF NOT EXISTS "ChatAttachment" (
    "id" SERIAL NOT NULL,
    "messageId" INTEGER NOT NULL,
    "url_path" TEXT NOT NULL,
    "original_name" TEXT NOT NULL DEFAULT '',
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL DEFAULT 0,
    "kind" TEXT NOT NULL DEFAULT 'file',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ChatAttachment_messageId_idx" ON "ChatAttachment"("messageId");

DO $$ BEGIN
  ALTER TABLE "ChatAttachment"
    ADD CONSTRAINT "ChatAttachment_messageId_fkey"
    FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ChatMessageHide
CREATE TABLE IF NOT EXISTS "ChatMessageHide" (
    "id" SERIAL NOT NULL,
    "messageId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "hiddenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessageHide_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ChatMessageHide_messageId_userId_key" ON "ChatMessageHide"("messageId", "userId");
CREATE INDEX IF NOT EXISTS "ChatMessageHide_userId_idx" ON "ChatMessageHide"("userId");

DO $$ BEGIN
  ALTER TABLE "ChatMessageHide"
    ADD CONSTRAINT "ChatMessageHide_messageId_fkey"
    FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ChatMessageHide"
    ADD CONSTRAINT "ChatMessageHide_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ChatConversation"
    ADD CONSTRAINT "ChatConversation_pinnedMessageId_fkey"
    FOREIGN KEY ("pinnedMessageId") REFERENCES "ChatMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
