-- AlterTable
ALTER TABLE "AvailabilityRule" ADD COLUMN     "audienceKind" TEXT NOT NULL DEFAULT 'friends';

-- AlterTable
ALTER TABLE "CoworkDay" ADD COLUMN     "audienceKind" TEXT NOT NULL DEFAULT 'friends';

-- CreateIndex
CREATE INDEX "Friendship_bId_idx" ON "Friendship"("bId");
