ALTER TABLE "contracts"
  ADD CONSTRAINT "contracts_end_date_required_for_non_framework"
  CHECK ("contract_form" = 'framework' OR "end_date" IS NOT NULL);
