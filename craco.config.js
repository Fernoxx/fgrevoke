const webpack = require('webpack');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Add polyfills for Node.js modules
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        "stream": require.resolve("stream-browserify"),
      };

      // Add plugins for polyfills
      webpackConfig.plugins = [
        ...webpackConfig.plugins,
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
        }),
        new webpack.DefinePlugin({
          'process.env': JSON.stringify(process.env),
          'global': 'globalThis',
        }),
      ];

      // Ignore warnings about critical dependencies
      webpackConfig.ignoreWarnings = [
        /Critical dependency/,
        /Failed to parse source map/
      ];

      return webpackConfig;
    },
  },
};
