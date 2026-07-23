ALTER TABLE "drivers"
DROP CONSTRAINT "drivers_category_id_fkey",
DROP COLUMN "category_id";

CREATE TABLE "company_drivers" (
    "company_id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_drivers_pkey" PRIMARY KEY ("company_id", "driver_id")
);

CREATE TABLE "party_drivers" (
    "party_id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "party_drivers_pkey" PRIMARY KEY ("party_id", "driver_id")
);

CREATE INDEX "company_drivers_driver_id_idx" ON "company_drivers"("driver_id");
CREATE INDEX "party_drivers_driver_id_idx" ON "party_drivers"("driver_id");

ALTER TABLE "company_drivers"
ADD CONSTRAINT "company_drivers_company_id_fkey"
FOREIGN KEY ("company_id") REFERENCES "companies"("company_id")
ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "company_drivers_driver_id_fkey"
FOREIGN KEY ("driver_id") REFERENCES "drivers"("driver_id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "party_drivers"
ADD CONSTRAINT "party_drivers_party_id_fkey"
FOREIGN KEY ("party_id") REFERENCES "parties"("party_id")
ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "party_drivers_driver_id_fkey"
FOREIGN KEY ("driver_id") REFERENCES "drivers"("driver_id")
ON DELETE CASCADE ON UPDATE CASCADE;
