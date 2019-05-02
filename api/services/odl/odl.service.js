// Initializes the `odl` service on path `/old/v1/micronets/config`
const createService = require('feathers-mongoose');
const createModel = require('../../models/odl.model');
const hooks = require('./odl.hooks');
const paths = require('./../../hooks/servicePaths')
const servicePath = paths.ODL_PATH
module.exports = function (app) {
  const Model = createModel(app);
  const paginate = app.get('paginate');

  const options = {
    id:'gatewayId',
    Model,
    paginate
  };

  // Initialize our service with any options it requires
  app.use(`${servicePath}`, createService(options));

  // Get our initialized service so that we can register hooks
  const service = app.service(`${servicePath}`);
  service.hooks(hooks);
};
