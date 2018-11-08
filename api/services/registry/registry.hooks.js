const { authenticate } = require('@feathersjs/authentication').hooks;
const omit = require ( 'ramda/src/omit' );
const omitMeta = omit ( [ 'updatedAt' , 'createdAt' , '_id' , '__v' ] );
const apiInit = { crossDomain : true , headers : { 'Content-type' : 'application/json' } }
const axios = require ( 'axios' );
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
      hook => {
        hook.result = omitMeta ( hook.data )
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
