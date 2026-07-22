-- AlterTable
ALTER TABLE "Alert" ADD COLUMN     "acknowledgedAt" TIMESTAMP(3),
ADD COLUMN     "acknowledgedBy" TEXT;

-- AlterTable
ALTER TABLE "Target" ADD COLUMN     "isMilestone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "locationId" TEXT,
ADD COLUMN     "progressPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "wbsParentId" TEXT;

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "address" TEXT,
    "timezone" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TargetDependency" (
    "id" TEXT NOT NULL,
    "predecessorId" TEXT NOT NULL,
    "successorId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'FS',
    "lagDays" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TargetDependency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TargetBaseline" (
    "id" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "baselineStart" TIMESTAMP(3) NOT NULL,
    "baselineEnd" TIMESTAMP(3) NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "label" TEXT NOT NULL,

    CONSTRAINT "TargetBaseline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyReport" (
    "id" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pdfPath" TEXT NOT NULL,
    "summary" JSONB NOT NULL,

    CONSTRAINT "WeeklyReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Location_name_key" ON "Location"("name");

-- AddForeignKey
ALTER TABLE "Target" ADD CONSTRAINT "Target_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Target" ADD CONSTRAINT "Target_wbsParentId_fkey" FOREIGN KEY ("wbsParentId") REFERENCES "Target"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TargetDependency" ADD CONSTRAINT "TargetDependency_predecessorId_fkey" FOREIGN KEY ("predecessorId") REFERENCES "Target"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TargetDependency" ADD CONSTRAINT "TargetDependency_successorId_fkey" FOREIGN KEY ("successorId") REFERENCES "Target"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TargetBaseline" ADD CONSTRAINT "TargetBaseline_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Target"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Target"("id") ON DELETE CASCADE ON UPDATE CASCADE;
