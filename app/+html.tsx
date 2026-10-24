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

import { studioTheme } from '@/ui/studio-theme';

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
        {/*
         * The document <title> is provided by the Helmet <Head> in
         * _layout.tsx. Rendering one here too produces a duplicate, and the
         * Helmet placeholder (which appears first in <head>) wins the
         * `document.title` IDL getter — so we omit it here.
         */}
      </head>
      <body style={{ backgroundColor: '#0c0a12', color: '#f4eef8' }}>
        {/* Dark scrollbars + a dark root canvas (web only — this file is
            ignored on native). The studio scrolls inside its own `main`, so
            Firefox's default light scrollbar track painted a ~10px white
            strip down the right edge at desktop widths (agy-ux finding 11).
            `scrollbar-color` inherits from `html`, so one declaration covers
            the root and every inner scroller; tokens come from the shared
            studio palette so the track never drifts from the bench. */}
        <style
          dangerouslySetInnerHTML={{
            __html: `html{background-color:${studioTheme.bg};scrollbar-color:${studioTheme.line} ${studioTheme.bg};}`,
          }}
        />
        {/* Page-level reset so the RN root fills the viewport on web. */}
        <ScrollViewStyleReset />
        {children}
      </body>
    </html>
  );
}
