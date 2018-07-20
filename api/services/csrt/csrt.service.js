// Initializes the `csrt` service on path `/micronets/v1/mm/csrt`
const createService = require('feathers-mongoose');
const createModel = require('../../models/csrt.model');
const hooks = require('./csrt.hooks');

module.exports = function (app) {
  const Model = createModel(app);
  const paginate = app.get('paginate');

  const options = {
    Model,
    paginate
  };

  // Initialize our service with any options it requires
  app.use('/micronets/v1/mm/csrt', createService(options));

  // Get our initialized service so that we can register hooks
  const service = app.service('micronets/v1/mm/csrt');

  service.hooks(hooks);
};