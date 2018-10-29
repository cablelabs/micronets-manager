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
  app.use('/mm/v1/dhcp', createService(options));

  // Get our initialized service so that we can register hooks
  const service = app.service('mm/v1/dhcp');
  service.hooks(hooks);

  app.use('/mm/v1/dhcp/subnets/:subnetId/devices/:deviceId', async(req , res , next) => {
    const { path , originalUrl , method, params, body } = req
    console.log ( '\n REQUEST PATH : ' + JSON.stringify ( path ) + '\t\t ORIGINAL URL : ' + JSON.stringify ( originalUrl )
      + '\t\t PARAMS : ' + JSON.stringify ( params )
      + '\t\t BODY : ' + JSON.stringify ( body )
      + '\t\t METHOD : ' + JSON.stringify ( method ) )

    if(method == 'PUT'){
      const subnet = await service.get(params.subnetId,params)
      console.log('\n Subnet to update device info : ' + JSON.stringify(subnet))
      const result =  await service.update(null,{...req.body},{ query : { subnetId:params.subnetId, deviceId:params.deviceId ,url:originalUrl }, mongoose: { upsert: true}})
      res.json(result)
    }
    if(method == 'GET') {
      const result =  await service.get(null,{subnetId:params.subnetId,deviceId:params.deviceId,url:originalUrl})
      res.json(result)
    }
    if(method == 'DELETE') {
      const result =  await service.remove(null,{subnetId:params.subnetId, deviceId:params.deviceId, url:originalUrl})
      res.json(result)
    }
  });

  app.use('/mm/v1/dhcp/subnets/:subnetId/devices', async(req , res , next) => {
    const { path , originalUrl , method, params, body } = req
    console.log ( '\n REQUEST PATH : ' + JSON.stringify ( path )
      + '\t\t ORIGINAL URL : ' + JSON.stringify ( originalUrl )
      + '\t\t PARAMS : ' + JSON.stringify ( params )
      + '\t\t BODY : ' + JSON.stringify ( body )
      + '\t\t METHOD : ' + JSON.stringify ( method ) )

    if(method == 'POST'){
      const subnet = await service.get(params.subnetId,params)
      console.log('\n Subnet to add device to : ' + JSON.stringify(subnet))
      const result =  await service.create({...req.body},{ query : { subnetId:params.subnetId, url:originalUrl }, mongoose: { upsert: true}})
      res.json(result)
    }
    if(method == 'GET') {
      const result =  await service.get(null,{url:originalUrl,subnetId:params.subnetId})
      res.json(result)
    }
    if(method == 'DELETE') {
      const result =  await service.remove(null,{subnetId:params.subnetId,url:originalUrl})
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
      const result =  await service.update(null,{...req.body},{ query : { subnetId : params.subnetId }, mongoose: { upsert: true}})
      res.json(result)
    }
    if(method == 'GET') {
      const result =  await service.get(null,{subnetId:params.subnetId,url:originalUrl})
      res.json(result)
    }
    if(method == 'DELETE') {
      const result =  await service.remove(null,{subnetId:params.subnetId,url:originalUrl})
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

    if(method == 'POST'){
     const result =  await service.create({...req})
      res.json(result)
    }
    if(method == 'GET') {
      const result =  await service.get(null,{url:originalUrl})
      res.json(result)
    }
    if(method == 'DELETE') {
      const result =  await service.remove(null,{url:originalUrl})
      res.json(result)
    }
  });
};
