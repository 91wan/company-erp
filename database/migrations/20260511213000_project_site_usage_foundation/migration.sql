ALTER TYPE "InventorySourceType" ADD VALUE IF NOT EXISTS 'project_usage';

ALTER TABLE "project_sites"
  ADD COLUMN "region" TEXT,
  ADD COLUMN "start_date" DATE,
  ADD COLUMN "end_date" DATE;
