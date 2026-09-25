const url = require('url');

module.exports = (req, res) => {
  const parsed = url.parse(req.url, true);
  const mode = req.query?.mode || parsed.query?.mode || 'healthy';
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Set-Cookie': `sim_mode=${mode}; Path=/; Max-Age=86400; SameSite=Lax`
  });
  res.end(JSON.stringify({ success: true, currentMode: mode }));
};
