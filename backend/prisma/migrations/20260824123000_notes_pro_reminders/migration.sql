-- AlterTable NotePersonnelle
ALTER TABLE "NotePersonnelle" ADD COLUMN IF NOT EXISTS "recurrence" TEXT NOT NULL DEFAULT 'none';
ALTER TABLE "NotePersonnelle" ADD COLUMN IF NOT EXISTS "tag" TEXT NOT NULL DEFAULT 'perso';
ALTER TABLE "NotePersonnelle" ADD COLUMN IF NOT EXISTS "rappelNotifieAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "NotePersonnelle_rappelAt_idx" ON "NotePersonnelle"("rappelAt");

-- AlterTable Notification
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "notePersonnelleId" INTEGER;

CREATE INDEX IF NOT EXISTS "Notification_notePersonnelleId_idx" ON "Notification"("notePersonnelleId");

DO $$ BEGIN
  ALTER TABLE "Notification" ADD CONSTRAINT "Notification_notePersonnelleId_fkey"
    FOREIGN KEY ("notePersonnelleId") REFERENCES "NotePersonnelle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
