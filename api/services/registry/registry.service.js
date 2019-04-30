// Initializes the `registry` service on path `/micronets/v1/mm/registry`
const createService = require('feathers-mongoose');
const createModel = require('../../models/registry.model');
const hooks = require('./registry.hooks');
const paths = require('./../../hooks/servicePaths')
const REGISTRY_PATH = paths.REGISTRY_PATH
module.exports = function (app) {
  const Model = createModel(app);
  const paginate = app.get('paginate');

  const options = {
    id:'subscriberId',
    Model,
    paginate
  };

  // Initialize our service with any options it requires
  app.use(`${REGISTRY_PATH}`, createService(options));

  // Get our initialized service so that we can register hooks
  const service = app.service(`${REGISTRY_PATH}`);

  service.hooks(hooks);
};
