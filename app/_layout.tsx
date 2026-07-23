// Root layout for Expo Router.
//
// `<Slot />` renders the matched child route with no wrapping navigator. This
// app uses a flat hierarchy (chain picker -> life screens -> bardo -> settings);
// when todo 12+ introduce per-section chrome (headers, back gestures) a nested
// `<Stack />` can be added under `app/life/_layout.tsx`. For todo 11 a bare slot
// keeps static web rendering simple and the route tree shallow.
//
// Reference: https://docs.expo.dev/router/installation

import { Slot } from 'expo-router';
import Head from 'expo-router/head';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      {/*
       * Provide the document title via Helmet so a single populated
       * `<title>` is emitted in the SSR HTML shell. Without this, the
       * Helmet placeholder `<title data-rh="true"></title>` renders before
       * any title set in `+html.tsx`, and `document.title` resolves to the
       * empty first title (axe `document-title` violation).
       */}
      <Head>
        <title>Yakshetra</title>
      </Head>
      {/* `auto` respects the user's light/dark preference (userInterfaceStyle). */}
      <StatusBar style="auto" />
      <Slot />
    </SafeAreaProvider>
  );
}
