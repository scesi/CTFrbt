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

## License

See [LICENSE](./LICENSE).
