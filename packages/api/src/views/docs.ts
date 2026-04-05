function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const API_DOCS = [
  {
    method: 'GET',
    path: '/feed',
    description: 'Paginated feed of recent scans.',
    params: [
      { name: 'limit', type: 'number', default: '20', description: 'Results per page (max 100)' },
      { name: 'cursor', type: 'number', default: '—', description: 'Scan ID for cursor-based pagination' },
      { name: 'search', type: 'string', default: '—', description: 'Filter by package name (case-insensitive)' },
      { name: 'minScore', type: 'number', default: '—', description: 'Minimum risk score' },
      { name: 'alerted', type: 'string', default: '—', description: 'Set to "true" to show only alerted scans' },
    ],
    example: `curl 'https://ferretwatch.dev/feed?limit=5&search=express'`,
    response: `{
  "scans": [
    {
      "id": 42,
      "packageName": "express",
      "version": "4.21.1",
      "previousVersion": "4.21.0",
      "riskScore": 0,
      "staticFlags": [],
      "scannedAt": "2026-04-05T12:00:00.000Z",
      "alerted": false
    }
  ],
  "nextCursor": null
}`,
  },
  {
    method: 'GET',
    path: '/scan/:package/:version',
    description: 'Detailed scan results for a specific package version. Returns HTML for browsers, JSON for API clients.',
    params: [],
    example: `curl 'https://ferretwatch.dev/scan/express/4.21.1'`,
    response: `{
  "id": 42,
  "packageName": "express",
  "version": "4.21.1",
  "previousVersion": "4.21.0",
  "riskScore": 0,
  "staticFlags": [],
  "llmSummary": null,
  "diffUrl": null,
  "alerted": false,
  "scannedAt": "2026-04-05T12:00:00.000Z",
  "alerts": []
}`,
  },
  {
    method: 'GET',
    path: '/scan/:package',
    description: 'Scan history for a package — all scanned versions.',
    params: [
      { name: 'limit', type: 'number', default: '20', description: 'Results per page (max 100)' },
    ],
    example: `curl 'https://ferretwatch.dev/scan/express'`,
    response: `{
  "package": "express",
  "scans": [
    { "id": 42, "version": "4.21.1", "riskScore": 0, "alerted": false, ... },
    { "id": 30, "version": "4.21.0", "riskScore": 0, "alerted": false, ... }
  ]
}`,
  },
  {
    method: 'GET',
    path: '/stats',
    description: 'Dashboard statistics.',
    params: [],
    example: `curl 'https://ferretwatch.dev/stats'`,
    response: `{
  "totalPackages": 156,
  "scansToday": 42,
  "totalAlerts": 3
}`,
  },
];

function renderEndpoint(ep: typeof API_DOCS[0]): string {
  const params = ep.params.length > 0
    ? `<table class="param-table">
        <thead><tr><th>Param</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
        <tbody>${ep.params.map(p => `<tr><td><code>${escapeHtml(p.name)}</code></td><td>${escapeHtml(p.type)}</td><td>${escapeHtml(p.default)}</td><td>${escapeHtml(p.description)}</td></tr>`).join('')}</tbody>
       </table>`
    : '';

  return `
    <div class="endpoint">
      <div class="endpoint-header">
        <span class="method">${ep.method}</span>
        <code class="path">${escapeHtml(ep.path)}</code>
      </div>
      <p class="endpoint-desc">${escapeHtml(ep.description)}</p>
      ${params}
      <div class="example-label">Example</div>
      <pre class="example-code"><code>${escapeHtml(ep.example)}</code></pre>
      <div class="example-label">Response</div>
      <pre class="example-code"><code>${escapeHtml(ep.response)}</code></pre>
    </div>`;
}

export function renderDocsPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Documentation — Ferret Watch</title>
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
      --border-hover: #d4d4d4;
      --text: #0a0a0a;
      --text-secondary: #525252;
      --text-muted: #a3a3a3;
      --accent: #d97706;
      --accent-light: #fef3c7;
      --green: #16a34a;
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

    .docs-header {
      padding: 48px 0 32px;
    }

    .docs-header h1 {
      font-size: 28px; font-weight: 700; letter-spacing: -0.8px;
    }

    .docs-header p {
      font-size: 15px; color: var(--text-secondary); margin-top: 8px;
    }

    .base-url {
      display: inline-block;
      font-size: 13px;
      font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
      background: var(--accent-light);
      color: var(--accent);
      padding: 4px 12px;
      border-radius: 6px;
      margin-top: 12px;
    }

    .endpoint {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 24px;
      margin-bottom: 16px;
    }

    .endpoint-header {
      display: flex; align-items: center; gap: 10px; margin-bottom: 8px;
    }

    .method {
      font-size: 11px; font-weight: 700; padding: 3px 8px;
      border-radius: 6px; background: var(--green); color: white;
      letter-spacing: 0.5px;
    }

    .path {
      font-size: 14px;
      font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
      color: var(--text);
    }

    .endpoint-desc {
      font-size: 14px; color: var(--text-secondary); margin-bottom: 16px;
    }

    .param-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin-bottom: 16px;
    }

    .param-table th {
      text-align: left; font-weight: 600; padding: 6px 8px;
      border-bottom: 1px solid var(--border); font-size: 11px;
      text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted);
    }

    .param-table td {
      padding: 6px 8px; border-bottom: 1px solid var(--border); color: var(--text-secondary);
    }

    .param-table code {
      font-size: 12px; background: #f5f5f5; padding: 1px 5px; border-radius: 4px;
    }

    .example-label {
      font-size: 11px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.5px; color: var(--text-muted); margin-bottom: 6px;
    }

    .example-code {
      background: #f5f5f5; border-radius: 8px; padding: 12px;
      overflow-x: auto; margin-bottom: 16px;
    }

    .example-code code {
      font-size: 12px; font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
      line-height: 1.5; color: var(--text);
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
      .docs-header h1 { font-size: 22px; }
      footer { flex-direction: column; gap: 12px; text-align: center; }
      .param-table { font-size: 12px; }
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
      <a href="/">Dashboard</a>
      <a href="https://github.com/gunrmic/ferret" target="_blank">GitHub</a>
    </div>
  </nav>

  <div class="docs-header">
    <h1>API Documentation</h1>
    <p>All endpoints return JSON. No authentication required.</p>
    <div class="base-url">https://ferretwatch.dev</div>
  </div>

  ${API_DOCS.map(renderEndpoint).join('')}

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
