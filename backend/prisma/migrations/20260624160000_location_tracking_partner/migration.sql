-- AlterEnum: add Ortaklar (Partner) role
ALTER TYPE "Role" ADD VALUE 'PARTNER';

-- AlterTable restaurants: fixed map location
ALTER TABLE "restaurants"
  ADD COLUMN "latitude" DOUBLE PRECISION,
  ADD COLUMN "longitude" DOUBLE PRECISION,
  ADD COLUMN "locationNote" TEXT;

-- CreateTable courier_locations (live tracking pings)
CREATE TABLE "courier_locations" (
    "id" TEXT NOT NULL,
    "courierId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "restaurantId" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "speed" DOUBLE PRECISION,
    "accuracy" DOUBLE PRECISION,
    "deviceStatus" TEXT,
    "connectionStatus" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courier_locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "courier_locations_courierId_createdAt_idx" ON "courier_locations"("courierId", "createdAt");
CREATE INDEX "courier_locations_shiftId_idx" ON "courier_locations"("shiftId");

-- AddForeignKey
ALTER TABLE "courier_locations" ADD CONSTRAINT "courier_locations_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "couriers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "courier_locations" ADD CONSTRAINT "courier_locations_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "courier_locations" ADD CONSTRAINT "courier_locations_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable app_settings (key/value config)
CREATE TABLE "app_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);
