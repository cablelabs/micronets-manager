// Initializes the `mock-micronets` service on path `/mm/v1/mock/micronets`
const createService = require('feathers-mongoose');
const createModel = require('../../models/mock-micronets.model');
const hooks = require('./mock-micronets.hooks');

module.exports = function (app) {
  const Model = createModel(app);
  const paginate = app.get('paginate');
  const path = app.get('path')
  const options = {
    Model,
    paginate,
    path
  };

  // Initialize our service with any options it requires
  app.use('/mm/v1/mock/micronets', createService(options));
  const service = app.service('mm/v1/mock/micronets');
  service.hooks(hooks);

  app.use('/mm/v1/mock/micronets/:micronetId/subnets/:subnetId/devices', service);

};
