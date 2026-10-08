// Life dossier — year, setting, ties. Preview of the LLM compile payload.

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { stringifyLifeContext, type LifeContext } from '@/engine';
import { formatSid, resolveSid } from '@/i18n';
import { studioTheme as t } from '@/ui/studio-theme';

export interface StudioLifeProps {
  readonly context: LifeContext;
  readonly onExport?: (json: string) => void;
}

export default function StudioLife({ context, onExport }: StudioLifeProps) {
  return (
    <View testID="studio-life" style={styles.panel}>
      <Text accessibilityRole="header" style={styles.heading}>
        {resolveSid('studio.life_heading_sid')}
      </Text>
      <Text style={styles.line}>
        {formatSid('studio.life_when_sid', {
          year: context.setting.year,
          month: context.setting.month,
          day: context.setting.day,
        })}
      </Text>
      {/* The role line is shown only when a real role name came with the
          context. The bench stand-in life has no pack behind it, and its
          `role_id` is the placeholder `operator` — printing that under
          "This life" presented a build-internal token as the player's
          identity. With no role name, the line is omitted rather than
          filled with a token. */}
      {context.setting.role_name === undefined ? null : (
        <Text style={styles.muted}>
          {formatSid('studio.life_who_sid', {
            role: context.setting.role_name,
            age: context.age,
          })}
        </Text>
      )}
      <Text style={styles.muted}>
        {formatSid('studio.life_world_sid', {
          world: context.world_name ?? resolveSid('studio.life_world_none_sid'),
        })}
      </Text>
      {context.ties.length === 0 ? (
        <Text style={styles.muted}>{resolveSid('studio.life_ties_empty_sid')}</Text>
      ) : (
        context.ties.slice(0, 4).map((tie) => (
          <Text key={`${tie.source}-${tie.id}`} style={styles.tie}>
            {formatSid('studio.life_tie_sid', { name: tie.id, bond: tie.bond })}
          </Text>
        ))
      )}
      {onExport === undefined ? null : (
        <Pressable
          role="button"
          testID="studio-export-life"
          accessibilityLabel={resolveSid('studio.export_life_sid')}
          onPress={() => onExport(stringifyLifeContext(context))}
        >
          <Text style={styles.export}>{resolveSid('studio.export_life_sid')}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 6, marginTop: 8 },
  heading: { fontSize: 20, fontWeight: '700', color: t.text },
  line: { fontSize: 16, color: t.gold },
  muted: { fontSize: 14, color: t.muted },
  tie: { fontSize: 14, color: t.text },
  export: { fontSize: 15, fontWeight: '600', color: t.accent, paddingVertical: 8 },
});
