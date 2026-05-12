CREATE TYPE "CertificateType" AS ENUM (
  'person_health_cert',
  'business_license',
  'food_operation_license',
  'project_site_license',
  'supplier_qualification',
  'management_system_cert',
  'food_safety_cert',
  'credit_rating_cert',
  'honor_cert',
  'bank_account_permit',
  'contract_qualification_file',
  'other'
);

CREATE TYPE "CertificateOwnerType" AS ENUM (
  'person',
  'project_site',
  'supplier',
  'company'
);

CREATE TYPE "CertificateValidityType" AS ENUM (
  'fixed_expiry',
  'long_term',
  'no_expiry_visible'
);

CREATE TABLE "certificate_records" (
  "id" UUID NOT NULL,
  "certificate_code" TEXT NOT NULL,
  "certificate_name" TEXT NOT NULL,
  "certificate_type" "CertificateType" NOT NULL,
  "owner_type" "CertificateOwnerType" NOT NULL,
  "owner_employee_id" UUID,
  "owner_project_site_id" UUID,
  "owner_party_id" UUID,
  "owner_name_snapshot" TEXT NOT NULL,
  "certificate_number" TEXT,
  "issuing_authority" TEXT,
  "certificate_scope" TEXT,
  "issue_date" DATE,
  "validity_type" "CertificateValidityType" NOT NULL,
  "expiry_date" DATE,
  "next_review_date" DATE,
  "reminder_days" INTEGER NOT NULL DEFAULT 30,
  "is_compliance_critical" BOOLEAN NOT NULL DEFAULT false,
  "attachment_path" TEXT,
  "source_file_path" TEXT,
  "source_page_no" INTEGER,
  "responsible_employee_id" UUID,
  "confirmed_by_employee_id" UUID,
  "confirmed_at" TIMESTAMP(3),
  "is_disabled" BOOLEAN NOT NULL DEFAULT false,
  "remark" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "certificate_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "certificate_records_certificate_code_key" ON "certificate_records"("certificate_code");
CREATE INDEX "certificate_records_certificate_type_idx" ON "certificate_records"("certificate_type");
CREATE INDEX "certificate_records_owner_type_idx" ON "certificate_records"("owner_type");
CREATE INDEX "certificate_records_owner_employee_id_idx" ON "certificate_records"("owner_employee_id");
CREATE INDEX "certificate_records_owner_project_site_id_idx" ON "certificate_records"("owner_project_site_id");
CREATE INDEX "certificate_records_owner_party_id_idx" ON "certificate_records"("owner_party_id");
CREATE INDEX "certificate_records_responsible_employee_id_idx" ON "certificate_records"("responsible_employee_id");
CREATE INDEX "certificate_records_expiry_date_idx" ON "certificate_records"("expiry_date");
CREATE INDEX "certificate_records_next_review_date_idx" ON "certificate_records"("next_review_date");

ALTER TABLE "certificate_records"
  ADD CONSTRAINT "certificate_records_owner_employee_id_fkey"
  FOREIGN KEY ("owner_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "certificate_records"
  ADD CONSTRAINT "certificate_records_owner_project_site_id_fkey"
  FOREIGN KEY ("owner_project_site_id") REFERENCES "project_sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "certificate_records"
  ADD CONSTRAINT "certificate_records_owner_party_id_fkey"
  FOREIGN KEY ("owner_party_id") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "certificate_records"
  ADD CONSTRAINT "certificate_records_responsible_employee_id_fkey"
  FOREIGN KEY ("responsible_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "certificate_records"
  ADD CONSTRAINT "certificate_records_confirmed_by_employee_id_fkey"
  FOREIGN KEY ("confirmed_by_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
