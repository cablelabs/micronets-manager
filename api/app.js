// const path = require('path');
// const favicon = require('serve-favicon');
// const compress = require('compression');
// const helmet = require('helmet');
// const cors = require('cors');
// const logger = require('./logger');
//
// const feathers = require('@feathersjs/feathers');
// const configuration = require('@feathersjs/configuration');
// const express = require('@feathersjs/express');
// const socketio = require('@feathersjs/socketio');
// const handler = require('@feathersjs/express/errors');
// const notFound = require('@feathersjs/errors/not-found');
//
// const middleware = require('./middleware');
// const services = require('./services');
// const appHooks = require('./app.hooks');
// const channels = require('./channels');
//
// const authentication = require('./authentication');
//
// const mongodb = require('./mongodb');
//
// const mongoose = require('./mongoose');
//
// const subnet = require('./subnet')
//
// const app = express(feathers());
//
// // Load app configuration
// app.configure(configuration());
// // Enable security, CORS, compression, favicon and body parsing
// app.use(helmet());
// app.use(cors());
// app.use(compress());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(favicon(path.join(app.get('public'), 'feathers-favicon.ico')));
// // Host the public folder
// app.use('/', express.static(app.get('public')));
// app.use(function(req, res, next) {
//   const { headers, originalUrl } = req
//   req.feathers.requestHeaders = headers;
//   req.feathers.requestUrl = originalUrl
//   next();
// });
//
// // Set up Plugins and providers
// app.configure(express.rest());
// app.configure(socketio());
//
// app.configure(mongodb);
//
// app.configure(mongoose);
//
// app.configure(subnet)
//
// // Configure other middleware (see `middleware/index.js`)
// app.configure(middleware);
// app.configure(authentication);
// // Set up our services (see `services/index.js`)
// app.configure(services);
// // Set up event channels (see channels.js)
// app.configure(channels);
//
// // Configure a middleware for 404s and the error handler
// app.use(express.errorHandler({
//   html: function(error, req, res, next) {
//     // render your error view with the error object
//     res.render('error', error);
//   }
// }));
//
// app.use(notFound());
// app.use(handler());
//
// app.hooks(appHooks);
//
// module.exports = app;

const subnet = require('./subnet')
const path = require('path');
const favicon = require('serve-favicon');
const compress = require('compression');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');

const feathers = require('@feathersjs/feathers');
const express = require('@feathersjs/express');
const configuration = require('@feathersjs/configuration');
const rest = require('@feathersjs/express/rest');
const socketio = require('@feathersjs/socketio');

const handler = require('@feathersjs/express/errors');
// const notFound = require('feathers-errors/not-found');

const middleware = require('./middleware/index');
const services = require('./services/index');
const appHooks = require('./app.hooks');

const authentication = require('./authentication');
const mongodb = require('./mongodb');
const mongoose = require('./mongoose');


const app = express(feathers());
// Load app configuration
app.configure(configuration());
// Enable CORS, security, compression, favicon and body parsing
app.use(cors());
app.use(helmet());
app.use(compress());
app.configure(rest());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(function(req, res, next) {
  const { headers, originalUrl } = req
  req.feathers.requestHeaders = headers;
  req.feathers.requestUrl = originalUrl
  next();
});

app.use(favicon(path.join(app.get('public'), 'favicon.ico')));
// Host the public folder
app.use('/', express.static(app.get('public')));

app.configure(mongoose);
app.configure(subnet)
app.configure(socketio());
app.configure(mongodb);
app.configure(mongoose);
app.configure(authentication);
// Configure other middleware (see `middleware/index.js`)
app.configure(middleware);
// Set up our services (see `services/index.js`)
app.configure(services);
// Configure a middleware for 404s and the error handler
// app.use(notFound());
// Set up event channels (see channels.js)
//app.configure(channels);
app.use(handler());

app.hooks(appHooks);

module.exports = app;
