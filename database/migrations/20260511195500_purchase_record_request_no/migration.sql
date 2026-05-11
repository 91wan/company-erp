ALTER TABLE "purchase_records" ADD COLUMN "purchase_request_no" TEXT;
CREATE INDEX "purchase_records_purchase_request_no_idx" ON "purchase_records"("purchase_request_no");
