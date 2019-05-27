const dotenv = require('dotenv');
dotenv.config();
module.exports = {
  subscriberId: process.env.subscriberId,
  identityUrl: process.env.identityUrl,
  webSocketBaseUrl: process.env.webSocketBaseUrl,
  msoPortalUrl: process.env.msoPortalUrl,
  gatewayUrl: process.env.gatewayUrl
};
