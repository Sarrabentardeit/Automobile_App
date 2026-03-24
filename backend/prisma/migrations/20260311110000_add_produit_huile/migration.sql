-- CreateTable
CREATE TABLE "ProduitHuile" (
    "id" SERIAL NOT NULL,
    "designation" TEXT NOT NULL,
    "reference" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL DEFAULT 'moteur',
    "quantite" INTEGER NOT NULL DEFAULT 0,
    "unite" TEXT NOT NULL DEFAULT 'L',
    "seuil_alerte" INTEGER,
    "prix" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProduitHuile_pkey" PRIMARY KEY ("id")
);
