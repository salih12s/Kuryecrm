-- CreateEnum
CREATE TYPE "VisitResult" AS ENUM ('POSITIVE', 'NEGATIVE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'MUHASEBE';
ALTER TYPE "Role" ADD VALUE 'PAZARLAMACI';
ALTER TYPE "Role" ADD VALUE 'GOZLEMCI';

-- CreateTable
CREATE TABLE "marketing_visits" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "visitDate" TEXT NOT NULL,
    "placeName" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT,
    "result" "VisitResult" NOT NULL,
    "operationSize" INTEGER,
    "negativeReason" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_visits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "marketing_visits_userId_idx" ON "marketing_visits"("userId");

-- CreateIndex
CREATE INDEX "marketing_visits_visitDate_idx" ON "marketing_visits"("visitDate");

-- AddForeignKey
ALTER TABLE "marketing_visits" ADD CONSTRAINT "marketing_visits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
