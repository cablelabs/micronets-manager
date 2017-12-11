var mongoose = require('mongoose')

module.exports.deviceSchema = mongoose.Schema({
  timestampUtc: { type: String },
  deviceId: { type: String },
  deviceName: { type: String },
  deviceDescription: { type: String },
  mac: {
    eui48: { type: String }
  },
  ipv4: {
    host: { type: String }
  }
}, { _id: false })
