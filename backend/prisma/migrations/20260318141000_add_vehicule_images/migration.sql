-- CreateTable
CREATE TABLE "VehiculeImage" (
    "id" SERIAL NOT NULL,
    "vehiculeId" INTEGER NOT NULL,
    "url_path" TEXT NOT NULL,
    "original_name" TEXT NOT NULL DEFAULT '',
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'etat_exterieur',
    "note" TEXT NOT NULL DEFAULT '',
    "created_by_id" INTEGER,
    "created_by" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehiculeImage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "VehiculeImage"
ADD CONSTRAINT "VehiculeImage_vehiculeId_fkey"
FOREIGN KEY ("vehiculeId") REFERENCES "Vehicule"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
