// Settings screen — accessibility, content warnings, and save-slot management.
//
// Pure presentational component. The parent route wires `useSaveSlot` (for
// settings + the slot list) and clipboard helpers, then passes data/callbacks
// in. Keeping this view free of hooks/persistence makes it trivially testable
// under the test-renderer shim.
//
// Design constraints (plan todo 15/28): NO global "disable all warnings"
// toggle — per-category only. Toggles persist via the parent's
// `useSaveSlot().updateSettings()`. Save export/import is base64 around the
// canonical envelope (see `encodeSaveBlob`/`decodeSaveBlob`).

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { WARNING_CATEGORIES, type WarningCategoryId } from '@/content/warning-taxonomy';
import { formatSid, resolveSid } from '@/i18n';
import type { AppSettings, FontScale, SlotSummary } from '@/ui/hooks/useSaveSlot';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SettingsViewProps {
  readonly settings: AppSettings;
  readonly slots: readonly SlotSummary[];
  // Content warnings: fire the new enabled value for one category.
  readonly onToggleContentWarning: (id: WarningCategoryId, enabled: boolean) => void;
  // Accessibility toggles.
  readonly onToggleReducedMotion: (enabled: boolean) => void;
  readonly onSelectFontScale: (scale: FontScale) => void;
  // Save-slot management. `onExportSlot` returns a base64 code (throws if empty).
  readonly onExportSlot: (slot: number) => string;
  readonly onImportSlot: (slot: number, base64: string) => Promise<void>;
  readonly onDeleteSlot: (slot: number) => void;
  // Clipboard seam (synchronous; the route bridges to the platform clipboard).
  readonly readClipboard: () => string;
  readonly writeClipboard: (text: string) => void;
  readonly onNavigateAbout: () => void;
}

interface ImportMessage {
  readonly slot: number;
  readonly ok: boolean;
}

const FONT_SCALES: readonly FontScale[] = ['small', 'medium', 'large'];

