const mongoose = require('mongoose');
const logger = require('./logger');

module.exports = function (app) {
  if(process.env.NODE_ENV == 'development' && process.env.NETWORK_MODE == 'false') {
    logger.debug('Mongoose connection : ' + JSON.stringify(app.get('mongodbDocker')) + '\t\t Node environment : ' + JSON.stringify(process.env.NODE_ENV) + '\t\t DOCKER_COMPOSE : ' + JSON.stringify(process.env.NETWORK_MODE));
    mongoose.connect(app.get('mongodbDocker'));
  }
  else {
    logger.debug('Mongoose connection : ' + JSON.stringify(app.get('mongodb')) + '\t\t Node environment : ' + JSON.stringify(process.env.NODE_ENV));
    mongoose.connect(app.get('mongodb'));
  }
  mongoose.Promise = global.Promise;
  app.set('mongooseClient', mongoose);
};
