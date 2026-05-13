# Technical Debt Tracking

This document tracks engineering debt that should be handled in focused maintenance slices. It is not a feature roadmap.

## Prisma Repository Type Debt

Current priority for reducing `AnyPrisma` and `as any` usage:

1. `apps/api/src/prismaMarketOperationsHandoffsRepository.ts`
   - Medium priority because it contains newer market/operations handoff behavior and permission-sensitive project references.
   - Refactor target: replace generic Prisma access with a typed repository client contract.

Completed:

- `apps/api/src/prismaProjectSitesRepository.ts` was hardened in the ProjectSites Prisma type-debt slice. It no longer relies on a broad `AnyPrisma` client or `as any` casts for project site, compliance, or usage issue behavior.
- `apps/api/src/prismaReplenishmentRepository.ts` was hardened in the Replenishment Prisma type-debt slice. It no longer relies on a broad `AnyPrisma` client or `as any` casts for suggestion generation and replenishment-to-purchase conversion.

## Maintenance Constraints

- Do not combine this cleanup with business feature changes.
- Preserve public API response shapes and existing route behavior.
- Add focused tests before replacing broad Prisma casts in each repository.
