const token = require('./token/token.service.js');
const certificates = require('./certificates/certificates.service.js');
const csrt = require('./csrt/csrt.service.js');
const registry = require('./registry/registry.service.js');
const users = require('./users/users.service.js');
// eslint-disable-next-line no-unused-vars
module.exports = function (app) {
  app.configure(token);
  app.configure(certificates);
  app.configure(csrt);
  app.configure(registry);
  app.configure(users);
};
