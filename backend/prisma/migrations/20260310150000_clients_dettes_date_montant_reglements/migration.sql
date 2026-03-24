-- AlterTable ClientDette: add date and montant_total
ALTER TABLE "ClientDette" ADD COLUMN "date" TEXT;
ALTER TABLE "ClientDette" ADD COLUMN "montant_total" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Backfill: use createdAt for date, reste for montant_total
UPDATE "ClientDette" SET "date" = to_char("createdAt"::date, 'YYYY-MM-DD');
UPDATE "ClientDette" SET "montant_total" = "reste" WHERE "reste" > 0;

ALTER TABLE "ClientDette" ALTER COLUMN "date" SET NOT NULL;

-- CreateTable ClientDetteReglement
CREATE TABLE "ClientDetteReglement" (
    "id" SERIAL NOT NULL,
    "clientDetteId" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientDetteReglement_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ClientDetteReglement" ADD CONSTRAINT "ClientDetteReglement_clientDetteId_fkey" FOREIGN KEY ("clientDetteId") REFERENCES "ClientDette"("id") ON DELETE CASCADE ON UPDATE CASCADE;
