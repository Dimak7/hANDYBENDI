CREATE TYPE "ApplicantStatus" AS ENUM ('NEW', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED', 'WITHDRAWN');
CREATE TABLE "HiringOpening" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "requiredSkills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "minimumYears" INTEGER NOT NULL DEFAULT 0 CHECK ("minimumYears" BETWEEN 0 AND 60),
  "requiredAvailability" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "Applicant" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "openingId" TEXT NOT NULL REFERENCES "HiringOpening"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "skills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "relevantYears" INTEGER NOT NULL DEFAULT 0 CHECK ("relevantYears" BETWEEN 0 AND 60),
  "availability" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "experience" TEXT NOT NULL,
  "resumeText" TEXT NOT NULL DEFAULT '',
  "source" TEXT NOT NULL DEFAULT 'Office entry',
  "notes" TEXT NOT NULL DEFAULT '',
  "status" "ApplicantStatus" NOT NULL DEFAULT 'NEW',
  "version" INTEGER NOT NULL DEFAULT 0 CHECK ("version" >= 0),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  UNIQUE ("openingId", "email")
);
CREATE INDEX "Applicant_openingId_status_idx" ON "Applicant"("openingId", "status");
