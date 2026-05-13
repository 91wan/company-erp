# Technical Debt Tracking

This document tracks engineering debt that should be handled in focused maintenance slices. It is not a feature roadmap.

## Prisma Repository Type Debt

Current priority for reducing `AnyPrisma` and `as any` usage:

1. `apps/api/src/prismaProjectSitesRepository.ts`
   - Highest priority because it combines project site master data, usage requests, external account scope, compliance summaries, and inventory issue behavior.
   - Refactor target: introduce narrow typed delegate interfaces for the query/update surfaces used by project site tests.

2. `apps/api/src/prismaReplenishmentRepository.ts`
   - Medium priority because replenishment suggestions depend on stock aggregation and conversion into purchasing records.
   - Refactor target: type the inventory balance query result and replenishment-to-purchase transaction boundary.

3. `apps/api/src/prismaMarketOperationsHandoffsRepository.ts`
   - Medium priority because it contains newer market/operations handoff behavior and permission-sensitive project references.
   - Refactor target: replace generic Prisma access with a typed repository client contract.

## Maintenance Constraints

- Do not combine this cleanup with business feature changes.
- Preserve public API response shapes and existing route behavior.
- Add focused tests before replacing broad Prisma casts in each repository.
