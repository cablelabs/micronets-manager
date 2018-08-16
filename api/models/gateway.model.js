// gateway-model.js - A mongoose model
// 
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function (app) {
  const mongooseClient = app.get('mongooseClient');
  const { Schema } = mongooseClient;
  const gateway = new Schema({
    gatewayId: { type: String, required: true },
    timestamp: { type: Date, required: false },
    uptime: {type: Number, required: false}
  }, {
    timestamps: true
  });

  return mongooseClient.model('gateway', gateway);
};
