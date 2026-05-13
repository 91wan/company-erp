CREATE TYPE "ContractForm" AS ENUM (
  'one_time',
  'fixed_term',
  'framework',
  'project_construction'
);

CREATE TYPE "ContractSubjectCategory" AS ENUM (
  'food_ingredients',
  'tableware_supplies',
  'kitchen_equipment',
  'advertising_signage',
  'renovation',
  'civil_construction',
  'elevator',
  'service_operation',
  'labor_subcontract',
  'other'
);

ALTER TYPE "ContractStatus" ADD VALUE IF NOT EXISTS 'draft';
ALTER TYPE "ContractStatus" ADD VALUE IF NOT EXISTS 'completed';
ALTER TYPE "ContractStatus" ADD VALUE IF NOT EXISTS 'cancelled';

ALTER TABLE "contracts"
  ADD COLUMN "contract_form" "ContractForm" NOT NULL DEFAULT 'fixed_term',
  ADD COLUMN "subject_category" "ContractSubjectCategory" NOT NULL DEFAULT 'other';

UPDATE "contracts"
SET "contract_form" = 'one_time'
WHERE "direction" = 'purchase_contract';

UPDATE "contracts"
SET "contract_form" = 'framework'
WHERE "direction" = 'framework_contract';

UPDATE "contracts"
SET "subject_category" = 'service_operation'
WHERE "direction" = 'client_service_contract';

UPDATE "contracts"
SET "subject_category" = 'labor_subcontract'
WHERE "direction" = 'subcontract_contract';

UPDATE "contracts"
SET "subject_category" = 'kitchen_equipment'
WHERE "investment_category" = 'equipment';

UPDATE "contracts"
SET "subject_category" = 'tableware_supplies'
WHERE "investment_category" = 'tableware_supplies';

UPDATE "contracts"
SET "subject_category" = 'advertising_signage'
WHERE "investment_category" = 'advertising_signage';

UPDATE "contracts"
SET "subject_category" = 'renovation'
WHERE "investment_category" = 'renovation';

UPDATE "contracts"
SET "direction" = 'purchase_contract'
WHERE "direction" = 'framework_contract';

ALTER TYPE "ContractDirection" RENAME TO "ContractDirection_old";

CREATE TYPE "ContractDirection" AS ENUM (
  'purchase_contract',
  'client_service_contract',
  'subcontract_contract',
  'other'
);

ALTER TABLE "contracts"
  ALTER COLUMN "direction" TYPE "ContractDirection"
  USING "direction"::text::"ContractDirection";

DROP TYPE "ContractDirection_old";

CREATE INDEX "contracts_contract_form_idx" ON "contracts"("contract_form");
CREATE INDEX "contracts_subject_category_idx" ON "contracts"("subject_category");
