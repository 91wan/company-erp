# Public Internet Security Headers Policy

This document describes the HTTP security headers applied by the Company ERP API when `PUBLIC_SECURITY_HEADERS_ENABLED=true` or `PUBLIC_INTERNET_ENABLED=true`.

## Activation

| Flag | Effect |
|------|--------|
| `PUBLIC_SECURITY_HEADERS_ENABLED=true` | All headers except HSTS are applied |
| `PUBLIC_INTERNET_ENABLED=true` | All headers including HSTS are applied (implies `PUBLIC_SECURITY_HEADERS_ENABLED=true`) |

## Applied Headers

### Strict-Transport-Security (HSTS)
```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```
- **Enabled**: Only when `PUBLIC_INTERNET_ENABLED=true`
- **Rationale**: Forces HTTPS for 2 years. `preload` allows submission to browser preload lists.
- **Warning**: Do not set in intranet/NAS mode — it will break HTTP internal access.

### Content-Security-Policy (CSP)
```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self';
  frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'
```
- `script-src 'self'` — no inline scripts, no CDN scripts
- `style-src 'unsafe-inline'` — allowed because Vite inlines critical CSS; will be tightened with nonce in a future iteration
- `frame-ancestors 'none'` — prevents clickjacking (complements X-Frame-Options)
- `object-src 'none'` — disables Flash/plugins

### X-Content-Type-Options
```
X-Content-Type-Options: nosniff
```
Prevents browsers from MIME-sniffing response content. Applied to all responses including attachment downloads.

### Referrer-Policy
```
Referrer-Policy: strict-origin-when-cross-origin
```
Sends origin-only referrer for cross-origin requests, full URL for same-origin.

### X-Frame-Options
```
X-Frame-Options: DENY
```
Prevents the app from being embedded in an iframe on any domain. Redundant with CSP `frame-ancestors 'none'` but retained for older browser compatibility.

### Permissions-Policy
```
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
```
Restricts access to sensitive browser APIs the ERP does not use.

### Cross-Origin-Opener-Policy (COOP)
```
Cross-Origin-Opener-Policy: same-origin
```
Prevents cross-origin windows from accessing this window object, mitigating Spectre-class attacks.

### Cross-Origin-Resource-Policy (CORP)
```
Cross-Origin-Resource-Policy: same-origin
```
Prevents cross-origin requests from reading the response. Complements COOP.

## Attachment Download Headers

In addition to the above, attachment content responses always include:
```
Cache-Control: private, no-store
Content-Disposition: attachment
```
- `Cache-Control: private, no-store` — prevents proxy caching of sensitive documents
- `Content-Disposition: attachment` — forces download, prevents inline execution in browser

## What Is NOT Set

- `Cache-Control` on API JSON responses: intentionally not set here; set per-route as needed
- `Vary` headers: set by the CORS plugin
- `Access-Control-*`: managed by `@fastify/cors`

## Verification

After deployment, verify headers with:
```bash
curl -sI https://erp.example.com/api/app-version | grep -iE "Content-Security-Policy|X-Frame-Options|Strict-Transport|X-Content-Type|Referrer|Permissions"
```

All of the following must be present for `security-headers.txt` evidence:
- `Strict-Transport-Security` (public internet only)
- `Content-Security-Policy`
- `X-Content-Type-Options`
- `X-Frame-Options`
- `frame-ancestors` (within CSP)
