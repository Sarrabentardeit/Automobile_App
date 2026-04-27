-- CreateTable
CREATE TABLE "VehiculeSuivi" (
    "id" SERIAL NOT NULL,
    "vehiculeId" INTEGER NOT NULL,
    "numero" TEXT NOT NULL DEFAULT '',
    "date" TEXT NOT NULL,
    "voiture" TEXT NOT NULL DEFAULT '',
    "matricule" TEXT NOT NULL DEFAULT '',
    "kilometrage" TEXT NOT NULL DEFAULT '',
    "travauxEffectues" TEXT NOT NULL DEFAULT '',
    "travauxProchains" TEXT NOT NULL DEFAULT '',
    "produitsUtilises" TEXT NOT NULL DEFAULT '',
    "technicien" TEXT NOT NULL DEFAULT '',
    "rempliPar" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehiculeSuivi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VehiculeSuivi_vehiculeId_idx" ON "VehiculeSuivi"("vehiculeId");

-- AddForeignKey
ALTER TABLE "VehiculeSuivi" ADD CONSTRAINT "VehiculeSuivi_vehiculeId_fkey" FOREIGN KEY ("vehiculeId") REFERENCES "Vehicule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
