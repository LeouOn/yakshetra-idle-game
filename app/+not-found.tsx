// Not-found screen — rendered when no route matches the requested URL.
//
// Expo Router's built-in fallback rendered this route *outside* the root
// layout, so the Helmet `<Head><title>Yakshetra</title>` in `app/_layout.tsx`
// never applied and the exported HTML carried an empty `<title>`: a serious axe
// `document-title` violation on a page any mistyped URL can reach. The title is
// therefore set here, per route, the same way a screen sets its own copy.
//
// This file is the wiring only — the screen itself is `NotFoundView`, matching
// the presentational convention the other tested routes use (`SettingsView`,
// `BardoView`), so the copy and the landmark stay testable without a router.

import Head from 'expo-router/head';
import { router } from 'expo-router';

import { resolveSid } from '@/i18n';
import NotFoundView from '@/ui/components/NotFoundView';

export default function NotFoundScreen() {
  return (
    <>
      <Head>
        <title>{resolveSid('not_found.title_sid')}</title>
      </Head>
      <NotFoundView onGoHome={() => router.replace('/')} />
    </>
  );
}
