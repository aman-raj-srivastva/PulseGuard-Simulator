const handler = require('../server.js');

module.exports = (req, res) => {
  const cookieHeader = req.headers && req.headers.cookie;
  let activeMode = 'healthy';
  if (cookieHeader) {
    const match = cookieHeader.match(/(^|;\s*)sim_mode=([^;]*)/);
    if (match) activeMode = decodeURIComponent(match[2]);
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(handler.renderControlPage(activeMode));
};
