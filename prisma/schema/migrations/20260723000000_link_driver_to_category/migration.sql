ALTER TABLE "drivers"
DROP CONSTRAINT "drivers_company_id_fkey",
DROP COLUMN "company_id",
ADD COLUMN "category_id" TEXT;

CREATE INDEX "drivers_category_id_idx" ON "drivers"("category_id");

ALTER TABLE "drivers"
ADD CONSTRAINT "drivers_category_id_fkey"
FOREIGN KEY ("category_id") REFERENCES "categories"("category_id")
ON DELETE SET NULL ON UPDATE CASCADE;
