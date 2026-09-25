const serverHandler = require('../server.js');

module.exports = (req, res) => {
  return serverHandler(req, res);
};
