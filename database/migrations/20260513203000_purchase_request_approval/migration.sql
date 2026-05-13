ALTER TYPE "PurchaseRequestStatus" ADD VALUE IF NOT EXISTS 'pending_approval' AFTER 'draft';
ALTER TYPE "PurchaseRequestStatus" ADD VALUE IF NOT EXISTS 'rejected' BEFORE 'cancelled';

ALTER TABLE "purchase_requests"
  ADD COLUMN "submitted_at" TIMESTAMP(3),
  ADD COLUMN "reviewed_at" TIMESTAMP(3),
  ADD COLUMN "reviewed_by_employee_id" UUID,
  ADD COLUMN "reviewed_by_name" TEXT,
  ADD COLUMN "review_remark" TEXT;

CREATE INDEX "purchase_requests_reviewed_by_employee_id_idx" ON "purchase_requests"("reviewed_by_employee_id");

ALTER TABLE "purchase_requests"
  ADD CONSTRAINT "purchase_requests_reviewed_by_employee_id_fkey"
  FOREIGN KEY ("reviewed_by_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
