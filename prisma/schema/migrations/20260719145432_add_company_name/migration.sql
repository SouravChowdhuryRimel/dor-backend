/*
  Warnings:

  - Added the required column `company_name` to the `companies` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "company_name" TEXT NOT NULL DEFAULT 'Default Company';

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;
