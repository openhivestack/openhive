-- AlterTable
ALTER TABLE "agentVersion" ADD COLUMN     "capabilities" JSONB,
ADD COLUMN     "instructions" TEXT,
ADD COLUMN     "prompts" JSONB,
ADD COLUMN     "skills" JSONB,
ADD COLUMN     "tools" JSONB;

-- CreateTable
CREATE TABLE "agentProfile" (
    "id" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "displayName" TEXT,
    "description" TEXT,
    "image" TEXT,
    "tags" TEXT[],
    "homepage" TEXT,
    "repository" TEXT,
    "onChainId" TEXT,
    "onChainRegistry" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agentProfile_agentName_key" ON "agentProfile"("agentName");

-- AddForeignKey
ALTER TABLE "agentProfile" ADD CONSTRAINT "agentProfile_agentName_fkey" FOREIGN KEY ("agentName") REFERENCES "agent"("name") ON DELETE CASCADE ON UPDATE CASCADE;
