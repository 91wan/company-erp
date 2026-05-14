CREATE TYPE "AttachmentStatus" AS ENUM ('active', 'disabled');

CREATE TABLE "attachment_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "attachment_code" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "original_file_name" TEXT,
    "file_type" TEXT,
    "file_size" INTEGER,
    "owner_module" TEXT NOT NULL,
    "owner_entity_type" TEXT NOT NULL,
    "owner_entity_id" UUID,
    "status" "AttachmentStatus" NOT NULL DEFAULT 'active',
    "created_by_user_id" UUID,
    "created_by_username" TEXT,
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attachment_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "attachment_records_attachment_code_key" ON "attachment_records"("attachment_code");
CREATE INDEX "attachment_records_owner_module_owner_entity_type_owner_entity_id_idx" ON "attachment_records"("owner_module", "owner_entity_type", "owner_entity_id");
CREATE INDEX "attachment_records_status_idx" ON "attachment_records"("status");
CREATE INDEX "attachment_records_created_at_idx" ON "attachment_records"("created_at");
