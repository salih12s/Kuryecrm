-- AlterEnum: add Kurye Şefi role
ALTER TYPE "Role" ADD VALUE 'KURYE_SEFI';

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('APPROVED', 'PENDING', 'REJECTED');

-- Rename users.email -> users.username (preserves existing values, no data loss)
ALTER TABLE "users" RENAME COLUMN "email" TO "username";
ALTER INDEX "users_email_key" RENAME TO "users_username_key";

-- AlterTable couriers: plate + approval lifecycle
ALTER TABLE "couriers"
  ADD COLUMN "plate" TEXT,
  ADD COLUMN "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN "rejectionNote" TEXT;

-- AlterTable restaurants: approval lifecycle
ALTER TABLE "restaurants"
  ADD COLUMN "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN "rejectionNote" TEXT;

-- CreateTable shift_segments
CREATE TABLE "shift_segments" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "restaurantHourlyRateSnapshot" DECIMAL(10,2) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT,
    "sequence" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shift_segments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shift_segments_shiftId_idx" ON "shift_segments"("shiftId");
CREATE INDEX "shift_segments_restaurantId_idx" ON "shift_segments"("restaurantId");

-- AddForeignKey
ALTER TABLE "shift_segments" ADD CONSTRAINT "shift_segments_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shift_segments" ADD CONSTRAINT "shift_segments_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
