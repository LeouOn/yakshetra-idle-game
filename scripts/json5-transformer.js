// Custom Metro transformer that pre-parses .json5 files into JS modules before
// handing them to the upstream Expo babel transformer.
//
// JSON5 is a superset of JSON with comments, trailing commas, unquoted keys,
// and hex numbers. Metro's default JSON handling does not extend to .json5.
// This transformer bridges that gap: it parses the .json5 source with the
// `json5` library and emits a JS module that the upstream Expo transformer
// processes normally (with all Expo-router babel plugins intact).
//
// The upstream transformer path is passed from metro.config.js via the
// __YAKSHETRA_BABEL_TRANSFORMER env var. This ensures we delegate to the SAME
// transformer Expo configured (which carries the plugins that inline
// process.env.EXPO_ROUTER_APP_ROOT and other build-time constants).
//
// Plan reference: T12 loader integration (make the game playable on web).

const JSON5 = require('json5');

const upstreamPath = process.env.__YAKSHETRA_BABEL_TRANSFORMER;
if (typeof upstreamPath !== 'string' || upstreamPath.length === 0) {
  throw new Error(
    'json5-transformer: __YAKSHETRA_BABEL_TRANSFORMER env var not set; ' +
      'metro.config.js must set it to the default Expo babel-transformer path',
  );
}
const upstream = require(upstreamPath);

/**
 * Transform a single file. For .json5 files we rewrite the source as
 * `module.exports = <JSON>;` (JSON is valid JS, so JSON.stringify produces
 * syntactically correct JS source). All other files pass through to the
 * upstream Expo transformer untouched, preserving its full plugin chain.
 */
module.exports = {
  ...upstream,
  transform: async function transformJson5(params) {
    const filename = params.filename;
    if (typeof filename === 'string' && filename.endsWith('.json5')) {
      const parsed = JSON5.parse(params.src);
      const rewritten = 'module.exports = ' + JSON.stringify(parsed) + ';';
      return upstream.transform({ ...params, src: rewritten });
    }
    return upstream.transform(params);
  },
};
