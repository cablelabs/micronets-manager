const MongoClient = require('mongodb').MongoClient;
const logger = require('./logger');

module.exports = function () {
  const app = this;
  let dbConfig = ''
  if(process.env.NODE_ENV == 'development' && process.env.NETWORK_MODE == 'false') {
    logger.debug('MongoDB connection : ' + JSON.stringify(app.get('mongodbDocker')) + '\t\t Node environment : ' + JSON.stringify(process.env.NODE_ENV) + '\t\t DOCKER_COMPOSE : ' + JSON.stringify(process.env.NETWORK_MODE));
    dbConfig = app.get('mongodbDocker');
  }
  else {
    logger.debug('MongoDB connection : ' + JSON.stringify(app.get('mongodb')) + '\t\t Node environment : ' + JSON.stringify(process.env.NODE_ENV));
    dbConfig = app.get('mongodb');
  }
  const promise = MongoClient.connect(dbConfig);
  app.set('mongoClient', promise);
};
