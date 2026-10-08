// Bench tabs (wave 2a, lane b1) — the hierarchy. The bench tab carries the
// loop (charge, working, stage); the life, market and archive move behind
// tabs. Every section stays MOUNTED: inactive tabs collapse via display
// none, so screen readers can still reach them and tests stay stable —
// the tab is a focus affordance, not a data gate.

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { resolveSid } from '@/i18n';
import { studioTheme as t } from '@/ui/studio-theme';

export const STUDIO_TABS = ['bench', 'life', 'market', 'archive', 'world'] as const;
export type StudioTab = (typeof STUDIO_TABS)[number];

export interface StudioTabsProps {
  readonly active: StudioTab;
  readonly onSelect: (tab: StudioTab) => void;
}

export interface TabSectionProps {
  readonly tab: StudioTab;
  readonly active: StudioTab;
  readonly children: React.ReactNode;
}

/** One always-mounted section; hidden unless its tab is active. */
export function TabSection({ tab, active, children }: TabSectionProps) {
  return (
    <View testID={`studio-tab-section-${tab}`} style={active === tab ? null : styles.hidden}>
      {children}
    </View>
  );
}

export default function StudioTabs({ active, onSelect }: StudioTabsProps) {
  return (
    <View testID="studio-tabs" accessibilityRole="tablist" style={styles.bar}>
      {STUDIO_TABS.map((tab) => (
        <Pressable
          key={tab}
          role="tab"
          testID={`studio-tab-${tab}`}
          accessibilityState={{ selected: active === tab }}
          onPress={() => onSelect(tab)}
          style={[styles.tab, active === tab ? styles.tabActive : null]}
        >
          <Text style={[styles.tabText, active === tab ? styles.tabTextActive : null]}>
            {resolveSid(`studio.tab_${tab}_sid`)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', gap: 6, marginVertical: 6 },
  tab: {
    minHeight: 44,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingHorizontal: 8,
    backgroundColor: t.chip,
  },
  tabActive: { backgroundColor: t.accentDeep, borderWidth: 1, borderColor: t.accent },
  tabText: { color: t.muted, fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: t.text },
  hidden: { display: 'none' },
});
