-- AlterTable
ALTER TABLE "ProduitStock" ADD COLUMN "dernier_prix_unitaire_ttc" DOUBLE PRECISION NOT NULL DEFAULT 0;

UPDATE "ProduitStock"
SET "dernier_prix_unitaire_ttc" = CASE
  WHEN "quantite" > 0 THEN "valeur_achat_ttc" / "quantite"::double precision
  ELSE 0
END;
