var rn = require('random-number');
var gen = rn.generator({
  min:  1534270984
  , max:  2534270984
  , integer: true
})

module.exports = {
  before: {
    all: [],
    find: [],
    get: [],
    create: [
      hook => {
        const { params, data , id, path, headers } = hook
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
           console.log('\n MOCK MICRO-NETS DATA : ' + JSON.stringify(mockMicronets))
           hook.data = Object.assign({},{ micronets:{micronet:mockMicronets}})
           return Promise.resolve(hook)
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
    create: [
      hook => {
        console.log('\n  hook.result : ' + JSON.stringify(hook.result))
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
