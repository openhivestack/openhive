-- AlterTable
ALTER TABLE "agent" ADD COLUMN     "verificationStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
ADD COLUMN     "verifiedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "agent_verificationStatus_idx" ON "agent"("verificationStatus");
