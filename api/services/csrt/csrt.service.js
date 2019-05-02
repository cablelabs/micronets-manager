// Initializes the `csrt` service on path `/micronets/v1/mm/csrt`
const createService = require('feathers-mongoose');
const createModel = require('../../models/csrt.model');
const hooks = require('./csrt.hooks');
const paths = require('./../../hooks/servicePaths')
const servicePath = paths.CSRT_PATH
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
};
