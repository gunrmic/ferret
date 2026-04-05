interface ScanFlag {
  rule: string;
  severity: string;
  filename: string;
  line: number;
  snippet: string;
  description: string;
}

interface ScanAlert {
  id: number;
  alertType: string;
  sentAt: Date | string;
  content: string | null;
}

interface ScanData {
  id: number;
  packageName: string;
  version: string;
  previousVersion: string | null;
  scannedAt: Date | string;
  riskScore: number | null;
  staticFlags: unknown;
  llmSummary: string | null;
  alerted: boolean;
  alerts: ScanAlert[];
}

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

function severityOrder(severity: string): number {
  switch (severity) {
    case 'critical': return 0;
    case 'high': return 1;
    case 'medium': return 2;
    case 'low': return 3;
    default: return 4;
  }
}

function severityClass(severity: string): string {
  switch (severity) {
    case 'critical': return 'sev-crit';
    case 'high': return 'sev-high';
    case 'medium': return 'sev-medium';
    case 'low': return 'sev-low';
    default: return 'sev-low';
  }
}

function renderFlags(flags: ScanFlag[]): string {
  const sorted = [...flags].sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity));

  const renderFlag = (flag: ScanFlag): string => `
    <div class="flag-card">
      <div class="flag-header">
        <span class="flag-rule">${escapeHtml(flag.rule)}</span>
        <span class="sev-badge ${severityClass(flag.severity)}">${escapeHtml(flag.severity)}</span>
      </div>
      <div class="flag-location">${escapeHtml(flag.filename)}${flag.line ? `:${flag.line}` : ''}</div>
      ${flag.snippet ? `<pre class="flag-snippet"><code>${escapeHtml(flag.snippet)}</code></pre>` : ''}
      <div class="flag-desc">${escapeHtml(flag.description)}</div>
    </div>`;

  if (sorted.length <= 20) {
    return sorted.map(renderFlag).join('');
  }

  const visible = sorted.slice(0, 20).map(renderFlag).join('');
  const hidden = sorted.slice(20).map(renderFlag).join('');
  return `${visible}
    <details class="more-flags">
      <summary>Show ${sorted.length - 20} more flags</summary>
      ${hidden}
    </details>`;
}

