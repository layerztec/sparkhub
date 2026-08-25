# Production deployment

SparkHub deploys automatically when CI passes on a push to `master`.

```text
push master → CI → GitHub Actions (install + build) → rsync to VPS → --watch reloads
```

The app is **built on GitHub Actions** (`bun install` + `bun run build`), then **rsynced in bulk** to the VPS (including `node_modules`). Server config files on the VPS are never overwritten (see `deploy.exclude`). The server runs **`bun run start:watch`** and reloads when rsync updates files.

## One-time VPS setup

Git is not required on the server for deploys.

### 1. Deploy user and directory

```bash
sudo mkdir -p /var/www/sparkhub
sudo useradd --system --home-dir /var/www/sparkhub --shell /bin/bash deploy
sudo chown -R deploy:deploy /var/www/sparkhub
```

### 2. Install Bun (as the deploy user)

```bash
sudo -iu deploy bash -lc 'curl -fsSL https://bun.sh/install | bash'
```

Bun will install to `/var/www/sparkhub/.bun/bin/bun`. Verify:

```bash
sudo -iu deploy bash -lc 'which bun && bun --version'
```

### 3. Production configuration

Create config on the server before the first deploy (these paths are excluded from rsync):

```bash
cd /var/www/sparkhub
mkdir -p src
# copy or create src/config.ts and src/config-server.ts
```

- `src/config.ts` — public domain
- `src/config-server.ts` — SQLite path, wallet seed, TLS cert paths

Ensure TLS certificate files exist at the paths referenced in `config-server.ts`.

Binding to port 443 usually requires:

```bash
sudo setcap 'cap_net_bind_service=+ep' /var/www/sparkhub/.bun/bin/bun
```

### 4. Keep the server running (pick one)

**Option A — PM2**

Run all of this as the `deploy` user (e.g. `sudo -iu deploy`):

```bash
cd /var/www/sparkhub
pm2 start /var/www/sparkhub/.bun/bin/bun --name sparkhub -- run start:watch
pm2 save
pm2 startup   # run the command it prints (as root)
```

**Option B — systemd**

```bash
sudo tee /etc/systemd/system/sparkhub.service <<'EOF'
[Unit]
Description=SparkHub
After=network.target

[Service]
Type=simple
User=deploy
WorkingDirectory=/var/www/sparkhub
Environment=HOME=/var/www/sparkhub
ExecStart=/var/www/sparkhub/.bun/bin/bun run start:watch
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now sparkhub
```

Adjust the `bun` path if needed (`sudo -iu deploy which bun`).

### 5. First deploy

Merge this repo’s CD setup to `master`, add GitHub secrets (below), and let the **Deploy** workflow run. It will rsync the built app to the server.

If the app directory is empty, create `src/config.ts` and `src/config-server.ts` first, then run **Actions → Deploy → Run workflow**.

### 6. SSH credentials for GitHub Actions

| Secret | Description |
|--------|-------------|
| `SSH_HOST` | VPS hostname or IP |
| `SSH_USER` | `deploy` |
| `SSH_PASSWORD` | Deploy user password |
| `SSH_PORT` | Optional; default `22` |

Optional repository **variables**:

| Variable | Default |
|----------|---------|
| `DEPLOY_PATH` | `/var/www/sparkhub` |

### 7. Branch protection (recommended)

On `master`, require the **CI** workflow to pass before merge.

## What gets synced

`deploy.exclude` keeps server-only files safe:

- `src/config.ts`, `src/config-server.ts`
- `.git/`, tests, docs, local SQLite files

## Day-to-day operations

- **Deploy**: push to `master` (after CI passes) or **Actions → Deploy → Run workflow**.
- **Logs**: `pm2 logs sparkhub` or `journalctl -u sparkhub -f`
- **Rollback**: in **Actions → Deploy → Run workflow**, pick the branch or tag at the revision you want to ship. The workflow checks out the dispatched ref. For a fast revert, `git revert` and push to `master`.

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Deploy workflow skipped | CI must pass on a **push** to `master`. |
| Config overwritten | Paths must stay listed in `deploy.exclude`. |
| Server did not reload | Process must use `bun run start:watch`. |
| `bun: command not found` | Bun not on deploy user `PATH`. |
| Permission denied on 443 | `setcap` on `bun` or reverse proxy on 443. |
