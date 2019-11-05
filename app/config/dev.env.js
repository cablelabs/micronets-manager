var merge = require('webpack-merge')
var prodEnv = require('./prod.env')

module.exports = merge(prodEnv, {
  NODE_ENV: '"development"',
  MM_SERVER_BASE_URL: process.env.MM_SERVER_BASE_URL || '"http://127.0.0.1:3030"',
  MSO_PORTAL_BASE_URL: process.env.MM_MSO_PORTAL_BASE_URL|| '"http://127.0.0.1:3210"',
  SUBSCRIBER_ID: process.env.MM_SUBSCRIBER_ID
})
