// Initializes the `micronets` service on path `/mm/v1/micronets`
const createService = require ( 'feathers-mongoose' );
const createModel = require ( '../../models/micronets.model' );
const hooks = require ( './micronets.hooks' );
const logger = require ( './../../logger' );
const paths = require('./../../hooks/servicePaths')
const MICRONETS_PATH = paths.MICRONET_PATH
const USERS_PATH = paths.USERS_PATH
module.exports = function ( app ) {
  const Model = createModel ( app );
  const paginate = app.get ( 'paginate' );

  const options = {
    id: 'id',
    Model ,
    paginate
  };

  // Initialize our service with any options it requires
  app.use ( `${MICRONETS_PATH}` , createService ( options ) );

  // Get our initialized service so that we can register hooks
  const service = app.service ( `${MICRONETS_PATH}` );
  service.hooks ( hooks );

  // app.use ( '/mm/v1/micronets/init', service  );

  app.use ( `${MICRONETS_PATH}/:id/micronets/:micronetId/devices`, service  );
  app.use ( `${MICRONETS_PATH}/:id/micronets/:micronetId`, service  );
  app.use ( `${MICRONETS_PATH}/:id/micronets`, service  );

  app.service (`${USERS_PATH}`).on ( 'userDeviceRegistered' , ( data ) => {
    service.create ( { ...data } , { params : service.hooks.params } )
  } )
};
