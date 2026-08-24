-- CreateTable
CREATE TABLE "NotePersonnelle" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "titre" TEXT NOT NULL DEFAULT '',
    "contenu" TEXT NOT NULL DEFAULT '',
    "rappelAt" TIMESTAMP(3),
    "epinglee" BOOLEAN NOT NULL DEFAULT false,
    "faite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotePersonnelle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotePersonnelle_userId_idx" ON "NotePersonnelle"("userId");

-- AddForeignKey
ALTER TABLE "NotePersonnelle" ADD CONSTRAINT "NotePersonnelle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
