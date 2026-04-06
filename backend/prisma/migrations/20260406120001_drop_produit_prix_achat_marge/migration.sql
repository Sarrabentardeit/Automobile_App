-- Retrait des colonnes catalogue prix d'achat / marge (réversion fonctionnalité)
ALTER TABLE "ProduitStock" DROP COLUMN IF EXISTS "prix_achat_unitaire";
ALTER TABLE "ProduitStock" DROP COLUMN IF EXISTS "marge_vente_pct";
