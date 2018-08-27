// Initializes the `micronets` service on path `/mm/v1/micronets`
const createService = require('feathers-mongoose');
const createModel = require('../../models/micronets.model');
const hooks = require('./micronets.hooks');

module.exports = function (app) {
  const Model = createModel(app);
  const paginate = app.get('paginate');

  const options = {
    Model,
    paginate
  };

  // Initialize our service with any options it requires
  app.use('/mm/v1/micronets', createService(options));

  // Get our initialized service so that we can register hooks
  const service = app.service('mm/v1/micronets');

  service.hooks(hooks);
};
