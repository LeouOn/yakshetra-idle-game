// Metro configuration for Expo Router.
//
// Extends Expo's default Metro config. Expo Router's typed-route generation and
// web static rendering both flow through this config. No custom resolvers are
// needed: the `@/*` path alias is handled by tsconfig + Babel/Expo's tsconfig
// path plugin at build time.
//
// Reference: https://docs.expo.dev/guides/customizing-metro

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
