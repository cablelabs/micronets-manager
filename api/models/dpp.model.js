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
    reason: { type: String, required: false }
  })

  const device = new Schema({
    _id:false,
    deviceId: { type: String, required: true },
    events:[{ type: event, required: false }]
  })

  const dpp = new Schema({
    subscriberId: { type: String, required: false },
    devices:[{ type: device, required: false }]
  }, {
    timestamps: true
  });

  return mongooseClient.model('dpp', dpp);
};
