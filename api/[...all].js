const handler = require('../server.js');

module.exports = (req, res) => {
  // Catch route from Vercel dynamic param
  if (req.query && req.query.all) {
    const slug = Array.isArray(req.query.all) ? req.query.all.join('/') : req.query.all;
    req.url = '/' + slug + (req.url.includes('?') ? '?' + req.url.split('?')[1] : '');
  }
  return handler(req, res);
};
