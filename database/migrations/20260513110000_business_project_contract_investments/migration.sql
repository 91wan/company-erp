CREATE TYPE "ContractInvestmentCategory" AS ENUM ('renovation', 'equipment', 'advertising_signage', 'tableware_supplies', 'other');
CREATE TYPE "BusinessProjectType" AS ENUM ('self_operated_construction');
CREATE TYPE "BusinessProjectStatus" AS ENUM ('preparing', 'in_progress', 'active', 'paused', 'ended', 'cancelled');

CREATE TABLE "business_projects" (
  "id" UUID NOT NULL,
  "project_code" TEXT NOT NULL,
  "project_name" TEXT NOT NULL,
  "project_type" "BusinessProjectType" NOT NULL DEFAULT 'self_operated_construction',
  "status" "BusinessProjectStatus" NOT NULL DEFAULT 'preparing',
  "location" TEXT,
  "manager_employee_id" UUID,
  "start_date" DATE,
  "end_date" DATE,
  "remark" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "business_projects_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "project_sites"
  ADD COLUMN "business_project_id" UUID;

ALTER TABLE "contracts"
  ADD COLUMN "investment_category" "ContractInvestmentCategory",
  ADD COLUMN "business_project_id" UUID;

CREATE UNIQUE INDEX "business_projects_project_code_key" ON "business_projects"("project_code");
CREATE INDEX "business_projects_project_type_idx" ON "business_projects"("project_type");
CREATE INDEX "business_projects_status_idx" ON "business_projects"("status");
CREATE INDEX "business_projects_manager_employee_id_idx" ON "business_projects"("manager_employee_id");
CREATE INDEX "project_sites_business_project_id_idx" ON "project_sites"("business_project_id");
CREATE INDEX "contracts_business_project_id_idx" ON "contracts"("business_project_id");
CREATE INDEX "contracts_investment_category_idx" ON "contracts"("investment_category");

ALTER TABLE "business_projects"
  ADD CONSTRAINT "business_projects_manager_employee_id_fkey"
  FOREIGN KEY ("manager_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "project_sites"
  ADD CONSTRAINT "project_sites_business_project_id_fkey"
  FOREIGN KEY ("business_project_id") REFERENCES "business_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "contracts"
  ADD CONSTRAINT "contracts_business_project_id_fkey"
  FOREIGN KEY ("business_project_id") REFERENCES "business_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
