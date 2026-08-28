-- CreateEnum
CREATE TYPE "PackagingType" AS ENUM ('BAG', 'CARTON', 'BOX', 'BOTTLE', 'DRUM', 'CONTAINER', 'BUNDLE', 'PACK', 'PIECE');

-- CreateEnum
CREATE TYPE "UnitType" AS ENUM ('GRAM', 'KILOGRAM', 'TON', 'MILLILITER', 'LITER', 'PIECE', 'PACK', 'DOZEN', 'PAIR', 'SET', 'BUNDLE');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "packaging_type" "PackagingType" NOT NULL DEFAULT 'PIECE',
ADD COLUMN     "unit_type" "UnitType" NOT NULL DEFAULT 'PIECE';
