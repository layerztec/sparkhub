# SparkHub

Lightning Adresses built with Spark & Elysia.

## Development

* edit `src/config.ts`

```bash
# Install dependencies
bun install

# Start development server
bun run dev:full
```

## API Documentation

Swagger documentation is available at `http://localhost:3000/swagger` when the server is running.

## Deployment

Pushes to `master` run CI, then build and rsync to the VPS; the server reloads via Bun `--watch`.

See [docs/deploy.md](docs/deploy.md) for one-time server setup and GitHub secrets.
