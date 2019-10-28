var merge = require('webpack-merge')
var prodEnv = require('./prod.env')

module.exports = merge(prodEnv, {
  NODE_ENV: '"development"',
  MM_SERVER_BASE_URL: process.env.MM_SERVER_BASE_URL || '"http://10.200.30.101:3030"',
  MSO_PORTAL_BASE_URL: process.env.MM_MSO_PORTAL_BASE_URL|| '"http://10.200.30.101:3210"',
  SUBSCRIBER_ID: process.env.MM_SUBSCRIBER_ID || '"test3"'
})
