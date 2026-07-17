-- AlterTable
ALTER TABLE "users" ADD COLUMN "phone_number" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_number_key" ON "users"("phone_number");
