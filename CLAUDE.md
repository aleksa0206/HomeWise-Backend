# CLAUDE.md

## Project

HomeWise is a multi-tenant household API (Node.js/TypeScript, Express, Prisma/MySQL): shared budget, transactions and chores for a family. It was forked from StaffAway-Backend and keeps its architecture and auth stack. Every tenant is a `Household`; almost every model carries a `householdId` and all queries must be scoped to `req.user.householdId`.

## Commands

- Dev server: `npm run dev` · Build: `npm run build` · Tests: `npm test` (serial, `.env.test`)
- Single test file: `npx dotenv -e .env.test -- jest tests/chore.test.ts --runInBand`
- Test DB migrations: `npm run test:migrate` — run again after every new migration
- Format: `npm run format` / `npm run format:check`

`prismaClient.ts` connects via the Mariadb adapter from `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME`; `DATABASE_URL` is only for the Prisma CLI. On Windows use `DB_HOST=127.0.0.1`. `schema.prisma`'s datasource must not have a `url`.

## Architecture

`routes → controllers → services → repositories → Prisma`, plain exported functions, one file per resource per layer.

- Routes wire `authMiddleware`, `validate(zodSchema)` and `requireRole('Owner')`. Controllers are thin. Services hold business rules and authorization. Repositories are the only files that import `prismaClient`; multi-step writes use `prisma.$transaction` inside the repository.
- Errors extend `errors/AppError.ts`; `middleware/errorMiddleware.ts` maps them (and Prisma P2002/P2003/P2025) to HTTP. FKs are `ON DELETE RESTRICT`, so deleting a parent with children is a 409 — except a chore's comments, which `removeChoreWithComments` deletes with it.
- Roles: `Owner` manages the household (rename, add/remove members, change roles, audit log); everything else is open to every member. Owners cannot change their own role or delete themselves, so a household always keeps an Owner.
- Per-record rules: transactions are edited by their `userId` or an Owner; chores by the creator, the assignee or an Owner (an unassigned chore by anyone), deleted by the creator or an Owner; comments by the author or an Owner.
- Chores: `claim` and `complete` are guarded `updateMany`s on the row's current state, so concurrent requests cannot double-claim or double-complete (409). Completing a recurring chore creates the next occurrence in the same transaction (`utils/dates.ts#nextDueDate`, monthly clamps to month end).
- Bills: `payBill` is a guarded `updateMany` on the due date the client saw plus the expense `Transaction`, in one transaction; a one-off bill becomes `isActive=false`. Bills must use an Expense category.
- Shopping: everyone edits lists and items; only the creator or an Owner deletes a list (its items go with it). `checkedById` is set server-side.
- Notifications are created only by services (`choreService.notify`), never via a REST body; nobody is notified about their own action.
- Money is `Decimal(12,2)`; input goes through `validation/common.ts#money` (string, max 2 decimals) and is returned as a string. Calendar dates are `YYYY-MM-DD` stored as UTC midnight.
- New households get default categories (`householdRepository.DEFAULT_CATEGORIES`). Category type is not editable after creation.
- The DI container (`src/container`) only exists to swap the email service in tests.

## Conventions

- All code text is in English (errors, logs, emails, comments, test names); the frontend translates.
- `User.email` is globally unique: login looks up by email alone.
- List endpoints: `parsePagination` + `{ data, meta }`; query filters via `utils/queryParams.ts`, `compact()` for Prisma `where`; every `findMany` has an explicit `orderBy`.
