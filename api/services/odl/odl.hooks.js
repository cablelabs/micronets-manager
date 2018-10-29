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
        console.log('\n ODL GET HOOK id : ' + JSON.stringify(id))
        return hook.app.service ( 'mm/v1/micronets/odl' ).find ( { query : { gatewayId : id } } )
          .then ( ( { data } ) => {
            data = omitMeta(data[0])
            console.log('\n GET hook.result : ' + JSON.stringify(data))
            hook.result = Object.assign({}, data)
          })
      }
    ],
    create: [],
    update: [
      async(hook) => {
        const { data, id, params } = hook;
        hook.params.mongoose = {
          runValidators : true ,
          setDefaultsOnInsert : true
        }
        console.log('\n ODL UPDATE HOOK DATA : ' + JSON.stringify(data) + '\t\t ID : ' + JSON.stringify(id) + '\t\t PARAMS : ' + JSON.stringify(params))
      }
    ],
    patch: [
      async(hook) => {
       const { data, id, params } = hook;
        hook.params.mongoose = {
          runValidators : true ,
          setDefaultsOnInsert : true
        }
       console.log('\n ODL PATCH HOOK DATA : ' + JSON.stringify(data) + '\t\t ID : ' + JSON.stringify(id) + '\t\t PARAMS : ' + JSON.stringify(params))
       const odl =  await hook.app.service('/mm/v1/micronets/odl').get({})
       console.log('\n ODL PATCH HOOK ODL OBJECT FROM GET : ' + JSON.stringify(odl.data))
        if(!hook.id) {
         hook.id = odl.data._id
         console.log('\n ODL PATCH HOOK SET HOOK.ID : ' + JSON.stringify(hook.id))
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
