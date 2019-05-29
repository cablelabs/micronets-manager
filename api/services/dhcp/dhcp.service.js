// Initializes the `dhcp` service on path `/mm/v1/micronets/dhcp`
const createService = require('feathers-mongoose');
const createModel = require('../../models/dhcp.model');
const hooks = require('./dhcp.hooks');
const paths = require('./../../hooks/servicePaths')
const servicePath = paths.DHCP_PATH
const logger = require ( './../../logger' );
module.exports = function (app) {
  const Model = createModel(app);
  const paginate = app.get('paginate');

  const options = {
    Model,
    paginate
  };

  // Initialize our service with any options it requires
  app.use(`${servicePath}`, createService(options));

  // Get our initialized service so that we can register hooks
  const service = app.service(`${servicePath}`);
  service.hooks(hooks);
  app.use(`${servicePath}/:id/devices/:deviceId`, service);
  app.use(`${servicePath}/:id/devices`, service);
  app.use(`${servicePath}/:id`, service);

};