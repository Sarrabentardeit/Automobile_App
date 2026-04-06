-- AlterTable (suivi de 20260406120001_drop : colonnes retirées du schéma)
ALTER TABLE "ProduitStock" ADD COLUMN "prix_achat_unitaire" DOUBLE PRECISION;
ALTER TABLE "ProduitStock" ADD COLUMN "marge_vente_pct" DOUBLE PRECISION;
