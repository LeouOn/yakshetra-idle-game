// Life-start screen — role selection, content warnings, era intro.
//
// On mount it attempts to load the era pack (default 'tang-china', or the
// 'era' route param). Two render paths:
//   - ready:        era name + lineage notes + content warnings + 3 role cards.
//                    Tapping a role navigates to /life/[lifeId]?roleId=...
//   - unavailable:  advisory fallback (Wave 4-5 packs are not authored yet;
//                    todo 0 advisory onboarding gates content authoring).
//
// Role cards: the EraPack schema (todo 4) does not yet carry an explicit
// `roles` array (it is `.strict()` and the field is intentionally absent until
// the first real pack ships), so role titles/descriptions are resolved via
// string ids namespaced under the loaded era. When Wave 4 ships authored
// roles this presentation layer already speaks the same string-id vocabulary.
//
// useSaveSlot is wired to surface an existing-save hint. Per-category content
// warning toggle persistence is deferred until SaveBlob gains a settings
// field; the expandable review section uses local state in the meantime.
//
// All visible text flows through @/i18n string ids — no inline literals.
//
// Plan reference: todo 12.

import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { EraPack } from '@/content/schema';
import { loadEraPack } from '@/content/loader';
import { formatSid, resolveSid } from '@/i18n';
import { useSaveSlot } from '@/ui/hooks/useSaveSlot';

const DEFAULT_ERA_ID = 'tang-china';

// Three stable role keys. Forward-compatible with Wave 4 packs: when authored
// roles land, the era namespace already carries their titles/descriptions.
const ROLE_KEYS = ['peasant', 'merchant', 'monastic'] as const;
type RoleKey = (typeof ROLE_KEYS)[number];

type LoadStatus = 'loading' | 'ready' | 'unavailable';

interface RoleCardData {
  readonly key: RoleKey;
  readonly title: string;
  readonly description: string;
  readonly selectLabel: string;
}

/**
 * Resolve a sid, falling back to the raw sid if it is not in the table. Used
 * for open-vocabulary keys (content-warning categories) that may not yet have
 * a authored label without crashing the whole screen.
 */
function tryResolveSid(sid: string): string {
  try {
    return resolveSid(sid);
  } catch {
    return sid;
  }
}

function warningLabel(warningKey: string): string {
  return tryResolveSid(`content_warning.${warningKey}.label_sid`);
}

function buildRoleCards(eraId: string): RoleCardData[] {
  const cards: RoleCardData[] = [];
  for (const key of ROLE_KEYS) {
    const title = resolveSid(`era.${eraId}.role.${key}.title_sid`);
    const description = resolveSid(`era.${eraId}.role.${key}.description_sid`);
    cards.push({
      key,
      title,
      description,
      selectLabel: formatSid('life.start.role_select_label_sid', { role: title }),
    });
  }
  return cards;
}

export default function LifeStartScreen() {
  const params = useLocalSearchParams<{ era?: string }>();
  const eraId = params.era ?? DEFAULT_ERA_ID;
  const { state: saveState } = useSaveSlot();
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [pack, setPack] = useState<EraPack | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const loaded = await loadEraPack(eraId);
        if (!cancelled) {
          setPack(loaded);
          setStatus('ready');
        }
      } catch {
        if (!cancelled) {
          setPack(null);
          setStatus('unavailable');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eraId]);

  const handleSelectRole = (roleKey: RoleKey): void => {
    router.push({
      pathname: '/life/[lifeId]',
      params: { lifeId: 'pending', roleId: roleKey, era: eraId },
    });
  };

  if (status === 'loading') {
    return (
      <View role="main" style={styles.center}>
        <Text accessibilityRole="header" style={styles.heading}>
          {resolveSid('life.start.loading_sid')}
        </Text>
      </View>
    );
  }

  if (status === 'unavailable' || pack === null) {
    return (
      <View role="main" style={styles.center}>
        <Text accessibilityRole="header" style={styles.heading}>
          {resolveSid('life.start.unavailable_heading_sid')}
        </Text>
        <Text style={styles.body}>{resolveSid('life.start.unavailable_body_sid')}</Text>
        <Pressable
          testID="life-start-about"
          accessibilityRole="button"
          accessibilityLabel={resolveSid('life.start.unavailable_about_button_sid')}
          style={styles.button}
          onPress={() => router.push('/about')}
        >
          <Text style={styles.buttonText}>
            {resolveSid('life.start.unavailable_about_button_sid')}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ReadyView
      pack={pack}
      eraId={eraId}
      hasSave={saveState !== null}
      onSelectRole={handleSelectRole}
    />
  );
}

