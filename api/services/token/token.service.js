// Initializes the `token` service on path `/token`
const createService = require('feathers-mongoose');
const createModel = require('../../models/token.model');
const hooks = require('./token.hooks');

module.exports = function (app) {
  const Model = createModel(app);
  const paginate = app.get('paginate');

  const options = {
    Model,
    paginate
  };

  // Initialize our service with any options it requires
  app.use('/token', createService(options));

  // Get our initialized service so that we can register hooks
  const service = app.service('token');

  service.hooks(hooks);
};
