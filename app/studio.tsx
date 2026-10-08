// Manifest bench route. The route body lives in StudioRoute (src/ui) so the
// hydration gate is testable; this file only wires navigation.

import { router } from 'expo-router';

import StudioRoute from '@/ui/components/StudioRoute';

export default function StudioScreen() {
  return <StudioRoute onBack={() => router.back()} />;
}
