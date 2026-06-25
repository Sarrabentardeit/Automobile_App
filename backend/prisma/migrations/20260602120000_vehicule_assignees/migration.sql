-- Table d'assignation véhicule ↔ utilisateur (multi-techniciens / responsables)
CREATE TABLE "VehiculeAssignee" (
    "id" SERIAL NOT NULL,
    "vehiculeId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehiculeAssignee_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VehiculeAssignee_vehiculeId_userId_role_key" ON "VehiculeAssignee"("vehiculeId", "userId", "role");
CREATE INDEX "VehiculeAssignee_userId_idx" ON "VehiculeAssignee"("userId");
CREATE INDEX "VehiculeAssignee_vehiculeId_idx" ON "VehiculeAssignee"("vehiculeId");

ALTER TABLE "VehiculeAssignee" ADD CONSTRAINT "VehiculeAssignee_vehiculeId_fkey" FOREIGN KEY ("vehiculeId") REFERENCES "Vehicule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehiculeAssignee" ADD CONSTRAINT "VehiculeAssignee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Données existantes : technicien / responsable principal (utilisateurs valides uniquement)
INSERT INTO "VehiculeAssignee" ("vehiculeId", "userId", "role")
SELECT v."id", v."technicien_id", 'technicien'
FROM "Vehicule" v
INNER JOIN "User" u ON u."id" = v."technicien_id"
WHERE v."technicien_id" IS NOT NULL
ON CONFLICT ("vehiculeId", "userId", "role") DO NOTHING;

INSERT INTO "VehiculeAssignee" ("vehiculeId", "userId", "role")
SELECT v."id", v."responsable_id", 'responsable'
FROM "Vehicule" v
INNER JOIN "User" u ON u."id" = v."responsable_id"
WHERE v."responsable_id" IS NOT NULL
ON CONFLICT ("vehiculeId", "userId", "role") DO NOTHING;
