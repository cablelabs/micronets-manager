var merge = require('webpack-merge')
var prodEnv = require('./prod.env')

module.exports = merge(prodEnv, {
  NODE_ENV: '"development"',
  BASE_URL: '"http://127.0.0.1:3000"',
  MM_SERVER_BASE_URL: '"http://127.0.0.1:3030"',
  CLIENT_BASE_URL: '"http://127.0.0.1:8080"',
  MSO_PORTAL_BASE_URL: '"http://45.79.13.192:3210"',
  DHCP_BASE_URL: '"http://10.36.32.127:5001"',
  DHCP_SOCKET_URL: '"wss://45.79.13.134:5050/micronets/v1/ws-proxy/grandpa-gw"'
})
