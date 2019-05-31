const dotenv = require('dotenv');
dotenv.config();
module.exports = {
  SUBSCRIBER_ID: process.env.SUBSCRIBER_ID,
  IDENTITY_URL: process.env.IDENTITY_URL,
  WEB_SOCKET_BASE_URL: process.env.WEB_SOCKET_BASE_URL,
  MSO_PORTAL_URL: process.env.MSO_PORTAL_URL
};
