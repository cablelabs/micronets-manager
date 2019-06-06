// Initializes the `subnetAllocator` service on path `/mm/v1/allocator`
const createService = require('feathers-memory');
const hooks = require('./subnet-allocator.hooks');
module.exports = function (app) {
  
  const paginate = app.get('paginate');

  const options = {
    paginate
  };

  // Initialize our service with any options it requires
  app.use('/mm/v1/allocator', createService(options));

  // Get our initialized service so that we can register hooks
  const service = app.service('mm/v1/allocator');
  service.hooks(hooks);
  app.use ( `mm/v1/allocator/subnets`, service  );
  app.use ( `mm/v1/allocator/subnets/:id`, service  );
  app.use ( `mm/v1/allocator/subnets/:id/devices`, service  );
};