interface ReadyViewProps {
  readonly pack: EraPack;
  readonly eraId: string;
  readonly hasSave: boolean;
  readonly onSelectRole: (roleKey: RoleKey) => void;
}

const ReadyView: FC<ReadyViewProps> = ({ pack, eraId, hasSave, onSelectRole }) => {
  const [warningsExpanded, setWarningsExpanded] = useState(false);
  const eraName = resolveSid(pack.name_sid);
  const lineageNotes = resolveSid(pack.lineage_notes_sid);
  const roleCards = buildRoleCards(eraId);
  const warnings = pack.content_warnings;

  return (
    <ScrollView role="main" style={styles.scroll} contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" style={styles.heading}>
        {resolveSid('life.start.heading_sid')}
      </Text>

      <View style={styles.section}>
        <Text style={styles.label}>{resolveSid('life.start.era_label_sid')}</Text>
        <Text accessibilityRole="header" style={styles.eraName}>
          {eraName}
        </Text>
      </View>

      {hasSave ? (
        <Text style={styles.resumeHint}>{resolveSid('life.start.resume_hint_sid')}</Text>
      ) : null}

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.subheading}>
          {resolveSid('life.start.lineage_notes_heading_sid')}
        </Text>
        <Text style={styles.body}>{lineageNotes}</Text>
      </View>

      <View style={styles.section}>
        <Pressable
          testID="life-start-warnings-toggle"
          accessibilityRole="button"
          accessibilityLabel={resolveSid('life.start.content_warnings_expand_sid')}
          onPress={() => setWarningsExpanded((prev) => !prev)}
          style={styles.collapseButton}
        >
          <Text style={styles.collapseButtonText}>
            {warningsExpanded
              ? resolveSid('life.start.content_warnings_collapse_sid')
              : resolveSid('life.start.content_warnings_expand_sid')}
          </Text>
        </Pressable>
        {warningsExpanded ? (
          warnings.length === 0 ? (
            <Text style={styles.body}>{resolveSid('life.start.content_warnings_empty_sid')}</Text>
          ) : (
            <View style={styles.warningList}>
              {warnings.map((key) => (
                <Text key={key} style={styles.warningItem} testID={`life-start-warning-${key}`}>
                  {warningLabel(key)}
                </Text>
              ))}
            </View>
          )
        ) : null}
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.subheading}>
          {resolveSid('life.start.roles_heading_sid')}
        </Text>
        <View style={styles.roles}>
          {roleCards.map((card) => (
            <Pressable
              key={card.key}
              testID={`life-start-role-${card.key}`}
              accessibilityRole="button"
              accessibilityLabel={card.selectLabel}
              style={styles.roleCard}
              onPress={() => onSelectRole(card.key)}
            >
              <Text style={styles.roleTitle}>{card.title}</Text>
              <Text style={styles.roleDescription}>{card.description}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24, paddingVertical: 32, gap: 20 },
  center: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  heading: { fontSize: 26, fontWeight: '700' },
  subheading: { fontSize: 13, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  label: { fontSize: 12, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 0.5 },
  eraName: { fontSize: 22, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 22 },
  resumeHint: { fontSize: 13, opacity: 0.7, fontStyle: 'italic' },
  section: { gap: 8 },
  collapseButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6b6b73',
    alignSelf: 'flex-start',
  },
  collapseButtonText: { fontSize: 14, fontWeight: '600' },
  warningList: { gap: 4, marginTop: 4 },
  warningItem: { fontSize: 14, lineHeight: 20 },
  roles: { gap: 12 },
  roleCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3a3a42',
    padding: 16,
    gap: 6,
  },
  roleTitle: { fontSize: 17, fontWeight: '600' },
  roleDescription: { fontSize: 14, lineHeight: 20, opacity: 0.8 },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#111827',
    alignItems: 'center',
  },
  buttonText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
});
