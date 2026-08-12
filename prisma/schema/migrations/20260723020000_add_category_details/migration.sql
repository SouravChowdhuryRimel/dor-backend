CREATE TYPE "CategoryStatus" AS ENUM ('ACTIVE', 'INACTIVE');

ALTER TABLE "categories"
RENAME COLUMN "title" TO "category_name";

ALTER TABLE "categories"
ADD COLUMN "category_thumbnail" TEXT,
ADD COLUMN "status" "CategoryStatus" NOT NULL DEFAULT 'ACTIVE';
