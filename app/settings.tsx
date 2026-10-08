// Settings screen — accessibility, content warnings, save-slot management.
//
// Wires `useSaveSlot` (settings + slots 1-5) and a synchronous clipboard bridge
// to the presentational {@link SettingsView}. Content-warning toggles persist
// via `useSaveSlot().updateSettings()`; save export/import is base64 around the
// canonical envelope. Link to /about for the disclaimer + glossary.
//
// Plan reference: todo 15.

import { router } from 'expo-router';

import SettingsView from '@/ui/components/SettingsView';
import { useSaveSlot } from '@/ui/hooks/useSaveSlot';
import { useMounted } from '@/ui/hooks/useMounted';
import ScreenSkeleton from '@/ui/components/ScreenSkeleton';

// Same-session clipboard bridge. On web we additionally push the text to the
// async platform clipboard (best-effort); the synchronous buffer keeps the
// in-app export→import round-trip working everywhere.
let clipboardBuffer = '';

function writeClipboard(text: string): void {
  clipboardBuffer = text;
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator === 'object' &&
    navigator !== null &&
    typeof navigator.clipboard === 'object' &&
    typeof navigator.clipboard.writeText === 'function'
  ) {
    void navigator.clipboard.writeText(text);
  }
}

function readClipboard(): string {
  return clipboardBuffer;
}

export default function SettingsScreen() {
  const {
    settings,
    allSlots,
    updateSettings,
    setContentWarning,
    exportSlot,
    importSlot,
    deleteSlot,
    error,
    clearError,
  } = useSaveSlot(1);
  const mounted = useMounted();

  if (!mounted) {
    return <ScreenSkeleton sections={3} testID="settings-skeleton" />;
  }

  return (
    <SettingsView
      settings={settings}
      slots={mounted ? allSlots : []}
      slotsLoading={!mounted}
      error={error}
      onClearError={clearError}
      onToggleContentWarning={setContentWarning}
      onToggleReducedMotion={(enabled) => updateSettings({ reducedMotion: enabled })}
      onSelectFontScale={(scale) => updateSettings({ fontScale: scale })}
      onExportSlot={exportSlot}
      onImportSlot={(slot, base64) => importSlot(slot, base64)}
      onDeleteSlot={(slot) => {
        void deleteSlot(slot);
      }}
      readClipboard={readClipboard}
      writeClipboard={writeClipboard}
      onNavigateAbout={() => router.push('/about')}
    />
  );
}
