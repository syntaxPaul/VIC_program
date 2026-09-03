-- CreateTable
CREATE TABLE "Receipt18A" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "receiptNumber" TEXT NOT NULL,
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuedBy" TEXT,
    "memberId" TEXT,
    "donorName" TEXT NOT NULL,
    "donorNature" TEXT NOT NULL DEFAULT 'NATURAL_PERSON',
    "donorIdType" TEXT,
    "donorIdCountry" TEXT NOT NULL DEFAULT 'South Africa',
    "donorIdNumber" TEXT,
    "donorTaxRef" TEXT,
    "donorAddress" TEXT,
    "donorPhone" TEXT,
    "donorEmail" TEXT,
    "donorTradingName" TEXT,
    "donationDate" DATETIME NOT NULL,
    "amount" REAL NOT NULL,
    "isInKind" BOOLEAN NOT NULL DEFAULT false,
    "inKindDescription" TEXT,
    "inKindFairValue" REAL,
    "fundId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'Used solely in carrying on the public benefit activities of the organisation.',
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "cancelledReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Receipt18A_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Receipt18A_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "Fund" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Receipt18A_receiptNumber_key" ON "Receipt18A"("receiptNumber");

-- CreateIndex
CREATE INDEX "Receipt18A_donationDate_idx" ON "Receipt18A"("donationDate");

-- CreateIndex
CREATE INDEX "Receipt18A_memberId_idx" ON "Receipt18A"("memberId");
