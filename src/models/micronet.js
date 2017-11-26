var mongoose = require('mongoose')
import subnetSchema from './subnet';

var micronetSchema = mongoose.Schema({
  timestampUtc: { type: Date, default: Date.now },
  statusCode: { type:Number },
  statusText: { type: String },
  logEvents: [{ type: Object}],
  subnets: [{ type: subnetSchema }]
})