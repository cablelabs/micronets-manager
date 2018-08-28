const { authenticate } = require('@feathersjs/authentication').hooks;

function initializeMicronets(hook) {
  hook.data = Object.assign({}, { message:'Initialize Micronets'})
  console.log('\n initializeMicronets function hook.data : ' + JSON.stringify(hook.data))
  return hook
}

function addMicronetsWithoutDevices(hook) {
  return { message: 'Add micronets without devices called' }
}

function addMicronetsWithDevices(hook) {
  return { message: 'Add micronets with devices called' }
}

module.exports = {
  before: {
    all: [ // authenticate('jwt')
       ],
    find: [],
    get: [],
    create: [
       hook => {
         const { data, params, id } = hook;
         console.log('\n Micronets create hook data : ' + JSON.stringify(data))
         console.log('\n Micronets create hook params : ' + JSON.stringify(params))
         if(data.data.reqUrl == '/mm/v1/micronets/init') {
           console.log('\n\n /mm/v1/micronets/init ')
           hook.data = Object.assign({}, { message:'Initialize Micro-nets'})
           console.log('\n hook.result : ' + JSON.stringify(hook.data))
           return Promise.resolve(hook);
         }
         if(data.data.reqUrl === '/mm/v1/micronets/123/subnets') {
           console.log('\n\n /mm/v1/micronets/123/subnets ')
         }
         if(data.data.reqUrl === '/mm/v1/micronets/123/subnets/3434/devices') {
           console.log('\n\n /mm/v1/micronets/123/subnets/3434/devices ')
         }
       }
    ],
    update: [],
    patch: [],
    remove: []
  },

  after: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  },

  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  }
};
