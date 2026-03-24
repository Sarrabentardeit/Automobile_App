-- Nettoyer les fournisseur_id orphelins (référencent un Fournisseur inexistant)
UPDATE "Achat" SET "fournisseur_id" = NULL
WHERE "fournisseur_id" IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM "Fournisseur" WHERE "Fournisseur"."id" = "Achat"."fournisseur_id");

-- AddForeignKey
ALTER TABLE "Achat" ADD CONSTRAINT "Achat_fournisseur_id_fkey" FOREIGN KEY ("fournisseur_id") REFERENCES "Fournisseur"("id") ON DELETE SET NULL ON UPDATE CASCADE;
