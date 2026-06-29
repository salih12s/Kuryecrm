-- CreateEnum
CREATE TYPE "MotorcycleStatus" AS ENUM ('IN_STOCK', 'ASSIGNED', 'SOLD', 'RETIRED');

-- CreateEnum
CREATE TYPE "AccessoryType" AS ENUM ('BAG', 'CHEST_BAG', 'OTHER');

-- CreateTable
CREATE TABLE "motorcycles" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "plate" TEXT,
    "purchaseDate" TEXT NOT NULL,
    "purchasePrice" DECIMAL(12,2) NOT NULL,
    "status" "MotorcycleStatus" NOT NULL DEFAULT 'IN_STOCK',
    "saleDate" TEXT,
    "salePrice" DECIMAL(12,2),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "motorcycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accessory_purchases" (
    "id" TEXT NOT NULL,
    "type" "AccessoryType" NOT NULL,
    "name" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitCost" DECIMAL(12,2) NOT NULL,
    "purchaseDate" TEXT NOT NULL,
    "supplier" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accessory_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accessory_sales" (
    "id" TEXT NOT NULL,
    "type" "AccessoryType" NOT NULL,
    "name" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "unitCost" DECIMAL(12,2) NOT NULL,
    "saleDate" TEXT NOT NULL,
    "buyer" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accessory_sales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "motorcycles_status_idx" ON "motorcycles"("status");

-- CreateIndex
CREATE INDEX "accessory_purchases_type_idx" ON "accessory_purchases"("type");

-- CreateIndex
CREATE INDEX "accessory_purchases_purchaseDate_idx" ON "accessory_purchases"("purchaseDate");

-- CreateIndex
CREATE INDEX "accessory_sales_type_idx" ON "accessory_sales"("type");

-- CreateIndex
CREATE INDEX "accessory_sales_saleDate_idx" ON "accessory_sales"("saleDate");
