# Repository Guidelines

## Project Structure & Module Organization

Lumora Pay is split into `frontend/`, `backend/`, `contracts/`, and `docs/`. The frontend is a Vite React app with pages in `frontend/src/pages`, layout components in `frontend/src/components`, API clients in `frontend/src/services/api`, wallet/Stellar helpers in `frontend/src/services/stellar`, Zustand stores in `frontend/src/stores`, and assets in `frontend/src/assets` or `frontend/public`. The backend is a NestJS app with modules under `backend/src`, Prisma schema and migrations in `backend/prisma`, and tests in `backend/test` plus `*.spec.ts`. Soroban contracts live in `contracts/contracts/*/src`.

## Build, Test, and Development Commands

Frontend: run `npm run dev` in `frontend/` for Vite, `npm run build` for production build, `npm run typecheck` for TypeScript, and `npm run lint` for oxlint.

Backend: run `npm run start:dev` in `backend/`, `npm run build`, `npm run test`, `npm run test:e2e`, and `npm run lint`. Use `npx prisma migrate dev` and `npx prisma db seed` when changing database schema or seed data.

Contracts: run `cargo fmt --check`, `cargo test`, and `stellar contract build` from `contracts/`.

## Coding Style & Naming Conventions

Use TypeScript for frontend/backend and Rust for contracts. Keep frontend components in PascalCase, hooks/stores in camelCase, API files named by domain such as `payments.api.ts`, and Nest modules named `*.module.ts`, `*.service.ts`, `*.controller.ts`. Prefer centralized mappers/services over status conversion inside components. Do not add fake txHashes, fake contract IDs, or client-side secrets.

## Testing Guidelines

Backend unit tests use Jest with `*.spec.ts`; e2e tests use `backend/test/jest-e2e.json`. Frontend currently uses TypeScript build as the minimal test gate. For wallet flows, follow `docs/14_FREIGHTER_E2E_CHECKLIST.md`. For non-browser integration, use `scripts/test-full-integration.ts`.

## Commit & Pull Request Guidelines

Git history is unavailable in this workspace, so use concise imperative commits, for example `Add payment intent verification`. PRs should describe user-facing behavior, database or env changes, test results, screenshots for UI changes, and any remaining blockchain deployment limitations.

## Security & Configuration Tips

Never commit `.env`. Use `.env.example` only for non-secret placeholders. Frontend must use `VITE_*` public config only. Backend must verify XDR contents and Horizon/RPC results before changing invoice, payment, refund, or escrow state.
