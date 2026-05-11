CREATE TYPE "ReplenishmentSuggestionStatus" AS ENUM ('open', 'converted', 'dismissed');

CREATE TABLE "replenishment_suggestions" (
  "id" UUID NOT NULL,
  "warehouse_id" UUID NOT NULL,
  "material_id" UUID NOT NULL,
  "safe_stock" DECIMAL(14,3) NOT NULL,
  "current_stock" DECIMAL(14,3) NOT NULL,
  "reserved_usage_qty" DECIMAL(14,3) NOT NULL,
  "open_purchase_qty" DECIMAL(14,3) NOT NULL,
  "suggested_quantity" DECIMAL(14,3) NOT NULL,
  "status" "ReplenishmentSuggestionStatus" NOT NULL DEFAULT 'open',
  "converted_purchase_request_id" UUID,
  "remark" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "replenishment_suggestions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "replenishment_suggestions_warehouse_id_idx" ON "replenishment_suggestions"("warehouse_id");
CREATE INDEX "replenishment_suggestions_material_id_idx" ON "replenishment_suggestions"("material_id");
CREATE INDEX "replenishment_suggestions_status_idx" ON "replenishment_suggestions"("status");
CREATE INDEX "replenishment_suggestions_converted_purchase_request_id_idx" ON "replenishment_suggestions"("converted_purchase_request_id");
CREATE UNIQUE INDEX "replenishment_suggestions_open_warehouse_material_key"
  ON "replenishment_suggestions"("warehouse_id", "material_id")
  WHERE "status" = 'open';

ALTER TABLE "replenishment_suggestions"
  ADD CONSTRAINT "replenishment_suggestions_warehouse_id_fkey"
  FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "replenishment_suggestions"
  ADD CONSTRAINT "replenishment_suggestions_material_id_fkey"
  FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "replenishment_suggestions"
  ADD CONSTRAINT "replenishment_suggestions_converted_purchase_request_id_fkey"
  FOREIGN KEY ("converted_purchase_request_id") REFERENCES "purchase_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
