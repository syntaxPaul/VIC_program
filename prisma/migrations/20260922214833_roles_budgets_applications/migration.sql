-- Two more church offices.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'DISCIPLESHIP';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'EVANGELIST';

-- A budget is now proposed and then approved, and records what it was based on.
CREATE TYPE "BudgetStatus" AS ENUM ('DRAFT', 'APPROVED');
ALTER TABLE "Budget"
  ADD COLUMN "status" "BudgetStatus" NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN "basedOnYearStart" TIMESTAMP(3),
  ADD COLUMN "upliftPercent" DOUBLE PRECISION,
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "approvedBy" TEXT,
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Membership forms filled in from the public link.
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'HELD_DUPLICATE', 'ACCEPTED', 'MERGED', 'DECLINED');

CREATE TABLE "MembershipApplication" (
  "id" TEXT NOT NULL,
  "surname" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "dob" TIMESTAMP(3),
  "gender" "Gender",
  "maritalStatus" "MaritalStatus",
  "addressLine" TEXT,
  "city" TEXT,
  "province" TEXT,
  "postalCode" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "children" TEXT,
  "salvationDate" TIMESTAMP(3),
  "baptismDate" TIMESTAMP(3),
  "previousChurch" TEXT,
  "previousChurchLocation" TEXT,
  "prayerRequests" TEXT,
  "interestedIn" TEXT,
  "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
  "possibleDuplicateOfId" TEXT,
  "duplicateReason" TEXT,
  "sourceHash" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewedBy" TEXT,
  "reviewNote" TEXT,
  "createdMemberId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MembershipApplication_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MembershipApplication_status_idx" ON "MembershipApplication"("status");
CREATE INDEX "MembershipApplication_createdAt_idx" ON "MembershipApplication"("createdAt");
CREATE INDEX "MembershipApplication_sourceHash_createdAt_idx" ON "MembershipApplication"("sourceHash", "createdAt");

ALTER TABLE "MembershipApplication"
  ADD CONSTRAINT "MembershipApplication_possibleDuplicateOfId_fkey"
  FOREIGN KEY ("possibleDuplicateOfId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
