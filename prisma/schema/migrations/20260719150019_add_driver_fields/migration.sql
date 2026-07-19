/*
  Warnings:

  - Added the required column `address` to the `drivers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `district` to the `drivers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `driver_name` to the `drivers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `driving_licence_number` to the `drivers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nid_number` to the `drivers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `upozela` to the `drivers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "drivers" ADD COLUMN     "address" TEXT NOT NULL,
ADD COLUMN     "district" TEXT NOT NULL,
ADD COLUMN     "driver_image" TEXT,
ADD COLUMN     "driver_name" TEXT NOT NULL,
ADD COLUMN     "driving_licence_number" TEXT NOT NULL,
ADD COLUMN     "load_capacity" TEXT,
ADD COLUMN     "nid_number" TEXT NOT NULL,
ADD COLUMN     "truck_number" TEXT,
ADD COLUMN     "truck_type" TEXT,
ADD COLUMN     "upozela" TEXT NOT NULL;
