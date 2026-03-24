-- CreateTable
CREATE TABLE "Achat" (
    "id" SERIAL NOT NULL,
    "numero" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "fournisseur_id" INTEGER,
    "fournisseur_nom" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'brouillon',
    "paye" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Achat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AchatLigne" (
    "id" SERIAL NOT NULL,
    "achatId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "designation" TEXT NOT NULL,
    "quantite" DOUBLE PRECISION NOT NULL,
    "prix_unitaire" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "AchatLigne_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AchatLigne" ADD CONSTRAINT "AchatLigne_achatId_fkey" FOREIGN KEY ("achatId") REFERENCES "Achat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
