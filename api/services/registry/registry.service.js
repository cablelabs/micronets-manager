// Initializes the `registry` service on path `/micronets/v1/mm/registry`
const createService = require('feathers-mongoose');
const createModel = require('../../models/registry.model');
const hooks = require('./registry.hooks');

module.exports = function (app) {
  const Model = createModel(app);
  const paginate = app.get('paginate');

  const options = {
    Model,
    paginate
  };

  // Initialize our service with any options it requires
  app.use('/mm/v1/micronets/registry', createService(options));

  // Get our initialized service so that we can register hooks
  const service = app.service('/mm/v1/micronets/registry');

  service.hooks(hooks);
};
