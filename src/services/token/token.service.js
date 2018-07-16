// Initializes the `token` service on path `/token`
const createService = require('feathers-mongodb');
const hooks = require('./token.hooks');

module.exports = function (app) {
  const paginate = app.get('paginate');
  const mongoClient = app.get('mongoClient');
  const options = { paginate };

  // Initialize our service with any options it requires
  app.use('/token', createService(options));

  // Get our initialized service so that we can register hooks and filters
  const service = app.service('token');

  mongoClient.then(db => {
    service.Model = db.collection('token');
  });

  service.hooks(hooks);
};
