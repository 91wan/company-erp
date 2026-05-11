CREATE TYPE "PartyType" AS ENUM ('supplier', 'client', 'subcontractor', 'operator');
CREATE TYPE "ProjectSiteServiceMode" AS ENUM ('direct', 'subcontracted');

CREATE TABLE "parties" (
  "id" UUID NOT NULL,
  "party_code" TEXT NOT NULL,
  "party_name" TEXT NOT NULL,
  "party_types" "PartyType"[] NOT NULL,
  "unified_social_credit_code" TEXT,
  "primary_contact_name" TEXT,
  "primary_contact_phone" TEXT,
  "supply_category" TEXT,
  "common_materials" TEXT,
  "address" TEXT,
  "settlement_notes" TEXT,
  "status" "BaseStatus" NOT NULL DEFAULT 'enabled',
  "remark" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "parties_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "parties_party_code_key" ON "parties"("party_code");
CREATE UNIQUE INDEX "parties_unified_social_credit_code_key" ON "parties"("unified_social_credit_code");
CREATE INDEX "parties_status_idx" ON "parties"("status");
CREATE INDEX "parties_party_name_idx" ON "parties"("party_name");

ALTER TABLE "materials" ADD COLUMN "default_supplier_party_id" UUID;
CREATE INDEX "materials_default_supplier_party_id_idx" ON "materials"("default_supplier_party_id");

ALTER TABLE "materials"
  ADD CONSTRAINT "materials_default_supplier_party_id_fkey"
  FOREIGN KEY ("default_supplier_party_id") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "project_sites"
  ADD COLUMN "client_party_id" UUID,
  ADD COLUMN "operator_party_id" UUID,
  ADD COLUMN "service_mode" "ProjectSiteServiceMode" NOT NULL DEFAULT 'direct',
  ADD COLUMN "subcontractor_party_id" UUID,
  ADD COLUMN "site_address" TEXT,
  ADD COLUMN "service_type" TEXT,
  ADD COLUMN "client_contact_name" TEXT,
  ADD COLUMN "client_contact_phone" TEXT,
  ADD COLUMN "subcontractor_contact_name" TEXT,
  ADD COLUMN "subcontractor_contact_phone" TEXT;

CREATE INDEX "project_sites_client_party_id_idx" ON "project_sites"("client_party_id");
CREATE INDEX "project_sites_operator_party_id_idx" ON "project_sites"("operator_party_id");
CREATE INDEX "project_sites_subcontractor_party_id_idx" ON "project_sites"("subcontractor_party_id");

ALTER TABLE "project_sites"
  ADD CONSTRAINT "project_sites_client_party_id_fkey"
  FOREIGN KEY ("client_party_id") REFERENCES "parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "project_sites"
  ADD CONSTRAINT "project_sites_operator_party_id_fkey"
  FOREIGN KEY ("operator_party_id") REFERENCES "parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "project_sites"
  ADD CONSTRAINT "project_sites_subcontractor_party_id_fkey"
  FOREIGN KEY ("subcontractor_party_id") REFERENCES "parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
