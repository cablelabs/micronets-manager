const { authenticate } = require('@feathersjs/authentication').hooks;
const omit = require ( 'ramda/src/omit' );
const omitMeta = omit ( [ 'updatedAt' , 'createdAt' , '_id' , '__v' ] );
const apiInit = { crossDomain : true , headers : { 'Content-type' : 'application/json' } }
const axios = require ( 'axios' );
let apiHeaders = { headers : {  crossDomain: true } };
module.exports = {
  before: {
    all: [ //authenticate('jwt')
       ],
    find: [],
    get: [
      hook => {
      const {params, data, id} = hook
        const query = Object.assign({ subscriberId: id ? id : params.id }, hook.params.query);
        hook.params.mongoose = {
          runValidators: true,
          setDefaultsOnInsert: true
        }
        return hook.app.service('/mm/v1/micronets/registry').find({ query })
          .then(({data}) => {
            if(data.length === 1) {
              hook.result = omitMeta(data[0]);
            }
        })
      }
    ],
    create: [
      hook => {
        const { data , params } = hook
        hook.data = Object.assign ( {} , data )
      }
    ],
    update: [
      async (hook) => {
        const {params, data, id} = hook
        hook.params.mongoose = {
          runValidators: true,
          setDefaultsOnInsert: true,
          upsert : true
        }
        let registryToModify = await hook.app.service('/mm/v1/micronets/registry').find(id)
        registryToModify = registryToModify.data[0]
        const patchResult = await hook.app.service('/mm/v1/micronets/registry').patch(null, Object.assign({},{...registryToModify, ...data}),{ query : { subscriberId: id }, mongoose: { upsert: true}})
        hook.result = patchResult[0]
        return Promise.resolve(hook);
      }
    ],
    patch: [],
    remove: []
  },

  after: {
    all: [],
    find: [],
    get: [],
    create: [
      async(hook) => {
        hook.result = omitMeta ( hook.data )
        console.log('\n Registry created : ' + JSON.stringify(hook.result))
        const registry = hook.result
        let subscriber = await axios.get(`${registry.msoPortalUrl}/internal/subscriber/${registry.subscriberId}`)
        subscriber = subscriber.data
        console.log('\n Associated subscriber with registry : ' + JSON.stringify(subscriber))
        const micronet = await hook.app.service('/mm/v1/micronets').create(Object.assign({},{
          type: 'userCreate',
          id : subscriber.id ,
          name : subscriber.name ,
          ssid : subscriber.ssid ,
          micronets : Object.assign ( {} , {
            micronet : []
          } )
        }))
        const getmicronet = await hook.app.service('/mm/v1/micronets').find()
        console.log('\n Empty micronet for subscriber  : ' + JSON.stringify(getmicronet))
        return hook
      }
    ],
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
