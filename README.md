# Homewise — Backend

**Budget · Tasks · Home · Together**

REST API for [Homewise](https://homewise.live), a household app where a family shares one monthly budget, keeps track of bills, splits chores and keeps a common shopping list. Every household is an isolated tenant in the same database.

- Live: **https://homewise.live**
- Frontend: [HomeWise-Frontend](https://github.com/aleksa0206/HomeWise-Frontend) (Angular)

## Features

- **Households and members** — public sign-up creates a household with the caller as its `Owner`; the Owner adds family members (`Owner` / `Member`) and manages roles. A household always keeps at least one Owner.
- **Budget** — income and expense categories (sensible defaults on sign-up), a planned amount per category per month, and a monthly summary of planned vs. actual with the balance.
- **Transactions** — income and expenses recorded by anyone, on behalf of any member ("who paid"), filterable by month, type, category and member.
- **Bills** — recurring (weekly, monthly, yearly) or one-off payments with a responsible member. Paying a bill records the expense and moves it to its next due date in a single transaction, so a double click cannot pay a period twice.
- **Chores** — anyone creates a task and assigns it to anyone or leaves it open; anyone can claim an open task; the assignee can hand it over. Tasks have a due date, a priority and can repeat — completing a recurring task creates the next one.
- **Shopping lists** — shared lists where everyone adds and ticks off items; the server records who added and who checked each item.
- **Comments, notifications, activity log** — comments on tasks; notifications when someone assigns you a task or a bill, completes your task or comments on it; an audit log for Owners.
- **Calendar data** — due-date filters on tasks and bills and date filters on transactions back the shared calendar in the frontend.

## Security

- Short-lived JWT access token (15 min) in the response body; opaque refresh token, stored hashed, rotated on every use and sent only as an `httpOnly`, `sameSite=strict` cookie.
- Optional TOTP two-factor authentication. The temporary 2FA token is rejected everywhere except the verification endpoint.
- Account lockout after 5 failed logins, timing-safe login (no account enumeration), hashed and expiring password-reset tokens.
- DB-backed rate limiting, so limits hold across instances.
- Every query is scoped to the caller's household; cross-household access returns 403/404.
- Environment variables are validated at startup.

## Tech stack

Node.js 24 · TypeScript · Express 5 · Prisma 7 (MariaDB adapter) on MySQL 8 · Zod · Pino · Jest + Supertest · Nodemailer · Docker · Prometheus metrics

Layered architecture: `routes → controllers → services → repositories → Prisma`. Business rules and authorization live in services; only repositories touch the database.

## Getting started

Requirements: Node.js 24 and MySQL 8 (local install or `docker-compose up -d`).

```bash
npm install
cp .env.example .env            # set JWT_SECRET (at least 32 characters) and the DB settings
npx prisma migrate deploy
npx prisma generate
npm run dev                     # http://localhost:4000
```

Then create the first household with `POST /auth/register` (or through the frontend at `/register`).

### Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `PORT` | no | Default `4000` |
| `NODE_ENV` | no | `development` / `test` / `production` |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | yes | Used by the app. On Windows use `127.0.0.1`, not `localhost` |
| `DATABASE_URL` | yes | Used only by the Prisma CLI (migrations) |
| `JWT_SECRET` | yes | At least 32 characters |
| `FRONTEND_URL` | in production | CORS origin and password-reset links |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | in production | Password-reset emails |
| `TRUST_PROXY` | no | Number of reverse proxies in front of the app (default `0`) |
| `METRICS_TOKEN` | no | Enables `GET /metrics` for Prometheus |

## API overview

| Area | Endpoints |
| --- | --- |
| Auth | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/forgot-password`, `/auth/reset-password`, `GET /auth/me`, 2FA under `/auth/2fa/*` |
| Household | `GET /households/me`, `PUT /households/me` (Owner) |
| Members | `GET/POST /users`, `GET/PUT/DELETE /users/:id` (create/delete: Owner) |
| Categories | `GET/POST /categories`, `GET/PUT/DELETE /categories/:id` |
| Budget | `GET /budgets/summary?year&month`, `PUT /budgets` (upsert), `DELETE /budgets/:id` |
| Transactions | `GET /transactions?from&to&type&categoryId&userId`, `POST`, `GET/PUT/DELETE /transactions/:id` |
| Bills | `GET /bills?isActive&dueTo&responsibleId`, `POST`, `GET/PUT/DELETE /bills/:id`, `POST /bills/:id/pay` |
| Chores | `GET /chores?status&assigneeId&unassigned&dueFrom&dueTo`, `POST`, `GET/PUT/DELETE /chores/:id`, `POST /chores/:id/claim`, `/complete`, `/reopen` |
| Comments | `GET/POST /chores/:id/comments`, `PUT/DELETE /comments/:id` |
| Shopping | `GET/POST /shopping-lists`, `GET/PUT/DELETE /shopping-lists/:id`, `GET/POST /shopping-lists/:id/items`, `POST /shopping-lists/:id/clear-checked`, `PUT/DELETE /shopping-items/:id` |
| Notifications | `GET /notifications?isRead`, `PUT /notifications/:id`, `POST /notifications/read-all`, `DELETE /notifications/:id` |
| Audit log | `GET /audit-logs` (Owner) |
| Health | `GET /health` |

Lists are paginated (`?page&limit`, max 100) and return `{ data, meta }`. Money is sent as a number or a string with up to two decimals and returned as a string (no float rounding). Dates are `YYYY-MM-DD`.

## Tests

Integration tests run against a real MySQL database configured in `.env.test` (same variables, separate database).

```bash
npm run test:migrate   # after every new migration
npm test
```

CI (GitHub Actions) runs formatting, type checking and the full test suite against MySQL 8, and builds the Docker image.

## Deployment

`docker-compose.prod.yaml` runs MySQL, a one-shot migration container, the API and the frontend (nginx, which also proxies `/api`) on a single host. The frontend repository is expected next to this one (`../HomeWise-Frontend`).

```bash
docker compose -p homewise --env-file .env.production -f docker-compose.prod.yaml up -d --build
```

Production runs on a home server behind a Cloudflare Tunnel — no ports are open to the internet. Keep `DB_USER`, `DB_PASSWORD` and `DB_NAME` alphanumeric: they are interpolated into a connection URL.
