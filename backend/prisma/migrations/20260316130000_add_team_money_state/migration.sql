-- CreateTable
CREATE TABLE "TeamMoneyState" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMoneyState_pkey" PRIMARY KEY ("id")
);

