CREATE TYPE "ChargePriceSource" AS ENUM ('project_site_price');

ALTER TABLE "materials"
  ADD COLUMN "is_project_site_sale_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "purchase_reference_price" DECIMAL(14, 4),
  ADD COLUMN "project_site_sale_price" DECIMAL(14, 4),
  ADD COLUMN "project_site_sale_unit" TEXT,
  ADD COLUMN "project_site_sale_remark" TEXT,
  ADD COLUMN "is_consumable" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "inventory_movements"
  ADD COLUMN "unit_charge_price" DECIMAL(14, 4),
  ADD COLUMN "charge_amount" DECIMAL(14, 4),
  ADD COLUMN "charge_price_source" "ChargePriceSource",
  ADD COLUMN "charge_remark" TEXT;

ALTER TABLE "project_usage_requests"
  ADD COLUMN "unit_charge_price" DECIMAL(14, 4),
  ADD COLUMN "charge_amount" DECIMAL(14, 4) NOT NULL DEFAULT 0,
  ADD COLUMN "charge_price_source" "ChargePriceSource",
  ADD COLUMN "charge_remark" TEXT,
  ADD COLUMN "last_issued_at" DATE,
  ADD COLUMN "last_received_by_name" TEXT;
