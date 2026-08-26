-- CreateTable
CREATE TABLE "OutilNouriEntry" (
    "id" SERIAL NOT NULL,
    "date" TEXT NOT NULL,
    "vehicule" TEXT NOT NULL,
    "type_travaux" TEXT NOT NULL,
    "prix_garage" DOUBLE PRECISION,
    "prix_nouri" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutilNouriEntry_pkey" PRIMARY KEY ("id")
);
