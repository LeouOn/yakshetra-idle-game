// About screen — front-matter disclaimer, lineage notes, glossary, sources.
//
// Renders the presentational {@link AboutView}. All text flows through `about.*`
// string ids. A back button returns to the previous route.
//
// Plan reference: todo 28 (disclaimer + glossary surface); this route is wired
// in todo 15 so the settings screen's "About" link resolves.

import { router } from 'expo-router';

import AboutView from '@/ui/components/AboutView';
import ScreenSkeleton from '@/ui/components/ScreenSkeleton';
import { useMounted } from '@/ui/hooks/useMounted';

export default function AboutScreen() {
  // Hydration parity: the server and the first client render ship the
  // skeleton; the ScrollView swaps in after mount (browser finding 3).
  const mounted = useMounted();
  if (!mounted) {
    return <ScreenSkeleton sections={3} testID="about-skeleton" />;
  }
  return <AboutView onBack={() => router.back()} />;
}
