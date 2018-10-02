var rn = require('random-number');
var gen = rn.generator({
  min:  1534270984
  , max:  2534270984
  , integer: true
})
const omit = require ( 'ramda/src/omit' );
const omitMeta = omit ( [ 'updatedAt' , 'createdAt' ,  '__v' ] );

module.exports = {
  before: {
    all: [],
    find: [],
    get: [
      hook => {
        const { data , params , id } = hook;
        hook.params.mongoose = {
          runValidators : true ,
          setDefaultsOnInsert : true
        }
        return hook.app.service ( '/mm/v1/mock/micronets' ).find ( {} )
          .then ( ( { data } ) => {
            hook.result = omitMeta ( data[ 0 ] );
            console.log ( '\n Get Hook Result : ' + JSON.stringify ( hook.result ) )
            Promise.resolve ( hook )
          } )
      }
    ],
    create: [
      async (hook) => {
        const { params, data , id, path, headers } = hook
        hook.params.mongoose = {
          runValidators : true ,
          setDefaultsOnInsert : true
        }
        const mockMicronetFromDB = await hook.app.service('/mm/v1/mock/micronets').get({})
        console.log('\n mockMicronetFromDB  : ' + JSON.stringify(mockMicronetFromDB))
        if (hook.data.micronets && !hook.id) {
          let mockMicronets = []
          const micronetsPostData = Object.assign({},hook.data)
          console.log('\n CREATE HOOK MOCK MICRONET POST BODY : ' + JSON.stringify(micronetsPostData))
          micronetsPostData.micronets.micronet.forEach((micronet, index) => {
            console.log('\n MICRO-NET ID : ' + JSON.stringify(micronet["micronet-id"]))
            mockMicronets.push(Object.assign({},{
              ...micronet ,
              "class": micronet.class ? micronet.class : micronet.name,
              "micronet-id" : micronet["micronet-id"]!= undefined ? micronet["micronet-id"] : gen ()
            }))
          })
          console.log('\n MOCK MICRO-NETS CONSTRUCTED RESPONSE : ' + JSON.stringify(mockMicronets))
          if(mockMicronetFromDB && mockMicronetFromDB.hasOwnProperty('_id')) {
            hook.id = mockMicronetFromDB._id
            console.log('\n Update existing record for hook.id : ' + JSON.stringify(hook.id))
            const patchResult = await hook.app.service ( '/mm/v1/mock/micronets' ).patch ( hook.id,
              { micronets : { micronet : mockMicronets } } ,
              { query : {} , mongoose : { upsert : true } }  );
            console.log('\n PATCH RESULT : ' + JSON.stringify(patchResult))
            hook.result = Object.assign({},{ micronets:patchResult.micronets })
            return Promise.resolve(hook)
          }
          if(Object.keys(mockMicronetFromDB).length == 0) {
            console.log('\n Mock micronet not present create one ... : ' + JSON.stringify(mockMicronetFromDB))
            hook.data = Object.assign({},{ micronets:{micronet:mockMicronets}})
            return Promise.resolve(hook)
          }
        }

      }
    ],
    update: [],
    patch: [],
    remove: [
     async (hook) => {
        const { params, data , id, path, headers } = hook
        console.log('\n\n REMOVE HOOK PARAMS : ' + JSON.stringify(params) + '\t\t DATA : ' + JSON.stringify(data) + '\t\t ID : ' + JSON.stringify(id) + '\t\t PATH : ' + JSON.stringify(path))
        const {  subnetId, micronetId } = params.route ;
        console.log('\n REMOVE HOOK SUBNET-ID : ' + JSON.stringify(subnetId) + '\t\t MICRONET-ID : ' + JSON.stringify(micronetId))
        if(hook.id) {
          console.log('\n Delete specific micronet hook.id : ' + JSON.stringify(hook.id))
          const micronetFromDB = await hook.app.service('/mm/v1/mock/micronets').get({})
          const filteredMicronet = micronetFromDB.micronets.micronet.filter((foundMicronet) => foundMicronet['micronet-id']!= hook.id)
          console.log('\n Filtered Micronet : ' + JSON.stringify(filteredMicronet))
          const patchResult = await hook.app.service('/mm/v1/mock/micronets').patch(micronetFromDB._id, {micronets: {micronet: filteredMicronet } }, { query : {} , mongoose : { upsert : true } }  )
          console.log('\n\n DELETE PATCH RESULT : ' + JSON.stringify(patchResult))
          hook.result = Object.assign({},{ micronets:patchResult.micronets })
          return Promise.resolve(hook)
        }
      }
    ]
  },
  after: {
    all: [],
    find: [],
    get: [],
    create: [ hook => {} ],
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
