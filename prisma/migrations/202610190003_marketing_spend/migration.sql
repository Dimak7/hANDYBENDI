CREATE TABLE "MarketingSpend" (
 "id" TEXT NOT NULL,
 "source" TEXT NOT NULL,
 "campaign" TEXT NOT NULL DEFAULT '',
 "spentOn" DATE NOT NULL,
 "amountCents" INTEGER NOT NULL,
 "note" TEXT NOT NULL DEFAULT '',
 "submissionKey" TEXT NOT NULL,
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "MarketingSpend_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "MarketingSpend_nonnegative" CHECK ("amountCents" >= 0)
);
CREATE UNIQUE INDEX "MarketingSpend_submissionKey_key" ON "MarketingSpend"("submissionKey");
CREATE INDEX "MarketingSpend_spentOn_source_campaign_idx" ON "MarketingSpend"("spentOn", "source", "campaign");
