// Initializes the `mock-micronets` service on path `/mm/v1/mock/micronets`
const createService = require('feathers-mongoose');
const createModel = require('../../models/mock-micronets.model');
const hooks = require('./mock-micronets.hooks');
const paths = require('./../../hooks/servicePaths')
const servicePath = paths.MOCK_MICRONET_PATH
module.exports = function (app) {
  const Model = createModel(app);
  const paginate = app.get('paginate');
  const path = app.get('path')
  const options = {
    id: 'id',
    Model,
    paginate,
    path
  };

  // Initialize our service with any options it requires
  app.use(`${servicePath}`, createService(options));
  const service = app.service(`${servicePath}`);
  service.hooks(hooks);
  app.use(`${servicePath}/:id/micronets/:micronetId/devices`, service);
  app.use(`${servicePath}/:id/micronets/:micronetId`, service);
  app.use(`${servicePath}/:id/micronets`, service);

};
