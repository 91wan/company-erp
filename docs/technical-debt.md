# Technical Debt Tracking

This document tracks engineering debt that should be handled in focused maintenance slices. It is not a feature roadmap.

## Prisma Repository Type Debt

Current priority for reducing `AnyPrisma` and `as any` usage:

1. `apps/api/src/prismaBusinessProjectsRepository.ts`
   - Lower priority, but still uses a broad Prisma client type for business project investment summaries.

Completed:

- `apps/api/src/prismaProjectSitesRepository.ts` was hardened in the ProjectSites Prisma type-debt slice. It no longer relies on a broad `AnyPrisma` client or `as any` casts for project site, compliance, or usage issue behavior.
- `apps/api/src/prismaReplenishmentRepository.ts` was hardened in the Replenishment Prisma type-debt slice. It no longer relies on a broad `AnyPrisma` client or `as any` casts for suggestion generation and replenishment-to-purchase conversion.
- `apps/api/src/prismaMarketOperationsHandoffsRepository.ts` was hardened in the Market Operations Prisma type-debt slice. It now uses a narrow handoff delegate contract and typed include payloads for handoff list/detail/create/update behavior.
- `apps/api/src/prismaInventoryRepository.ts` was hardened in the Inventory Prisma type-debt slice. It no longer relies on a broad `AnyPrisma` client or `as any` casts for movement mapping, purchase receiving rollup, and inventory balance aggregation behavior.
- `apps/api/src/prismaImportJobRepository.ts` was hardened in the Import Job Prisma type-debt slice. It no longer relies on a broad `AnyPrisma` client or `as any` casts for preview context loading, row/job DTO mapping, confirmation transactions, and JSON row persistence.

## Maintenance Constraints

- Do not combine this cleanup with business feature changes.
- Preserve public API response shapes and existing route behavior.
- Add focused tests before replacing broad Prisma casts in each repository.
