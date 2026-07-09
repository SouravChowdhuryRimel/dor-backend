/*
  Warnings:

  - A unique constraint covering the columns `[phone_number]` on the table `parties` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `password` to the `parties` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "parties" ADD COLUMN     "password" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "parties_phone_number_key" ON "parties"("phone_number");
