-- AlterTable
ALTER TABLE "User" ADD COLUMN     "permissions" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "statut" TEXT NOT NULL DEFAULT 'actif',
ADD COLUMN     "telephone" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "role" SET DEFAULT 'technicien';
