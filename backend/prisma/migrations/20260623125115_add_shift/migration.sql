-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "ShiftConfirmationStatus" AS ENUM ('WAITING', 'RESTAURANT_SUBMITTED', 'COURIER_SUBMITTED', 'MATCHED', 'DISPUTED', 'ADMIN_APPROVED');

-- CreateTable
CREATE TABLE "shifts" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "courierId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "plannedStartTime" TEXT NOT NULL,
    "plannedEndTime" TEXT NOT NULL,
    "extraStartTime" TEXT,
    "extraEndTime" TEXT,
    "restaurantHourlyRateSnapshot" DECIMAL(10,2) NOT NULL,
    "courierHourlyRateSnapshot" DECIMAL(10,2) NOT NULL,
    "restaurantReportedStartTime" TEXT,
    "restaurantReportedEndTime" TEXT,
    "courierReportedStartTime" TEXT,
    "courierReportedEndTime" TEXT,
    "approvedStartTime" TEXT,
    "approvedEndTime" TEXT,
    "status" "ShiftStatus" NOT NULL DEFAULT 'PLANNED',
    "confirmationStatus" "ShiftConfirmationStatus" NOT NULL DEFAULT 'WAITING',
    "note" TEXT,
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shifts_restaurantId_idx" ON "shifts"("restaurantId");

-- CreateIndex
CREATE INDEX "shifts_courierId_idx" ON "shifts"("courierId");

-- CreateIndex
CREATE INDEX "shifts_date_idx" ON "shifts"("date");

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "couriers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
