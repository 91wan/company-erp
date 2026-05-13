-- Rename the external project manager login identity to a project-site external account.
ALTER TYPE "RoleCode" RENAME VALUE 'external_project_manager' TO 'external_project_site';

UPDATE "user_role_assignments"
SET "role" = 'external_project_site'
WHERE "role"::text = 'external_project_manager';

ALTER TYPE "CertificateType" ADD VALUE IF NOT EXISTS 'employer_liability_insurance';

ALTER TABLE "project_sites"
  ADD COLUMN "payroll_agency_required" BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TYPE "ProjectSiteRosterWorkerType" AS ENUM ('direct_site_staff', 'subcontractor_site_staff');
CREATE TYPE "ProjectSiteRosterStatus" AS ENUM ('active', 'left');
CREATE TYPE "ProjectSiteComplianceReviewStatus" AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE "project_site_roster_people" (
  "id" UUID NOT NULL,
  "project_site_id" UUID NOT NULL,
  "person_name" TEXT NOT NULL,
  "phone" TEXT,
  "identity_no_last4" TEXT,
  "worker_type" "ProjectSiteRosterWorkerType" NOT NULL,
  "job_role" TEXT,
  "start_date" DATE,
  "end_date" DATE,
  "status" "ProjectSiteRosterStatus" NOT NULL DEFAULT 'active',
  "source_attachment_path" TEXT,
  "remark" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "project_site_roster_people_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project_site_employer_liability_insurance_policies" (
  "id" UUID NOT NULL,
  "project_site_id" UUID NOT NULL,
  "policy_no" TEXT NOT NULL,
  "insurer_name" TEXT NOT NULL,
  "start_date" DATE NOT NULL,
  "end_date" DATE NOT NULL,
  "attachment_path" TEXT,
  "review_status" "ProjectSiteComplianceReviewStatus" NOT NULL DEFAULT 'pending',
  "reviewed_by_employee_id" UUID,
  "reviewed_at" TIMESTAMP(3),
  "remark" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "project_site_employer_liability_insurance_policies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project_site_employer_liability_insurance_covered_people" (
  "id" UUID NOT NULL,
  "policy_id" UUID NOT NULL,
  "roster_person_id" UUID,
  "covered_name_snapshot" TEXT NOT NULL,
  "identity_no_last4_snapshot" TEXT,
  "remark" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "project_site_employer_liability_insurance_covered_people_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project_site_payroll_submissions" (
  "id" UUID NOT NULL,
  "project_site_id" UUID NOT NULL,
  "payroll_month" TEXT NOT NULL,
  "attachment_path" TEXT NOT NULL,
  "submitted_by" TEXT,
  "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "review_status" "ProjectSiteComplianceReviewStatus" NOT NULL DEFAULT 'pending',
  "reviewed_by_employee_id" UUID,
  "reviewed_at" TIMESTAMP(3),
  "remark" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "project_site_payroll_submissions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "certificate_records"
  ADD COLUMN "owner_roster_person_id" UUID;

CREATE UNIQUE INDEX "project_site_employer_liability_insurance_policies_policy_no_key"
  ON "project_site_employer_liability_insurance_policies"("policy_no");
CREATE UNIQUE INDEX "project_site_payroll_submissions_project_site_id_payroll_month_key"
  ON "project_site_payroll_submissions"("project_site_id", "payroll_month");
CREATE INDEX "project_site_roster_people_project_site_id_idx" ON "project_site_roster_people"("project_site_id");
CREATE INDEX "project_site_roster_people_status_idx" ON "project_site_roster_people"("status");
CREATE INDEX "project_site_roster_people_worker_type_idx" ON "project_site_roster_people"("worker_type");
CREATE INDEX "project_site_employer_liability_insurance_policies_project_site_id_idx" ON "project_site_employer_liability_insurance_policies"("project_site_id");
CREATE INDEX "project_site_employer_liability_insurance_policies_end_date_idx" ON "project_site_employer_liability_insurance_policies"("end_date");
CREATE INDEX "project_site_employer_liability_insurance_policies_review_status_idx" ON "project_site_employer_liability_insurance_policies"("review_status");
CREATE INDEX "project_site_employer_liability_insurance_covered_people_policy_id_idx" ON "project_site_employer_liability_insurance_covered_people"("policy_id");
CREATE INDEX "project_site_employer_liability_insurance_covered_people_roster_person_id_idx" ON "project_site_employer_liability_insurance_covered_people"("roster_person_id");
CREATE INDEX "project_site_payroll_submissions_review_status_idx" ON "project_site_payroll_submissions"("review_status");
CREATE INDEX "certificate_records_owner_roster_person_id_idx" ON "certificate_records"("owner_roster_person_id");

ALTER TABLE "project_site_roster_people"
  ADD CONSTRAINT "project_site_roster_people_project_site_id_fkey"
  FOREIGN KEY ("project_site_id") REFERENCES "project_sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_site_employer_liability_insurance_policies"
  ADD CONSTRAINT "project_site_employer_liability_insurance_policies_project_site_id_fkey"
  FOREIGN KEY ("project_site_id") REFERENCES "project_sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_site_employer_liability_insurance_policies"
  ADD CONSTRAINT "project_site_employer_liability_insurance_policies_reviewed_by_employee_id_fkey"
  FOREIGN KEY ("reviewed_by_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "project_site_employer_liability_insurance_covered_people"
  ADD CONSTRAINT "project_site_employer_liability_insurance_covered_people_policy_id_fkey"
  FOREIGN KEY ("policy_id") REFERENCES "project_site_employer_liability_insurance_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_site_employer_liability_insurance_covered_people"
  ADD CONSTRAINT "project_site_employer_liability_insurance_covered_people_roster_person_id_fkey"
  FOREIGN KEY ("roster_person_id") REFERENCES "project_site_roster_people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "project_site_payroll_submissions"
  ADD CONSTRAINT "project_site_payroll_submissions_project_site_id_fkey"
  FOREIGN KEY ("project_site_id") REFERENCES "project_sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_site_payroll_submissions"
  ADD CONSTRAINT "project_site_payroll_submissions_reviewed_by_employee_id_fkey"
  FOREIGN KEY ("reviewed_by_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "certificate_records"
  ADD CONSTRAINT "certificate_records_owner_roster_person_id_fkey"
  FOREIGN KEY ("owner_roster_person_id") REFERENCES "project_site_roster_people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "external_project_manager_accounts"
  RENAME TO "project_site_external_accounts";

ALTER TABLE "project_site_external_accounts"
  RENAME COLUMN "manager_name" TO "current_contact_name";

ALTER TABLE "project_site_external_accounts"
  RENAME COLUMN "manager_phone" TO "current_contact_phone";

ALTER INDEX "external_project_manager_accounts_user_account_id_key"
  RENAME TO "project_site_external_accounts_user_account_id_key";

ALTER INDEX "external_project_manager_accounts_active_project_site_key"
  RENAME TO "project_site_external_accounts_active_project_site_key";

ALTER INDEX "external_project_manager_accounts_project_site_id_idx"
  RENAME TO "project_site_external_accounts_project_site_id_idx";

ALTER INDEX "external_project_manager_accounts_subcontractor_party_id_idx"
  RENAME TO "project_site_external_accounts_subcontractor_party_id_idx";

ALTER INDEX "external_project_manager_accounts_status_idx"
  RENAME TO "project_site_external_accounts_status_idx";
