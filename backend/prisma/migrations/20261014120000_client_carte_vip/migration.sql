ALTER TABLE "Client" ADD COLUMN "carte_vip_numero" TEXT;
ALTER TABLE "Client" ADD COLUMN "carte_vip_debut" TEXT;
ALTER TABLE "Client" ADD COLUMN "carte_vip_fin" TEXT;
ALTER TABLE "Client" ADD COLUMN "carte_vip_acces" TEXT;

CREATE UNIQUE INDEX "Client_carte_vip_numero_key" ON "Client"("carte_vip_numero");
