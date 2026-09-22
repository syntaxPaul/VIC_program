-- CreateEnum
CREATE TYPE "NoteCategory" AS ENUM ('GENERAL', 'SERMON', 'MEETING', 'VISIT', 'PRAYER', 'FOLLOW_UP');

-- CreateTable
CREATE TABLE "PastoralNote" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" "NoteCategory" NOT NULL DEFAULT 'GENERAL',
    "noteDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confidential" BOOLEAN NOT NULL DEFAULT false,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT,
    "authorId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PastoralNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PastoralNote_noteDate_idx" ON "PastoralNote"("noteDate");

-- CreateIndex
CREATE INDEX "PastoralNote_authorId_idx" ON "PastoralNote"("authorId");

-- CreateIndex
CREATE INDEX "PastoralNote_category_idx" ON "PastoralNote"("category");

-- AddForeignKey
ALTER TABLE "PastoralNote" ADD CONSTRAINT "PastoralNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
