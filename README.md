# Homewise Backend

[![CI](https://github.com/aleksa0206/HomeWise-Backend/actions/workflows/ci.yml/badge.svg)](https://github.com/aleksa0206/HomeWise-Backend/actions/workflows/ci.yml)

API for [Homewise](https://homewise.live), a household app where a family shares a monthly budget, bills, chores and a shopping list. Each household is a separate tenant in the same database.

Live: [homewise.live](https://homewise.live) | Frontend: [HomeWise-Frontend](https://github.com/aleksa0206/HomeWise-Frontend)

## What it does

- Households with `Owner` and `Member` roles
- Budget categories and a planned amount per category per month
- Income and expenses, filterable by month, type, category and member
- Recurring and one-off bills. Paying a bill adds the expense and moves the due date in one transaction
- Chores that can be assigned, claimed and repeated, with comments
- Shared shopping lists
- Notifications and an activity log for owners

## Stack

Node.js 24, TypeScript, Express 5, Prisma 7, MySQL 8, Zod, Pino, Jest + Supertest, Docker.

Started as a fork of [StaffAway-Backend](https://github.com/aleksa0206/StaffAway-Backend), so the structure and auth are the same: routes, controllers, services and repositories, JWT + refresh token cookie, optional 2FA. Every query is scoped to the user's household.

Money is stored as `Decimal(12,2)` and returned as a string, so there are no float rounding issues.

## Running locally

Needs Node.js 24 and MySQL 8 (or `docker-compose up -d`).

```bash
npm install
cp .env.example .env    # set JWT_SECRET and DB settings
npx prisma migrate deploy
npx prisma generate
npm run dev             # http://localhost:4000
```

### Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `PORT` | no | default `4000` |
| `NODE_ENV` | no | `development` / `test` / `production` |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | yes | on Windows use `127.0.0.1`, not `localhost` |
| `DATABASE_URL` | yes | only for Prisma CLI (migrations) |
| `JWT_SECRET` | yes | at least 32 characters |
| `FRONTEND_URL` | in production | CORS and reset links |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | in production | password reset emails |
| `TRUST_PROXY` | no | number of proxies in front of the app |
| `METRICS_TOKEN` | no | enables `GET /metrics` |

## API

| Area | Endpoints |
| --- | --- |
| Auth | `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/me`, `/auth/2fa/*` |
| Household | `GET/PUT /households/me` |
| Members | `GET/POST /users`, `GET/PUT/DELETE /users/:id` |
| Categories | `GET/POST /categories`, `GET/PUT/DELETE /categories/:id` |
| Budget | `GET /budgets/summary`, `PUT /budgets`, `DELETE /budgets/:id` |
| Transactions | `GET/POST /transactions`, `GET/PUT/DELETE /transactions/:id` |
| Bills | `GET/POST /bills`, `GET/PUT/DELETE /bills/:id`, `POST /bills/:id/pay` |
| Chores | `GET/POST /chores`, `GET/PUT/DELETE /chores/:id`, `POST /chores/:id/claim`, `/complete`, `/reopen` |
| Comments | `GET/POST /chores/:id/comments`, `PUT/DELETE /comments/:id` |
| Shopping | `/shopping-lists`, `/shopping-lists/:id/items`, `/shopping-items/:id` |
| Notifications | `GET /notifications`, `PUT /notifications/:id`, `POST /notifications/read-all` |
| Audit log | `GET /audit-logs` |
| Health | `GET /health` |

Lists are paginated with `?page&limit` and return `{ data, meta }`.

## Tests

Integration tests run against a real MySQL database from `.env.test`.

```bash
npm run test:migrate
npm test
```

## Deployment

`docker-compose.prod.yaml` runs MySQL, migrations, the API and the frontend on one server. It expects `../HomeWise-Frontend` next to this repo. In production it runs on my home server behind a Cloudflare Tunnel.

```bash
docker compose -p homewise --env-file .env.production -f docker-compose.prod.yaml up -d --build
```

Keep `DB_USER`, `DB_PASSWORD` and `DB_NAME` alphanumeric, they go into a connection URL.
