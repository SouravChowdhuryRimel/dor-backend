-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "InquiryStatus" AS ENUM ('OPEN', 'CLOSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_sub_category_id_fkey";

-- AlterTable
ALTER TABLE "categories" DROP COLUMN "keywords";

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "fcm_token" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ALTER COLUMN "district" DROP NOT NULL,
ALTER COLUMN "upozela" DROP NOT NULL;

-- AlterTable
ALTER TABLE "deliveries" ADD COLUMN     "additional_address" TEXT,
ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "long" DOUBLE PRECISION,
ALTER COLUMN "upozela" DROP NOT NULL,
ALTER COLUMN "district" DROP NOT NULL,
ALTER COLUMN "description" DROP NOT NULL;

-- AlterTable
ALTER TABLE "drivers" ADD COLUMN     "fcm_token" TEXT,
ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "long" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "inquiries" DROP COLUMN "image_url",
ADD COLUMN     "deadline" TIMESTAMP(3),
ADD COLUMN     "image_urls" TEXT[],
ADD COLUMN     "product_name" TEXT,
ADD COLUMN     "quantity" TEXT,
ADD COLUMN     "status" "InquiryStatus" NOT NULL DEFAULT 'OPEN';

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "user_id" TEXT;

-- AlterTable
ALTER TABLE "parties" ADD COLUMN     "additional_address" TEXT,
ADD COLUMN     "fcm_token" TEXT,
ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "long" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "products" ALTER COLUMN "sub_category_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "fcm_token" TEXT;

-- CreateTable
CREATE TABLE "inquiry_responses" (
    "response_id" TEXT NOT NULL,
    "inquiry_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "comment" TEXT,
    "offered_price" DOUBLE PRECISION,
    "product_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inquiry_responses_pkey" PRIMARY KEY ("response_id")
);

-- CreateIndex
CREATE INDEX "inquiry_responses_inquiry_id_idx" ON "inquiry_responses"("inquiry_id");

-- CreateIndex
CREATE INDEX "inquiry_responses_company_id_idx" ON "inquiry_responses"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "inquiry_responses_inquiry_id_company_id_key" ON "inquiry_responses"("inquiry_id", "company_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- AddForeignKey
ALTER TABLE "inquiry_responses" ADD CONSTRAINT "inquiry_responses_inquiry_id_fkey" FOREIGN KEY ("inquiry_id") REFERENCES "inquiries"("inquiry_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiry_responses" ADD CONSTRAINT "inquiry_responses_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("company_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiry_responses" ADD CONSTRAINT "inquiry_responses_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_sub_category_id_fkey" FOREIGN KEY ("sub_category_id") REFERENCES "sub_categories"("sub_category_id") ON DELETE SET NULL ON UPDATE CASCADE;
