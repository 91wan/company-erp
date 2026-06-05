# Technical Debt Tracking

This document tracks engineering debt that should be handled in focused maintenance slices. It is not a feature roadmap.

## Prisma Repository Type Debt

Current priority for reducing `AnyPrisma` and `as any` usage:

- No active Prisma repository type-debt candidates are currently tracked.

Completed:

- `apps/api/src/infra/prisma/prismaProjectSitesRepository.ts` was hardened in the ProjectSites Prisma type-debt slice. It no longer relies on a broad `AnyPrisma` client or `as any` casts for project site, compliance, or usage issue behavior.
- `apps/api/src/infra/prisma/prismaReplenishmentRepository.ts` was hardened in the Replenishment Prisma type-debt slice. It no longer relies on a broad `AnyPrisma` client or `as any` casts for suggestion generation and replenishment-to-purchase conversion.
- `apps/api/src/infra/prisma/prismaMarketOperationsHandoffsRepository.ts` was hardened in the Market Operations Prisma type-debt slice. It now uses a narrow handoff delegate contract and typed include payloads for handoff list/detail/create/update behavior.
- `apps/api/src/infra/prisma/prismaInventoryRepository.ts` was hardened in the Inventory Prisma type-debt slice. It no longer relies on a broad `AnyPrisma` client or `as any` casts for movement mapping, purchase receiving rollup, and inventory balance aggregation behavior.
- `apps/api/src/infra/prisma/prismaImportJobRepository.ts` was hardened in the Import Job Prisma type-debt slice. It no longer relies on a broad `AnyPrisma` client or `as any` casts for preview context loading, row/job DTO mapping, confirmation transactions, and JSON row persistence.
- `apps/api/src/infra/prisma/prismaBusinessProjectsRepository.ts` was hardened in the Business Projects Prisma type-debt slice. It now uses a narrow Prisma contract and typed normalizers for project mapping and investment summary aggregation behavior.
- `apps/api/src/infra/prisma/prismaPeoplePermissionsRepository.ts` project-site assignment duplicate checks were hardened in the Project Site Assignment type-debt slice. The relation type filter no longer needs a broad cast.

## Maintenance Constraints

- Do not combine this cleanup with business feature changes.
- Preserve public API response shapes and existing route behavior.
- Add focused tests before replacing broad Prisma casts in each repository.

## CI Maintenance

- GitHub Actions official actions were upgraded to Node 24 runtime compatible major versions in the CI Node 24 Actions hardening slice: `actions/checkout@v5` and `actions/setup-node@v5`. The project test runtime remains Node 22.
