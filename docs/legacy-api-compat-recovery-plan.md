# Legacy API Compatibility Recovery Plan

Last updated: 2026-02-06
Status: Implemented on main (2026-02-06)

## Goal
Restore legacy API contracts for `/products` and `/consignments` screens after the `/api/items` migration, so existing UI flows work without changes.

## Scope from review
1. `POST /api/consignments` must inject `itemType` and return `{ consignment }`.
2. Legacy print APIs must accept `POST` again.
3. Legacy IDs APIs must keep `productIds`/`consignmentIds`.
4. Legacy bulk APIs must keep old HTTP methods/body keys and quantity mode mapping.
5. Legacy list APIs must keep `products`/`consignments` keys.
6. Master APIs must keep legacy `_count` keys used by current UI.

## Branch plan and order
Implementation order follows severity and dependency:

1. `fix/legacy-p1-consignments-contract`
2. `fix/legacy-p1-print-post-compat`
3. `fix/legacy-p1-bulk-compat`
4. `fix/legacy-p2-list-and-ids-response-compat`
5. `fix/legacy-p2-master-count-compat`

Merge order should be the same as above.

## Workstream details

### 1) `fix/legacy-p1-consignments-contract`
Files:
- `app/api/consignments/route.ts`

Required behavior:
- `GET /api/consignments` returns legacy shape: `{ consignments, pagination }`.
- `POST /api/consignments` accepts old body (without `itemType`), injects `itemType: 'CONSIGNMENT'` before calling items API.
- `POST /api/consignments` returns legacy shape: `{ consignment }` (mapped from `{ item }`).
- Preserve status code and error body pass-through as much as possible.

Regression targets:
- `app/(dashboard)/consignments/new/page.tsx`
- `app/(dashboard)/consignments/page.tsx`

### 2) `fix/legacy-p1-print-post-compat`
Files:
- `app/api/products/print/route.ts`
- `app/api/consignments/print/route.ts`

Required behavior:
- Keep `GET` support.
- Re-add `POST` support for legacy clients.
- Accept legacy body keys:
  - products: `productIds`
  - consignments: `consignmentIds`
- Map response key:
  - products route returns `{ products }`
  - consignments route returns `{ consignments }`

Regression targets:
- `app/(dashboard)/products/print/page.tsx`
- `app/(dashboard)/consignments/print/page.tsx`

### 3) `fix/legacy-p1-bulk-compat`
Files:
- `app/api/consignments/bulk/route.ts`
- `app/api/consignments/bulk/edit/route.ts`
- `app/api/products/bulk/delete/route.ts`
- `app/api/products/bulk/edit/route.ts`

Required behavior:
- Keep legacy methods:
  - `/api/consignments/bulk` must support `DELETE`.
  - existing `POST` variants should keep working where already used.
- Keep legacy body keys:
  - `productIds`/`consignmentIds` -> `ids` for items API.
- Map quantity mode:
  - legacy `increment` -> items API `adjust`.
- Preserve legacy response compatibility (`success`, `message`, counts).

Regression targets:
- `app/(dashboard)/products/page.tsx`
- `app/(dashboard)/consignments/page.tsx`

### 4) `fix/legacy-p2-list-and-ids-response-compat`
Files:
- `app/api/products/route.ts`
- `app/api/consignments/route.ts`
- `app/api/products/ids/route.ts`
- `app/api/consignments/ids/route.ts`

Required behavior:
- List endpoints:
  - `/api/products` returns `{ products, pagination }`
  - `/api/consignments` returns `{ consignments, pagination }`
- IDs endpoints:
  - `/api/products/ids` returns `{ productIds }`
  - `/api/consignments/ids` returns `{ consignmentIds }`

Regression targets:
- `app/(dashboard)/products/page.tsx`
- `app/(dashboard)/consignments/page.tsx`

### 5) `fix/legacy-p2-master-count-compat`
Files:
- `app/api/tags/route.ts`
- `app/api/categories/route.ts`
- `app/api/manufacturers/route.ts`
- `app/api/locations/route.ts`
- `app/api/units/route.ts`

Required behavior:
- Keep `_count.items` for new model if needed.
- Also provide legacy keys consumed by current UI:
  - categories/manufacturers/locations/units: `_count.products`
  - tags: `_count.products` and `_count.consignments`
- Values can be derived from `items` as compatibility aliases until UI migration is done.

Regression targets:
- `app/(dashboard)/tags/page.tsx`
- `app/(dashboard)/categories/page.tsx`
- `app/(dashboard)/manufacturers/page.tsx`
- `app/(dashboard)/locations/page.tsx`
- `app/(dashboard)/units/page.tsx`

## Resume checklist
Use this section to restart work quickly.

1. Confirm working tree and base branch:
   - `git status --short --branch`
2. Create/switch to target branch for next unchecked workstream.
3. Edit only listed files for that workstream.
4. Run minimum checks:
   - `npm run typecheck`
   - `npm run test`
5. Manual smoke checks:
   - products list load, select all filtered, bulk edit/delete, print.
   - consignments list load, create new, select all filtered, bulk edit/delete, print.
   - master pages show non-zero counts when data exists.
6. Commit with conventional message.
7. Mark progress below.

## Progress tracker
- [x] 1) `fix/legacy-p1-consignments-contract`
- [x] 2) `fix/legacy-p1-print-post-compat`
- [x] 3) `fix/legacy-p1-bulk-compat`
- [x] 4) `fix/legacy-p2-list-and-ids-response-compat`
- [x] 5) `fix/legacy-p2-master-count-compat`

## Notes
- Keep adapter-level compatibility in API routes first; do not force UI updates in the same fix pass.
- This repository currently has many in-progress changes; do not reset unrelated files.
