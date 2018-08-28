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
        return hook.app.service ( 'odl/v1/micronets/config' ).find ( { query : { gatewayId : id } } )
          .then ( ( { data } ) => {
            data = omitMeta(data[0])
            console.log('\n GET hook.result : ' + JSON.stringify(data))
            hook.result = Object.assign({}, data)
          })
      }
    ],
    create: [],
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
