// Initializes the `mock-micronets` service on path `/mm/v1/mock/micronets`
const createService = require('feathers-mongoose');
const createModel = require('../../models/mock-micronets.model');
const hooks = require('./mock-micronets.hooks');
const micronetWithDevices = require('../../mock-data/micronetWithDevices');
const micronetWithoutDevices = require('../../mock-data/micronetWithoutDevices');
const micronetNotifications = require('../../mock-data/micronetNotifications');
const micronetsOperationalConfig = require('../../mock-data/micronetsOperationalConfig');

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
};
