// certificates-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function (app) {
  const mongooseClient = app.get('mongooseClient');
  const { Schema } = mongooseClient;
  const certificates = new Schema({
    wifiCert: { type: String, required: true },
    caCert: { type: String, required: true },
    passphrase: { type: String, required: true },
    subscriber: { type: Object, required: false },
    macAddress:{ type: String, required: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  }, {
    timestamps: true
  });

  return mongooseClient.model('certificates', certificates);
};
