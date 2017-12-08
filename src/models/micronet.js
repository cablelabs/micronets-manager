var mongoose = require('mongoose')
const { subnetSchema } = require('./subnet');

var micronetSchema = mongoose.Schema({
  timestampUtc: { type: String },
  statusCode: { type: Number },
  statusText: { type: String },
  logEvents: [{ type: String }],
  subnets: [subnetSchema]
});

module.exports = mongoose.model('micronets' , micronetSchema)
