ALTER TYPE "RoleCode" ADD VALUE IF NOT EXISTS 'marketing';
ALTER TYPE "RoleCode" ADD VALUE IF NOT EXISTS 'operations';

DELETE FROM "user_role_assignments" manager_roles
USING "user_role_assignments" viewer_roles
WHERE manager_roles."role"::text = 'manager'
  AND viewer_roles."user_account_id" = manager_roles."user_account_id"
  AND viewer_roles."role" = 'viewer';

UPDATE "user_role_assignments"
SET "role" = 'viewer'
WHERE "role"::text = 'manager';

CREATE TYPE "RoleCode_new" AS ENUM ('admin', 'hr', 'procurement', 'warehouse', 'project_site', 'marketing', 'operations', 'viewer');

ALTER TABLE "user_role_assignments"
  ALTER COLUMN "role" TYPE "RoleCode_new"
  USING "role"::text::"RoleCode_new";

DROP TYPE "RoleCode";
ALTER TYPE "RoleCode_new" RENAME TO "RoleCode";

CREATE TYPE "MarketOperationsHandoffStatus" AS ENUM ('pending', 'handed_over', 'accepted', 'cancelled');

CREATE TABLE "market_operations_handoffs" (
  "id" UUID NOT NULL,
  "handoff_no" TEXT NOT NULL,
  "project_name" TEXT NOT NULL,
  "client_party_id" UUID,
  "client_name" TEXT NOT NULL,
  "project_site_id" UUID,
  "market_owner_employee_id" UUID NOT NULL,
  "operations_owner_employee_id" UUID NOT NULL,
  "status" "MarketOperationsHandoffStatus" NOT NULL DEFAULT 'pending',
  "expected_start_date" DATE,
  "handoff_date" DATE,
  "project_summary" TEXT,
  "remark" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "market_operations_handoffs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "market_operations_handoffs_handoff_no_key" ON "market_operations_handoffs"("handoff_no");
CREATE INDEX "market_operations_handoffs_status_idx" ON "market_operations_handoffs"("status");
CREATE INDEX "market_operations_handoffs_client_party_id_idx" ON "market_operations_handoffs"("client_party_id");
CREATE INDEX "market_operations_handoffs_project_site_id_idx" ON "market_operations_handoffs"("project_site_id");
CREATE INDEX "market_operations_handoffs_market_owner_employee_id_idx" ON "market_operations_handoffs"("market_owner_employee_id");
CREATE INDEX "market_operations_handoffs_operations_owner_employee_id_idx" ON "market_operations_handoffs"("operations_owner_employee_id");

ALTER TABLE "market_operations_handoffs"
  ADD CONSTRAINT "market_operations_handoffs_client_party_id_fkey"
  FOREIGN KEY ("client_party_id") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "market_operations_handoffs"
  ADD CONSTRAINT "market_operations_handoffs_project_site_id_fkey"
  FOREIGN KEY ("project_site_id") REFERENCES "project_sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "market_operations_handoffs"
  ADD CONSTRAINT "market_operations_handoffs_market_owner_employee_id_fkey"
  FOREIGN KEY ("market_owner_employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "market_operations_handoffs"
  ADD CONSTRAINT "market_operations_handoffs_operations_owner_employee_id_fkey"
  FOREIGN KEY ("operations_owner_employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
