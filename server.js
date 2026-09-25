const http = require('http');
const url = require('url');

const PORT = 5000;

// State of the test site
let currentMode = 'healthy'; // 'healthy', 'coming-soon', 'server-error-500', 'database-error', 'timeout', 'not-found'
let responseDelayMs = 0;

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Handle Control / Mode Switch API
  if (pathname === '/api/set-mode') {
    const newMode = parsedUrl.query.mode;
    if (newMode) {
      currentMode = newMode;
      console.log(`[TEST SITE] Simulation mode changed to: ${currentMode}`);
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, currentMode }));
  }

  // Handle Simulation Delay if in timeout mode
  if (currentMode === 'timeout' && pathname !== '/control') {
    console.log('[TEST SITE] Simulating 15s timeout / hanging request...');
    setTimeout(() => {
      res.writeHead(504, { 'Content-Type': 'text/html' });
      res.end('<h1>504 Gateway Timeout</h1>');
    }, 15000);
    return;
  }

  // 1. Interactive Control Dashboard (Always accessible)
  if (pathname === '/control') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(renderControlPage());
  }

  // 2. Mode: 500 Internal Server Error
  if (currentMode === 'server-error-500') {
    res.writeHead(500, { 'Content-Type': 'text/html' });
    return res.end(`
      <!DOCTYPE html>
      <html>
      <head><title>500 Internal Server Error</title></head>
      <body style="font-family:sans-serif;padding:40px;background:#1e1e2f;color:#fff;">
        <h1 style="color:#ff4d4d;">500 Internal Server Error</h1>
        <p>Fatal PHP Crash in /var/www/site/index.php on line 42</p>
        <hr style="border-color:#444;">
        <a href="/control" style="color:#38bdf8;">⚙️ Open Test Site Control Panel to change mode</a>
      </body>
      </html>
    `);
  }

  // 3. Mode: Database Error
  if (currentMode === 'database-error') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(`
      <!DOCTYPE html>
      <html>
      <head><title>Database Error</title></head>
      <body style="font-family:sans-serif;padding:40px;background:#f8f9fa;color:#333;">
        <h1>Error establishing a database connection</h1>
        <p>This either means that the username and password information in your wp-config.php file is incorrect or that contact with the database server at localhost could not be established.</p>
        <hr>
        <a href="/control">⚙️ Open Test Site Control Panel</a>
      </body>
      </html>
    `);
  }

  // 4. Mode: Hostinger Coming Soon / Maintenance Mode (Returns HTTP 200 with placeholder)
  if (currentMode === 'coming-soon') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Coming Soon</title>
        <meta name="platform" content="hostinger">
      </head>
      <body style="font-family:sans-serif;text-align:center;padding:60px;background:#f5f6fa;color:#2f3640;">
        <div style="max-width:600px;margin:0 auto;background:#fff;padding:40px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
          <h2 style="color:#673ab7;letter-spacing:1px;">HOSTINGER</h2>
          <h1 style="font-size:32px;margin:20px 0;">Coming Soon</h1>
          <p style="font-size:16px;color:#718093;">New WordPress website is being built and will be published soon</p>
          <hr style="margin:30px 0;border:0;border-top:1px solid #eee;">
          <a href="/control" style="color:#38bdf8;text-decoration:none;font-weight:bold;">⚙️ Click here to Open Test Control Panel</a>
        </div>
      </body>
      </html>
    `);
  }

  // 5. Mode: 404 Not Found
  if (currentMode === 'not-found') {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    return res.end(`
      <!DOCTYPE html>
      <html>
      <head><title>404 Not Found</title></head>
      <body style="font-family:sans-serif;padding:40px;background:#1e1e2f;color:#fff;">
        <h1 style="color:#f59e0b;">404 Page Not Found</h1>
        <p>The requested endpoint <code>${pathname}</code> was not found on this server.</p>
        <a href="/control" style="color:#38bdf8;">⚙️ Control Panel</a>
      </body>
      </html>
    `);
  }

  // 6. Mode: Healthy (Default)
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Healthy Test Site • Sandbox</title>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap" rel="stylesheet">
    </head>
    <body style="font-family:'Plus Jakarta Sans',sans-serif;background:#090d16;color:#f8fafc;padding:40px;text-align:center;">
      <div style="max-width:700px;margin:0 auto;background:#121826;padding:40px;border-radius:16px;border:1px solid rgba(255,255,255,0.1);box-shadow:0 20px 40px rgba(0,0,0,0.5);">
        <div style="display:inline-block;width:60px;height:60px;background:rgba(16,185,129,0.2);color:#10b981;border-radius:50%;line-height:60px;font-size:28px;margin-bottom:16px;">✓</div>
        <h1 style="font-size:28px;font-weight:800;margin-bottom:8px;">Test Website is ONLINE & Healthy</h1>
        <p style="color:#94a3b8;margin-bottom:24px;">Current Route: <code>${pathname}</code> • HTTP Status: <strong>200 OK</strong></p>
        
        <div style="background:#0f172a;padding:20px;border-radius:12px;text-align:left;margin-bottom:24px;border:1px solid rgba(255,255,255,0.06);">
          <h4 style="color:#38bdf8;margin-top:0;">Available Test Subpages:</h4>
          <ul style="color:#cbd5e1;padding-left:20px;line-height:1.8;">
            <li><code>/</code> - Homepage</li>
            <li><code>/about</code> - About Us</li>
            <li><code>/products</code> - Products Catalog</li>
            <li><code>/api/status</code> - JSON API status</li>
          </ul>
        </div>

        <a href="/control" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">
          🎮 Open Interactive Simulation Controls
        </a>
      </div>
    </body>
    </html>
  `);
});

