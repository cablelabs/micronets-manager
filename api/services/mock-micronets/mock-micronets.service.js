// Initializes the `mock-micronets` service on path `/mm/v1/mock/micronets`
const createService = require('feathers-mongoose');
const createModel = require('../../models/mock-micronets.model');
const hooks = require('./mock-micronets.hooks');
const micronetWithDevices = require('../../mock-data/micronetWithDevices');
const micronetWithoutDevices = require('../../mock-data/micronetWithoutDevices');
const micronetNotifications = require('../../mock-data/micronetNotifications');

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

  app.use('/mm/v1/mock/restconf/config/micronets-notifications:micronets-notifications', (req, res, next) => {
    res.json(micronetNotifications);
  });


  app.use('/mm/v1/mock/micronets/:micronetId/subnet/:subnetId/devices', (req, res, next) => {
    // console.log('\n Request : ' + JSON.stringify(req.originalUrl))
    // console.log('\n req.path : ' + JSON.stringify(req.path))
    // console.log('\n Request method : ' + JSON.stringify(req.method))
    res.json(micronetWithDevices);
  });

  app.use('/mm/v1/mock/micronets/:micronetId/subnets', (req, res, next) => {
    res.json(micronetWithoutDevices);
  });

  app.use('/mm/v1/mock/micronets/init', (req, res, next) => {
    res.json(micronetWithoutDevices);
  });




};
