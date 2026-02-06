# Repository Guidelines

## Project Structure & Module Organization
- `app/` holds the Next.js App Router routes, including `(auth)/`, `(dashboard)/`, and `app/api/` handlers.
- `app/(dashboard)/` contains inventory pages (products, consignments, and master data like categories, tags, locations, units).
- `app/api/` exposes JSON APIs for auth, products, consignments, filters, settings, and master data.
- `components/` groups UI by domain: `products/`, `consignments/`, `dashboard/`, `layout/`, and `ui/` (shadcn/ui + Radix).
- `lib/` contains shared logic: `auth/`, `db/`, `hooks/`, `products/`, `consignments/`, `validations/`, `utils/`.
- `prisma/` holds the schema, migrations, and seed script (`prisma/seed.ts`).
- `scripts/` contains data/maintenance tasks (`fix-arrival-dates.ts`, `import-images.ts`, `read-excel.ts`) and `vercel-build.js`.
- `tests/` is split into `unit/`, `integration/`, and `e2e/`.

## Build, Test, and Development Commands
- `make setup` (or `npm install`, `npm run db:migrate`, `npm run db:seed`) for first-time setup.
- `make dev` or `npm run dev` to start the local app (runs Prisma generate + Next dev).
- `make build` or `npm run build` for production build; `make start` or `npm run start` to run it.
- `npm run lint`, `npm run format`, `npm run format:check`, `npm run typecheck` for quality checks.
- `npm run test`, `npm run test:watch`, `npm run test:coverage` for unit/integration tests.
- `npm run test:e2e`, `npm run test:e2e:ui`, `npm run test:e2e:report` for Playwright.
- `npm run db:migrate`, `npm run db:migrate:deploy`, `npm run db:migrate:reset` for migrations.
- `npm run db:seed`, `npm run db:studio`, `npm run db:generate`, `npm run db:fix-dates` for DB tooling.
- `npm run vercel-build` is used in Vercel builds.

## Coding Style & Naming Conventions
- Prettier is the source of truth: 2-space indent, single quotes, no semicolons, print width 100.
- ESLint uses `next/core-web-vitals`.
- Tests are named `*.test.ts` in `tests/unit` and `tests/integration`, and `*.spec.ts` in `tests/e2e`.

## Testing Guidelines
- Unit/integration tests run with Vitest (`npm run test`).
- E2E tests run with Playwright (`npm run test:e2e`), with reports via `npm run test:e2e:report`.
- Keep new features covered at the appropriate level (unit for logic, e2e for critical flows).

## Commit & Pull Request Guidelines
- Follow Conventional Commits as seen in history: `feat:`, `fix:`, `perf:`, `docs:`, `test:`.
- PRs should include a clear summary, testing notes, and UI screenshots when applicable.
- Call out any schema/migration changes and how to seed or verify them.

## Security & Configuration
- Use `.env.example` as the baseline; do not commit real secrets.
- Prisma expects PostgreSQL via `DATABASE_URL` and `DIRECT_URL` (Supabase pooler URLs are documented).
- Required app settings include `SESSION_SECRET`, `NEXT_PUBLIC_APP_URL`, and Cloudinary keys.
- Dev-only admin auto-seed is controlled via `DEV_AUTO_SEED_ADMIN`, `DEV_ADMIN_USERNAME`, `DEV_ADMIN_PASSWORD`.

## Agent-Specific Notes
- Project rules and domain details live in `.claude/CLAUDE.md` and `TODO.md`.
- Deployment notes live in `DEPLOYMENT.md`.
