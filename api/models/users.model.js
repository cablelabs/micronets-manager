// users-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
'use strict';
var uuid = require('uuid');
var mongoose = require('mongoose');

module.exports = function (app) {
  const mongooseClient = app.get('mongooseClient');
  const { Schema } = mongooseClient;
  const users = new Schema({
    id: { type: String, required: true, primaryKey: true },
    name: { type: String, required: true },
    ssid: { type: String, required: true },
    devices:[ {
      deviceId: { type: String, required: true },
      clientId: { type: String, required: true},
      macAddress: { type: String, required: true },
      class: { type: String, required: false },
      isRegistered: { type: Boolean , required: true , default: false },
      deviceName: {type: String, required: true, default: 'Test Device'},
      deviceLeaseStatus:{ type: String, required:true }
    }]
  }, {
    timestamps: true
  });

  return mongooseClient.model('users', users);
};


