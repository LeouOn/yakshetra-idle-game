// Web-only HTML document wrapper for static rendering.
//
// This file is ignored on native. On web, Expo Router wraps every statically
// rendered route in the document returned here, enabling per-route HTML output
// (one .html file per route under dist/).
//
// NOTE: as of expo-router SDK 57, `ScrollViewStyleReset` is a self-closing
// `<style>` injector (it no longer wraps children) — it emits the
// `#root,body,html{height:100%}` reset that full-screen React Native Web apps
// need for native scroll parity.
//
// Reference: https://docs.expo.dev/router/web/static-rendering/

import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * Root HTML document for the web target.
 */
export default function RootHTML({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <title>Yakshetra</title>
      </head>
      <body>
        {/* Page-level reset so the RN root fills the viewport on web. */}
        <ScrollViewStyleReset />
        {children}
      </body>
    </html>
  );
}
