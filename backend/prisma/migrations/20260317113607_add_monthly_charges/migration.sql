-- AlterTable
ALTER TABLE "ClientDette" ALTER COLUMN "notes" SET DEFAULT '';

-- AlterTable
ALTER TABLE "DemandeDevis" ALTER COLUMN "client_telephone" SET DEFAULT '',
ALTER COLUMN "notes" SET DEFAULT '';

-- AlterTable
ALTER TABLE "Notification" ALTER COLUMN "title" SET DEFAULT '';

-- AlterTable
ALTER TABLE "Reclamation" ALTER COLUMN "client_telephone" SET DEFAULT '',
ALTER COLUMN "assigne_a" SET DEFAULT '';

-- CreateTable
CREATE TABLE "MonthlyCharge" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyCharge_pkey" PRIMARY KEY ("id")
);
