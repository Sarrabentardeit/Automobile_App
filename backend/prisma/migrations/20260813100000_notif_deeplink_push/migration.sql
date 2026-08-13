-- AlterTable User: Expo push token
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "expoPushToken" TEXT;

-- AlterTable Notification: deep-link targets
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "conversationId" INTEGER;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "clientDetteId" INTEGER;

-- Indexes
CREATE INDEX IF NOT EXISTS "Notification_userId_read_idx" ON "Notification"("userId", "read");
CREATE INDEX IF NOT EXISTS "Notification_conversationId_idx" ON "Notification"("conversationId");
CREATE INDEX IF NOT EXISTS "Notification_clientDetteId_idx" ON "Notification"("clientDetteId");

-- Foreign keys (ignore if already present)
DO $$ BEGIN
  ALTER TABLE "Notification"
    ADD CONSTRAINT "Notification_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Notification"
    ADD CONSTRAINT "Notification_clientDetteId_fkey"
    FOREIGN KEY ("clientDetteId") REFERENCES "ClientDette"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
