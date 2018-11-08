const { authenticate } = require('@feathersjs/authentication').hooks;
const omit = require ( 'ramda/src/omit' );
const omitMeta = omit ( [ 'updatedAt' , 'createdAt' , '_id' , '__v' ] );
module.exports = {
  before: {
    all: [  authenticate('jwt') ],
    find: [],
    get: [
      hook => {
        const {params, headers, data, id} = hook
        return hook.app.service ( 'mm/v1/micronets/odl' ).find ( { query : { gatewayId : id } } )
          .then ( ( { data } ) => {
            data = omitMeta(data[0])
            hook.result = Object.assign({}, data)
          })
      }
    ],
    create: [],
    update: [],
    patch: [
      async(hook) => {
       const { data, id, params } = hook;
        hook.params.mongoose = {
          runValidators : true ,
          setDefaultsOnInsert : true
        }
       const odl =  await hook.app.service('/mm/v1/micronets/odl').get({})
        if(!hook.id) {
         hook.id = odl.data._id
        }
      }
    ],
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
