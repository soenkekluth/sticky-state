const webpack = require('webpack');
const package = require('./package');

const banner = `${package.name} ${package.version} - ${package.description}\nCopyright (c) ${ new Date().getFullYear() } ${package.author} - ${package.homepage}\nLicense: ${package.license}`;

module.exports = {
  'context': __dirname + '/src',
  'entry': ['./sticky-state.js'],
  'output': {
    'path': __dirname + '/dist',
    'filename': `${package.name}.min.js`,
    'library': `StickyState`,
    'libraryTarget': 'umd'
  },
  debug: false,
  'module': {
    'loaders': [{
      'test': /\.js$/,
      'exclude': /node_modules/,
      'loader': 'babel'
    }]
  },
  'plugins': [
    new webpack.BannerPlugin(banner),
  ]
};
