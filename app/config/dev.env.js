var merge = require('webpack-merge')
var prodEnv = require('./prod.env')

module.exports = merge(prodEnv, {
  NODE_ENV: '"development"',
  MM_SERVER_BASE_URL: '"http://10.70.17.163:3030"',
  CLIENT_BASE_URL: '"http://10.70.17.163:8080"',
  MSO_PORTAL_BASE_URL: '"http://10.70.17.163:3210"',
  SUBSCRIBER_ID: '"7B2A-BE88-08817Z"',
  TEST_ID: `${process.env.VUE_APP_SUBSCRIBER_ID}`
})
