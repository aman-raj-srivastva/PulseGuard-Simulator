const http = require('http');
const url = require('url');

const PORT = process.env.PORT || 5000;

// State of the test site (in-memory fallback)
let currentMode = 'healthy'; // 'healthy', 'coming-soon', 'server-error-500', 'database-error', 'timeout', 'not-found'

function getCookie(req, name) {
  const cookieHeader = req.headers && req.headers.cookie;
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function resolvePath(req, parsedUrl) {
  // 1. Check if Vercel catch-all param is present (req.query.all)
  if (req.query && req.query.all) {
    const slug = Array.isArray(req.query.all) ? req.query.all.join('/') : req.query.all;
    if (slug) return slug.startsWith('/') ? slug : '/' + slug;
  }

  // 2. Query parameter passed via Vercel rewrite (?route=... or ?path=...)
  const queryObj = (req.query) || (parsedUrl && parsedUrl.query) || {};
  if (queryObj.route || queryObj.path) {
    const r = queryObj.route || queryObj.path;
    return r.startsWith('/') ? r : '/' + r;
  }

  // 3. Vercel / Proxy headers (filter out internal /api/ filenames)
  const xForwarded = req.headers['x-forwarded-uri'] || 
                     req.headers['x-original-url'] || 
                     req.headers['x-real-path'];
  if (xForwarded && !xForwarded.startsWith('/api/')) {
    return xForwarded.split('?')[0];
  }

  // 4. Fallback to standard parsedUrl pathname
  let p = parsedUrl.pathname || '/';
  if (p.startsWith('/api/')) {
    return '/';
  }
  return p;
}

function handler(req, res) {
  const parsedUrl = url.parse(req.url || '/', true);
  const pathname = resolvePath(req, parsedUrl);
  const cleanPath = pathname.replace(/\/+$/, '') || '/';
  const queryObj = (req.query) || (parsedUrl && parsedUrl.query) || {};

  // Check if control dashboard is requested
  const isControlPage = cleanPath === '/control' || 
                        cleanPath.endsWith('/control') || 
                        queryObj.view === 'control' || 
                        queryObj.route === 'control';

  // Support direct path-based mode: /mode/:modeName (e.g. /mode/coming-soon)
  let pathMode = null;
  if (cleanPath.startsWith('/mode/')) {
    pathMode = cleanPath.split('/')[2];
    if (pathMode === '500') pathMode = 'server-error-500';
    if (pathMode === 'db') pathMode = 'database-error';
    if (pathMode === '404') pathMode = 'not-found';
  }

  // Handle Control / Mode Switch API
  const isSetModeApi = cleanPath === '/api/set-mode' || 
                       queryObj.route === 'api/set-mode' || 
                       queryObj.route === 'set-mode';

  if (isSetModeApi) {
    const newMode = queryObj.mode || parsedUrl.query.mode;
    if (newMode) {
      currentMode = newMode;
      console.log(`[TEST SITE] Simulation mode changed to: ${currentMode}`);
    }
    const modeToSet = newMode || currentMode;
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Set-Cookie': `sim_mode=${modeToSet}; Path=/; Max-Age=86400; SameSite=Lax`
    });
    return res.end(JSON.stringify({ success: true, currentMode: modeToSet }));
  }

  // Resolve active mode priority: Query param > Path prefix > Cookie > In-memory
  const activeMode = queryObj.mode || parsedUrl.query.mode || pathMode || getCookie(req, 'sim_mode') || currentMode;

  // 1. Interactive Control Dashboard (Always accessible regardless of failure mode)
  if (isControlPage) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(renderControlPage(activeMode));
  }

  // Handle Simulation Delay if in timeout mode
  if (activeMode === 'timeout') {
    console.log('[TEST SITE] Simulating 10s timeout / hanging request...');
    setTimeout(() => {
      res.writeHead(504, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>504 Gateway Timeout</h1>');
    }, 10000);
    return;
  }

  // 2. Mode: 500 Internal Server Error
  if (activeMode === 'server-error-500') {
    res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(`
      <!DOCTYPE html>
      <html>
      <head><title>500 Internal Server Error</title></head>
      <body style="font-family:sans-serif;padding:40px;background:#1e1e2f;color:#fff;">
        <h1 style="color:#f43f5e;">HTTP 500 - Internal Server Error</h1>
        <p>Fatal PHP Crash: Uncaught Error: Call to undefined function wp_load_engine() in /var/www/html/wp-settings.php:124</p>
        <hr>
        <a href="/control" style="color:#38bdf8;">⚙️ Back to Control Panel</a>
      </body>
      </html>
    `);
  }

  // 3. Mode: Database Connection Error (WordPress DB Crash)
  if (activeMode === 'database-error') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Database Error</title>
      </head>
      <body style="font-family:sans-serif;padding:50px;color:#333;background:#f9f9f9;">
        <h1>Error establishing a database connection</h1>
        <p>This either means that the username and password information in your wp-config.php file is incorrect or that contact with the database server at localhost could not be established.</p>
        <hr>
        <a href="/control" style="color:#2563eb;">⚙️ Back to Control Panel</a>
      </body>
      </html>
    `);
  }

  // 4. Mode: Hostinger Coming Soon / Maintenance Mode (Returns HTTP 200 with placeholder)
  if (activeMode === 'coming-soon') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
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
  if (activeMode === 'not-found') {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(`
      <!DOCTYPE html>
      <html>
      <head><title>404 Not Found</title></head>
      <body style="font-family:sans-serif;padding:40px;background:#1e1e2f;color:#fff;">
        <h1 style="color:#f59e0b;">404 Page Not Found</h1>
        <p>The requested endpoint <code>${pathname}</code> was not found on this server.</p>
        <a href="/control" style="color:#38bdf8;">⚙️ Back to Control Panel</a>
      </body>
      </html>
    `);
  }

  // 6. Mode: Healthy (Default)
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
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
}

function renderControlPage(mode) {
  const activeMode = mode || 'healthy';
  const badgeClass = activeMode === 'healthy' ? 'healthy' : (activeMode === 'coming-soon' ? 'warn' : 'error');

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
        .instruction { background: rgba(56,189,248,0.08); border-left: 4px solid #38bdf8; padding: 16px; border-radius: 8px; font-size: 13px; line-height: 1.6; color: #cbd5e1; margin-bottom: 20px; }
        .instruction code { background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; color: #38bdf8; }
        .direct-links { background: #0f172a; padding: 18px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); }
        .direct-links h4 { font-size: 14px; color: #38bdf8; margin-bottom: 12px; }
        .direct-links ul { list-style: none; display: flex; flex-direction: column; gap: 8px; font-size: 13px; }
        .direct-links a { color: #94a3b8; text-decoration: none; font-family: 'JetBrains Mono', monospace; }
        .direct-links a:hover { color: #f8fafc; text-decoration: underline; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🎮 PulseGuard <span>Simulator & Test Site</span></h1>
        <p class="subtitle">Click any button below to instantly simulate outages, Hostinger Coming Soon placeholders, database crashes, or timeouts.</p>

        <div class="status-box">
          <div>
            <div style="font-size:12px;color:#94a3b8;text-transform:uppercase;font-weight:600;">Current Site Target</div>
            <div style="font-size:18px;font-weight:800;margin-top:2px;" id="currentUrl">Simulator Active</div>
          </div>
          <span class="badge ${badgeClass}" id="currentBadge">
            ${activeMode}
          </span>
        </div>

        <div class="grid">
          <button class="sim-btn ${activeMode === 'healthy' ? 'active' : ''}" onclick="setMode('healthy')">
            <strong>🟢 1. Normal / Healthy Site</strong>
            <span>Returns clean HTTP 200 OK with normal HTML content.</span>
          </button>

          <button class="sim-btn ${activeMode === 'coming-soon' ? 'active' : ''}" onclick="setMode('coming-soon')">
            <strong>🟡 2. Hostinger "Coming Soon" Mode</strong>
            <span>Returns HTTP 200 with Hostinger "Coming Soon" placeholder to test deep content detection.</span>
          </button>

          <button class="sim-btn ${activeMode === 'server-error-500' ? 'active' : ''}" onclick="setMode('server-error-500')">
            <strong>🔴 3. HTTP 500 Server Error</strong>
            <span>Simulates PHP crash / 500 Internal Server Error.</span>
          </button>

          <button class="sim-btn ${activeMode === 'database-error' ? 'active' : ''}" onclick="setMode('database-error')">
            <strong>💥 4. Database Connection Crash</strong>
            <span>Simulates "Error establishing a database connection".</span>
          </button>

          <button class="sim-btn ${activeMode === 'timeout' ? 'active' : ''}" onclick="setMode('timeout')">
            <strong>⏳ 5. Timeout / Hanging (10s)</strong>
            <span>Hangs requests for 10s to test connection timeout alerts.</span>
          </button>

          <button class="sim-btn ${activeMode === 'not-found' ? 'active' : ''}" onclick="setMode('not-found')">
            <strong>🚫 6. HTTP 404 Page Not Found</strong>
            <span>Simulates broken subpages / missing routes.</span>
          </button>
        </div>

        <div class="instruction">
          <strong>💡 How to test with your PulseGuard Monitor:</strong><br>
          1. In your PulseGuard dashboard, click <strong>"+ Add Website"</strong>.<br>
          2. Name: <code>Sandbox Test Site</code> | Base URL: <code id="siteBaseUrl">https://pulse-guard-simulator.vercel.app</code> | Threshold: <code>1</code>.<br>
          3. Change modes from this control panel, or test direct URLs like <code>/mode/coming-soon</code> or <code>/mode/server-error-500</code>.<br>
          4. When you click <strong>"Check Now"</strong> in PulseGuard, it will immediately catch the outage and notify Telegram!
        </div>

        <div class="direct-links">
          <h4>🔗 Direct Static Failure Endpoints (for deterministic monitor testing):</h4>
          <ul>
            <li>• Coming Soon: <a href="/mode/coming-soon" target="_blank">/mode/coming-soon</a></li>
            <li>• HTTP 500: <a href="/mode/server-error-500" target="_blank">/mode/server-error-500</a></li>
            <li>• DB Crash: <a href="/mode/database-error" target="_blank">/mode/database-error</a></li>
            <li>• 404 Not Found: <a href="/mode/not-found" target="_blank">/mode/not-found</a></li>
            <li>• Clean Healthy: <a href="/mode/healthy" target="_blank">/mode/healthy</a></li>
          </ul>
        </div>
      </div>

      <script>
        document.getElementById('currentUrl').textContent = window.location.origin;
        const baseEl = document.getElementById('siteBaseUrl');
        if (baseEl) baseEl.textContent = window.location.origin;

        async function setMode(mode) {
          document.cookie = "sim_mode=" + mode + "; path=/; max-age=86400; SameSite=Lax";
          try {
            await fetch('/api/set-mode?mode=' + mode);
          } catch(e) {}
          window.location.reload();
        }
      </script>
    </body>
    </html>
  `;
}

const server = http.createServer(handler);

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🎮 Test Sandbox running on http://localhost:${PORT}`);
    console.log(`🕹️ Control Panel available at http://localhost:${PORT}/control`);
    console.log(`======================================================\n`);
  });
}

handler.renderControlPage = renderControlPage;
module.exports = handler;
