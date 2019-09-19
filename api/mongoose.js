const mongoose = require('mongoose');
const logger = require('./logger');

module.exports = function (app) {
  mongodb_uri = app.get('mongodb');
  logger.info('MONGOOSE URI : ' + JSON.stringify(mongodb_uri))
  mongoose.connect(mongodb_uri);
  mongoose.Promise = global.Promise;
  app.set('mongooseClient', mongoose);
};
