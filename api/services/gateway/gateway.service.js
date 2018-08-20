// Initializes the `gateway` service on path `/mm/v1/micronets/gateway/status`
const createService = require('feathers-mongoose');
const createModel = require('../../models/gateway.model');
const hooks = require('./gateway.hooks');

module.exports = function (app) {
  const Model = createModel(app);
  const paginate = app.get('paginate');

  const options = {
    Model,
    paginate
  };

  // Initialize our service with any options it requires
  app.use('/mm/v1/micronets/gtwystatus', createService(options));

  // Get our initialized service so that we can register hooks
  const service = app.service('mm/v1/micronets/gtwystatus');

  service.hooks(hooks);
};
