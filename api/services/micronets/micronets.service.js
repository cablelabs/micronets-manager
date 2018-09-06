// Initializes the `micronets` service on path `/mm/v1/micronets`
const createService = require('feathers-mongoose');
const createModel = require('../../models/micronets.model');
const hooks = require('./micronets.hooks');

module.exports = function (app) {
  const Model = createModel(app);
  const paginate = app.get('paginate');

  const options = {
    Model,
    paginate
  };

  // Initialize our service with any options it requires
  app.use('/mm/v1/micronets', createService(options));

  // Get our initialized service so that we can register hooks
  const service = app.service('mm/v1/micronets');
  service.hooks(hooks);

  app.use('/mm/v1/micronets/init', async (req, res, next) => {
    const { path, originalUrl, method } = req
    console.log('\n REQUEST PATH : ' + JSON.stringify(path) + '\t\t ORIGINAL URL : ' + JSON.stringify(originalUrl) + '\t\t METHOD : ' + JSON.stringify(method))
    const result =  await service.create ( {
      data : { req : req } ,
      params : service.hooks.params
    } )
    console.log('\n MICRO-NETS SERVICE RESULT : ' + JSON.stringify(result))
    service.on('created' , (micronet) => {
      console.log('\n MICRO-NETS SERVICE INIT CREATE EVENT : ' + JSON.stringify(micronet))
    })
     res.json(result)
  });

  app.use(`/mm/v1/micronets/:micronetId/subnets/:subnetId/devices`, async (req, res, next) => {
    const { path, originalUrl, method, params } = req
    console.log('\n REQUEST PATH : ' + JSON.stringify(path) + '\t\t ORIGINAL URL : ' + JSON.stringify(originalUrl) + '\t\t METHOD : ' + JSON.stringify(method) + '\t\t PARAMS : ' + JSON.stringify(params))
    if(method == 'POST') {
      const result =  await service.create ( {
        data : { req : req } ,
        params : service.hooks.params
      } )
      console.log('\n MICRO-NETS ADD DEVICE TO SUBNET SERVICE RESULT : ' + JSON.stringify(result))
      service.on('created' , (micronet) => {
        console.log('\n MICRO-NETS ADD DEVICE TO SUBNET SERVICE CREATE EVENT : ' + JSON.stringify(micronet))
      })
      res.json(result)
    }

  });

  app.use(`/mm/v1/micronets/:micronetId/subnets`, async (req, res, next) => {
    const { path, originalUrl, method, params } = req
    console.log('\n REQUEST PATH : ' + JSON.stringify(path) + '\t\t ORIGINAL URL : ' + JSON.stringify(originalUrl) + '\t\t METHOD : ' + JSON.stringify(method) + '\t\t PARAMS : ' + JSON.stringify(params))
    if(method == 'POST') {
      const result =  await service.create ( {
        data : { req : req } ,
        params : service.hooks.params
      } )
      console.log('\n MICRO-NETS ADD SUBNET SERVICE RESULT : ' + JSON.stringify(result))
      service.on('created' , (micronet) => {
        console.log('\n MICRO-NETS ADD SUBNET SERVICE CREATE EVENT : ' + JSON.stringify(micronet))
      })
      res.json(result)
    }

  });



};
