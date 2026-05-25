# CSRF / Origin Production Policy

本策略用于公司内网正式上线审批前的安全复核。它不改变当前 runtime 行为，只固定正式上线判断口径和下一阶段安全切片。

## Current Behavior

当前 unsafe methods 的 `Origin/Host` 检查在 `PUBLIC_ACCESS_ENABLED=true` 时启用；该模式还要求 HTTPS `CORS_ALLOWED_ORIGINS` 和安全 Cookie 配置。登录态请求已经使用 `X-CSRF-Token` 作为 non-GET CSRF header，前端 API client 会在 mutation 请求中携带该 token。

## 公司内网正式上线建议

如果系统通过浏览器访问且使用登录 Cookie，公司内网正式上线建议启用或专项评估 `Origin/Host` 检查与 CSRF token 策略。即使 `PUBLIC_ACCESS_ENABLED=false`，只要存在跨设备内网访问、反向代理、多域名入口或跨网段访问，也应评估是否增加内网 origin gate。

下一阶段建议新增或确认：

- `INTERNAL_ORIGIN_CHECK_ENABLED`: 在内网正式上线时独立启用 unsafe method 的 Origin/Host 校验。
- `AUTH_COOKIE_SAMESITE`: 明确 Cookie SameSite 策略，避免浏览器默认行为漂移。
- `non-GET CSRF header`: 保持所有业务 mutation 必须带 `X-CSRF-Token`，并在测试 helper 中显式获取 token 后再发起写操作。

## Blocking Boundary

- 如果只在可信 LAN + 同源 Nginx 下使用，且无跨网段、远程访问或公网反代，本项可作为 P1 风险复核，不阻断公司内网正式上线审批。
- 如果存在跨网段/远程/反代访问，本项升级为 P0：必须先完成 HTTPS、CORS allowlist、Origin/Host、CSRF token、Cookie SameSite、审计和附件下载专项验收。

## Explicit Non-Goals

- 本文档不允许公网暴露 API/PostgreSQL。
- 本文档不授权路由器端口转发。
- 本文档不把公司内网正式上线等同于公网 SaaS。
- 本文档不要求在本 slice 修改 runtime；runtime 修改应单独建安全 PR。
