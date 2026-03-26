-- CreateTable
CREATE TABLE "OutilMohamedEntry" (
    "id" SERIAL NOT NULL,
    "date" TEXT NOT NULL,
    "vehicule" TEXT NOT NULL,
    "outillage" TEXT NOT NULL,
    "prix_garage" DOUBLE PRECISION NOT NULL,
    "prix_mohamed" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutilMohamedEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutilAhmedEntry" (
    "id" SERIAL NOT NULL,
    "date" TEXT NOT NULL,
    "vehicule" TEXT NOT NULL,
    "type_travaux" TEXT NOT NULL,
    "prix_garage" DOUBLE PRECISION,
    "prix_ahmed" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutilAhmedEntry_pkey" PRIMARY KEY ("id")
);

