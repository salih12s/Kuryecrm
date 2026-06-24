-- CreateEnum
CREATE TYPE "AdvanceStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FinanceTransactionType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "FinanceTransactionStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateTable
CREATE TABLE "courier_advances" (
    "id" TEXT NOT NULL,
    "courierId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "advanceDate" TEXT NOT NULL,
    "note" TEXT,
    "status" "AdvanceStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courier_advances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_invoices" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "invoiceNo" TEXT,
    "invoiceDate" TEXT NOT NULL,
    "periodStart" TEXT,
    "periodEnd" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "note" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'UNPAID',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_payments" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "paymentDate" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" TEXT,
    "note" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_transactions" (
    "id" TEXT NOT NULL,
    "type" "FinanceTransactionType" NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "transactionDate" TEXT NOT NULL,
    "note" TEXT,
    "status" "FinanceTransactionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "courier_advances_courierId_idx" ON "courier_advances"("courierId");

-- CreateIndex
CREATE INDEX "courier_advances_status_idx" ON "courier_advances"("status");

-- CreateIndex
CREATE INDEX "restaurant_invoices_restaurantId_idx" ON "restaurant_invoices"("restaurantId");

-- CreateIndex
CREATE INDEX "restaurant_invoices_status_idx" ON "restaurant_invoices"("status");

-- CreateIndex
CREATE INDEX "restaurant_payments_restaurantId_idx" ON "restaurant_payments"("restaurantId");

-- CreateIndex
CREATE INDEX "restaurant_payments_invoiceId_idx" ON "restaurant_payments"("invoiceId");

-- CreateIndex
CREATE INDEX "restaurant_payments_status_idx" ON "restaurant_payments"("status");

-- CreateIndex
CREATE INDEX "finance_transactions_type_idx" ON "finance_transactions"("type");

-- CreateIndex
CREATE INDEX "finance_transactions_status_idx" ON "finance_transactions"("status");

-- AddForeignKey
ALTER TABLE "courier_advances" ADD CONSTRAINT "courier_advances_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "couriers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_invoices" ADD CONSTRAINT "restaurant_invoices_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_payments" ADD CONSTRAINT "restaurant_payments_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_payments" ADD CONSTRAINT "restaurant_payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "restaurant_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
