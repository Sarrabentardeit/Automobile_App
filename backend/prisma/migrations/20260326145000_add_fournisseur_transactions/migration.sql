-- CreateTable
CREATE TABLE "FournisseurTransaction" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "fournisseur" TEXT NOT NULL,
    "vehicule" TEXT,
    "pieces" TEXT,
    "num_facture" TEXT,
    "created_by_id" INTEGER,
    "created_by_name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FournisseurTransaction_pkey" PRIMARY KEY ("id")
);

