// Initializes the `certificates` service on path `/micronets/v1/mm/certificates`
const createService = require('feathers-mongoose');
const createModel = require('../../models/certificates.model');
const hooks = require('./certificates.hooks');

module.exports = function (app) {
  const Model = createModel(app);
  const paginate = app.get('paginate');

  const options = {
    Model,
    paginate
  };

  // Initialize our service with any options it requires
  app.use('/micronets/v1/mm/certificates', createService(options));

  // Get our initialized service so that we can register hooks
  const service = app.service('micronets/v1/mm/certificates');

  service.hooks(hooks);
};
