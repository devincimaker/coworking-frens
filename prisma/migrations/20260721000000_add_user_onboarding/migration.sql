-- Add first-run profile fields.
ALTER TABLE "User" ADD COLUMN "username" TEXT;
ALTER TABLE "User" ADD COLUMN "bio" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN "onboardedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
