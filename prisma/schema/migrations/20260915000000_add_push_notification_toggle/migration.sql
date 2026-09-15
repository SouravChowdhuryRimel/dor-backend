-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_push_notification_enabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "is_push_notification_enabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "parties" ADD COLUMN IF NOT EXISTS "is_push_notification_enabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "is_push_notification_enabled" BOOLEAN NOT NULL DEFAULT true;
