-- CreateEnum
CREATE TYPE "CourierPaymentStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateTable
CREATE TABLE "courier_payments" (
    "id" TEXT NOT NULL,
    "courierId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentDate" TEXT NOT NULL,
    "method" TEXT,
    "note" TEXT,
    "status" "CourierPaymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courier_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "courier_payments_courierId_idx" ON "courier_payments"("courierId");

-- CreateIndex
CREATE INDEX "courier_payments_paymentDate_idx" ON "courier_payments"("paymentDate");

-- CreateIndex
CREATE INDEX "courier_payments_status_idx" ON "courier_payments"("status");

-- AddForeignKey
ALTER TABLE "courier_payments" ADD CONSTRAINT "courier_payments_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "couriers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
