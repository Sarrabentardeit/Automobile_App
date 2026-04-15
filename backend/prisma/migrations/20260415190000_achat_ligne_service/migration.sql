-- AlterTable
ALTER TABLE "AchatLigne" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'produit';

-- AlterTable
ALTER TABLE "AchatLigne" ALTER COLUMN "productId" DROP NOT NULL;
