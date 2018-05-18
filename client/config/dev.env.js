var merge = require('webpack-merge')
var prodEnv = require('./prod.env')

module.exports = merge(prodEnv, {
  NODE_ENV: '"development"',
  BASE_URL: '"http://127.0.0.1:3000"',
  CLIENT_BASE_URL: '"http://127.0.0.1:8080"',
  MSO_PORTAL_BASE_URL: '"http://127.0.0.1:3210"',
  DHCP_BASE_URL: '"http://127.0.0.1:5000"',
  DHCP_SOCKET_URL: '"http://127.0.0.1:5000/micronets-dhcp-v1"'
})
