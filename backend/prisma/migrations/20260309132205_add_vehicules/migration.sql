-- CreateTable
CREATE TABLE "Vehicule" (
    "id" SERIAL NOT NULL,
    "immatriculation" TEXT NOT NULL DEFAULT '',
    "modele" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'voiture',
    "etat_actuel" TEXT NOT NULL DEFAULT 'orange',
    "technicien_id" INTEGER,
    "responsable_id" INTEGER,
    "defaut" TEXT NOT NULL DEFAULT '',
    "client_telephone" TEXT NOT NULL DEFAULT '',
    "date_entree" TEXT NOT NULL,
    "date_sortie" TEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    "derniere_mise_a_jour" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehiculeHistorique" (
    "id" SERIAL NOT NULL,
    "vehiculeId" INTEGER NOT NULL,
    "etat_precedent" TEXT,
    "etat_nouveau" TEXT NOT NULL,
    "date_changement" TEXT NOT NULL,
    "utilisateur_id" INTEGER NOT NULL,
    "utilisateur_nom" TEXT NOT NULL,
    "commentaire" TEXT NOT NULL DEFAULT '',
    "duree_etat_precedent_min" INTEGER,
    "pieces_utilisees" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "VehiculeHistorique_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "VehiculeHistorique" ADD CONSTRAINT "VehiculeHistorique_vehiculeId_fkey" FOREIGN KEY ("vehiculeId") REFERENCES "Vehicule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
