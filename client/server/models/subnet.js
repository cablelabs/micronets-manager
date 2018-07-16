var mongoose = require('mongoose')
const { deviceSchema } = require('./device')

module.exports.subnetSchema = mongoose.Schema({
  subnetId: { type: String },
  subnetName: { type: String },
  class: { type: String },
  ipv4: {
    network: { type: String },
    netmask: { type: String },
    gateway: { type: String }
  },
  deviceList: [deviceSchema]
}, { _id : false });
