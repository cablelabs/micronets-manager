var merge = require('webpack-merge')
var prodEnv = require('./prod.env')

module.exports = merge(prodEnv, {
  NODE_ENV: '"development"',
  MM_SERVER_BASE_URL: '"http://127.0.0.1:3030"',
  CLIENT_BASE_URL: '"http://127.0.0.1:8080"',
  MSO_PORTAL_BASE_URL: '"http://127.0.0.1:3210"',
  SUBSCRIBER_ID: '"9B4C-BE88-08817Z"',
  TEST_ID: `${process.env.VUE_APP_SUBSCRIBER_ID}`
})
