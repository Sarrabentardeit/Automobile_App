-- CreateTable
CREATE TABLE "Facture" (
    "id" SERIAL NOT NULL,
    "numero" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'brouillon',
    "clientId" INTEGER,
    "client_nom" TEXT NOT NULL,
    "client_telephone" TEXT NOT NULL,
    "client_adresse" TEXT DEFAULT '',
    "client_matricule_fiscale" TEXT DEFAULT '',
    "timbre" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Facture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FactureLigne" (
    "id" SERIAL NOT NULL,
    "factureId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "qte" DOUBLE PRECISION,
    "mt_ht" DOUBLE PRECISION,
    "montant" DOUBLE PRECISION,
    "productId" INTEGER,
    "prix_unitaire_ht" DOUBLE PRECISION,

    CONSTRAINT "FactureLigne_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FactureLigne" ADD CONSTRAINT "FactureLigne_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture"("id") ON DELETE CASCADE ON UPDATE CASCADE;
