-- CreateEnum
CREATE TYPE "WelfareKind" AS ENUM ('FOOD_PARCEL', 'CLOTHING', 'SCHOOL_UNIFORM', 'BLANKETS', 'TOILETRIES', 'CASH_SUPPORT', 'FUNERAL_SUPPORT', 'MEDICAL', 'OTHER');

-- CreateEnum
CREATE TYPE "WelfareStatus" AS ENUM ('PLANNED', 'GIVEN', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ChildAgeGroup" AS ENUM ('NURSERY', 'BEGINNERS', 'PRIMARY', 'JUNIORS', 'ALL_AGES');

-- CreateEnum
CREATE TYPE "ChildrensActivityKind" AS ENUM ('SUNDAY_SCHOOL', 'BIBLE_CLUB', 'HOLIDAY_CLUB', 'OUTING', 'PARTY', 'CONCERT', 'CAMP', 'OTHER');

-- CreateEnum
CREATE TYPE "YouthDivision" AS ENUM ('INTERMEDIATE', 'YOUTH', 'YOUNG_ADULTS', 'MEN');

-- CreateEnum
CREATE TYPE "YouthMeetingKind" AS ENUM ('FELLOWSHIP', 'WORD_STUDY', 'PRAYER', 'OUTREACH', 'SPORTS', 'CAMP', 'CONFERENCE', 'SOCIAL', 'OTHER');

-- CreateEnum
CREATE TYPE "OutreachKind" AS ENUM ('STREET_EVANGELISM', 'DOOR_TO_DOOR', 'OPEN_AIR_CRUSADE', 'HOSPITAL_VISIT', 'PRISON_VISIT', 'SCHOOL_OUTREACH', 'OLD_AGE_HOME', 'COMMUNITY_SERVICE', 'FOOD_DISTRIBUTION', 'REVIVAL', 'FOLLOW_UP_VISITS', 'OTHER');

-- CreateEnum
CREATE TYPE "OutreachStatus" AS ENUM ('PLANNED', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ConsecrationStatus" AS ENUM ('REQUESTED', 'SCHEDULED', 'CONSECRATED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Budget" ADD COLUMN     "departmentId" TEXT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MembershipApplication" ADD COLUMN     "idNumber" TEXT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "leaderName" TEXT,
    "leaderPhone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WelfareGrant" (
    "id" TEXT NOT NULL,
    "kind" "WelfareKind" NOT NULL,
    "status" "WelfareStatus" NOT NULL DEFAULT 'PLANNED',
    "date" TIMESTAMP(3) NOT NULL,
    "memberId" TEXT,
    "recipientName" TEXT,
    "recipientPhone" TEXT,
    "household" TEXT,
    "isMember" BOOLEAN NOT NULL DEFAULT false,
    "items" TEXT NOT NULL,
    "quantity" INTEGER,
    "estimatedValue" DOUBLE PRECISION,
    "authorisedBy" TEXT,
    "eventId" TEXT,
    "confidential" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "recordedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WelfareGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChildrensActivity" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "ChildrensActivityKind" NOT NULL DEFAULT 'SUNDAY_SCHOOL',
    "ageGroup" "ChildAgeGroup" NOT NULL DEFAULT 'ALL_AGES',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "location" TEXT,
    "leader" TEXT,
    "helpers" TEXT,
    "lessonTitle" TEXT,
    "scripture" TEXT,
    "memoryVerse" TEXT,
    "materials" TEXT,
    "expectedChildren" INTEGER,
    "attended" INTEGER,
    "parentNotes" TEXT,
    "notes" TEXT,
    "eventId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChildrensActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YouthMeeting" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "YouthMeetingKind" NOT NULL DEFAULT 'FELLOWSHIP',
    "division" "YouthDivision" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "location" TEXT,
    "leader" TEXT,
    "scripture" TEXT,
    "theme" TEXT,
    "outline" TEXT,
    "questions" TEXT,
    "attended" INTEGER,
    "notes" TEXT,
    "eventId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "YouthMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outreach" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "OutreachKind" NOT NULL,
    "status" "OutreachStatus" NOT NULL DEFAULT 'PLANNED',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "location" TEXT,
    "area" TEXT,
    "leader" TEXT,
    "team" TEXT,
    "teamSize" INTEGER,
    "plan" TEXT,
    "materials" TEXT,
    "estimatedCost" DOUBLE PRECISION,
    "peopleReached" INTEGER,
    "decisions" INTEGER,
    "followUpsDue" INTEGER,
    "report" TEXT,
    "eventId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Outreach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consecration" (
    "id" TEXT NOT NULL,
    "childName" TEXT NOT NULL,
    "childDob" TIMESTAMP(3),
    "childGender" "Gender",
    "fatherName" TEXT,
    "motherName" TEXT,
    "guardianName" TEXT,
    "parentPhone" TEXT,
    "parentMemberId" TEXT,
    "status" "ConsecrationStatus" NOT NULL DEFAULT 'REQUESTED',
    "consecrationDate" TIMESTAMP(3),
    "place" TEXT,
    "officiant" TEXT,
    "scripture" TEXT,
    "witnesses" TEXT,
    "registerNumber" TEXT,
    "certificateIssuedAt" TIMESTAMP(3),
    "certificateIssuedBy" TEXT,
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consecration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE INDEX "WelfareGrant_date_idx" ON "WelfareGrant"("date");

-- CreateIndex
CREATE INDEX "WelfareGrant_memberId_idx" ON "WelfareGrant"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "ChildrensActivity_eventId_key" ON "ChildrensActivity"("eventId");

-- CreateIndex
CREATE INDEX "ChildrensActivity_startsAt_idx" ON "ChildrensActivity"("startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "YouthMeeting_eventId_key" ON "YouthMeeting"("eventId");

-- CreateIndex
CREATE INDEX "YouthMeeting_startsAt_idx" ON "YouthMeeting"("startsAt");

-- CreateIndex
CREATE INDEX "YouthMeeting_division_idx" ON "YouthMeeting"("division");

-- CreateIndex
CREATE UNIQUE INDEX "Outreach_eventId_key" ON "Outreach"("eventId");

-- CreateIndex
CREATE INDEX "Outreach_startsAt_idx" ON "Outreach"("startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Consecration_registerNumber_key" ON "Consecration"("registerNumber");

-- CreateIndex
CREATE INDEX "Consecration_consecrationDate_idx" ON "Consecration"("consecrationDate");

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WelfareGrant" ADD CONSTRAINT "WelfareGrant_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WelfareGrant" ADD CONSTRAINT "WelfareGrant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChildrensActivity" ADD CONSTRAINT "ChildrensActivity_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YouthMeeting" ADD CONSTRAINT "YouthMeeting_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outreach" ADD CONSTRAINT "Outreach_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

