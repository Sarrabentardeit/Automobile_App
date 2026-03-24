-- CreateTable
CREATE TABLE "CalendarAssignment" (
    "id" SERIAL NOT NULL,
    "date" TEXT NOT NULL,
    "member_name" TEXT NOT NULL,
    "vehicle_id" INTEGER,
    "vehicle_label" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "client_name" TEXT DEFAULT '',
    "client_telephone" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarAssignment_pkey" PRIMARY KEY ("id")
);

