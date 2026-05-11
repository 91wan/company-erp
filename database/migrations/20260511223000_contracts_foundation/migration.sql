CREATE TYPE "ContractDirection" AS ENUM ('purchase_contract', 'client_service_contract', 'subcontract_contract', 'framework_contract', 'other');
CREATE TYPE "ContractStatus" AS ENUM ('active', 'terminated');

CREATE TABLE "contracts" (
  "id" UUID NOT NULL,
  "contract_no" TEXT NOT NULL,
  "contract_name" TEXT NOT NULL,
  "counterparty_party_id" UUID NOT NULL,
  "counterparty_name_snapshot" TEXT NOT NULL,
  "direction" "ContractDirection" NOT NULL,
  "project_site_id" UUID,
  "signed_date" DATE,
  "start_date" DATE NOT NULL,
  "end_date" DATE NOT NULL,
  "amount" DECIMAL(14,2),
  "budget_amount" DECIMAL(14,2),
  "currency" TEXT NOT NULL DEFAULT 'CNY',
  "attachment_ref" TEXT,
  "status" "ContractStatus" NOT NULL DEFAULT 'active',
  "remark" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contract_attachments" (
  "id" UUID NOT NULL,
  "contract_id" UUID NOT NULL,
  "file_name" TEXT NOT NULL,
  "file_path" TEXT NOT NULL,
  "file_type" TEXT,
  "file_size" INTEGER,
  "uploaded_by" TEXT,
  "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "remark" TEXT,
  CONSTRAINT "contract_attachments_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "purchase_records"
  ADD COLUMN "contract_id" UUID;

CREATE UNIQUE INDEX "contracts_contract_no_key" ON "contracts"("contract_no");
CREATE INDEX "contracts_counterparty_party_id_idx" ON "contracts"("counterparty_party_id");
CREATE INDEX "contracts_project_site_id_idx" ON "contracts"("project_site_id");
CREATE INDEX "contracts_direction_idx" ON "contracts"("direction");
CREATE INDEX "contracts_status_idx" ON "contracts"("status");
CREATE INDEX "contracts_end_date_idx" ON "contracts"("end_date");

CREATE INDEX "contract_attachments_contract_id_idx" ON "contract_attachments"("contract_id");
CREATE INDEX "purchase_records_contract_id_idx" ON "purchase_records"("contract_id");

ALTER TABLE "contracts"
  ADD CONSTRAINT "contracts_counterparty_party_id_fkey"
  FOREIGN KEY ("counterparty_party_id") REFERENCES "parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "contracts"
  ADD CONSTRAINT "contracts_project_site_id_fkey"
  FOREIGN KEY ("project_site_id") REFERENCES "project_sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "contract_attachments"
  ADD CONSTRAINT "contract_attachments_contract_id_fkey"
  FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "purchase_records"
  ADD CONSTRAINT "purchase_records_contract_id_fkey"
  FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
