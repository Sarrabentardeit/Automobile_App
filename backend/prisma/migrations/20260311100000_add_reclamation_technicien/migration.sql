-- CreateTable
CREATE TABLE "ReclamationTechnicien" (
    "id" SERIAL NOT NULL,
    "reclamationId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "user_full_name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReclamationTechnicien_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ReclamationTechnicien"
ADD CONSTRAINT "ReclamationTechnicien_reclamationId_fkey"
FOREIGN KEY ("reclamationId") REFERENCES "Reclamation"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReclamationTechnicien"
ADD CONSTRAINT "ReclamationTechnicien_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

