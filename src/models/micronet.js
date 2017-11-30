var mongoose = require('mongoose')
var subnets = require('./subnet');

var micronetSchema = mongoose.Schema({
  timestampUtc: { type: String },
  statusCode: { type: Number },
  statusText: { type: String },
  logEvents: Array,
  subnets: Array
});

module.exports = mongoose.model('micronets' , micronetSchema)