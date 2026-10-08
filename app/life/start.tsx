// Life-start screen — role selection, content warnings, era intro.
//
// On mount it attempts to load the era pack (default 'tang-china', or the
// 'era' route param). Two render paths:
//   - ready:        era name + lineage notes + content warnings + the pack's
//                    own role cards. Tapping a role navigates to
//                    /life/[lifeId]?roleId=...
//   - unavailable:  advisory fallback (Wave 4-5 packs are not authored yet;
//                    todo 0 advisory onboarding gates content authoring).
//
// Role cards come from the pack's `starting_roles`, so each era offers the
// roles it actually authors and the `roleId` param is an id the life route
// can resolve. They used to be three hardcoded keys resolved through an
// `era.<id>.role.*` namespace, which only the Tang era defined: picking the
// second era at the bardo threw `unknown string id` and white-screened.
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
import { openLife } from '@/engine';
import { formatSid, resolveSid } from '@/i18n';
import { studioTheme as t } from '@/ui/studio-theme';
import { useSaveSlot } from '@/ui/hooks/useSaveSlot';
import { useMounted } from '@/ui/hooks/useMounted';
import ScreenSkeleton from '@/ui/components/ScreenSkeleton';
import SaveSlotErrorBar from '@/ui/components/SaveSlotErrorBar';
import type { SaveSlotError } from '@/ui/hooks/useSaveSlot';

const DEFAULT_ERA_ID = 'tang-china';

type LoadStatus = 'loading' | 'ready' | 'unavailable';

interface RoleCardData {
  readonly key: string;
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

/**
 * One card per role the pack authors, labelled through the pack's own string
 * ids. A pack without `starting_roles` yields no cards rather than cards that
 * name roles the era does not have. A role with no label falls back to its raw
 * id so one thin content row cannot blank the picker.
 */
function buildRoleCards(pack: EraPack): RoleCardData[] {
  const cards: RoleCardData[] = [];
  for (const role of pack.starting_roles ?? []) {
    const title = resolveSid(role.label_sid ?? role.title_sid ?? role.id);
    cards.push({
      key: role.id,
      title,
      description: resolveSid(role.description_sid),
      selectLabel: formatSid('life.start.role_select_label_sid', { role: title }),
    });
  }
  return cards;
}

export default function LifeStartScreen() {
  const params = useLocalSearchParams<{ era?: string; resume?: string }>();
  const eraId = params.era ?? DEFAULT_ERA_ID;
  const { state: saveState, loading: saveLoading, error, clearError } = useSaveSlot();
  const [status, setStatus] = useState<LoadStatus>('loading');
  const mounted = useMounted();
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

  useEffect(() => {
    if (params.resume !== '1' || saveLoading) {
      return;
    }
    // Only a life still in progress is resumable; a chain whose current life
    // has ended falls through to role selection instead of reopening it.
    const life = saveState === null ? null : openLife(saveState);
    if (life === null) {
      return;
    }
    router.replace({
      pathname: '/life/[lifeId]',
      params: { lifeId: life.id, era: life.era },
    });
  }, [params.resume, saveLoading, saveState]);

  const handleSelectRole = (roleKey: string): void => {
    router.push({
      pathname: '/life/[lifeId]',
      params: { lifeId: 'pending', roleId: roleKey, era: eraId },
    });
  };

  if (status === 'loading' || !mounted) {
    // The frame of the arriving screen, not a promise of one — and the same
    // frame the server shipped, so hydration matches.
    return <ScreenSkeleton sections={4} testID="life-start-skeleton" />;
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
      hasSave={saveState !== null}
      onSelectRole={handleSelectRole}
      saveError={error}
      onClearSaveError={clearError}
    />
  );
}

interface ReadyViewProps {
  readonly pack: EraPack;
  readonly hasSave: boolean;
  readonly onSelectRole: (roleKey: string) => void;
  readonly saveError: SaveSlotError | null;
  readonly onClearSaveError: () => void;
}

const ReadyView: FC<ReadyViewProps> = ({
  pack,
  hasSave,
  onSelectRole,
  saveError = null,
  onClearSaveError,
}) => {
  const [warningsExpanded, setWarningsExpanded] = useState(false);
  const eraName = resolveSid(pack.name_sid);
  const lineageNotes = resolveSid(pack.lineage_notes_sid);
  const roleCards = buildRoleCards(pack);
  const warnings = pack.content_warnings;

  return (
    <ScrollView role="main" style={styles.scroll} contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" style={styles.heading}>
        {resolveSid('life.start.heading_sid')}
      </Text>

      <SaveSlotErrorBar error={saveError} onContinue={onClearSaveError} />

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
  scroll: { flex: 1, backgroundColor: t.bg },
  content: { paddingHorizontal: 24, paddingVertical: 32, gap: 20 },
  center: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    backgroundColor: t.bg,
  },
  heading: { fontSize: 26, fontWeight: '700', color: t.text },
  subheading: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: t.gold,
  },
  label: {
    fontSize: 12,
    opacity: 0.6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: t.muted,
  },
  eraName: { fontSize: 22, fontWeight: '600', color: t.text },
  body: { fontSize: 15, lineHeight: 22, color: t.text },
  resumeHint: { fontSize: 13, opacity: 0.7, fontStyle: 'italic', color: t.muted },
  section: { gap: 8 },
  collapseButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: t.line,
    alignSelf: 'flex-start',
  },
  collapseButtonText: { fontSize: 14, fontWeight: '600', color: t.text },
  warningList: { gap: 4, marginTop: 4 },
  warningItem: { fontSize: 14, lineHeight: 20, color: t.muted },
  roles: { gap: 12 },
  roleCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.line,
    backgroundColor: t.surface,
    padding: 16,
    gap: 6,
  },
  roleTitle: { fontSize: 17, fontWeight: '600', color: t.text },
  roleDescription: { fontSize: 14, lineHeight: 20, opacity: 0.8, color: t.muted },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: t.accentDeep,
    alignItems: 'center',
  },
  buttonText: { color: t.text, fontSize: 15, fontWeight: '600' },
});
