-- AlterTable
ALTER TABLE "chat_messages" ADD COLUMN     "file" TEXT,
ADD COLUMN     "image" TEXT,
ALTER COLUMN "message" DROP NOT NULL;
