-- CreateTable
CREATE TABLE "ProduitStock" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL DEFAULT 0,
    "valeur_achat_ttc" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "categorie" TEXT DEFAULT '',
    "prix_vente" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProduitStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MouvementStock" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "produit_nom" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "origine" TEXT NOT NULL,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MouvementStock_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MouvementStock" ADD CONSTRAINT "MouvementStock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ProduitStock"("id") ON DELETE CASCADE ON UPDATE CASCADE;
