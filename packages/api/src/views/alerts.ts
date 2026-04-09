function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function scoreClass(score: number): string {
  if (score === 0) return 'score-clean';
  if (score <= 50) return 'score-low';
  if (score <= 70) return 'score-high';
  return 'score-crit';
}

function scoreLabel(score: number): string {
  return score === 0 ? 'Clean' : String(score);
}

interface AlertWithScan {
  id: number;
  alertType: string;
  sentAt: Date | string;
  content: string | null;
  scan: {
    id: number;
    packageName: string;
    version: string;
    previousVersion: string | null;
    riskScore: number | null;
    staticFlags: unknown;
    llmSummary: string | null;
    scannedAt: Date | string;
  };
}

interface StaticFlag {
  rule: string;
  severity: string;
}

function renderAlertCard(alert: AlertWithScan): string {
  const { scan } = alert;
  const score = scan.riskScore ?? 0;
  const flags: StaticFlag[] = Array.isArray(scan.staticFlags) ? scan.staticFlags as StaticFlag[] : [];
  const uniqueRules = [...new Set(flags.map((f) => f.rule))].slice(0, 4);
  const scanUrl = `/scan/${encodeURIComponent(scan.packageName)}/${encodeURIComponent(scan.version)}`;
  const version = scan.previousVersion
    ? `v${escapeHtml(scan.previousVersion)} &rarr; v${escapeHtml(scan.version)}`
    : `v${escapeHtml(scan.version)}`;

  return `
    <div class="alert-card">
      <div class="alert-card-header">
        <a href="${scanUrl}" class="alert-pkg">
          <span class="alert-pkg-name">${escapeHtml(scan.packageName)}</span>
          <span class="alert-pkg-version">${version}</span>
        </a>
        <div class="score-badge ${scoreClass(score)}">${scoreLabel(score)}</div>
      </div>
      ${uniqueRules.length ? `<div class="alert-flags">${uniqueRules.map((r) => `<span class="flag-tag">${escapeHtml(r)}</span>`).join('')}</div>` : ''}
      ${scan.llmSummary ? `<div class="alert-summary">${escapeHtml(scan.llmSummary)}</div>` : ''}
      <div class="alert-card-footer">
        <span class="alert-time">Alerted on ${formatDate(alert.sentAt)}</span>
        <a href="${scanUrl}" class="alert-link">View scan details &rarr;</a>
      </div>
    </div>`;
}

