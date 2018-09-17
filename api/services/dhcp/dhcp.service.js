// Initializes the `dhcp` service on path `/mm/v1/micronets/dhcp`
const createService = require('feathers-mongoose');
const createModel = require('../../models/dhcp.model');
const hooks = require('./dhcp.hooks');

module.exports = function (app) {
  const Model = createModel(app);
  const paginate = app.get('paginate');

  const options = {
    Model,
    paginate
  };

  // Initialize our service with any options it requires
  app.use('/mm/v1/micronets/dhcp', createService(options));

  // Get our initialized service so that we can register hooks
  const service = app.service('mm/v1/micronets/dhcp');
  service.hooks(hooks);

  // app.use('/subnets', async(req , res , next) => {
  //   const result =  service.create(params)
  // });

  // app.use('/mm/v1/dhcp/subnets/:subnetId/devices', service);

  app.use('/mm/v1/dhcp/subnets/:subnetId/devices', async(req , res , next) => {
    const { path , originalUrl , method, params, body } = req
    console.log ( '\n REQUEST PATH : ' + JSON.stringify ( path )
      + '\t\t ORIGINAL URL : ' + JSON.stringify ( originalUrl )
      + '\t\t PARAMS : ' + JSON.stringify ( params )
      + '\t\t BODY : ' + JSON.stringify ( body )
      + '\t\t METHOD : ' + JSON.stringify ( method ) )

    if(method == 'POST'){
      const subnet = await service.get(params.subnetId,params)
      console.log('\n subnet to add device to : ' + JSON.stringify(subnet))
      const result =  await service.update(subnet._id,{...req.body},{ query : { subnetId:params.subnetId, url:originalUrl }, mongoose: { upsert: true}})
      res.json(result)
    }
    if(method == 'GET') {
      const result =  await service.get(params.subnetId,params)
      res.json(result)
    }
  });

  app.use('/mm/v1/dhcp/subnets/:subnetId', async(req , res , next) => {
    const { path , originalUrl , method, params, body } = req
    console.log ( '\n REQUEST PATH : ' + JSON.stringify ( path )
      + '\t\t ORIGINAL URL : ' + JSON.stringify ( originalUrl )
      + '\t\t PARAMS : ' + JSON.stringify ( params )
      + '\t\t BODY : ' + JSON.stringify ( body )
      + '\t\t METHOD : ' + JSON.stringify ( method ) )

    if(method == 'PUT'){
      const result =  await service.update(params.subnetId,{...req.body},{ query : { subnetId : params.subnetId }, mongoose: { upsert: true}})
      res.json(result)
    }
    if(method == 'GET') {
      const result =  await service.get(params.subnetId,params)
      res.json(result)
    }
  });


  app.use('/mm/v1/dhcp/subnets', async(req , res , next) => {
    const { path , originalUrl , method, params, body } = req
    console.log ( '\n REQUEST PATH : ' + JSON.stringify ( path )
      + '\t\t ORIGINAL URL : ' + JSON.stringify ( originalUrl )
      + '\t\t PARAMS : ' + JSON.stringify ( params )
      + '\t\t BODY : ' + JSON.stringify ( body )
      + '\t\t METHOD : ' + JSON.stringify ( method ) )

    // res.json({message:'DHCP Subnet created'})
    if(method == 'POST'){
     const result =  await service.create({...req})
      res.json(result)
    }
    if(method == 'GET') {
      const result =  await service.get(null,params)
      res.json(result)
    }
    if(method == 'PUT'){
      const result =  await service.update(params.subnetId,{...req.body})
      res.json(result)
    }
  });




};
