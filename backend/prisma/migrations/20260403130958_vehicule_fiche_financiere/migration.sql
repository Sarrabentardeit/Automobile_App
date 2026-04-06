-- AlterTable
ALTER TABLE "Vehicule" ADD COLUMN     "avance_client" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "VehiculeDepense" (
    "id" SERIAL NOT NULL,
    "vehiculeId" INTEGER NOT NULL,
    "libelle" TEXT NOT NULL DEFAULT '',
    "montant" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehiculeDepense_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "VehiculeDepense" ADD CONSTRAINT "VehiculeDepense_vehiculeId_fkey" FOREIGN KEY ("vehiculeId") REFERENCES "Vehicule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
