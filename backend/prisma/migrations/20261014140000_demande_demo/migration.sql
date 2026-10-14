CREATE TABLE "DemandeDemo" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "garage" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "ponts" INTEGER,
    "message" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemandeDemo_pkey" PRIMARY KEY ("id")
);
