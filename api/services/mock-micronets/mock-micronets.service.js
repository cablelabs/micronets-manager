// Initializes the `mock-micronets` service on path `/mm/v1/mock/micronets`
const createService = require('feathers-mongoose');
const createModel = require('../../models/mock-micronets.model');
const hooks = require('./mock-micronets.hooks');
const paths = require('./../../hooks/servicePaths')
const MOCK_MICRONET_PATH = paths.MOCK_MICRONET_PATH
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
  app.use(`${MOCK_MICRONET_PATH}`, createService(options));
  const service = app.service(`${MOCK_MICRONET_PATH}`);
  service.hooks(hooks);
  app.use(`${MOCK_MICRONET_PATH}/:id/micronets/:micronetId/devices`, service);
  app.use(`${MOCK_MICRONET_PATH}/:id/micronets/:micronetId`, service);
  app.use(`${MOCK_MICRONET_PATH}/:id/micronets`, service);

};
