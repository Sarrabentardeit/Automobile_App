-- CreateTable
CREATE TABLE "Reclamation" (
    "id" SERIAL NOT NULL,
    "date" TEXT NOT NULL,
    "client_name" TEXT NOT NULL,
    "client_telephone" TEXT,
    "vehicle_ref" TEXT NOT NULL DEFAULT '',
    "sujet" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "statut" TEXT NOT NULL DEFAULT 'ouverte',
    "assigne_a" TEXT,
    "priorite" TEXT DEFAULT 'normale',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reclamation_pkey" PRIMARY KEY ("id")
);