function renderControlPage() {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>PulseGuard Sandbox Simulator</title>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: #090d16; color: #f8fafc; padding: 40px 20px; min-height: 100vh; }
        .container { max-width: 800px; margin: 0 auto; background: rgba(18, 24, 38, 0.9); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 36px; box-shadow: 0 25px 50px rgba(0,0,0,0.6); }
        h1 { font-size: 26px; font-weight: 800; margin-bottom: 8px; }
        h1 span { color: #38bdf8; }
        p.subtitle { color: #94a3b8; font-size: 14px; margin-bottom: 28px; }
        .status-box { background: #0f172a; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 18px 24px; margin-bottom: 28px; display: flex; justify-content: space-between; align-items: center; }
        .badge { padding: 6px 14px; border-radius: 9999px; font-size: 13px; font-weight: 700; text-transform: uppercase; font-family: 'JetBrains Mono', monospace; }
        .badge.healthy { background: rgba(16,185,129,0.2); color: #10b981; border: 1px solid rgba(16,185,129,0.4); }
        .badge.error { background: rgba(244,63,94,0.2); color: #f43f5e; border: 1px solid rgba(244,63,94,0.4); }
        .badge.warn { background: rgba(245,158,11,0.2); color: #f59e0b; border: 1px solid rgba(245,158,11,0.4); }
        .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 28px; }
        .sim-btn { display: flex; flex-direction: column; gap: 6px; padding: 18px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03); color: #f8fafc; cursor: pointer; text-align: left; transition: all 0.2s ease; font-family: inherit; }
        .sim-btn:hover { background: rgba(255,255,255,0.08); transform: translateY(-2px); border-color: rgba(255,255,255,0.2); }
        .sim-btn.active { border-color: #38bdf8; background: rgba(56,189,248,0.1); }
        .sim-btn strong { font-size: 15px; display: flex; align-items: center; gap: 8px; }
        .sim-btn span { font-size: 12px; color: #94a3b8; }
        .instruction { background: rgba(56,189,248,0.08); border-left: 4px solid #38bdf8; padding: 16px; border-radius: 8px; font-size: 13px; line-height: 1.6; color: #cbd5e1; }
        .instruction code { background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; color: #38bdf8; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🎮 PulseGuard <span>Simulator & Test Site</span></h1>
        <p class="subtitle">Click any button below to instantly simulate outages, Hostinger Coming Soon placeholders, database crashes, or timeouts.</p>

        <div class="status-box">
          <div>
            <div style="font-size:12px;color:#94a3b8;text-transform:uppercase;font-weight:600;">Current Site Mode</div>
            <div style="font-size:18px;font-weight:800;margin-top:2px;">http://localhost:5000</div>
          </div>
          <span class="badge ${currentMode === 'healthy' ? 'healthy' : (currentMode === 'coming-soon' ? 'warn' : 'error')}" id="currentBadge">
            ${currentMode}
          </span>
        </div>

        <div class="grid">
          <button class="sim-btn ${currentMode === 'healthy' ? 'active' : ''}" onclick="setMode('healthy')">
            <strong>🟢 1. Normal / Healthy Site</strong>
            <span>Returns clean HTTP 200 OK with normal HTML content.</span>
          </button>

          <button class="sim-btn ${currentMode === 'coming-soon' ? 'active' : ''}" onclick="setMode('coming-soon')">
            <strong>🟡 2. Hostinger "Coming Soon" Mode</strong>
            <span>Returns HTTP 200 with Hostinger "Coming Soon" placeholder to test deep content detection.</span>
          </button>

          <button class="sim-btn ${currentMode === 'server-error-500' ? 'active' : ''}" onclick="setMode('server-error-500')">
            <strong>🔴 3. HTTP 500 Server Error</strong>
            <span>Simulates PHP crash / 500 Internal Server Error.</span>
          </button>

          <button class="sim-btn ${currentMode === 'database-error' ? 'active' : ''}" onclick="setMode('database-error')">
            <strong>💥 4. Database Connection Crash</strong>
            <span>Simulates "Error establishing a database connection".</span>
          </button>

          <button class="sim-btn ${currentMode === 'timeout' ? 'active' : ''}" onclick="setMode('timeout')">
            <strong>⏳ 5. Timeout / Hanging (> 15s)</strong>
            <span>Hangs requests for 15s to test connection timeout alerts.</span>
          </button>

          <button class="sim-btn ${currentMode === 'not-found' ? 'active' : ''}" onclick="setMode('not-found')">
            <strong>🚫 6. HTTP 404 Page Not Found</strong>
            <span>Simulates broken subpages / missing routes.</span>
          </button>
        </div>

        <div class="instruction">
          <strong>💡 How to test with your Monitor:</strong><br>
          1. In your PulseGuard dashboard (<a href="http://localhost:3000" target="_blank" style="color:#38bdf8;">http://localhost:3000</a>), click <strong>"+ Add Website"</strong>.<br>
          2. Name: <code>Sandbox Test Site</code> | Base URL: <code>http://localhost:5000</code> | Threshold: <code>1</code>.<br>
          3. Click any button above, then click <strong>"Check Now"</strong> in PulseGuard to see instant detection & alert notifications!
        </div>
      </div>

      <script>
        async function setMode(mode) {
          const res = await fetch('/api/set-mode?mode=' + mode);
          const data = await res.json();
          if (data.success) {
            window.location.reload();
          }
        }
      </script>
    </body>
    </html>
  `;
}

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🎮 Test Sandbox running on http://localhost:${PORT}`);
  console.log(`🕹️ Control Panel available at http://localhost:${PORT}/control`);
  console.log(`======================================================\n`);
});
