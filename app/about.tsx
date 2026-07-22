// About screen — front-matter disclaimer, lineage notes, glossary, sources.
//
// Renders the presentational {@link AboutView}. All text flows through `about.*`
// string ids. A back button returns to the previous route.
//
// Plan reference: todo 28 (disclaimer + glossary surface); this route is wired
// in todo 15 so the settings screen's "About" link resolves.

import { router } from 'expo-router';

import AboutView from '@/ui/components/AboutView';

export default function AboutScreen() {
  return <AboutView onBack={() => router.back()} />;
}
