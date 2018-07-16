const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = {
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader',
        options: {
          loaders: {
            css: ExtractTextPlugin.extract({
              loader: 'css-loader',
              fallbackLoader: 'vue-style-loader'
            }),
            scss: ExtractTextPlugin.extract({
              loader: 'css-loader!sass-loader',
              fallbackLoader: 'vue-style-loader'
            }),
            sass: ExtractTextPlugin.extract({
              loader: 'css-loader!sass-loader?indentedSyntax',
              fallbackLoader: 'vue-style-loader'
            })
          }
        }
      }
    ]
  },
  plugins: [
    // Minify JS and strip comments
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false
      },
      output: {
        comments: false
      }
    }),
    // Minify CSS
    new webpack.LoaderOptionsPlugin({
      minimize: true
    }),
    // Extract CSS in single file
    new ExtractTextPlugin('css/style.css')
  ]
};
