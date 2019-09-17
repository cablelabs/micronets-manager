const MongoClient = require('mongodb').MongoClient;
const logger = require('./logger');

module.exports = function () {
  const app = this;
  mongodb_uri = process.env.MONGODB_URI
  if (!mongodb_uri) {
    mongodb_uri = app.get('mongodb');
  }
  logger.info('MONGODB URI : ' + JSON.stringify(mongodb_uri))
  const promise = MongoClient.connect(mongodb_uri);
  app.set('mongoClient', promise);
};
