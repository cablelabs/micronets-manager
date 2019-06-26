// // odl-model.js - A mongoose model
// //
// // See http://mongoosejs.com/docs/models.html
// // for more of what you can do here.
// module.exports = function (app) {
//   const mongooseClient = app.get('mongooseClient');
//   const { Schema } = mongooseClient;
//
//   const ports = new Schema({
//     _id:false,
//     port: { type: Number, required: true },
//     interface: { type: String, required: true },
//     hwtype: { type: String, required: true },
//     subnet: { type: String, required: true },
//     vlanId: { type: String, required: true  },
//     macAddress: {type: String, required: true}
//   });
//
//   const bridge = new Schema({
//     _id:false,
//     name: { type: String, required: true },
//     macAddress: { type: String, required: true },
//     trunkIp: { type: String, required: true },
//     trunkPort: { type: String, required: true },
//     ports: [{ type:ports, required: true }]
//   });
//
//   const bridges = new Schema({
//     _id:false,
//     bridges: [{ type: bridge, required: true }],
//   });
//
//   const odl = new Schema({
//     gatewayId: { type: String, required: true , unique: true, primaryKey: true, sparse: true },
//     hwModelId: { type: String, required: true },
//     ovsVersion: { type: String, required: true },
//     ovsHost: { type: String, required: true },
//     ovsPort: { type: String, required: true },
//     switchConfig: { type: bridges, required: true },
//   }, {
//     timestamps: true
//   });
//
//   return mongooseClient.model('odl', odl);
// };

// New switch config

// odl-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function (app) {
  const mongooseClient = app.get('mongooseClient');
  const { Schema } = mongooseClient;

  const ports = new Schema({
    _id:false,
    port: { type: Number, required: true },
    interface: { type: String, required: true },
    hwtype: { type: String, required: true },
    subnet: { type: String, required: true },
    vlanId: { type: String, required: true  },
    macAddress: {type: String, required: true}
  });

  const bridge = new Schema({
    _id:false,
    name: { type: String, required: true },
    macAddress: { type: String, required: true },
    trunkIp: { type: String, required: true },
    trunkPort: { type: String, required: true },
    ports: [{ type:ports, required: true }]
  });

  const dppType = new Schema({
    _id:false,
    supportedAkms: [{ type: String, required: true }]
  })

  const octectType = new Schema({
    _id:false,
    min: { type: String, required: true },
    max: { type: String, required: true }
  })

  const deviceRangeType = new Schema({
    _id:false,
    octetD: { type: octectType, required: true }
  })

  const subnetGatewayType = new Schema({
    _id:false,
    octetD: { type: String, required: true }
  })

  const subnetRangeType = new Schema({
    _id:false,
    octetA: { type: String, required: true },
    octetB: { type: octectType, required: true },
    octetC: { type: octectType, required: true },
  })

  const subnetType = new Schema({
    _id:false,
    octetA: { type: String, required: true },
    octetB: { type: String, required: true },
    octetC: { type: String, required: true },
  })


  const ipv4SubnetRange = new Schema({
    _id:false,
    id: { type: String, required: false },
    subnetRange: { type: subnetRangeType, required: true },
    deviceRange: { type: deviceRangeType, required: true },
    subnetGateway: { type: subnetGatewayType, required: true },
    subnetBits: { type: String, required: false }
  });

  const ipv4Subnet = new Schema({
    _id:false,
    subnetRange: { type: subnetType, required: true },
    deviceRange: { type: deviceRangeType, required: true },
    subnetGateway: { type: subnetGatewayType, required: true }
  });

  const micronetInterface = new Schema({
    _id:false,
    name: { type: String, required: true },
    macAddress: { type: String, required: true },
    medium: { type: String, required: true },
    ssid: { type: String, required: false },
    dpp: { type: dppType, required: false },
    ovsPort: { type: String, required: true },
    ipv4SubnetRanges: [{ type: ipv4SubnetRange, required: false }],
    ipv4Subnets: [{ type: ipv4Subnet, required: false }]
  });

  const vLanRange = new Schema({
    _id:false,
    min: { type: String, required: true },
    max: { type: String, required: true }
  });

  const gwtVersion =  new Schema({
    _id:false,
    major: { type: String, required: true },
    minor: { type: String, required: true },
    micro: { type: String, required: true },
  });
  const odl = new Schema({
    version: { type: String, required: true },
    gatewayModel: { type: String, required: true },
    gatewayVersion: { type: gwtVersion, required: true },
    gatewayId: { type: String, required: true, unique: true, primaryKey: true, sparse: true },
    configRevision: { type: String, required: true },
    vlanRanges:[{type:vLanRange, required: true}],
    micronetInterfaces: [{ type: micronetInterface, required: true }]
  }, {
    timestamps: true
  });

  return mongooseClient.model('odl', odl);
};