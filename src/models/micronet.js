var mongoose = require('mongoose')
var subnets = require('./subnet');

var micronetSchema = mongoose.Schema({
  timestampUtc: { type: Date, default: Date.now },
  statusCode: { type: Number },
  statusText: { type: String },
  logEvents: [{ type: Object}],
  subnets: [{ type: Object , schema:subnets }]
});

module.exports = mongoose.model('micronets' , micronetSchema)