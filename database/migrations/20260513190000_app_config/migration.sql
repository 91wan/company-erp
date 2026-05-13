CREATE TABLE "app_config" (
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "app_config_pkey" PRIMARY KEY ("key")
);

INSERT INTO "app_config" ("key", "value")
VALUES ('companyName', 'Company ERP')
ON CONFLICT ("key") DO NOTHING;