function fontScaleLabelSid(scale: FontScale): string {
  return `settings.font_scale_${scale}_sid`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SettingsView({
  settings,
  slots,
  onToggleContentWarning,
  onToggleReducedMotion,
  onSelectFontScale,
  onExportSlot,
  onImportSlot,
  onDeleteSlot,
  readClipboard,
  writeClipboard,
  onNavigateAbout,
}: SettingsViewProps) {
  const [exportCode, setExportCode] = useState<string | null>(null);
  const [exportSlot, setExportSlot] = useState<number | null>(null);
  const [importMsg, setImportMsg] = useState<ImportMessage | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = (slot: number): void => {
    try {
      const code = onExportSlot(slot);
      writeClipboard(code);
      setExportCode(code);
      setExportSlot(slot);
      setExportError(null);
    } catch (err) {
      setExportCode(null);
      setExportSlot(null);
      setExportError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleImport = async (slot: number): Promise<void> => {
    const code = readClipboard();
    try {
      await onImportSlot(slot, code);
      setImportMsg({ slot, ok: true });
    } catch {
      setImportMsg({ slot, ok: false });
    }
  };

  const handleDelete = (slot: number): void => {
    onDeleteSlot(slot);
  };

  return (
    <ScrollView
      testID="settings-screen"
      accessibilityRole="summary"
      contentContainerStyle={styles.container}
    >
      <Text accessibilityRole="header" style={styles.title}>
        {resolveSid('settings.title_sid')}
      </Text>

      {/* Content warnings (9 per-category toggles, no global off) */}
      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionHeading}>
          {resolveSid('settings.content_warnings_heading_sid')}
        </Text>
        <Text style={styles.help}>{resolveSid('settings.content_warnings_help_sid')}</Text>
        <View style={styles.toggleList}>
          {WARNING_CATEGORIES.map((cat) => {
            const enabled = settings.contentWarnings[cat.id];
            const stateSid = enabled ? 'settings.toggle_on_sid' : 'settings.toggle_off_sid';
            const stateLabel = resolveSid(stateSid);
            const label = resolveSid(cat.label_sid);
            const description = resolveSid(cat.description_sid);
            const rowLabel = formatSid('settings.toggle_label_sid', {
              label,
              state: stateLabel,
            });
            return (
              <Pressable
                key={cat.id}
                testID={`settings-warning-${cat.id}`}
                accessibilityRole="button"
                accessibilityLabel={rowLabel}
                style={styles.toggleRow}
                onPress={() => onToggleContentWarning(cat.id, !enabled)}
              >
                <View style={styles.toggleText}>
                  <Text style={styles.toggleLabel}>{label}</Text>
                  <Text style={styles.toggleDescription}>{description}</Text>
                </View>
                <Text
                  testID={`settings-warning-${cat.id}-state`}
                  style={enabled ? styles.stateOn : styles.stateOff}
                >
                  {stateLabel}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Reduced motion */}
      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionHeading}>
          {resolveSid('settings.reduced_motion_label_sid')}
        </Text>
        <Text style={styles.help}>{resolveSid('settings.reduced_motion_help_sid')}</Text>
        <Pressable
          testID="settings-reduced-motion"
          accessibilityRole="button"
          accessibilityLabel={formatSid('settings.toggle_label_sid', {
            label: resolveSid('settings.reduced_motion_label_sid'),
            state: resolveSid(
              settings.reducedMotion ? 'settings.toggle_on_sid' : 'settings.toggle_off_sid',
            ),
          })}
          style={styles.toggleRow}
          onPress={() => onToggleReducedMotion(!settings.reducedMotion)}
        >
          <View style={styles.toggleText}>
            <Text style={styles.toggleLabel}>
              {resolveSid('settings.reduced_motion_label_sid')}
            </Text>
          </View>
          <Text
            testID="settings-reduced-motion-state"
            style={settings.reducedMotion ? styles.stateOn : styles.stateOff}
          >
            {resolveSid(
              settings.reducedMotion ? 'settings.toggle_on_sid' : 'settings.toggle_off_sid',
            )}
          </Text>
        </Pressable>
      </View>

      {/* Font size (3 steps) */}
      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionHeading}>
          {resolveSid('settings.font_scale_heading_sid')}
        </Text>
        <View style={styles.fontRow}>
          {FONT_SCALES.map((scale) => {
            const selected = settings.fontScale === scale;
            const sizeLabel = resolveSid(fontScaleLabelSid(scale));
            const fullLabel = formatSid(
              selected ? 'settings.font_scale_selected_sid' : 'settings.font_scale_unselected_sid',
              { size: sizeLabel },
            );
            return (
              <Pressable
                key={scale}
                testID={`settings-font-${scale}`}
                accessibilityRole="button"
                accessibilityLabel={fullLabel}
                onPress={() => onSelectFontScale(scale)}
                style={[styles.fontButton, selected ? styles.fontButtonSelected : null]}
              >
                <Text style={selected ? styles.fontLabelSelected : styles.fontLabel}>
                  {sizeLabel}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Save slot management */}
      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionHeading}>
          {resolveSid('settings.save_slots_heading_sid')}
        </Text>
        <View style={styles.slotList}>
          {slots.map((summary) => (
            <SlotRow
              key={summary.slot}
              summary={summary}
              onExport={handleExport}
              onImport={handleImport}
              onDelete={handleDelete}
            />
          ))}
        </View>

        {exportError !== null ? (
          <Text testID="settings-export-error" style={styles.error}>
            {exportError}
          </Text>
        ) : null}
        {exportCode !== null && exportSlot !== null ? (
          <View style={styles.exportResult}>
            <Text accessibilityRole="header" style={styles.exportLabel}>
              {resolveSid('settings.export_result_label_sid')}
            </Text>
            <Text
              testID="settings-export-code"
              accessibilityLabel={resolveSid('settings.export_result_sid')}
              style={styles.exportCode}
              numberOfLines={2}
            >
              {exportCode}
            </Text>
            <Text style={styles.help}>{resolveSid('settings.export_result_sid')}</Text>
          </View>
        ) : null}
        {importMsg !== null ? (
          <Text testID="settings-import-msg" style={importMsg.ok ? styles.success : styles.error}>
            {importMsg.ok
              ? formatSid('settings.import_succeeded_sid', { n: importMsg.slot })
              : resolveSid('settings.import_failed_sid')}
          </Text>
        ) : null}
      </View>

      <Pressable
        testID="settings-about-link"
        accessibilityRole="button"
        accessibilityLabel={resolveSid('settings.about_link_sid')}
        style={styles.aboutLink}
        onPress={onNavigateAbout}
      >
        <Text style={styles.aboutLinkText}>{resolveSid('settings.about_link_sid')}</Text>
      </Pressable>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Slot row
// ---------------------------------------------------------------------------

interface SlotRowProps {
  readonly summary: SlotSummary;
  readonly onExport: (slot: number) => void;
  readonly onImport: (slot: number) => Promise<void>;
  readonly onDelete: (slot: number) => void;
}

function SlotRow({ summary, onExport, onImport, onDelete }: SlotRowProps) {
  const { slot, blob } = summary;
  const meta =
    blob === null
      ? resolveSid('settings.slot_empty_sid')
      : formatSid('settings.slot_meta_sid', { unix: blob.created_at_unix });

  return (
    <View style={styles.slotRow} testID={`settings-slot-${slot}`}>
      <View style={styles.slotMeta}>
        <Text style={styles.slotLabel}>{formatSid('settings.slot_label_sid', { n: slot })}</Text>
        <Text style={styles.slotMetaText}>{meta}</Text>
      </View>
      <View style={styles.slotActions}>
        <Pressable
          testID={`settings-slot-${slot}-export`}
          accessibilityRole="button"
          accessibilityLabel={formatSid('settings.toggle_label_sid', {
            label: formatSid('settings.slot_label_sid', { n: slot }),
            state: resolveSid('settings.export_button_sid'),
          })}
          disabled={blob === null}
          style={[styles.slotButton, blob === null ? styles.slotButtonDisabled : null]}
          onPress={() => onExport(slot)}
        >
          <Text style={styles.slotButtonText}>{resolveSid('settings.export_button_sid')}</Text>
        </Pressable>
        <Pressable
          testID={`settings-slot-${slot}-import`}
          accessibilityRole="button"
          accessibilityLabel={resolveSid('settings.import_button_sid')}
          style={styles.slotButton}
          onPress={() => {
            void onImport(slot);
          }}
        >
          <Text style={styles.slotButtonText}>{resolveSid('settings.import_button_sid')}</Text>
        </Pressable>
        <Pressable
          testID={`settings-slot-${slot}-delete`}
          accessibilityRole="button"
          accessibilityLabel={resolveSid('settings.delete_button_sid')}
          disabled={blob === null}
          style={[styles.slotButton, blob === null ? styles.slotButtonDisabled : null]}
          onPress={() => onDelete(slot)}
        >
          <Text style={styles.slotButtonText}>{resolveSid('settings.delete_button_sid')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, paddingVertical: 28, gap: 28 },
  title: { fontSize: 26, fontWeight: '700' },
  section: { gap: 10 },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'uppercase',
    opacity: 0.8,
  },
  help: { fontSize: 14, opacity: 0.65, lineHeight: 19 },
  toggleList: { gap: 8 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#f4f4f5',
    gap: 12,
  },
  toggleText: { flex: 1, gap: 2 },
  toggleLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
  toggleDescription: { fontSize: 13, opacity: 0.7, color: '#111827' },
  stateOn: { fontSize: 14, fontWeight: '700', color: '#166534' },
  stateOff: { fontSize: 14, fontWeight: '700', color: '#9f1239' },
  fontRow: { flexDirection: 'row', gap: 10 },
  fontButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#f4f4f5',
    alignItems: 'center',
  },
  fontButtonSelected: { backgroundColor: '#111827' },
  fontLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  fontLabelSelected: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  slotList: { gap: 10 },
  slotRow: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#f4f4f5',
    gap: 8,
  },
  slotMeta: { gap: 2 },
  slotLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
  slotMetaText: { fontSize: 13, opacity: 0.65, color: '#111827' },
  slotActions: { flexDirection: 'row', gap: 8 },
  slotButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
  },
  slotButtonDisabled: { opacity: 0.4 },
  slotButtonText: { fontSize: 13, fontWeight: '600', color: '#111827' },
  exportResult: { gap: 4, marginTop: 6 },
  exportLabel: { fontSize: 13, fontWeight: '700', opacity: 0.8 },
  exportCode: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#111827',
    opacity: 0.8,
  },
  success: { fontSize: 14, fontWeight: '600', color: '#166534' },
  error: { fontSize: 14, fontWeight: '600', color: '#9f1239' },
  aboutLink: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  aboutLinkText: { fontSize: 15, fontWeight: '600', color: '#111827' },
});
