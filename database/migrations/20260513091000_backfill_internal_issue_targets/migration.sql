UPDATE "inventory_movements"
SET "issue_target_type" = 'company_department'
WHERE "issue_target_type" = 'internal_office';
