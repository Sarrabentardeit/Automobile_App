-- CreateTable
CREATE TABLE "DemandeDevis" (
    "id" SERIAL NOT NULL,
    "date" TEXT NOT NULL,
    "client_name" TEXT NOT NULL,
    "client_telephone" TEXT,
    "vehicle_ref" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "statut" TEXT NOT NULL DEFAULT 'en_attente',
    "montant_estime" DOUBLE PRECISION,
    "date_limite" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemandeDevis_pkey" PRIMARY KEY ("id")
);
