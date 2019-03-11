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

  // const bridges = new Schema({
  //   bridges: [{ type: bridge, required: true }],
  // });

  const bridges = new Schema({
    _id:false,
    bridges: [{ type: bridge, required: true }],
  });

  const odl = new Schema({
    gatewayId: { type: String, required: true , unique: true, primaryKey: true, sparse: true },
    hwModelId: { type: String, required: true },
    ovsVersion: { type: String, required: true },
    ovsHost: { type: String, required: true },
    ovsPort: { type: String, required: true },
    switchConfig: { type: bridges, required: true },
  }, {
    timestamps: true
  });

  return mongooseClient.model('odl', odl);
};
