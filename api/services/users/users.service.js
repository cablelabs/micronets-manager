// Initializes the `users` service on path `/micronets/v1/mm/users`
const createService = require('feathers-mongoose');
const createModel = require('../../models/users.model');
const hooks = require('./users.hooks');
const paths = require('./../../hooks/servicePaths')
const USERS_PATH = paths.USERS_PATH
module.exports = function (app) {
  const Model = createModel(app);
  const paginate = app.get('paginate');

  const options = {
    id:'id',
    Model,
    paginate
  };

  // Initialize our service with any options it requires
  app.use(`${USERS_PATH}`, createService(options));

  // Get our initialized service so that we can register hooks
  const service = app.service(`${USERS_PATH}`);

  service.hooks(hooks);
};
