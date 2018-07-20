'use strict';

const webpack = require('webpack');
const webpackDevMiddleware = require('webpack-dev-middleware');
const config = require('../../webpack.config');
const compiler = webpack(config);

module.exports = function (app) {
  app.use(webpackDevMiddleware(compiler, {
    publicPath: config.output.publicPath,
    stats: {
      assets: true,
      children: false,
      chunks: false,
      hash: false,
      timings: false,
      version: false
    }
  }));
};
