-- AlterTable
ALTER TABLE "Achat" ADD COLUMN "timbre" DOUBLE PRECISION NOT NULL DEFAULT 1;

-- Les prix unitaires en base étaient interprétés comme TTC par ligne ; on les convertit en HT pour le même barème que la facture vente (TVA 19 % + timbre).
UPDATE "AchatLigne" SET "prix_unitaire" = CASE WHEN "prix_unitaire" <> 0 THEN "prix_unitaire" / 1.19 ELSE 0 END;
