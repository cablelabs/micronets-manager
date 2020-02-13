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
    id: { type: String, required: true, primaryKey: true, sparse: true },
    name: { type: String, required: true },
    ssid: { type: String, required: true },
    devices:[ {
      _id:false,
      deviceId: { type: String, required: true },
      macAddress: { type: String, required: true },
      isRegistered: { type: Boolean , required: true , default: false },
      deviceName: {type: String, required: true, default: 'Test Device'},
      clientId: { type: String, required: false },
      class: { type: String, required: false },
      deviceConnection: {type: String, required: true, default: 'ethernet'},
      deviceLeaseStatus: { type: String, required:true, default: 'intermediary' },
      mudUrlFromRegistry: { type: String, required:false, default: '' },
      mudUrl: { type: String, required:false, default: '' },
      manufacturers:[{ type: String, required: false }],
      deviceManufacturer: { type: String, required:false },
      deviceModel: { type: String, required:false },
      deviceAuthority: { type: String, required:false },
      deviceModelUID: { type: String, required:false },
      deviceIp: { type: String, required:false },
      onboardType: { type: String, required: false },
      onboardStatus: { type: String, required: false },
      psk: { type: String, required: false  },
      micronetId : { type: String, required: false  },
      allowHosts: [{ type: String, required: false }],
      denyHosts: [{ type: String, required: false }]
    }]
  }, {
    timestamps: true
  });

  return mongooseClient.model('users', users);
};


