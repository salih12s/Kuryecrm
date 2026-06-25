-- Soft delete for restaurants and couriers: keep the row (and its shifts /
-- finance history) so reports are not affected when a record is "deleted".
ALTER TABLE "restaurants" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "couriers" ADD COLUMN "deletedAt" TIMESTAMP(3);
