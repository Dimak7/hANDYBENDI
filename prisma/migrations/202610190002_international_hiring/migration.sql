ALTER TABLE "HiringOpening"
 ADD COLUMN "country" TEXT NOT NULL DEFAULT 'US',
 ADD COLUMN "city" TEXT NOT NULL DEFAULT 'Chicago',
 ADD COLUMN "workplace" TEXT NOT NULL DEFAULT 'ONSITE',
 ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD',
 ADD COLUMN "salaryMin" INTEGER,
 ADD COLUMN "salaryMax" INTEGER,
 ADD COLUMN "salaryPeriod" TEXT NOT NULL DEFAULT 'HOUR',
 ADD COLUMN "language" TEXT NOT NULL DEFAULT 'en',
 ADD COLUMN "questions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
 ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Applicant"
 ADD COLUMN "country" TEXT NOT NULL DEFAULT 'US',
 ADD COLUMN "city" TEXT NOT NULL DEFAULT '',
 ADD COLUMN "answers" JSONB NOT NULL DEFAULT '{}',
 ADD COLUMN "consentAt" TIMESTAMPTZ(3);
ALTER TABLE "HiringOpening" ADD CONSTRAINT "hiring_salary_range" CHECK ("salaryMin" IS NULL OR "salaryMin" >= 0);
ALTER TABLE "HiringOpening" ADD CONSTRAINT "hiring_salary_max" CHECK ("salaryMax" IS NULL OR ("salaryMax" >= 0 AND ("salaryMin" IS NULL OR "salaryMax" >= "salaryMin")));
