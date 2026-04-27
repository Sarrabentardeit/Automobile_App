-- AlterTable
ALTER TABLE "Facture" ADD COLUMN "montant_paye" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "FacturePaiement" (
    "id" SERIAL NOT NULL,
    "factureId" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "mode" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacturePaiement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FacturePaiement_factureId_idx" ON "FacturePaiement"("factureId");

-- AddForeignKey
ALTER TABLE "FacturePaiement" ADD CONSTRAINT "FacturePaiement_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture"("id") ON DELETE CASCADE ON UPDATE CASCADE;
