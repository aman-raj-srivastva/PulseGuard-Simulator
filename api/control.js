const { handler } = require('../server.js');
const serverHandler = require('../server.js');

module.exports = (req, res) => {
  // Directly render control page
  if (serverHandler.renderControlPage) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(serverHandler.renderControlPage());
  }
  return serverHandler(req, res);
};
