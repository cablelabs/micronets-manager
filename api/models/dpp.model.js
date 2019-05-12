// dpp-model.js - A mongoose model
// 
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function (app) {
  const mongooseClient = app.get('mongooseClient');
  const { Schema } = mongooseClient;

  const event = new Schema({
    _id:false,
    type: { type: String, required: true },
    macAddress: { type: String, required: true },
    micronetId: { type: String, required: true },
    reason: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  })

  const dpp = new Schema({
    subscriberId: { type: String, required: false },
    deviceId: { type: String, required: false },
    events:[{ type: event, required: false }]
  }, {
    timestamps: true
  });

  return mongooseClient.model('dpp', dpp);
};
