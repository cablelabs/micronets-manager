let config = {};
try {
  config = require('./' + process.env.NODE_ENV + '.json');
} catch (e) {
  config = require('./default.json');
}

module.exports = config;
