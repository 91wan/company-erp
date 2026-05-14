# Identity Number Encryption Policy

Company ERP treats individual-party identity numbers as decryptable sensitive fields.

## Current Policy

- APIs and UI must not return a full identity number.
- Normal business responses expose only `identityNoMasked` and `identityNoLast4`.
- The full normalized identity number is encrypted with AES-256-GCM before storage.
- The encryption key comes from `IDENTITY_ENCRYPTION_SECRET`.
- `IDENTITY_ENCRYPTION_SECRET` must be independent from `AUTH_SESSION_SECRET`.
- Production startup rejects missing or placeholder identity encryption secrets.

## Key Version

Current key version: `1`.

Encrypted values use the prefix `v1:` and `parties.identity_no_key_version` records the key version used for the stored value.

## Rotation Plan

Future key rotation should be handled by a dedicated migration/maintenance command:

1. Configure both the old and new identity encryption secrets outside Git.
2. Read encrypted identity numbers by key version.
3. Decrypt with the old key in backend-only maintenance code.
4. Re-encrypt with the new key and increment `identity_no_key_version`.
5. Verify API, audit logs, and UI still expose only masked/last-four values.

No normal HTTP API should return the decrypted full identity number.
