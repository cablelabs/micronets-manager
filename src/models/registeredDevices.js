var mongoose = require('mongoose')

module.exports.registeredDevicesSchema = mongoose.Schema({
  deviceId: { type: String },
  clientId: { type: String },
  isRegistered: { type: Boolean },
  macAddress: { type: String },
}, { _id: false })