const logger = require ( './../../logger' );
const paths = require('./../../hooks/servicePaths')

module.exports = {
  before: {
    all: [],
    find: [],
    get: [],
    create: [
      async(hook) => {
     const { data, params } = hook
     logger.debug('\n\n MICRONETS CREATE DPP HOOK DATA : ' + JSON.stringify(data) + '\t\t PARAMS : ' + JSON.stringify(params))
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