export function renderAlertsPage(alerts: AlertWithScan[]): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alerts — Ferret Watch</title>
  <meta name="description" content="Security alerts for suspicious npm package updates detected by Ferret Watch.">
  <link rel="icon" href="/logo.png" type="image/png">
  <link rel="alternate" type="application/atom+xml" title="Ferret Watch Alerts" href="/feed.xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --bg: #fafafa;
      --surface: #ffffff;
      --border: #e5e5e5;
      --border-hover: #d4d4d4;
      --text: #0a0a0a;
      --text-secondary: #525252;
      --text-muted: #a3a3a3;
      --accent: #d97706;
      --accent-light: #fef3c7;
      --green: #16a34a;
      --green-bg: #f0fdf4;
      --yellow: #ca8a04;
      --yellow-bg: #fefce8;
      --orange: #ea580c;
      --orange-bg: #fff7ed;
      --red: #dc2626;
      --red-bg: #fef2f2;
      --radius: 12px;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }

    .container { max-width: 720px; margin: 0 auto; padding: 0 20px; }

    nav {
      padding: 16px 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border);
    }

    nav .brand {
      display: flex; align-items: center; gap: 10px;
      text-decoration: none; color: var(--text);
    }

    nav .brand img { width: 28px; height: 28px; }
    nav .brand span { font-weight: 600; font-size: 15px; letter-spacing: -0.3px; }

    nav .nav-links { display: flex; gap: 4px; }

    nav .nav-links a {
      font-size: 13px; color: var(--text-secondary); text-decoration: none;
      padding: 6px 12px; border-radius: 8px; transition: background 0.15s, color 0.15s;
    }

    nav .nav-links a:hover { background: #f0f0f0; color: var(--text); }

    .page-header {
      padding: 48px 0 32px;
    }

    .page-header h1 {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.8px;
    }

    .page-header-meta {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-top: 8px;
    }

    .page-header p {
      font-size: 15px;
      color: var(--text-secondary);
    }

    .rss-link {
      font-size: 13px;
      color: var(--accent);
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .rss-link:hover { text-decoration: underline; }

    .alert-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px;
      margin-bottom: 12px;
      transition: border-color 0.15s;
    }

    .alert-card:hover { border-color: var(--border-hover); }

    .alert-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 8px;
    }

    .alert-pkg {
      text-decoration: none;
      color: inherit;
    }

    .alert-pkg:hover .alert-pkg-name { color: var(--accent); }

    .alert-pkg-name {
      font-size: 16px;
      font-weight: 600;
      transition: color 0.12s;
    }

    .alert-pkg-version {
      font-size: 13px;
      color: var(--text-muted);
      margin-left: 8px;
    }

    .score-badge {
      font-size: 12px;
      font-weight: 600;
      padding: 4px 12px;
      border-radius: 8px;
      min-width: 50px;
      text-align: center;
      font-variant-numeric: tabular-nums;
      flex-shrink: 0;
    }

    .score-clean { background: var(--green-bg); color: var(--green); }
    .score-low { background: var(--yellow-bg); color: var(--yellow); }
    .score-high { background: var(--orange-bg); color: var(--orange); }
    .score-crit { background: var(--red-bg); color: var(--red); }

    .alert-flags {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
      margin-bottom: 10px;
    }

    .flag-tag {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 6px;
      background: var(--red-bg);
      color: var(--red);
      font-weight: 500;
    }

    .alert-summary {
      font-size: 14px;
      color: var(--text-secondary);
      line-height: 1.6;
      margin-bottom: 12px;
      white-space: pre-wrap;
    }

    .alert-card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .alert-time {
      font-size: 12px;
      color: var(--text-muted);
    }

    .alert-link {
      font-size: 13px;
      color: var(--accent);
      text-decoration: none;
    }

    .alert-link:hover { text-decoration: underline; }

    .empty-state {
      text-align: center;
      padding: 64px 20px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
    }

    .empty-state h2 {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .empty-state p {
      font-size: 14px;
      color: var(--text-muted);
    }

    footer {
      padding: 32px 0 56px;
      border-top: 1px solid var(--border);
      display: flex; justify-content: space-between; align-items: center;
    }

    footer .footer-left { font-size: 12px; color: var(--text-muted); }
    footer .footer-links { display: flex; gap: 16px; }

    footer .footer-links a {
      font-size: 12px; color: var(--text-muted); text-decoration: none;
    }

    footer .footer-links a:hover { color: var(--text-secondary); }

    @media (max-width: 640px) {
      .page-header h1 { font-size: 22px; }
      .page-header-meta { flex-direction: column; align-items: flex-start; gap: 8px; }
      .alert-card-header { flex-direction: column; align-items: flex-start; }
      .alert-card-footer { flex-direction: column; align-items: flex-start; gap: 6px; }
      footer { flex-direction: column; gap: 12px; text-align: center; }
    }
  </style>
</head>
<body>
<div class="container">

  <nav>
    <a class="brand" href="/">
      <img src="/logo.png" alt="Ferret Watch">
      <span>Ferret Watch</span>
    </a>
    <div class="nav-links">
      <a href="/alerts">Alerts</a>
      <a href="https://github.com/gunrmic/ferret" target="_blank">GitHub</a>
      <a href="/docs">API Docs</a>
    </div>
  </nav>

  <div class="page-header">
    <h1>Security Alerts</h1>
    <div class="page-header-meta">
      <p>Suspicious npm package updates detected by Ferret Watch.</p>
      <a class="rss-link" href="/feed.xml">RSS Feed</a>
    </div>
  </div>

  ${alerts.length > 0
    ? alerts.map(renderAlertCard).join('')
    : `<div class="empty-state">
        <h2>All clear</h2>
        <p>No alerts yet. When suspicious code is detected in a popular npm package, it will appear here.</p>
      </div>`}

  <footer>
    <div class="footer-left">Ferret Watch &mdash; Catching threats before they bite.</div>
    <div class="footer-links">
      <a href="/feed">API</a>
      <a href="/docs">Docs</a>
      <a href="https://github.com/gunrmic/ferret">GitHub</a>
    </div>
  </footer>

</div>
</body>
</html>`;
}
