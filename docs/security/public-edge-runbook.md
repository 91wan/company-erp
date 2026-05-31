# Public Internet Edge Runbook

This runbook describes the required network architecture and edge security configuration when `PUBLIC_INTERNET_ENABLED=true`. It must be reviewed and signed off before public go-live.

## Architecture

```
Internet → CDN / WAF / Reverse Proxy (HTTPS 443) → Company ERP Web/API
```

- The reverse proxy terminates TLS and forwards requests to the internal API over the internal network.
- PostgreSQL is **never** exposed to the public internet — only the API container communicates with it.
- `NAS_ATTACHMENTS_ROOT` is **never** exposed to the public internet — attachments are served exclusively through authenticated API endpoints.
- NAS root folders, SMB/WebDAV shares, and raw attachment paths must not be published through the reverse proxy or CDN.
- The API container must **never** be accessible via a direct public IP:port.

## TLS Requirements

1. Only HTTPS on port 443 is allowed for public access.
2. HTTP port 80 must redirect to HTTPS (`301 Moved Permanently`).
3. TLS 1.2 minimum, TLS 1.3 preferred. Disable SSLv3, TLS 1.0, TLS 1.1.
4. Cipher suites must exclude known weak ciphers (RC4, DES, 3DES, export ciphers).
5. TLS certificates must be from a trusted CA (Let's Encrypt is acceptable).
6. Certificates must renew automatically (e.g., certbot cron or ACME integration).
7. Verify certificate validity before go-live: `openssl s_client -connect <domain>:443 -servername <domain>`

## HSTS

Set by application when `PUBLIC_INTERNET_ENABLED=true`:
```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

The reverse proxy may also set this header — the application always sets it as a defense in depth.

## Security Headers

The application sets all security headers when `PUBLIC_SECURITY_HEADERS_ENABLED=true`. Verify they are present on live responses:

```
Content-Security-Policy: default-src 'self'; ...
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

## WAF / Bot Protection

1. A WAF (e.g., Cloudflare, Nginx ModSecurity, AWS WAF) is required before public go-live.
2. WAF must be configured for:
   - OWASP CRS (Core Rule Set) rules at minimum.
   - Rate limiting for login endpoints.
   - Bot challenge / CAPTCHA on login if available.
   - Block requests with suspicious patterns (SQL injection, XSS, path traversal).
3. Record the WAF provider in `public-go-live-manifest.json`.
4. Redacted WAF config must be included in `waf-config.redacted.txt` evidence.

## Upload and Download Limits

- Maximum upload size: set in reverse proxy and API multipart config (`MAX_UPLOAD_SIZE_MB`).
- Attachment download rate limit: configured via `ATTACHMENT_DOWNLOAD_RATE_LIMIT_MAX_PER_IP`.
- Import preview rate limit: configured via `IMPORT_PREVIEW_RATE_LIMIT_MAX_PER_IP`.

## Log Management

- Reverse proxy access logs must be enabled.
- Sensitive headers (Authorization, Cookie, Set-Cookie) must be excluded from logs.
- Logs must be retained for at least 90 days.
- Log analysis must be set up to alert on: 401/403 spikes, 5xx spikes, unusual upload volumes.

## IP Allowlist (Optional)

If the ERP is only used by headquarters staff, consider IP allowlisting at the WAF/reverse proxy layer to restrict public internet access to known corporate IP ranges. This significantly reduces attack surface.

## Prohibited

- 路由器端口转发直连 API/PostgreSQL（不允许）
- 公网直接暴露 PostgreSQL 端口（不允许）
- 公网直接暴露 NAS_ATTACHMENTS_ROOT（不允许）
- 通过 CDN、Nginx alias、静态目录或 NAS 分享链接暴露附件根目录（不允许）
- HTTP 明文传输业务数据（不允许）
- 绕过 HTTPS（不允许）

## Pre-Go-Live Checklist

- [ ] DNS A/CNAME records pointing to reverse proxy confirmed
- [ ] TLS certificate valid and auto-renewal configured
- [ ] HTTP → HTTPS redirect verified
- [ ] HSTS header present in curl output
- [ ] WAF enabled and tested
- [ ] Security headers verified with `curl -I https://<domain>`
- [ ] PostgreSQL port not reachable from internet
- [ ] NAS attachment root not reachable from internet
- [ ] Reverse proxy config redacted copy saved to evidence
- [ ] WAF config redacted copy saved to evidence
