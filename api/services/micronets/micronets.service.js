// Initializes the `micronets` service on path `/mm/v1/micronets`
const createService = require ( 'feathers-mongoose' );
const createModel = require ( '../../models/micronets.model' );
const hooks = require ( './micronets.hooks' );
const logger = require ( './../../logger' );
const paths = require('./../../hooks/servicePaths')
const servicePath =  paths.MICRONETS_PATH
const {  USERS_PATH } = paths
module.exports = function ( app ) {
  const Model = createModel ( app );
  const paginate = app.get ( 'paginate' );

  const options = {
    id: 'id',
    Model ,
    paginate
  };

  // Initialize our service with any options it requires
  app.use ( `${servicePath}` , createService ( options ) );
  // Get our initialized service so that we can register hooks
  const service = app.service ( `${servicePath}` );
  service.hooks ( hooks );
  app.use ( `${servicePath}/:id/micronets/:micronetId/devices`, service  );
  app.use ( `${servicePath}/:id/micronets/:micronetId`, service  );
  app.use ( `${servicePath}/:id/micronets`, service  );
  app.service (`${USERS_PATH}`).on ( 'userDeviceRegistered' , ( data ) => {
    service.create ( { ...data } , { params : service.hooks.params } )
  } )
};
