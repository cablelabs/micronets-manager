// Initializes the `mock-micronets` service on path `/mm/v1/mock/micronets`
const createService = require('feathers-mongoose');
const createModel = require('../../models/mock-micronets.model');
const hooks = require('./mock-micronets.hooks');

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
  app.use('/mm/v1/mock/subscriber', createService(options));
  const service = app.service('mm/v1/mock/subscriber');
  service.hooks(hooks);

  app.use('/mm/v1/mock/subscriber/:id/micronets/:micronetId/devices', service);
  app.use('/mm/v1/mock/subscriber/:id/micronets/:micronetId', service);
  app.use('/mm/v1/mock/subscriber/:id/micronets', service);

};
