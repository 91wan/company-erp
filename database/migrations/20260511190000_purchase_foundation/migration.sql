CREATE TYPE "PurchaseRequestStatus" AS ENUM ('draft', 'pending_purchase', 'purchasing', 'partially_received', 'completed', 'cancelled');
CREATE TYPE "PurchaseRecordStatus" AS ENUM ('pending_purchase', 'ordered', 'partially_received', 'received', 'cancelled');
CREATE TYPE "PurchaseSourceType" AS ENUM ('platform', 'supplier', 'offline');

CREATE TABLE "purchase_requests" (
  "id" UUID NOT NULL,
  "request_no" TEXT NOT NULL,
  "requester_name" TEXT NOT NULL,
  "requester_employee_id" UUID,
  "department_name" TEXT NOT NULL,
  "department_id" UUID,
  "project_site_id" UUID,
  "expected_arrival_date" DATE,
  "purpose" TEXT,
  "status" "PurchaseRequestStatus" NOT NULL DEFAULT 'draft',
  "remark" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "purchase_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "purchase_request_lines" (
  "id" UUID NOT NULL,
  "purchase_request_id" UUID NOT NULL,
  "material_id" UUID,
  "material_code" TEXT,
  "material_name" TEXT NOT NULL,
  "specification" TEXT,
  "requested_quantity" DECIMAL(14,3) NOT NULL,
  "unit" TEXT NOT NULL,
  "remark" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "purchase_request_lines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "purchase_records" (
  "id" UUID NOT NULL,
  "purchase_no" TEXT NOT NULL,
  "purchase_request_id" UUID,
  "purchaser_name" TEXT NOT NULL,
  "purchaser_employee_id" UUID,
  "source_type" "PurchaseSourceType" NOT NULL,
  "purchase_platform" TEXT,
  "platform_order_no" TEXT,
  "shop_name" TEXT,
  "supplier_party_id" UUID,
  "supplier_name_text" TEXT,
  "purchase_description" TEXT,
  "purchase_date" DATE NOT NULL,
  "expected_arrival_date" DATE,
  "received_quantity" DECIMAL(14,3) NOT NULL DEFAULT 0,
  "status" "PurchaseRecordStatus" NOT NULL DEFAULT 'pending_purchase',
  "remark" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "purchase_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "purchase_record_lines" (
  "id" UUID NOT NULL,
  "purchase_record_id" UUID NOT NULL,
  "purchase_request_line_id" UUID,
  "material_id" UUID,
  "material_code" TEXT,
  "material_name" TEXT NOT NULL,
  "specification" TEXT,
  "purchase_quantity" DECIMAL(14,3) NOT NULL,
  "unit" TEXT NOT NULL,
  "purchase_price" DECIMAL(14,4),
  "received_quantity" DECIMAL(14,3) NOT NULL DEFAULT 0,
  "remark" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "purchase_record_lines_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "purchase_requests_request_no_key" ON "purchase_requests"("request_no");
CREATE INDEX "purchase_requests_status_idx" ON "purchase_requests"("status");
CREATE INDEX "purchase_requests_requester_employee_id_idx" ON "purchase_requests"("requester_employee_id");
CREATE INDEX "purchase_requests_department_id_idx" ON "purchase_requests"("department_id");
CREATE INDEX "purchase_requests_project_site_id_idx" ON "purchase_requests"("project_site_id");

CREATE INDEX "purchase_request_lines_purchase_request_id_idx" ON "purchase_request_lines"("purchase_request_id");
CREATE INDEX "purchase_request_lines_material_id_idx" ON "purchase_request_lines"("material_id");

CREATE UNIQUE INDEX "purchase_records_purchase_no_key" ON "purchase_records"("purchase_no");
CREATE INDEX "purchase_records_status_idx" ON "purchase_records"("status");
CREATE INDEX "purchase_records_source_type_idx" ON "purchase_records"("source_type");
CREATE INDEX "purchase_records_purchase_request_id_idx" ON "purchase_records"("purchase_request_id");
CREATE INDEX "purchase_records_purchaser_employee_id_idx" ON "purchase_records"("purchaser_employee_id");
CREATE INDEX "purchase_records_supplier_party_id_idx" ON "purchase_records"("supplier_party_id");

CREATE INDEX "purchase_record_lines_purchase_record_id_idx" ON "purchase_record_lines"("purchase_record_id");
CREATE INDEX "purchase_record_lines_purchase_request_line_id_idx" ON "purchase_record_lines"("purchase_request_line_id");
CREATE INDEX "purchase_record_lines_material_id_idx" ON "purchase_record_lines"("material_id");

ALTER TABLE "purchase_requests"
  ADD CONSTRAINT "purchase_requests_requester_employee_id_fkey"
  FOREIGN KEY ("requester_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "purchase_requests"
  ADD CONSTRAINT "purchase_requests_department_id_fkey"
  FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "purchase_requests"
  ADD CONSTRAINT "purchase_requests_project_site_id_fkey"
  FOREIGN KEY ("project_site_id") REFERENCES "project_sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "purchase_request_lines"
  ADD CONSTRAINT "purchase_request_lines_purchase_request_id_fkey"
  FOREIGN KEY ("purchase_request_id") REFERENCES "purchase_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "purchase_request_lines"
  ADD CONSTRAINT "purchase_request_lines_material_id_fkey"
  FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "purchase_records"
  ADD CONSTRAINT "purchase_records_purchase_request_id_fkey"
  FOREIGN KEY ("purchase_request_id") REFERENCES "purchase_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "purchase_records"
  ADD CONSTRAINT "purchase_records_purchaser_employee_id_fkey"
  FOREIGN KEY ("purchaser_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "purchase_records"
  ADD CONSTRAINT "purchase_records_supplier_party_id_fkey"
  FOREIGN KEY ("supplier_party_id") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "purchase_record_lines"
  ADD CONSTRAINT "purchase_record_lines_purchase_record_id_fkey"
  FOREIGN KEY ("purchase_record_id") REFERENCES "purchase_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "purchase_record_lines"
  ADD CONSTRAINT "purchase_record_lines_purchase_request_line_id_fkey"
  FOREIGN KEY ("purchase_request_line_id") REFERENCES "purchase_request_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "purchase_record_lines"
  ADD CONSTRAINT "purchase_record_lines_material_id_fkey"
  FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE SET NULL ON UPDATE CASCADE;
