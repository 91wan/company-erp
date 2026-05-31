CREATE TABLE IF NOT EXISTS "user_mfa_factors" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_account_id" UUID NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'totp',
  "secret_encrypted" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "activated_at" TIMESTAMP(3),
  "disabled_at" TIMESTAMP(3),
  CONSTRAINT "user_mfa_factors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "user_mfa_recovery_codes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_account_id" UUID NOT NULL,
  "mfa_factor_id" UUID NOT NULL,
  "code_hash" TEXT NOT NULL,
  "used_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_mfa_recovery_codes_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "user_mfa_factors"
  ALTER COLUMN "type" SET DEFAULT 'totp',
  ALTER COLUMN "status" SET DEFAULT 'pending';

DO $$
BEGIN
  ALTER TABLE "user_mfa_factors"
    ADD CONSTRAINT "user_mfa_factors_user_account_id_fkey"
    FOREIGN KEY ("user_account_id") REFERENCES "user_accounts"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "user_mfa_recovery_codes"
    ADD CONSTRAINT "user_mfa_recovery_codes_user_account_id_fkey"
    FOREIGN KEY ("user_account_id") REFERENCES "user_accounts"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "user_mfa_recovery_codes"
    ADD CONSTRAINT "user_mfa_recovery_codes_mfa_factor_id_fkey"
    FOREIGN KEY ("mfa_factor_id") REFERENCES "user_mfa_factors"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "user_mfa_factors"
    ADD CONSTRAINT "user_mfa_factors_type_check"
    CHECK ("type" IN ('totp'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "user_mfa_factors"
    ADD CONSTRAINT "user_mfa_factors_status_check"
    CHECK ("status" IN ('pending', 'active', 'disabled'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "user_mfa_factors_user_account_id_status_idx"
  ON "user_mfa_factors"("user_account_id", "status");

CREATE INDEX IF NOT EXISTS "user_mfa_recovery_codes_user_account_id_idx"
  ON "user_mfa_recovery_codes"("user_account_id");

CREATE INDEX IF NOT EXISTS "user_mfa_recovery_codes_mfa_factor_id_idx"
  ON "user_mfa_recovery_codes"("mfa_factor_id");

CREATE UNIQUE INDEX IF NOT EXISTS "user_mfa_factors_one_pending_per_user_idx"
  ON "user_mfa_factors"("user_account_id")
  WHERE "status" = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS "user_mfa_factors_one_active_per_user_idx"
  ON "user_mfa_factors"("user_account_id")
  WHERE "status" = 'active';
