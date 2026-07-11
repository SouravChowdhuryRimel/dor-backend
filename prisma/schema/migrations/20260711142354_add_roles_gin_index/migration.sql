-- CreateIndex
CREATE INDEX "users_roles_idx" ON "users" USING GIN ("roles");
