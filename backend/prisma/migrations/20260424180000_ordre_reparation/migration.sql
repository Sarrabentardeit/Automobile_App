-- CreateTable
CREATE TABLE "OrdreReparation" (
    "id" SERIAL NOT NULL,
    "vehiculeId" INTEGER NOT NULL,
    "numero" TEXT NOT NULL DEFAULT '',
    "clientNom" TEXT NOT NULL DEFAULT '',
    "clientTelephone" TEXT NOT NULL DEFAULT '',
    "voiture" TEXT NOT NULL DEFAULT '',
    "immatriculation" TEXT NOT NULL DEFAULT '',
    "kilometrage" INTEGER,
    "dateEntree" TEXT NOT NULL,
    "technicien" TEXT NOT NULL DEFAULT '',
    "vin" TEXT NOT NULL DEFAULT '',
    "carrosserieJson" JSONB,
    "voyantsJson" JSONB,
    "rempliPar" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrdreReparation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrdreReparationLigne" (
    "id" SERIAL NOT NULL,
    "ordreReparationId" INTEGER NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'en_attente',

    CONSTRAINT "OrdreReparationLigne_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrdreReparation_vehiculeId_idx" ON "OrdreReparation"("vehiculeId");

-- CreateIndex
CREATE INDEX "OrdreReparationLigne_ordreReparationId_idx" ON "OrdreReparationLigne"("ordreReparationId");

-- AddForeignKey
ALTER TABLE "OrdreReparation" ADD CONSTRAINT "OrdreReparation_vehiculeId_fkey" FOREIGN KEY ("vehiculeId") REFERENCES "Vehicule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdreReparationLigne" ADD CONSTRAINT "OrdreReparationLigne_ordreReparationId_fkey" FOREIGN KEY ("ordreReparationId") REFERENCES "OrdreReparation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
