CREATE TYPE "WarehouseType" AS ENUM ('headquarters', 'project_site', 'temporary');
CREATE TYPE "InventoryMovementType" AS ENUM ('opening', 'inbound', 'outbound', 'adjustment_in', 'adjustment_out');
CREATE TYPE "InventorySourceType" AS ENUM ('purchase', 'return_material', 'inventory_gain', 'opening', 'other');
CREATE TYPE "IssueTargetType" AS ENUM ('internal_office', 'project_site', 'subcontractor');
CREATE TYPE "ProjectUsageStatus" AS ENUM ('pending', 'issued', 'partially_issued', 'rejected');

CREATE TABLE "warehouses" (
  "id" UUID NOT NULL,
  "warehouse_code" TEXT NOT NULL,
  "warehouse_name" TEXT NOT NULL,
  "warehouse_type" "WarehouseType" NOT NULL DEFAULT 'headquarters',
  "project_site_id" UUID,
  "manager_name" TEXT,
  "manager_phone" TEXT,
  "status" "BaseStatus" NOT NULL DEFAULT 'enabled',
  "remark" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "materials" (
  "id" UUID NOT NULL,
  "material_code" TEXT NOT NULL,
  "material_name" TEXT NOT NULL,
  "specification" TEXT,
  "material_category" TEXT NOT NULL,
  "base_unit" TEXT NOT NULL,
  "default_warehouse_id" UUID,
  "safe_stock" DECIMAL(14,3),
  "status" "BaseStatus" NOT NULL DEFAULT 'enabled',
  "remark" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project_usage_requests" (
  "id" UUID NOT NULL,
  "request_no" TEXT NOT NULL,
  "request_date" DATE NOT NULL,
  "project_site_id" UUID NOT NULL,
  "warehouse_id" UUID NOT NULL,
  "material_id" UUID NOT NULL,
  "requested_quantity" DECIMAL(14,3) NOT NULL,
  "approved_quantity" DECIMAL(14,3),
  "issued_quantity" DECIMAL(14,3) NOT NULL DEFAULT 0,
  "unit" TEXT NOT NULL,
  "purpose" TEXT,
  "requested_by" TEXT,
  "expected_date" DATE,
  "status" "ProjectUsageStatus" NOT NULL DEFAULT 'pending',
  "outbound_no" TEXT,
  "remark" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "project_usage_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventory_movements" (
  "id" UUID NOT NULL,
  "movement_no" TEXT NOT NULL,
  "movement_date" DATE NOT NULL,
  "movement_type" "InventoryMovementType" NOT NULL,
  "source_type" "InventorySourceType",
  "issue_target_type" "IssueTargetType",
  "warehouse_id" UUID NOT NULL,
  "material_id" UUID NOT NULL,
  "quantity" DECIMAL(14,3) NOT NULL,
  "unit" TEXT NOT NULL,
  "unit_price" DECIMAL(14,4),
  "purchase_record_no" TEXT,
  "project_site_id" UUID,
  "subcontractor_name" TEXT,
  "department_name" TEXT,
  "requested_by" TEXT,
  "handled_by" TEXT,
  "received_by_name" TEXT,
  "purpose" TEXT,
  "remark" TEXT,
  "usage_request_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "warehouses_warehouse_code_key" ON "warehouses"("warehouse_code");
CREATE INDEX "warehouses_project_site_id_idx" ON "warehouses"("project_site_id");

CREATE UNIQUE INDEX "materials_material_code_key" ON "materials"("material_code");

CREATE UNIQUE INDEX "project_usage_requests_request_no_key" ON "project_usage_requests"("request_no");
CREATE INDEX "project_usage_requests_project_site_id_request_date_idx" ON "project_usage_requests"("project_site_id", "request_date");
CREATE INDEX "project_usage_requests_status_idx" ON "project_usage_requests"("status");

CREATE UNIQUE INDEX "inventory_movements_movement_no_key" ON "inventory_movements"("movement_no");
CREATE INDEX "inventory_movements_warehouse_id_material_id_movement_date_idx" ON "inventory_movements"("warehouse_id", "material_id", "movement_date");
CREATE INDEX "inventory_movements_movement_type_movement_date_idx" ON "inventory_movements"("movement_type", "movement_date");
CREATE INDEX "inventory_movements_project_site_id_idx" ON "inventory_movements"("project_site_id");

ALTER TABLE "warehouses"
  ADD CONSTRAINT "warehouses_project_site_id_fkey"
  FOREIGN KEY ("project_site_id") REFERENCES "project_sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "materials"
  ADD CONSTRAINT "materials_default_warehouse_id_fkey"
  FOREIGN KEY ("default_warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "project_usage_requests"
  ADD CONSTRAINT "project_usage_requests_project_site_id_fkey"
  FOREIGN KEY ("project_site_id") REFERENCES "project_sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "project_usage_requests"
  ADD CONSTRAINT "project_usage_requests_warehouse_id_fkey"
  FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "project_usage_requests"
  ADD CONSTRAINT "project_usage_requests_material_id_fkey"
  FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_movements"
  ADD CONSTRAINT "inventory_movements_warehouse_id_fkey"
  FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_movements"
  ADD CONSTRAINT "inventory_movements_material_id_fkey"
  FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_movements"
  ADD CONSTRAINT "inventory_movements_project_site_id_fkey"
  FOREIGN KEY ("project_site_id") REFERENCES "project_sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "inventory_movements"
  ADD CONSTRAINT "inventory_movements_usage_request_id_fkey"
  FOREIGN KEY ("usage_request_id") REFERENCES "project_usage_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
