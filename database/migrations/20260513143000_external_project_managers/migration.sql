-- Extend parties to support company/individual subcontractors.
CREATE TYPE "PartyEntityType" AS ENUM ('company', 'individual');

ALTER TYPE "RoleCode" ADD VALUE IF NOT EXISTS 'external_project_manager';

ALTER TABLE "parties"
  ADD COLUMN "entity_type" "PartyEntityType" NOT NULL DEFAULT 'company',
  ADD COLUMN "identity_no_encrypted" TEXT,
  ADD COLUMN "identity_no_last4" TEXT;

CREATE INDEX "parties_entity_type_idx" ON "parties"("entity_type");

-- External project managers are login identities, not internal employees.
CREATE TABLE "external_project_manager_accounts" (
  "id" UUID NOT NULL,
  "user_account_id" UUID NOT NULL,
  "project_site_id" UUID NOT NULL,
  "subcontractor_party_id" UUID,
  "manager_name" TEXT NOT NULL,
  "manager_phone" TEXT NOT NULL,
  "status" "UserAccountStatus" NOT NULL DEFAULT 'active',
  "start_date" DATE,
  "end_date" DATE,
  "remark" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "external_project_manager_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "external_project_manager_accounts_user_account_id_key"
  ON "external_project_manager_accounts"("user_account_id");
CREATE UNIQUE INDEX "external_project_manager_accounts_active_project_site_key"
  ON "external_project_manager_accounts"("project_site_id")
  WHERE "status" = 'active';
CREATE INDEX "external_project_manager_accounts_project_site_id_idx"
  ON "external_project_manager_accounts"("project_site_id");
CREATE INDEX "external_project_manager_accounts_subcontractor_party_id_idx"
  ON "external_project_manager_accounts"("subcontractor_party_id");
CREATE INDEX "external_project_manager_accounts_status_idx"
  ON "external_project_manager_accounts"("status");

ALTER TABLE "external_project_manager_accounts"
  ADD CONSTRAINT "external_project_manager_accounts_user_account_id_fkey"
  FOREIGN KEY ("user_account_id") REFERENCES "user_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "external_project_manager_accounts"
  ADD CONSTRAINT "external_project_manager_accounts_project_site_id_fkey"
  FOREIGN KEY ("project_site_id") REFERENCES "project_sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "external_project_manager_accounts"
  ADD CONSTRAINT "external_project_manager_accounts_subcontractor_party_id_fkey"
  FOREIGN KEY ("subcontractor_party_id") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Preserve the submitter identity as immutable snapshots on usage requests.
ALTER TABLE "project_usage_requests"
  ADD COLUMN "submitted_by_account_id" UUID,
  ADD COLUMN "submitted_by_name_snapshot" TEXT,
  ADD COLUMN "submitted_by_phone_snapshot" TEXT;

CREATE INDEX "project_usage_requests_submitted_by_account_id_idx"
  ON "project_usage_requests"("submitted_by_account_id");

ALTER TABLE "project_usage_requests"
  ADD CONSTRAINT "project_usage_requests_submitted_by_account_id_fkey"
  FOREIGN KEY ("submitted_by_account_id") REFERENCES "external_project_manager_accounts"("user_account_id") ON DELETE SET NULL ON UPDATE CASCADE;
