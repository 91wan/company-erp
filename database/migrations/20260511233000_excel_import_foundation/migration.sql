CREATE TYPE "ImportTemplateType" AS ENUM ('parties', 'materials', 'employees', 'project_sites', 'opening_inventory');
CREATE TYPE "ImportJobStatus" AS ENUM ('previewed', 'confirmed', 'failed');
CREATE TYPE "ImportRowStatus" AS ENUM ('valid', 'warning', 'error', 'skipped', 'imported');

CREATE TABLE "import_jobs" (
  "id" UUID NOT NULL,
  "template_type" "ImportTemplateType" NOT NULL,
  "original_file_name" TEXT NOT NULL,
  "file_hash" TEXT NOT NULL,
  "status" "ImportJobStatus" NOT NULL DEFAULT 'previewed',
  "total_rows" INTEGER NOT NULL DEFAULT 0,
  "valid_rows" INTEGER NOT NULL DEFAULT 0,
  "warning_rows" INTEGER NOT NULL DEFAULT 0,
  "error_rows" INTEGER NOT NULL DEFAULT 0,
  "skipped_rows" INTEGER NOT NULL DEFAULT 0,
  "imported_rows" INTEGER NOT NULL DEFAULT 0,
  "confirmed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "import_job_rows" (
  "id" UUID NOT NULL,
  "import_job_id" UUID NOT NULL,
  "row_number" INTEGER NOT NULL,
  "raw_data" JSONB NOT NULL,
  "normalized_data" JSONB,
  "issues" JSONB NOT NULL,
  "status" "ImportRowStatus" NOT NULL,
  "target_record_type" TEXT,
  "target_record_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "import_job_rows_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "import_jobs_template_type_status_idx" ON "import_jobs"("template_type", "status");
CREATE INDEX "import_jobs_created_at_idx" ON "import_jobs"("created_at");

CREATE UNIQUE INDEX "import_job_rows_import_job_id_row_number_key" ON "import_job_rows"("import_job_id", "row_number");
CREATE INDEX "import_job_rows_status_idx" ON "import_job_rows"("status");
CREATE INDEX "import_job_rows_target_record_type_target_record_id_idx" ON "import_job_rows"("target_record_type", "target_record_id");

ALTER TABLE "import_job_rows"
  ADD CONSTRAINT "import_job_rows_import_job_id_fkey"
  FOREIGN KEY ("import_job_id") REFERENCES "import_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
