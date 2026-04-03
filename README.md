# Ferret

Real-time npm supply chain security monitor. Ferret continuously watches the npm registry for new versions of popular packages, diffs the code changes, and uses static analysis to flag suspicious behavior — before developers install the update.

```
npm registry ──> Watcher ──> Redis Queue ──> Scanner Workers ──> Postgres
                (polls)       (BullMQ)       (diff + AST)       (results)
```

## How It Works

1. **Watcher** polls the npm registry every 5 minutes for new versions of the top ~1000 most downloaded packages (100k+ weekly downloads)
2. New versions are enqueued as scan jobs via **BullMQ** (Redis-backed, with deduplication and retries)
3. **Scanner** workers download both the old and new tarballs, extract them, and diff the files
4. Each changed file is parsed into an AST using **Babel** and run through 6 static analysis rules
5. A **risk score** (0–100) is computed based on the types and frequency of suspicious patterns found
6. Results are stored in **Postgres** for review

## Static Analysis Rules

| Rule | Detects | Weight |
|------|---------|--------|
| `child-process` | `child_process` imports, `exec()`, `spawn()`, `fork()` | 30 |
| `eval-usage` | `eval()`, `Function()`, `new Function()` | 25 |
| `network-calls` | `http`/`https`/`fetch`/`axios`/`got` imports + calls | 20 |
| `env-access` | `process.env` reads, destructuring from `process.env` | 15 |
| `base64-strings` | Base64-encoded strings (40+ chars), `atob()`, `Buffer.from(x, 'base64')` | 15 |
| `fs-writes` | `fs` imports + `writeFile`, `appendFile`, `createWriteStream`, `mkdir` | 10 |

Only **newly introduced** patterns are flagged — existing code that hasn't changed is ignored. This is done by parsing both old and new file ASTs and comparing flag fingerprints.

### Risk Scoring

- Each rule has a base weight (see table above)
- First occurrence of a rule = full weight
- Each additional occurrence = 50% of weight (diminishing returns)
- Score is capped at 100
- Example: `child_process` import + `exec()` call + `fetch()` + `process.env` read = 30 + 15 + 20 + 15 = **80**

## Project Structure

```
ferret/
├── packages/
│   ├── scanner/              # BullMQ worker: download, diff, analyze
│   │   └── src/
│   │       ├── index.ts      # Entry point, worker bootstrap
│   │       ├── tarball.ts    # Download + extract npm tarballs (p-limit 5)
│   │       ├── differ.ts     # File-level diff between package versions
│   │       ├── analyzer.ts   # Orchestrates rules across changed files
│   │       ├── risk-scorer.ts
│   │       ├── worker.ts     # BullMQ job processor
│   │       └── rules/        # 6 AST-based analysis rules
│   └── watcher/              # npm registry poller
│       └── src/
│           ├── index.ts      # Entry point, starts poll loop
│           ├── poller.ts     # Seed packages + poll for new versions
│           └── registry-client.ts  # npm API (search, downloads, packument)
├── shared/
│   ├── db/                   # Prisma schema + client
│   ├── queue/                # BullMQ queue + Redis connection
│   └── types/                # Zod schemas, shared types, config
├── docker-compose.yml        # Postgres 16 + Redis 7
└── pnpm-workspace.yaml
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Language | TypeScript (ES2022) |
| Runtime | Node.js |
| Monorepo | pnpm workspaces |
| Queue | BullMQ + Redis |
| Database | PostgreSQL + Prisma |
| AST Parsing | @babel/parser + @babel/traverse |
| Validation | Zod |
| Logging | Pino (structured JSON) |

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- Docker (for Postgres + Redis)

### Setup

```bash
# Clone and install
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
# Terminal 1 — start scanner worker
pnpm dev:scanner

# Terminal 2 — start watcher
pnpm dev:watcher
```

The watcher will seed popular packages on first run, then begin polling for new versions every 5 minutes. The scanner picks up jobs and processes them with concurrency of 3.

### Health Checks

- Watcher: `http://localhost:3001`
- Scanner: `http://localhost:3002`

### Inspect Results

```bash
# Open Prisma Studio to browse scan results
pnpm db:studio
```

## Configuration

All configuration is via environment variables (validated with Zod at startup):

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | — | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `NPM_REGISTRY_URL` | `https://registry.npmjs.org` | npm registry URL |
| `MIN_WEEKLY_DOWNLOADS` | `100000` | Minimum weekly downloads to monitor a package |
| `SCAN_INTERVAL_MINUTES` | `5` | How often the watcher polls for new versions |
| `SCANNER_CONCURRENCY` | `3` | Number of concurrent scan jobs |
| `SCANNER_PORT` | `3002` | Scanner health check port |
| `WATCHER_PORT` | `3001` | Watcher health check port |
| `LOG_LEVEL` | `info` | Pino log level |

## Database Schema

Three tables managed by Prisma:

- **packages** — monitored packages with last-seen version and ETag for conditional HTTP requests
- **scans** — scan results with risk score, static flags (JSON), and version metadata
- **alerts** — alert records (Phase 2: tweets, Slack, email)

## Roadmap

### Phase 1 (current)
- [x] Watcher polls registry, filters top packages by downloads
- [x] Scanner diffs and runs static analysis (AST-based)
- [x] Results stored in Postgres
- [ ] Simple public JSON feed at `/feed`

### Phase 2
- [ ] Claude API analysis for flagged packages
- [ ] Auto-tweet on high-risk findings (Twitter API v2)
- [ ] Next.js frontend with public feed

### Phase 3
- [ ] Subscription system (monitor specific packages)
- [ ] Slack/email webhooks
- [ ] Historical diff viewer

## License

MIT
