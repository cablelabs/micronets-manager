// Initializes the `odl` service on path `/old/v1/micronets/config`
const createService = require('feathers-mongoose');
const createModel = require('../../models/odl.model');
const hooks = require('./odl.hooks');

module.exports = function (app) {
  const Model = createModel(app);
  const paginate = app.get('paginate');

  const options = {
    Model,
    paginate
  };

  // Initialize our service with any options it requires
  app.use('/odl/v1/micronets/config', createService(options));

  // Get our initialized service so that we can register hooks
  const service = app.service('odl/v1/micronets/config');

  service.hooks(hooks);
};
