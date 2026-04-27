-- AlterTable
ALTER TABLE "Achat" ADD COLUMN "montant_paye" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "AchatPaiement" (
    "id" SERIAL NOT NULL,
    "achatId" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "mode" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AchatPaiement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AchatPaiement_achatId_idx" ON "AchatPaiement"("achatId");

-- AddForeignKey
ALTER TABLE "AchatPaiement" ADD CONSTRAINT "AchatPaiement_achatId_fkey"
FOREIGN KEY ("achatId") REFERENCES "Achat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
