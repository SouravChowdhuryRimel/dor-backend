ALTER TABLE "parties"
ADD COLUMN "company_id" TEXT,
ADD COLUMN "is_verified" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "drivers"
ADD COLUMN "company_id" TEXT,
ADD COLUMN "is_verified" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "parties"
ADD CONSTRAINT "parties_company_id_fkey"
FOREIGN KEY ("company_id") REFERENCES "companies"("company_id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "drivers"
ADD CONSTRAINT "drivers_company_id_fkey"
FOREIGN KEY ("company_id") REFERENCES "companies"("company_id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "parties_company_id_idx" ON "parties"("company_id");
CREATE INDEX "drivers_company_id_idx" ON "drivers"("company_id");