function renderAlerts(alerts: ScanAlert[]): string {
  const sorted = [...alerts].sort(
    (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
  );
  return sorted
    .map(
      (a) => `
    <div class="alert-item">
      <span class="alert-type">${escapeHtml(a.alertType)}</span>
      <span class="alert-time">${formatDate(a.sentAt)}</span>
      ${a.content ? `<div class="alert-content">${escapeHtml(a.content)}</div>` : ''}
    </div>`,
    )
    .join('');
}

export function renderScanDetailPage(scan: ScanData): string {
  const score = scan.riskScore ?? 0;
  const flags: ScanFlag[] = Array.isArray(scan.staticFlags) ? scan.staticFlags as ScanFlag[] : [];
  const version = scan.previousVersion
    ? `v${escapeHtml(scan.previousVersion)} &rarr; v${escapeHtml(scan.version)}`
    : `v${escapeHtml(scan.version)}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(scan.packageName)}@${escapeHtml(scan.version)} — Ferret Watch</title>
  <meta name="description" content="Scan results for ${escapeHtml(scan.packageName)} v${escapeHtml(scan.version)}">
  <link rel="icon" href="/logo.png" type="image/png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    /* SHARED WITH index.html */
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
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      color: var(--text);
    }

    nav .brand img { width: 28px; height: 28px; }

    nav .brand span {
      font-weight: 600;
      font-size: 15px;
      letter-spacing: -0.3px;
    }

    nav .nav-links {
      display: flex;
      gap: 4px;
    }

    nav .nav-links a {
      font-size: 13px;
      color: var(--text-secondary);
      text-decoration: none;
      padding: 6px 12px;
      border-radius: 8px;
      transition: background 0.15s, color 0.15s;
    }

    nav .nav-links a:hover {
      background: #f0f0f0;
      color: var(--text);
    }

    footer {
      padding: 32px 0 56px;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    footer .footer-left {
      font-size: 12px;
      color: var(--text-muted);
    }

    footer .footer-links {
      display: flex;
      gap: 16px;
    }

    footer .footer-links a {
      font-size: 12px;
      color: var(--text-muted);
      text-decoration: none;
      transition: color 0.12s;
    }

    footer .footer-links a:hover { color: var(--text-secondary); }

    .score-badge {
      font-weight: 600;
      padding: 4px 12px;
      border-radius: 8px;
      text-align: center;
      font-variant-numeric: tabular-nums;
    }

    .score-clean { background: var(--green-bg); color: var(--green); }
    .score-low { background: var(--yellow-bg); color: var(--yellow); }
    .score-high { background: var(--orange-bg); color: var(--orange); }
    .score-crit { background: var(--red-bg); color: var(--red); }
    /* END SHARED */

    /* DETAIL PAGE */
    .back-link {
      display: inline-block;
      margin: 24px 0 8px;
      font-size: 13px;
      color: var(--text-muted);
      text-decoration: none;
      transition: color 0.12s;
    }

    .back-link:hover { color: var(--text-secondary); }

    .pkg-header {
      padding: 24px 0 32px;
    }

    .pkg-header h1 {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.8px;
      line-height: 1.2;
    }

    .pkg-version {
      font-size: 15px;
      color: var(--text-secondary);
      margin-top: 4px;
    }

    .pkg-meta {
      display: flex;
      gap: 16px;
      margin-top: 8px;
      font-size: 13px;
      color: var(--text-muted);
    }

    .alerted-badge {
      color: var(--red);
      font-weight: 500;
    }

    .score-section {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 24px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      margin-bottom: 24px;
    }

    .score-section .score-badge {
      font-size: 32px;
      padding: 12px 24px;
      border-radius: 12px;
    }

    .score-section .score-text {
      font-size: 14px;
      color: var(--text-secondary);
    }

    .section {
      margin-bottom: 24px;
    }

    .section-title {
      font-size: 15px;
      font-weight: 600;
      letter-spacing: -0.2px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .count-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 6px;
      background: var(--border);
      color: var(--text-secondary);
    }

    .summary-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px;
      font-size: 14px;
      line-height: 1.7;
      color: var(--text-secondary);
      white-space: pre-wrap;
    }

    .summary-placeholder {
      color: var(--text-muted);
      font-style: italic;
    }

    .flag-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 16px;
      margin-bottom: 8px;
    }

    .flag-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }

    .flag-rule {
      font-size: 13px;
      font-weight: 600;
    }

    .sev-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .sev-crit { background: var(--red-bg); color: var(--red); }
    .sev-high { background: var(--orange-bg); color: var(--orange); }
    .sev-medium { background: var(--yellow-bg); color: var(--yellow); }
    .sev-low { background: var(--green-bg); color: var(--green); }

    .flag-location {
      font-size: 12px;
      font-family: 'SF Mono', 'Fira Code', 'Fira Mono', Menlo, monospace;
      color: var(--text-muted);
      margin-bottom: 8px;
    }

    .flag-snippet {
      background: #f5f5f5;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 8px;
      overflow-x: auto;
    }

    .flag-snippet code {
      font-size: 12px;
      font-family: 'SF Mono', 'Fira Code', 'Fira Mono', Menlo, monospace;
      line-height: 1.5;
      color: var(--text);
    }

    .flag-desc {
      font-size: 13px;
      color: var(--text-secondary);
      line-height: 1.5;
    }

    .more-flags summary {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-muted);
      cursor: pointer;
      padding: 8px 0;
      transition: color 0.12s;
    }

    .more-flags summary:hover { color: var(--text-secondary); }

    .empty-text {
      font-size: 14px;
      color: var(--text-muted);
      padding: 20px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
    }

    .alert-item {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      margin-bottom: 8px;
    }

    .alert-type {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 6px;
      background: var(--accent-light);
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .alert-time {
      font-size: 12px;
      color: var(--text-muted);
    }

    .alert-content {
      width: 100%;
      font-size: 13px;
      color: var(--text-secondary);
      margin-top: 4px;
      white-space: pre-wrap;
      word-break: break-word;
    }

    @media (max-width: 640px) {
      .pkg-header h1 { font-size: 22px; }
      .score-section .score-badge { font-size: 24px; padding: 8px 16px; }
      footer { flex-direction: column; gap: 12px; text-align: center; }
      nav .nav-links a { padding: 6px 8px; font-size: 12px; }
    }

    @media print {
      nav, footer, .back-link { display: none; }
      body { background: white; }
      .container { max-width: 100%; padding: 0; }
      .flag-card, .alert-item, .score-section, .summary-card { break-inside: avoid; }
      .flag-snippet { background: #f5f5f5 !important; -webkit-print-color-adjust: exact; }
      .score-badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .sev-badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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
      <a href="https://x.com/theferretwatch" target="_blank">Twitter</a>
      <a href="https://github.com/gunrmic/ferret" target="_blank">GitHub</a>
      <a href="/feed">API</a>
    </div>
  </nav>

  <a class="back-link" href="/">&larr; Back to feed</a>

  <div class="pkg-header">
    <h1>${escapeHtml(scan.packageName)}</h1>
    <div class="pkg-version">${version}</div>
    <div class="pkg-meta">
      <span>Scanned ${formatDate(scan.scannedAt)}</span>
      ${scan.alerted ? '<span class="alerted-badge">Alerted</span>' : ''}
      <a href="https://www.npmjs.com/package/${encodeURIComponent(scan.packageName)}" target="_blank" rel="noopener" style="color:var(--accent);text-decoration:none">View on npm</a>
    </div>
  </div>

  <div class="score-section">
    <div class="score-badge ${scoreClass(score)}">${scoreLabel(score)}</div>
    <div class="score-text">
      ${score === 0 ? 'No suspicious patterns detected.' : `Risk score: ${score}/100`}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Summary</div>
    ${scan.llmSummary
      ? `<div class="summary-card">${escapeHtml(scan.llmSummary)}</div>`
      : '<div class="summary-card summary-placeholder">AI summary not yet available for this scan.</div>'}
  </div>

  <div class="section">
    <div class="section-title">
      Detection Flags
      ${flags.length ? `<span class="count-badge">${flags.length}</span>` : ''}
    </div>
    ${flags.length
      ? renderFlags(flags)
      : '<div class="empty-text">No suspicious patterns detected.</div>'}
  </div>

  <div class="section">
    <div class="section-title">
      Alert History
      ${scan.alerts.length ? `<span class="count-badge">${scan.alerts.length}</span>` : ''}
    </div>
    ${scan.alerts.length
      ? renderAlerts(scan.alerts)
      : '<div class="empty-text">No alerts sent for this scan.</div>'}
  </div>

  <footer>
    <div class="footer-left">Ferret Watch &mdash; Catching threats before they bite.</div>
    <div class="footer-links">
      <a href="/feed">API</a>
      <a href="/stats">Stats</a>
      <a href="https://github.com/gunrmic/ferret">GitHub</a>
    </div>
  </footer>

</div>
</body>
</html>`;
}

export function renderScanNotFoundPage(packageName: string, version: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Scan not found — Ferret Watch</title>
  <link rel="icon" href="/logo.png" type="image/png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --bg: #fafafa;
      --surface: #ffffff;
      --border: #e5e5e5;
      --text: #0a0a0a;
      --text-secondary: #525252;
      --text-muted: #a3a3a3;
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
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      color: var(--text);
    }

    nav .brand img { width: 28px; height: 28px; }
    nav .brand span { font-weight: 600; font-size: 15px; letter-spacing: -0.3px; }

    nav .nav-links { display: flex; gap: 4px; }

    nav .nav-links a {
      font-size: 13px;
      color: var(--text-secondary);
      text-decoration: none;
      padding: 6px 12px;
      border-radius: 8px;
      transition: background 0.15s, color 0.15s;
    }

    nav .nav-links a:hover { background: #f0f0f0; color: var(--text); }

    .not-found {
      text-align: center;
      padding: 80px 20px;
    }

    .not-found h1 {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.5px;
      margin-bottom: 8px;
    }

    .not-found p {
      font-size: 15px;
      color: var(--text-muted);
      margin-bottom: 24px;
    }

    .not-found a {
      font-size: 13px;
      color: var(--text-secondary);
      text-decoration: none;
      padding: 10px 20px;
      border: 1px solid var(--border);
      border-radius: 10px;
      transition: all 0.15s;
    }

    .not-found a:hover {
      border-color: #d4d4d4;
      color: var(--text);
    }

    footer {
      padding: 32px 0 56px;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    footer .footer-left { font-size: 12px; color: var(--text-muted); }
    footer .footer-links { display: flex; gap: 16px; }

    footer .footer-links a {
      font-size: 12px;
      color: var(--text-muted);
      text-decoration: none;
      transition: color 0.12s;
    }

    footer .footer-links a:hover { color: var(--text-secondary); }

    @media (max-width: 640px) {
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
      <a href="https://x.com/theferretwatch" target="_blank">Twitter</a>
      <a href="https://github.com/gunrmic/ferret" target="_blank">GitHub</a>
      <a href="/feed">API</a>
    </div>
  </nav>

  <div class="not-found">
    <h1>Scan not found</h1>
    <p>No scan results for ${escapeHtml(packageName)}@${escapeHtml(version)}</p>
    <a href="/">&larr; Back to feed</a>
  </div>

  <footer>
    <div class="footer-left">Ferret Watch &mdash; Catching threats before they bite.</div>
    <div class="footer-links">
      <a href="/feed">API</a>
      <a href="/stats">Stats</a>
      <a href="https://github.com/gunrmic/ferret">GitHub</a>
    </div>
  </footer>
</div>
</body>
</html>`;
}
