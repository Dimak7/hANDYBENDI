CREATE TABLE "LeadPhoto" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "leadId" TEXT NOT NULL REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "storageKey" TEXT NOT NULL UNIQUE,
  "backend" TEXT NOT NULL CHECK ("backend" IN ('LOCAL', 'S3')),
  "size" INTEGER NOT NULL CHECK ("size" > 0 AND "size" <= 5242880),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "LeadPhoto_leadId_idx" ON "LeadPhoto"("leadId");
