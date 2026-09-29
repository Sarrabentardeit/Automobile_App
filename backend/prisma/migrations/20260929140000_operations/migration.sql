CREATE TABLE "Operation" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "cle" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Operation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Operation_cle_key" ON "Operation"("cle");

CREATE TABLE "OperationEntry" (
    "id" SERIAL NOT NULL,
    "operationId" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "vehicule" TEXT NOT NULL DEFAULT '',
    "type_travaux" TEXT NOT NULL DEFAULT '',
    "prix_garage" DOUBLE PRECISION,
    "prix" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OperationEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OperationEntry_operationId_idx" ON "OperationEntry"("operationId");

ALTER TABLE "OperationEntry"
ADD CONSTRAINT "OperationEntry_operationId_fkey"
FOREIGN KEY ("operationId") REFERENCES "Operation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Operation" ("nom", "cle", "actif", "updatedAt")
VALUES
  ('Opération Ahmed', 'ahmed', true, CURRENT_TIMESTAMP),
  ('Opération Nouri', 'nouri', true, CURRENT_TIMESTAMP);

INSERT INTO "OperationEntry" ("operationId", "date", "vehicule", "type_travaux", "prix_garage", "prix", "createdAt", "updatedAt")
SELECT o."id", a."date", a."vehicule", a."type_travaux", a."prix_garage", a."prix_ahmed", a."createdAt", a."updatedAt"
FROM "OutilAhmedEntry" a
JOIN "Operation" o ON o."cle" = 'ahmed';

INSERT INTO "OperationEntry" ("operationId", "date", "vehicule", "type_travaux", "prix_garage", "prix", "createdAt", "updatedAt")
SELECT o."id", n."date", n."vehicule", n."type_travaux", n."prix_garage", n."prix_nouri", n."createdAt", n."updatedAt"
FROM "OutilNouriEntry" n
JOIN "Operation" o ON o."cle" = 'nouri';
