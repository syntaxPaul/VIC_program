-- The church is one congregation, not a branch of one, so the field is gone
-- from every screen and every printed document. Dropping the column keeps
-- the schema honest about that.
ALTER TABLE "Settings" DROP COLUMN "branchName";
