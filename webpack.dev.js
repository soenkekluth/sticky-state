const webpack = require('webpack');
const package = require('./package');

module.exports = {
  'context': __dirname + '/src',
  'entry': [
    // 'webpack/hot/dev-server',
    'webpack-dev-server/client?http://localhost:3000/',
    './sticky-state.js'
  ],
  'output': {
    'path': __dirname + '/dist',
    'filename': `${package.name}.min.js`,
    'library': `StickyState`,
    'libraryTarget': 'umd'
  },
  'module': {
    'loaders': [{
      'test': /\.js$/,
      'exclude': /node_modules/,
      'loader': 'babel'
    }]
  },
  'plugins': [
    //new webpack.HotModuleReplacementPlugin()
  ],
  devServer: {
    // contentBase: './',
    port: 3000,
    // hot: true,
    open: true,
    inline: true
  }
};
