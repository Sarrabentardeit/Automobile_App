-- CreateTable
CREATE TABLE "ContactImportant" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "categorie" TEXT DEFAULT '',
    "notes" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactImportant_pkey" PRIMARY KEY ("id")
);
