-- CreateTable
CREATE TABLE "SwiftCode" (
    "swiftCode" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "address" TEXT,
    "countryName" TEXT NOT NULL,
    "countryISO2" TEXT NOT NULL,
    "isHeadquarter" BOOLEAN NOT NULL,
    "headquarterIdentifier" TEXT NOT NULL,

    CONSTRAINT "SwiftCode_pkey" PRIMARY KEY ("swiftCode")
);

-- CreateIndex
CREATE UNIQUE INDEX "SwiftCode_swiftCode_key" ON "SwiftCode"("swiftCode");

-- CreateIndex
CREATE INDEX "SwiftCode_countryISO2_idx" ON "SwiftCode"("countryISO2");

-- CreateIndex
CREATE INDEX "SwiftCode_headquarterIdentifier_idx" ON "SwiftCode"("headquarterIdentifier");

-- CreateIndex
CREATE INDEX "SwiftCode_isHeadquarter_idx" ON "SwiftCode"("isHeadquarter");
