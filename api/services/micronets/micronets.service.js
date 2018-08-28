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
    const data = {reqUrl: '/mm/v1/micronets/init',path:'/mm/v1/micronets/init', method: 'POST' }
    const result =  await service.create ( {
      data : { reqUrl : '/mm/v1/micronets/init' , path : '/mm/v1/micronets/init' , method : 'POST' } ,
      params : service.hooks.params
    } )
     console.log('\n service.create result : ' + JSON.stringify(result))
    service.on('created' , (micronet)=> {
      console.log('\n Created event captured micronet : ' + JSON.stringify(micronet))
    })
     res.json(result)
  });

};
