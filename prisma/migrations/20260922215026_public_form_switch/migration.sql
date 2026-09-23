-- A switch the office can reach if the public link is ever abused.
ALTER TABLE "Settings" ADD COLUMN "publicFormOpen" BOOLEAN NOT NULL DEFAULT true;
