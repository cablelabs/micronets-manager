const env = process.env.NODE_ENV ? process.env.NODE_ENV : 'development';
const config = require('./config');
const path = require('path');
const webpack = require('webpack');
const merge = require('webpack-merge');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const host = (process.env.HOST) ? process.env.HOST : config.host;
const port = (process.env.PORT) ? process.env.PORT : config.port;

const baseConfig = {
  entry: [
    './client/src/main.js'
  ],
  output: {
    path: path.resolve(__dirname, 'public'),
    filename: 'js/[name].js',
    publicPath: '/'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/
      },
      {
        test: /\.(png|jpg|gif)$/,
        loader: 'file-loader',
        options: {
          name: 'images/[name].[ext]'
        }
      },
      {
        test: /\.(eot|svg|ttf|woff?)$/,
        loader: 'file-loader',
        options: {
          name: 'fonts/[name].[ext]'
        }
      }
    ]
  },
  resolve: {
    alias: {
      'assets': path.resolve(__dirname, './app/assets/'),
      'vue$': 'vue/dist/vue.common.js'
    }
  },
  plugins: [
    // Error handling
    new webpack.NoEmitOnErrorsPlugin(),
    // Environment definition
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(env),
      'process.env.FEATHERS_HOST': JSON.stringify('http://' + host + ':' + port)
    }),
    // Configure vue-loader to use PostCSS
    new webpack.LoaderOptionsPlugin({
      vue: {
        postcss: [
          require('autoprefixer')({
            browsers: ['last 2 versions', 'ie > 8']
          }),
          require('postcss-flexbugs-fixes')
        ]
      }
    }),
    // Provide jQuery and Tether as global variables
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery',
      Tether: 'tether',
      'window.Tether': 'tether'
    }),
    // Create public/index.html
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'app/index.html'),
      filename: 'index.html'
    })
  ],
  performance: {
    hints: false
  }
};

const envConfig = {
  development: require('./webpack.config.dev.js'),
  production: require('./webpack.config.prod.js')
};

module.exports = merge(envConfig[env] || {}, baseConfig);
