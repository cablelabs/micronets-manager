var merge = require('webpack-merge')
var prodEnv = require('./prod.env')

module.exports = merge(prodEnv, {
  NODE_ENV: '"development"',
  BASE_URL: '"http://127.0.0.1:3000"',
  MM_SERVER_BASE_URL: '"http://nccoe-mm-api.micronets.in"',
  CLIENT_BASE_URL: '"http://nccoe-mm.micronets.in"',
  MSO_PORTAL_BASE_URL: '"http://nccoe-mso-api.micronets.in"',
  DHCP_BASE_URL: '"http://10.36.32.127:5001"',
  DHCP_SOCKET_URL: '"wss://nccoe-mso:5050/micronets/v1/ws-proxy/nccoe-gw"'
})
