// micronets-model.js - A mongoose model
// 
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function (app) {
  const mongooseClient = app.get('mongooseClient');
  const { Schema } = mongooseClient;

  const connectedDevices = new Schema({
    _id:false,
    'device-name': { type: String, required: true },
     class: { type: String, required: false },
    'device-mac': { type: String, required: true },
    'device-ip': { type: String, required: true },
    'device-openflow-port': { type: String, required: false },
    'device-id': { type: String, required: true  }
  });

  const subnet = new Schema({
    _id:false,
    name: { type: String, required: true },
    class: { type: String, required: true },
    'trunk-gateway-port': { type: String, required: true },
    'micronet-bridge-openflow-node-id': { type: String, required: false }, // Is this required ?
    'ovs-manager-ip': { type: String, required: false },
    'dhcp-server-port':{ type: String, required: false },
    'micronet-subnet-id': { type: String, required: true  },
    "dhcp-zone" : { type: String, required: true  } ,
    "micronet-id" : { type: String, required: true } ,
    'micronet-bridge-nodeid': { type:String, required: false  },  // Is this required ?
    'connected-devices': [{type:connectedDevices, required: true}],
    'micronet-subnet': { type: String, required: true },
    'micronet-gateway-ip': { type: String, required: false },
    'ovs-bridge-name':{ type: String, required: false },
    'trunk-gateway-ip': { type: String, required: true  },
  });


  const micronets = new Schema({
    id: { type: String, required: true, primaryKey: true,  unique:true, sparse: true },
    name: { type: String, required: true },
    ssid: { type: String, required: false },
    gatewayId: {type: String, required: true },
    micronets: [{ type:subnet, required: true }]
  }, {
    timestamps: true
  });

  return mongooseClient.model('micronets', micronets);
};
