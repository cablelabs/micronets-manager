// Initializes the `dhcp` service on path `/mm/v1/micronets/dhcp`
const createService = require('feathers-mongoose');
const createModel = require('../../models/dhcp.model');
const hooks = require('./dhcp.hooks');

module.exports = function (app) {
  const Model = createModel(app);
  const paginate = app.get('paginate');

  const options = {
    Model,
    paginate
  };

  // Initialize our service with any options it requires
  app.use('/mm/v1/micronets/dhcp', createService(options));

  // Get our initialized service so that we can register hooks
  const service = app.service('mm/v1/micronets/dhcp');

  service.hooks(hooks);
};
