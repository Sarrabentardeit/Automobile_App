-- CreateTable
CREATE TABLE "MouvementProduitManual" (
    "id" SERIAL NOT NULL,
    "date" TEXT NOT NULL,
    "produit" TEXT NOT NULL,
    "vehicule" TEXT NOT NULL,
    "technicien" TEXT NOT NULL,
    "neuf_utilise" TEXT NOT NULL DEFAULT 'neuf',
    "statut" TEXT NOT NULL DEFAULT 'en_cours',
    "prix" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fournisseur" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MouvementProduitManual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppSetting_key_key" ON "AppSetting"("key");

