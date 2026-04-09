# Ferret Watch

Real-time npm supply chain security monitor. Watches the npm registry for new versions of popular packages, diffs the code changes, and flags suspicious behavior — before developers install the update.

**Live:** [ferretwatch.dev](https://ferretwatch.dev) | **Alerts:** [ferretwatch.dev/alerts](https://ferretwatch.dev/alerts) | **API Docs:** [ferretwatch.dev/docs](https://ferretwatch.dev/docs) | **RSS:** [ferretwatch.dev/feed.xml](https://ferretwatch.dev/feed.xml)

```
npm registry ──> Watcher ──> Redis Queue ──> Scanner ──> Postgres ──> API
                (polls)       (BullMQ)      (diff+AST)   (results)   (feed)
                                                 │
                                                 └──> Alerter ──> /alerts page
```

## How It Works

1. **Watcher** polls the npm registry every 5 minutes for new versions of 150+ popular packages
2. New versions are enqueued as scan jobs via **BullMQ** (Redis-backed, with deduplication and retries)
3. **Scanner** downloads both old and new tarballs, extracts, and diffs the source files
4. Changed files are parsed into ASTs using **Babel** and analyzed for known attack patterns
5. A **risk score** (0–100) is computed. High-risk scans trigger alerts
6. **Alerter** creates an alert record when suspicious changes are detected
7. Results are available via the **API**, **live dashboard**, **alerts page**, and **Atom feed**

## Detection Engine

The scanner uses two categories of detection rules, designed based on analysis of real npm supply chain attacks (event-stream, ua-parser-js, eslint-scope, node-ipc, coa/rc, crossenv).

### Direct Code Execution

| Pattern | Severity | Description |
|---------|----------|-------------|
| `eval()` | Critical | Direct code execution from string |
| `new Function()` | Critical | Dynamic function construction |
| `module._compile()` | Critical | Internal Node.js code compilation (event-stream pattern) |
| `vm.runInNewContext()` | Critical | Sandboxed code execution |

### Composite Attack Patterns

These detect suspicious **combinations** of APIs within the same file — individual calls (like `fetch()` or `fs.writeFile()`) are not flagged on their own since they're normal in most packages.

| Pattern | Based On | Detects |
|---------|----------|---------|
| Credential file read + network request | eslint-scope | Reading `.npmrc`/`.env`/`.ssh` and exfiltrating via HTTP |
| `path.join()` with credential paths + network | eslint-scope | Computed credential path access (e.g., `path.join(home, '.npmrc')`) |
| `JSON.stringify(process.env)` + network | crossenv | Serializing all env vars and sending them out |
| `child_process` + shell download (`curl\|bash`) | ua-parser-js, coa | Install-time remote code execution |
| `crypto.createDecipher` + `eval`/`module._compile` | event-stream | Decrypting and executing hidden payloads |
| Base64 decode + code execution | various | Obfuscated code execution |
| `process.platform` switch + `child_process` | ua-parser-js, coa | Platform-specific malware delivery |
| Recursive directory walk + `fs.writeFile` | node-ipc | Destructive file overwrite (protestware) |
| IP geolocation API + destructive action | node-ipc | Geo-targeted attacks |

### Lifecycle Script Detection

New or modified lifecycle scripts in `package.json` are flagged — these are the #1 attack vector in npm supply chain attacks.

**Monitored scripts:** `preinstall`, `install`, `postinstall`, `prepare`, `prepack`, `postpack`, `prepublishOnly`

Safe patterns are whitelisted: `node-gyp-build`, `prebuild-install`, `node-pre-gyp`, `husky`, `patch-package`.

### Destructured Import Detection

Detects dangerous API usage even through destructured requires:

```javascript
// Both patterns are caught:
const cp = require('child_process'); cp.exec(cmd);
const { exec } = require('child_process'); exec(cmd);
```

Applies to both `child_process` and `fs` write methods.

### Noise Reduction

To minimize false positives, the scanner:
- Only flags **newly introduced** patterns (diffs old vs new AST by content fingerprint)
- Always diffs against the **previous npm version** (from registry `time` field, not our DB)
- Skips `dist/`, `test/`, `examples/`, `benchmark/` directories
- Skips minified files (`.min.js`, `-min.js`, bundled files)
- Skips files with lines > 5000 chars (minified content detection)
- Skips `.d.ts` type declaration files

## Dashboard Features

- **Package search** with debounced input
- **Filter pills**: All / Flagged / Alerted
- **Scan detail pages** with risk score, detection flags, alert history, and print support
- **Package history** — view all scans for a specific package over time
- **Alerts timeline** at `/alerts` — blog-style page of all security alerts
- **Atom/RSS feed** at `/feed.xml` for flagged scans

## API

Full documentation at [ferretwatch.dev/docs](https://ferretwatch.dev/docs).

| Endpoint | Description |
|----------|-------------|
| `GET /alerts` | Security alerts timeline (HTML for browsers, JSON for API clients) |
| `GET /feed` | Paginated feed of recent scans (supports `?search=`, `?minScore=`, `?alerted=`) |
| `GET /scan/:package` | Scan history for a package |
| `GET /scan/:package/:version` | Detailed scan results (HTML for browsers, JSON for API clients) |
| `GET /stats` | Dashboard statistics |
| `GET /feed.xml` | Atom feed of flagged scans |
| `GET /docs` | API documentation |
| `GET /healthz` | Health check |

## Project Structure

```
ferret/
├── packages/
│   ├── scanner/          # BullMQ worker: download, diff, analyze
│   ├── watcher/          # npm registry poller + package seeding
│   ├── api/              # Fastify API + landing page (ferretwatch.dev)
│   └── alerter/          # Creates alert records for high-risk scans
├── shared/
│   ├── db/               # Prisma schema + client
│   ├── queue/            # BullMQ queues (scan + alert) + Redis connection
│   └── types/            # Zod schemas, shared types, config
├── docker-compose.yml    # Postgres 16 + Redis 7 (local dev)
├── Dockerfile            # Multi-stage build for Railway deployment
└── pnpm-workspace.yaml
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Language | TypeScript (ES2022) |
| Runtime | Node.js 20 |
| Monorepo | pnpm workspaces |
| Queue | BullMQ + Redis |
| Database | PostgreSQL + Prisma |
| API | Fastify |
| AST Parsing | @babel/parser + @babel/traverse |
| Alerting | Built-in /alerts page + Atom feed |
| Validation | Zod |
| Logging | Pino (structured JSON with ISO timestamps) |
| Deployment | Railway |

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- Docker (for Postgres + Redis)

### Setup

```bash
git clone https://github.com/gunrmic/ferret.git
cd ferret
pnpm install

# Start infrastructure
docker compose up -d

# Create .env from template
cp .env.example .env

# Generate Prisma client and run migrations
pnpm db:generate
pnpm db:migrate
```

### Run

```bash
# Terminal 1 — scanner worker
pnpm dev:scanner

# Terminal 2 — watcher (seeds packages on first run)
pnpm dev:watcher

# Terminal 3 — API + dashboard
pnpm dev:api

# Terminal 4 — alerter
pnpm dev:alerter
```

### Health Checks

| Service | URL |
|---------|-----|
| Watcher | http://localhost:3001 |
| Scanner | http://localhost:3002 |
| API | http://localhost:3003/healthz |
| Alerter | http://localhost:3004 |

Health checks verify Redis and Postgres connectivity — they return 503 when dependencies are down.

## Configuration

All configuration is via environment variables (validated with Zod at startup):

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | — | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `NPM_REGISTRY_URL` | `https://registry.npmjs.org` | npm registry URL |
| `MIN_WEEKLY_DOWNLOADS` | `100000` | Minimum weekly downloads to monitor |
| `SCAN_INTERVAL_MINUTES` | `5` | Poll interval for new versions |
| `SCANNER_CONCURRENCY` | `3` | Concurrent scan jobs |
| `PORT` | `3003` | API server port |
| `CORS_ORIGIN` | `http://localhost:3003` | Allowed CORS origin |
| `SITE_URL` | `https://ferretwatch.dev` | Base URL for alert links |

## Deployment

Deployed on [Railway](https://railway.app) with 6 services:

- **Postgres** — managed database
- **Redis** — managed Redis
- **Watcher** — polls npm registry
- **Scanner** — processes scan jobs
- **API** — public feed + dashboard at ferretwatch.dev
- **Alerter** — creates alert records for high-risk scans

Each service uses the same multi-stage Dockerfile with a different start command.

## Reliability

- **Database indexes** on Scan(packageName, version), Scan(scannedAt), Alert(scanId)
- **Error boundaries** — all API routes wrapped in try-catch
- **Real health checks** — ping Redis + Postgres, return 503 when down
- **Graceful shutdown** with 30s timeout across all services
- **Queue backpressure** — watcher skips poll cycles when scan queue is backed up
- **DLQ monitoring** — scanner and alerter log failed job counts every 5 minutes
- **Tarball SSRF protection** — validate URL host, block redirects, 256MB size limit, symlink filtering

## License

MIT
