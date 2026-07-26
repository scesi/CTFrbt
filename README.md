# CTFrbt

> Retro terminal-themed CTF platform — orbital-ctf aesthetic meets macOS terminal.

## Stack

| Layer     | Technology                |
| --------- | ------------------------- |
| Framework | Next.js 15 (App Router)   |
| Runtime   | Node.js                   |
| Database  | PostgreSQL + Prisma ORM   |
| Auth      | NextAuth.js (Credentials) |
| Styles    | Vanilla CSS (CRT effects) |
| UI        | React 19                  |

## Development

```bash
# Install dependencies
pnpm install

# Set up environment
cp .env.example .env

# Generate Prisma client
pnpm prisma:generate

# Run database migrations
pnpm prisma:migrate

# Start dev server
pnpm dev
```

## Testing

Vitest, split into two projects: **unit** (no database) and **integration**
(runs against an ephemeral Postgres). Integration tests need the `postgres-test`
container up and a `.env.test` file.

```bash
# One-time: create the test env file
cp .env.test.example .env.test

# Start the ephemeral test database (tmpfs, port 5434)
docker compose up -d postgres-test

# Run everything (migrations are applied automatically)
pnpm test

# Or target one project
pnpm test:unit
pnpm test:integration

# Watch mode
pnpm test:watch
```

| Script                  | What it runs                         |
| ----------------------- | ------------------------------------ |
| `pnpm test`             | All tests once (unit + integration)  |
| `pnpm test:unit`        | Unit only — fast, no database        |
| `pnpm test:integration` | Integration only — needs the test DB |
| `pnpm test:watch`       | Re-run on change                     |

Tests live in `tests/` (`unit/`, `integration/`, plus shared `helpers/` and
`setup/`). The test database is disposable — the suite truncates every table
between tests, so never point `DATABASE_URL` at real data.

## License

See [LICENSE](./LICENSE).
