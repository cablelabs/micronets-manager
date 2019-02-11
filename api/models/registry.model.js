// registry-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function (app) {
  const mongooseClient = app.get('mongooseClient');
  const { Schema } = mongooseClient;
  const registry = new Schema({
    subscriberId: {type: String, required: true, unique: true, primaryKey: true,  sparse: true },
    identityUrl: { type: String, required: true },
    dhcpUrl: { type: String, required: false },
    mmUrl: { type: String, required: true },
    mmClientUrl: {type: String, required: true },
    webSocketUrl: { type: String, required: true },
    msoPortalUrl: { type: String, required: true },
    odlUrl:{ type: String, required: false },
    gatewayId : {type: String, required: true }
  }, {
    timestamps: true
  });

  return mongooseClient.model('registry', registry);
};
