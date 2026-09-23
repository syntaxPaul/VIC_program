-- Clearing the handled list hides it from the office, it does not delete the
-- decision, which the church has to be able to show.
ALTER TABLE "MembershipApplication" ADD COLUMN "clearedAt" TIMESTAMP(3);
