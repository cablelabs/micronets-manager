var merge = require('webpack-merge')
var prodEnv = require('./prod.env')

module.exports = merge(prodEnv, {
  NODE_ENV: '"development"',
  MM_SERVER_BASE_URL: '"http://45.56.76.21:3030"',
  CLIENT_BASE_URL: '"http://45.56.76.21:8080"',
  MSO_PORTAL_BASE_URL: '"http://45.79.13.192:3210"',
  SUBSCRIBER_ID: '"7B2A-BE88-08817Z"',
  TEST_ID: `${process.env.VUE_APP_SUBSCRIBER_ID}`
})
