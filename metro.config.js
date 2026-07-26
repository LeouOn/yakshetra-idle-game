// Metro configuration for Expo Router.
//
// Extends Expo's default Metro config with two additions for content packs:
//   1. `json5` is added to `resolver.sourceExts` so Metro treats .json5 files
//      as source modules (resolved and transformed) rather than binary assets.
//   2. `babelTransformerPath` is pointed at our wrapper
//      (scripts/json5-transformer.js) that pre-parses .json5 into a JS module
//      before the upstream babel transformer runs.
//
// The default Expo babel-transformer path is passed to the wrapper via an env
// var so the wrapper delegates non-.json5 files to the SAME upstream Expo
// configured (which carries the Expo-router babel plugins responsible for
// inlining process.env.EXPO_ROUTER_APP_ROOT and similar).
//
// Reference: https://docs.expo.dev/guides/customizing-metro

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Treat .json5 as source files so the bundler resolves them as modules.
config.resolver.sourceExts = [...config.resolver.sourceExts, 'json5'];

// Pass the default Expo babel-transformer path to our wrapper. Metro workers
// inherit the parent env, so the env var reaches the transform worker.
process.env.__YAKSHETRA_BABEL_TRANSFORMER = config.transformer.babelTransformerPath;

// Wrap the default babel transformer with our .json5 pre-parser.
config.transformer.babelTransformerPath = require.resolve('./scripts/json5-transformer.js');

module.exports = config;
