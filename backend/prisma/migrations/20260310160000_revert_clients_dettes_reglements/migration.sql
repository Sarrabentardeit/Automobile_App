-- Drop table ClientDetteReglement (FK from ClientDette)
DROP TABLE IF EXISTS "ClientDetteReglement";

-- Remove date and montant_total from ClientDette
ALTER TABLE "ClientDette" DROP COLUMN IF EXISTS "date";
ALTER TABLE "ClientDette" DROP COLUMN IF EXISTS "montant_total";
