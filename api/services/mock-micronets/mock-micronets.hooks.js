const micronetWithDevices = require('../../mock-data/micronetWithDevices');
const micronetWithoutDevices = require('../../mock-data/micronetWithoutDevices');

module.exports = {
  before: {
    all: [],
    find: [],
    get: [],
    create: [
      hook => {
        const { params, data , id, path, headers } = hook
         if (params) {
           Promise.resolve(hook)
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
