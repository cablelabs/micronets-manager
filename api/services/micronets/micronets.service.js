// Initializes the `micronets` service on path `/mm/v1/micronets`
const createService = require ( 'feathers-mongoose' );
const createModel = require ( '../../models/micronets.model' );
const hooks = require ( './micronets.hooks' );
const logger = require ( './../../logger' );

module.exports = function ( app ) {
  const Model = createModel ( app );
  const paginate = app.get ( 'paginate' );

  const options = {
    id: 'id',
    Model ,
    paginate
  };

  // Initialize our service with any options it requires
  app.use ( '/mm/v1/subscriber' , createService ( options ) );

  // Get our initialized service so that we can register hooks
  const service = app.service ( 'mm/v1/subscriber' );
  service.hooks ( hooks );

  // app.use ( '/mm/v1/micronets/init', service  );

  app.use ( `/mm/v1/subscriber/:id/micronets/:micronetId/devices`, service  );
  app.use ( `/mm/v1/subscriber/:id/micronets/:micronetId`, service  );
  app.use ( `/mm/v1/subscriber/:id/micronets`, service  );

  app.service ( '/mm/v1/micronets/users' ).on ( 'userDeviceRegistered' , ( data ) => {
    service.create ( { ...data } , { params : service.hooks.params } )
  } )
};
