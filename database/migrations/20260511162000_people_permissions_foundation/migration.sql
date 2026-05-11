CREATE TYPE "BaseStatus" AS ENUM ('enabled', 'disabled');
CREATE TYPE "EmployeeStatus" AS ENUM ('active', 'resigned', 'disabled');
CREATE TYPE "UserAccountStatus" AS ENUM ('active', 'disabled', 'locked');
CREATE TYPE "RoleCode" AS ENUM ('admin', 'hr', 'procurement', 'warehouse', 'project_site', 'viewer');
CREATE TYPE "ProjectSiteStatus" AS ENUM ('preparing', 'active', 'paused', 'ended');
CREATE TYPE "EmployeeProjectSiteRelationType" AS ENUM ('assigned', 'manager', 'support');

CREATE TABLE "departments" (
  "id" UUID NOT NULL,
  "department_code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "parent_id" UUID,
  "manager_employee_id" UUID,
  "status" "BaseStatus" NOT NULL DEFAULT 'enabled',
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "remark" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "employees" (
  "id" UUID NOT NULL,
  "employee_no" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "gender" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "department_id" UUID NOT NULL,
  "position" TEXT,
  "employment_status" "EmployeeStatus" NOT NULL DEFAULT 'active',
  "hire_date" DATE,
  "leave_date" DATE,
  "remark" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_accounts" (
  "id" UUID NOT NULL,
  "employee_id" UUID,
  "username" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "status" "UserAccountStatus" NOT NULL DEFAULT 'active',
  "last_login_at" TIMESTAMP(3),
  "password_changed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_role_assignments" (
  "id" UUID NOT NULL,
  "user_account_id" UUID NOT NULL,
  "role" "RoleCode" NOT NULL,
  "assigned_by_user_id" UUID,
  "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_role_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project_sites" (
  "id" UUID NOT NULL,
  "site_code" TEXT NOT NULL,
  "site_name" TEXT NOT NULL,
  "status" "ProjectSiteStatus" NOT NULL DEFAULT 'active',
  "primary_manager_employee_id" UUID,
  "remark" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "project_sites_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "employee_project_site_assignments" (
  "id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "project_site_id" UUID NOT NULL,
  "relation_type" "EmployeeProjectSiteRelationType" NOT NULL DEFAULT 'assigned',
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "start_date" DATE,
  "end_date" DATE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "employee_project_site_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "departments_department_code_key" ON "departments"("department_code");
CREATE INDEX "departments_parent_id_idx" ON "departments"("parent_id");
CREATE INDEX "departments_status_idx" ON "departments"("status");

CREATE UNIQUE INDEX "employees_employee_no_key" ON "employees"("employee_no");
CREATE UNIQUE INDEX "employees_phone_key" ON "employees"("phone");
CREATE UNIQUE INDEX "employees_email_key" ON "employees"("email");
CREATE INDEX "employees_department_id_idx" ON "employees"("department_id");
CREATE INDEX "employees_employment_status_idx" ON "employees"("employment_status");

CREATE UNIQUE INDEX "user_accounts_employee_id_key" ON "user_accounts"("employee_id");
CREATE UNIQUE INDEX "user_accounts_username_key" ON "user_accounts"("username");
CREATE INDEX "user_accounts_status_idx" ON "user_accounts"("status");

CREATE UNIQUE INDEX "user_role_assignments_user_account_id_role_key" ON "user_role_assignments"("user_account_id", "role");
CREATE INDEX "user_role_assignments_role_idx" ON "user_role_assignments"("role");
CREATE INDEX "user_role_assignments_assigned_by_user_id_idx" ON "user_role_assignments"("assigned_by_user_id");

CREATE UNIQUE INDEX "project_sites_site_code_key" ON "project_sites"("site_code");
CREATE INDEX "project_sites_status_idx" ON "project_sites"("status");
CREATE INDEX "project_sites_primary_manager_employee_id_idx" ON "project_sites"("primary_manager_employee_id");

CREATE INDEX "employee_project_site_assignments_employee_id_idx" ON "employee_project_site_assignments"("employee_id");
CREATE INDEX "employee_project_site_assignments_project_site_id_idx" ON "employee_project_site_assignments"("project_site_id");
CREATE INDEX "employee_project_site_assignments_relation_type_idx" ON "employee_project_site_assignments"("relation_type");

ALTER TABLE "departments"
  ADD CONSTRAINT "departments_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "departments"
  ADD CONSTRAINT "departments_manager_employee_id_fkey"
  FOREIGN KEY ("manager_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "employees"
  ADD CONSTRAINT "employees_department_id_fkey"
  FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_accounts"
  ADD CONSTRAINT "user_accounts_employee_id_fkey"
  FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "user_role_assignments"
  ADD CONSTRAINT "user_role_assignments_user_account_id_fkey"
  FOREIGN KEY ("user_account_id") REFERENCES "user_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_role_assignments"
  ADD CONSTRAINT "user_role_assignments_assigned_by_user_id_fkey"
  FOREIGN KEY ("assigned_by_user_id") REFERENCES "user_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "project_sites"
  ADD CONSTRAINT "project_sites_primary_manager_employee_id_fkey"
  FOREIGN KEY ("primary_manager_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "employee_project_site_assignments"
  ADD CONSTRAINT "employee_project_site_assignments_employee_id_fkey"
  FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "employee_project_site_assignments"
  ADD CONSTRAINT "employee_project_site_assignments_project_site_id_fkey"
  FOREIGN KEY ("project_site_id") REFERENCES "project_sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
