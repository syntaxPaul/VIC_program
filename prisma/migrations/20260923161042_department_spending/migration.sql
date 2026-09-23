-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "departmentId" TEXT;

-- CreateIndex
CREATE INDEX "Transaction_departmentId_idx" ON "Transaction"("departmentId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

