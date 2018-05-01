var merge = require('webpack-merge')
var prodEnv = require('./prod.env')

module.exports = merge(prodEnv, {
  NODE_ENV: '"development"',
  BASE_URL: '"http://localhost:3000"',
  CLIENT_BASE_URL: '"http://localhost:8080"',
  MSO_PORTAL_BASE_URL: '"http://localhost:3210"',
  DHCP_BASE_URL: '"http://localhost:5000"'
})
