export function renderNotFoundPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page not found — Ferret Watch</title>
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

    .not-found {
      text-align: center;
      padding: 80px 20px;
    }

    .not-found h1 {
      font-size: 48px;
      font-weight: 700;
      letter-spacing: -1.5px;
      margin-bottom: 8px;
    }

    .not-found h2 {
      font-size: 20px;
      font-weight: 600;
      letter-spacing: -0.3px;
      margin-bottom: 8px;
    }

    .not-found p {
      font-size: 15px;
      color: var(--text-muted);
      margin-bottom: 24px;
    }

    .not-found a {
      font-size: 13px; color: var(--text-secondary); text-decoration: none;
      padding: 10px 20px; border: 1px solid var(--border); border-radius: 10px;
      transition: all 0.15s;
    }

    .not-found a:hover { border-color: #d4d4d4; color: var(--text); }

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
      <a href="/docs">API Docs</a>
    </div>
  </nav>

  <div class="not-found">
    <h1>404</h1>
    <h2>Page not found</h2>
    <p>The page you're looking for doesn't exist or has been moved.</p>
    <a href="/">&larr; Back to dashboard</a>
  </div>

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
