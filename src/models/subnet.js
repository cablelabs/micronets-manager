var mongoose = require('mongoose');

var subnetSchema = mongoose.Schema({
    subnetId: { type: String },
    subnetName: { type: String },
    ipv4: {
      network: { type: String },
      netmask: { type: String },
      gateway: { type: String }
    },
    deviceList: [{
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
    }]
})

module.exports = mongoose.model('subnets' , subnetSchema)