// Application hooks that run for every service
const log = require('./hooks/log');
const dhcpConnect = require('./hooks/dhcpConnection');
const dw = require('./hooks/dhcpWrapperPromise')
const webSocketUrl = 'wss://localhost:5050/micronets/v1/ws-proxy/micronets-gw-7B2A-BE88-08817Z'



module.exports = {
  before: {
    all: [ log()],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  },

  after: {
    all: [ log() ],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  },

  error: {
    all: [ log() ],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  }
};
