# Repository Guidelines

## Project Structure & Module Organization
The platform is a Next.js 15 app router project. Pages, API routes, and server components live under `app/`. Shared UI lives in `components/`, with reusable primitives in `components/ui/`. Business logic and integrations (authentication, data access, helpers) sit in `lib/`. Database schemas, migrations, and SQL snapshots are kept in `drizzle/`, with `drizzle.config.ts` configuring Drizzle ORM. Email templates are in `emails/`, static assets in `public/`, and operational scripts in `scripts/`. Reference docs for deployments, setup, and validation live under `docs/` and the root markdown guides.

## Build, Test, and Development Commands
- `npm run dev` – starts the Next.js development server with hot reload and API routes.
- `npm run build` – produces the production bundle; run before deployment checks.
- `npm run start` – serves the built app locally for smoke tests.
- `npm run lint` – runs Next.js ESLint rules and TypeScript checks.
- `npm run db:generate`, `db:migrate`, `db:push`, `db:studio` – manage Drizzle migrations and inspect schema state. Always commit resulting SQL files under `drizzle/`.
- `./test-production.sh` and related `test-*.sh` scripts – exercise critical API and AI integrations against configured environments.

## Coding Style & Naming Conventions
Code is TypeScript-first with React Server Components by default. Use 2-space indentation and prefer explicit return types on exported functions. Component files should be PascalCase (`ProjectOverview.tsx`), hooks and utilities camelCase (`useProjects.ts`). Tailwind utility classes drive styling; keep class lists ordered logically (layout → spacing → typography). Run `npm run lint` and address autofixes before submitting.

## Testing Guidelines
Automated unit tests are limited; rely on integration checks documented in `TESTING.md`. Add lightweight component or server tests when introducing new logic. Name new test utilities with the `.test.ts` suffix alongside source files or in a `__tests__` folder. For API validation, follow the curl examples in `TESTING.md` after authenticating via `npm run dev`. Capture regressions by running the `test-*.sh` scripts relevant to the feature area.

## Commit & Pull Request Guidelines
Git history follows conventional commits (`feat:`, `fix:`, `chore:`). Scope summaries to ~72 characters and describe intent, not implementation details. For pull requests, include: 1) the feature or fix summary, 2) linked Linear/GitHub issue IDs, 3) screenshots or terminal output for UI/API changes, and 4) notes on database or configuration updates. Ensure migrations, env var additions, and documentation updates accompany the PR when applicable.
