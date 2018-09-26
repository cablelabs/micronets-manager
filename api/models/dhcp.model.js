// dhcp-model.js - A mongoose model
// 
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function (app) {
  const mongooseClient = app.get('mongooseClient');
  const { Schema } = mongooseClient;

  const macEui48 = new Schema({
    _id:false,
    eui48: { type: String, required: true }
  })

  const networkipv4 = new Schema({
    _id:false,
    ipv4: { type: String, required: true }
  })

  const device = new Schema({
    _id:false,
    deviceId: { type: String, required: true },
    macAddress: { type: macEui48, required: true },
    networkAddress: { type: networkipv4, required: true }
  })

  const ipv4 = new Schema({
    _id:false,
    network: { type: String, required: true },
    mask: { type:String, required:true },
    gateway: { type: String, required: true },
    broadcast: { type:String, required:false},
  })

  const dhcp = new Schema({
    subnetId: { type: String, required: true, primaryKey: true },
    ipv4Network: {type:ipv4, required:true},
    devices:[{ type: device, required: false }]
  }, {
    timestamps: true
  });

  return mongooseClient.model('dhcp', dhcp);
};

/* POST BODY DEVICES

    "device": {
      "deviceId": "Wireddevice01",
      "macAddress": {
        "eui48": "10:13:13:0f:b0:26"
      },
      "networkAddress": {
        "ipv4": "192.168.1.2"
      }
    }


 */