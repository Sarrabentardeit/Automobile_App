CREATE TABLE "ReunionNote" (
    "id" SERIAL NOT NULL,
    "date" TEXT NOT NULL,
    "vehiculeId" INTEGER NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "updatedBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReunionNote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReunionNote_date_vehiculeId_key" ON "ReunionNote"("date", "vehiculeId");
CREATE INDEX "ReunionNote_date_idx" ON "ReunionNote"("date");

ALTER TABLE "ReunionNote"
ADD CONSTRAINT "ReunionNote_vehiculeId_fkey"
FOREIGN KEY ("vehiculeId") REFERENCES "Vehicule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
