// gateway-model.js - A mongoose model
// 
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function (app) {
  const mongooseClient = app.get('mongooseClient');
  const { Schema } = mongooseClient;
  const gateway = new Schema({
    gatewayId: { type: String, required: true, unique: true, primaryKey: true },
    timeStamp: { type: String, required: true },
    uptime: {type: Number, required: false},
    status: {type:String, required:false}
  }, {
    timestamps: true
  });

  return mongooseClient.model('gateway', gateway);
};
