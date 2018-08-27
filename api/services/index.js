const token = require('./token/token.service.js');
const certificates = require('./certificates/certificates.service.js');
const csrt = require('./csrt/csrt.service.js');
const registry = require('./registry/registry.service.js');
const users = require('./users/users.service.js');
const gateway = require('./gateway/gateway.service.js');
const odl = require('./odl/odl.service.js');
const micronets = require('./micronets/micronets.service.js');
const mockMicronets = require('./mock-micronets/mock-micronets.service.js');

// eslint-disable-next-line no-unused-vars
module.exports = function (app) {
  app.configure(token);
  app.configure(certificates);
  app.configure(csrt);
  app.configure(registry);
  app.configure(users);
  app.configure(gateway);
  app.configure(odl);
  app.configure(micronets);
  app.configure(mockMicronets);
};
