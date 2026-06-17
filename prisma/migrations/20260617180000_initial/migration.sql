CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE "Lead" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "source" TEXT NOT NULL,
  "externalId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "url" TEXT,
  "rawPayload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Lead_source_idx" ON "Lead"("source");
CREATE UNIQUE INDEX "Lead_source_externalId_key" ON "Lead"("source", "externalId");
