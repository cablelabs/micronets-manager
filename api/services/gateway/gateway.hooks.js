const { authenticate } = require('@feathersjs/authentication').hooks;
var moment = require('moment');
const omit = require ( 'ramda/src/omit' );
const omitMeta = omit ( [ 'updatedAt' , 'createdAt' , '_id' , '__v' ] );
module.exports = {
  before: {
    all: [ authenticate('jwt') ],
    find: [],
    get: [
      hook => {
        const {params, headers, data, id} = hook
        console.log('\n Gateway get hook id : ' + JSON.stringify(id))
        return hook.app.service ( 'mm/v1/micronets/gtwystatus' ).find ( { query : { gatewayId : id } } )
          .then ( ( { data } ) => {
            data = omitMeta(data[0])
            console.log('\n GET hook.result : ' + JSON.stringify(data))
            hook.result = Object.assign({}, data)
          })
      }
    ],
    create: [
      hook => {
        const {params, headers, data} = hook
        let timeStamp = moment(hook.data.timeStamp).format()
        hook.data = Object.assign({},{
          gatewayId: hook.data.gatewayId,
          timeStamp:  moment(hook.data.timeStamp).format(),
          uptime:hook.data.uptime,
          status: hook.data.uptime > 0 ? 'online' : 'offline'
        })
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
    create: [
      hook => {
        hook.result = Object.assign({},{
          gatewayId: hook.result.gatewayId,
          timeStamp:hook.result.timeStamp,
          uptime:hook.result.uptime,
          status: hook.result.status
        })
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
