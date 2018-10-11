// Initializes the `micronets` service on path `/mm/v1/micronets`
const createService = require ( 'feathers-mongoose' );
const createModel = require ( '../../models/micronets.model' );
const hooks = require ( './micronets.hooks' );

module.exports = function ( app ) {
  const Model = createModel ( app );
  const paginate = app.get ( 'paginate' );

  const options = {
    Model ,
    paginate
  };

  // Initialize our service with any options it requires
  app.use ( '/mm/v1/micronets' , createService ( options ) );

  // Get our initialized service so that we can register hooks
  const service = app.service ( 'mm/v1/micronets' );
  service.hooks ( hooks );

  app.use ( '/mm/v1/micronets/init' , async ( req , res , next ) => {
    const { path , originalUrl , method } = req
    console.log ( '\n REQUEST PATH : ' + JSON.stringify ( path ) + '\t\t ORIGINAL URL : ' + JSON.stringify ( originalUrl ) + '\t\t METHOD : ' + JSON.stringify ( method ) )
    const result = await service.create (
      { req : req } ,
      { params : service.hooks.params }
    )
    // console.log ( '\n Micronets service result : ' + JSON.stringify ( result ) )
    service.on ( 'created' , ( micronet ) => {
      console.log ( '\n Micronets service created event : ' + JSON.stringify ( micronet ) )
    } )
    res.json ( result )
  } );

  app.use ( `/mm/v1/micronets/:micronetId/subnets/:subnetId/devices` , async ( req , res , next ) => {
    const { path , originalUrl , method , params } = req
    console.log ( '\n REQUEST PATH : ' + JSON.stringify ( path ) + '\t\t ORIGINAL URL : ' + JSON.stringify ( originalUrl ) + '\t\t METHOD : ' + JSON.stringify ( method ) + '\t\t PARAMS : ' + JSON.stringify ( params ) )
    if ( method == 'POST' ) {
      const result = await service.create (
        { req : req } ,
        { params : service.hooks.params }
      )
      // console.log ( '\n Micronets service add device to subnet result : ' + JSON.stringify ( result ) )
      service.on ( 'created' , ( micronet ) => {
        console.log ( '\n Micronets service add device to subnet created event  : ' + JSON.stringify ( micronet ) )
      } )
      res.json ( result )
    }

  } );

  app.use ( `/mm/v1/micronets/subnets/testdhcp` , async ( req , res , next ) => {
    const { path , originalUrl , method , params } = req
    console.log ( '\n REQUEST PATH : ' + JSON.stringify ( path ) + '\t\t ORIGINAL URL : ' + JSON.stringify ( originalUrl ) + '\t\t METHOD : ' + JSON.stringify ( method ) + '\t\t PARAMS : ' + JSON.stringify ( params ) )
    if ( method == 'POST' ) {

      const result = await service.create (
        { req : req } ,
        { params : service.hooks.params }
      )
      // console.log ( '\n Micronets service add subnet result : ' + JSON.stringify ( result ) )
      service.on ( 'created' , ( micronet ) => {
        console.log ( '\n Micronets service add subnet created event : ' + JSON.stringify ( micronet ) )
      } )
      res.json ( result )
    }

    else if ( method == 'GET' ) {
      const result = await service.get ( { ...params } )
      res.json ( result )
    }

  } );

  app.use ( `/mm/v1/micronets/subnets` , async ( req , res , next ) => {
    const { path , originalUrl , method , params } = req
    console.log ( '\n REQUEST PATH : ' + JSON.stringify ( path ) + '\t\t ORIGINAL URL : ' + JSON.stringify ( originalUrl ) + '\t\t METHOD : ' + JSON.stringify ( method ) + '\t\t PARAMS : ' + JSON.stringify ( params ) )
    if ( method == 'POST' ) {

      const result = await service.create (
        { req : req } ,
        { params : service.hooks.params }
      )
      // console.log ( '\n Micronets service add subnet result : ' + JSON.stringify ( result ) )
      service.on ( 'created' , ( micronet ) => {
        console.log ( '\n Micronets service add subnet created event : ' + JSON.stringify ( micronet ) )
      } )
      res.json ( result )
    }

    else if ( method == 'GET' ) {
      const result = await service.get ( { ...params } )
      res.json ( result )
    }

  } );

  app.service ( '/mm/v1/micronets/users' ).on ( 'userDeviceRegistered' , ( data ) => {
    console.log ( '\n Micronets service userDeviceRegistered event detected with data : ' + JSON.stringify ( data ) )
    service.create ( { ...data } , { params : service.hooks.params } )
  } )

  // app.service ( '/mm/v1/micronets/users' ).on ( 'userCreate' , ( data ) => {
  //   console.log ( '\n Micro-nets service userCreate event detected with data : ' + JSON.stringify ( data ) )
  //    service.create ( { ...data } , { params : service.hooks.params } )
  // } )

};
