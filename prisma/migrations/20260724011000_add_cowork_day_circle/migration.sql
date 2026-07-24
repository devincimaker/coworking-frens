-- AlterTable
ALTER TABLE "CoworkDay" ADD COLUMN "circleId" TEXT;

-- Backfill recurring days from their availability rule.
UPDATE "CoworkDay"
SET "circleId" = "AvailabilityRule"."circleId"
FROM "AvailabilityRule"
WHERE "CoworkDay"."ruleId" = "AvailabilityRule"."id"
  AND "AvailabilityRule"."circleId" IS NOT NULL;

-- CreateIndex
CREATE INDEX "CoworkDay_circleId_idx" ON "CoworkDay"("circleId");

-- AddForeignKey
ALTER TABLE "CoworkDay" ADD CONSTRAINT "CoworkDay_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
