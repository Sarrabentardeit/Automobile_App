-- Catalogue : prix d'achat + marge → prix de vente calculé côté app
ALTER TABLE "ProduitStock" ADD COLUMN IF NOT EXISTS "prix_achat_unitaire" DOUBLE PRECISION;
ALTER TABLE "ProduitStock" ADD COLUMN IF NOT EXISTS "marge_vente_pct" DOUBLE PRECISION;
