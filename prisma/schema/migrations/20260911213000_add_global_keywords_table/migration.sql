-- CreateTable
CREATE TABLE IF NOT EXISTS "keywords" (
    "keyword_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "keywords_pkey" PRIMARY KEY ("keyword_id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "keywords_name_key" ON "keywords"("name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "keywords_name_idx" ON "keywords"("name");
