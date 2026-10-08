// useMounted — false during server render AND the first client render, true
// after the first effect tick. Routes that derive content from client-only
// state (localStorage saves, URL params) render their skeleton until it
// flips, so the first client render matches the server HTML byte-for-byte
// and React 19 hydration (#418) succeeds. The swap to live content is a
// normal post-hydration update, not a mismatch.

import { useEffect, useState } from 'react';

export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Deferred a microtask so the flip is a separate render pass, not a
    // synchronous cascade inside the effect (repo lint: no sync setState
    // in effects).
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) {
        setMounted(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return mounted;
}
