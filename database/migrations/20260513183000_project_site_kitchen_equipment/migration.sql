CREATE TYPE "ProjectSiteKitchenEquipmentStatus" AS ENUM (
  'in_use',
  'damaged',
  'repair_needed',
  'returned',
  'retired'
);

CREATE TYPE "ProjectSiteKitchenEquipmentChangeType" AS ENUM (
  'add',
  'quantity_change',
  'location_change',
  'status_change',
  'photo_or_note'
);

CREATE TABLE "project_site_kitchen_equipment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "project_site_id" UUID NOT NULL,
  "equipment_name" TEXT NOT NULL,
  "equipment_category" TEXT,
  "specification" TEXT,
  "quantity" DECIMAL(14,4) NOT NULL,
  "unit" TEXT NOT NULL,
  "location" TEXT,
  "status" "ProjectSiteKitchenEquipmentStatus" NOT NULL DEFAULT 'in_use',
  "company_asset_tag" TEXT,
  "source_contract_id" UUID,
  "last_checked_date" DATE,
  "attachment_path" TEXT,
  "remark" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "project_site_kitchen_equipment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project_site_kitchen_equipment_change_requests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "project_site_id" UUID NOT NULL,
  "equipment_id" UUID,
  "equipment_name" TEXT NOT NULL,
  "change_type" "ProjectSiteKitchenEquipmentChangeType" NOT NULL,
  "proposed_quantity" DECIMAL(14,4),
  "proposed_location" TEXT,
  "proposed_status" "ProjectSiteKitchenEquipmentStatus",
  "attachment_path" TEXT,
  "description" TEXT,
  "submitted_by_account_id" UUID,
  "submitted_by_name_snapshot" TEXT,
  "submitted_by_phone_snapshot" TEXT,
  "review_status" "ProjectSiteComplianceReviewStatus" NOT NULL DEFAULT 'pending',
  "reviewed_by_employee_id" UUID,
  "reviewed_at" TIMESTAMP(3),
  "review_remark" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "project_site_kitchen_equipment_change_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "project_site_kitchen_equipment_project_site_id_idx" ON "project_site_kitchen_equipment"("project_site_id");
CREATE INDEX "project_site_kitchen_equipment_status_idx" ON "project_site_kitchen_equipment"("status");
CREATE INDEX "project_site_kitchen_equipment_source_contract_id_idx" ON "project_site_kitchen_equipment"("source_contract_id");
CREATE INDEX "project_site_kitchen_equipment_change_requests_project_site_id_idx" ON "project_site_kitchen_equipment_change_requests"("project_site_id");
CREATE INDEX "project_site_kitchen_equipment_change_requests_equipment_id_idx" ON "project_site_kitchen_equipment_change_requests"("equipment_id");
CREATE INDEX "project_site_kitchen_equipment_change_requests_review_status_idx" ON "project_site_kitchen_equipment_change_requests"("review_status");

ALTER TABLE "project_site_kitchen_equipment"
  ADD CONSTRAINT "project_site_kitchen_equipment_project_site_id_fkey"
  FOREIGN KEY ("project_site_id") REFERENCES "project_sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_site_kitchen_equipment"
  ADD CONSTRAINT "project_site_kitchen_equipment_source_contract_id_fkey"
  FOREIGN KEY ("source_contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "project_site_kitchen_equipment_change_requests"
  ADD CONSTRAINT "project_site_kitchen_equipment_change_requests_project_site_id_fkey"
  FOREIGN KEY ("project_site_id") REFERENCES "project_sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_site_kitchen_equipment_change_requests"
  ADD CONSTRAINT "project_site_kitchen_equipment_change_requests_equipment_id_fkey"
  FOREIGN KEY ("equipment_id") REFERENCES "project_site_kitchen_equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "project_site_kitchen_equipment_change_requests"
  ADD CONSTRAINT "project_site_kitchen_equipment_change_requests_reviewed_by_employee_id_fkey"
  FOREIGN KEY ("reviewed_by_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
