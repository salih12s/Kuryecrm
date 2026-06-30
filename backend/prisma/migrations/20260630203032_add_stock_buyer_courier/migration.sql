-- AlterTable
ALTER TABLE "accessory_sales" ADD COLUMN     "buyerCourierId" TEXT;

-- AlterTable
ALTER TABLE "motorcycles" ADD COLUMN     "buyer" TEXT,
ADD COLUMN     "buyerCourierId" TEXT;

-- CreateIndex
CREATE INDEX "accessory_sales_buyerCourierId_idx" ON "accessory_sales"("buyerCourierId");

-- CreateIndex
CREATE INDEX "motorcycles_buyerCourierId_idx" ON "motorcycles"("buyerCourierId");

-- AddForeignKey
ALTER TABLE "motorcycles" ADD CONSTRAINT "motorcycles_buyerCourierId_fkey" FOREIGN KEY ("buyerCourierId") REFERENCES "couriers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accessory_sales" ADD CONSTRAINT "accessory_sales_buyerCourierId_fkey" FOREIGN KEY ("buyerCourierId") REFERENCES "couriers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
