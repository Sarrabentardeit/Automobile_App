-- CreateTable
CREATE TABLE "DailyChecklist" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "data" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "validatedAt" TIMESTAMP(3),
    "validatorId" INTEGER,
    "validatorComment" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyChecklist_userId_date_key" ON "DailyChecklist"("userId", "date");

-- AddForeignKey
ALTER TABLE "DailyChecklist"
ADD CONSTRAINT "DailyChecklist_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyChecklist"
ADD CONSTRAINT "DailyChecklist_validatorId_fkey"
FOREIGN KEY ("validatorId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
