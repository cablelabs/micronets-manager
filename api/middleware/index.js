// eslint-disable-next-line no-unused-vars
const logger = require ( './../../api/logger' );

module.exports = function (app) {
  // Add your custom middleware here. Remember that
  // in Express, the order matters.
  app.use(function(req, res, next) {
  const { headers, originalUrl } = req
  logger.debug('\n MM middleware headers : ' + JSON.stringify(headers) + '\t\t originalUrl : ' + JSON.stringify(originalUrl))
  req.feathers.requestHeaders = headers;
  req.feathers.requestUrl = originalUrl
  next();
});

};
