-- AlterEnum: drop the unused RETIRED value by recreating the type.
BEGIN;
CREATE TYPE "MotorcycleStatus_new" AS ENUM ('IN_STOCK', 'ASSIGNED', 'SOLD');
ALTER TABLE "motorcycles" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "motorcycles" ALTER COLUMN "status" TYPE "MotorcycleStatus_new" USING ("status"::text::"MotorcycleStatus_new");
ALTER TYPE "MotorcycleStatus" RENAME TO "MotorcycleStatus_old";
ALTER TYPE "MotorcycleStatus_new" RENAME TO "MotorcycleStatus";
DROP TYPE "MotorcycleStatus_old";
ALTER TABLE "motorcycles" ALTER COLUMN "status" SET DEFAULT 'IN_STOCK';
COMMIT;
