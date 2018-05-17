var merge = require('webpack-merge')
var prodEnv = require('./prod.env')

module.exports = merge(prodEnv, {
  NODE_ENV: '"development"',
  BASE_URL: '"http://10.142.10.46:3000"',
  CLIENT_BASE_URL: '"http://10.142.10.46:8080"',
  MSO_PORTAL_BASE_URL: '"http://10.142.10.46:3210"',
  DHCP_BASE_URL: '"http://10.36.32.127:5000"'
})
