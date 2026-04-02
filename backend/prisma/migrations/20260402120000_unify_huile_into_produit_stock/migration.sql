-- AlterTable
ALTER TABLE "ProduitStock" ADD COLUMN "reference" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ProduitStock" ADD COLUMN "unite" TEXT NOT NULL DEFAULT 'unité';
ALTER TABLE "ProduitStock" ADD COLUMN "seuil_alerte" INTEGER;
ALTER TABLE "ProduitStock" ADD COLUMN "fluide_type" TEXT;

-- Migrate legacy ProduitHuile rows into ProduitStock (single inventory)
INSERT INTO "ProduitStock" ("nom", "quantite", "valeur_achat_ttc", "categorie", "prix_vente", "reference", "unite", "seuil_alerte", "fluide_type", "createdAt", "updatedAt")
SELECT
  "designation",
  "quantite",
  CASE WHEN COALESCE("prix", 0) > 0 AND "quantite" > 0 THEN "prix" * "quantite"::double precision ELSE 0 END,
  'Huiles & liquides',
  "prix",
  "reference",
  "unite",
  "seuil_alerte",
  "type",
  "createdAt",
  "updatedAt"
FROM "ProduitHuile";

-- DropTable
DROP TABLE "ProduitHuile";
