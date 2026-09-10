/*
  Warnings:

  - You are about to drop the column `category_id` on the `drivers` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "drivers" DROP CONSTRAINT "drivers_category_id_fkey";

-- DropIndex
DROP INDEX "drivers_category_id_idx";

-- AlterTable
ALTER TABLE "drivers" DROP COLUMN "category_id";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "profile_image" TEXT;
