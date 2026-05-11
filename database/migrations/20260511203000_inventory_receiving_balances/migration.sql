ALTER TABLE "inventory_movements"
  ADD COLUMN "purchase_record_line_id" UUID;

CREATE INDEX "inventory_movements_purchase_record_line_id_idx"
  ON "inventory_movements"("purchase_record_line_id");

ALTER TABLE "inventory_movements"
  ADD CONSTRAINT "inventory_movements_purchase_record_line_id_fkey"
  FOREIGN KEY ("purchase_record_line_id")
  REFERENCES "purchase_record_lines"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
