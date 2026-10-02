// Not-found screen — rendered when no route matches the requested URL.
//
// Expo Router's built-in fallback rendered this route *outside* the root layout,
// so the Helmet `<Head><title>Yakshetra</title>` in `app/_layout.tsx` never
// applied and the exported HTML carried an empty `<title>`: a serious axe
// `document-title` violation on a page any mistyped URL can reach. The title is
// therefore set here, per route, the same way a screen sets its own copy.

import Head from 'expo-router/head';

import { RoutePlaceholder } from '@/ui/components/RoutePlaceholder';

export default function NotFoundScreen() {
  return (
    <>
      <Head>
        <title>Page not found — Yakshetra</title>
      </Head>
      <RoutePlaceholder title="Page not found" implementingTodo="todo 15" />
    </>
  );
}
