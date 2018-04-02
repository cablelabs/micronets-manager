var mongoose = require('mongoose')
const { subnetSchema } = require('./subnet');
const { registeredDevicesSchema } = require('./registeredDevices');
var micronetSchema = mongoose.Schema({
  timestampUtc: { type: String },
  statusCode: { type: Number },
  statusText: { type: String },
  logEvents: [{ type: String }],
  subnets: [subnetSchema],
  id:{ type: String },
  name:{ type: String },
  devices: [registeredDevicesSchema]
});

module.exports = mongoose.model('micronets' , micronetSchema)
