-- CreateTable
CREATE TABLE "ChecklistAuditLog" (
    "id" SERIAL NOT NULL,
    "checklistId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" INTEGER,
    "actorName" TEXT NOT NULL DEFAULT '',
    "actorRole" TEXT NOT NULL DEFAULT '',
    "summary" TEXT NOT NULL DEFAULT '',
    "snapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistAuditLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ChecklistAuditLog"
ADD CONSTRAINT "ChecklistAuditLog_checklistId_fkey"
FOREIGN KEY ("checklistId") REFERENCES "DailyChecklist"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
