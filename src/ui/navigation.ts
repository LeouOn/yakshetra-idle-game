import { router } from 'expo-router';

/**
 * The Back control on a screen: step back when there is somewhere to go back
 * to, otherwise go home. A player who deep-links straight to /settings or
 * /life/start has no history, and `router.back()` alone would do nothing, which
 * is exactly the stuck case the Back control exists for.
 */
export function goBackOrHome(): void {
  if (typeof router.canGoBack === 'function' && !router.canGoBack()) {
    router.replace('/');
    return;
  }
  router.back();
}
