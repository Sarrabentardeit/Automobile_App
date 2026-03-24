-- CreateTable
CREATE TABLE "ClientDette" (
    "id" SERIAL NOT NULL,
    "client_name" TEXT NOT NULL,
    "telephone_client" TEXT NOT NULL DEFAULT '',
    "designation" TEXT NOT NULL DEFAULT '',
    "reste" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientDette_pkey" PRIMARY KEY ("id")
);
