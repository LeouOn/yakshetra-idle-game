// About screen — front-matter disclaimer, lineage notes, glossary, sources.
//
// Pure presentational component. All visible text flows through `@/i18n` string
// ids (`about.*`). Lineage notes use the hardcoded fallback string in en.json;
// when real era packs ship, the era-specific `lineage_notes_sid` will layer on
// top (todo 16/21).
//
// Design constraints (plan todo 28): NO claim of doctrinal authority. The
// disclaimer is explicit that this is fiction inspired by, not a teaching of,
// any lineage.

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { resolveSid } from '@/i18n';
import { studioTheme as t } from '@/ui/studio-theme';

/** Ordered glossary term keys (≥10 per plan). Each has a term + definition SID. */
const GLOSSARY_KEYS: readonly string[] = [
  'parami',
  'lens',
  'intent_root',
  'karmic_echo',
  'bardo',
  'life_chain',
  'era_pack',
  'rule_variation',
  'narrative_seed',
  'content_warning',
  'social_identity',
];

/** Ordered bibliography entry keys (5 per plan). */
const BIBLIOGRAPHY_KEYS: readonly string[] = [
  'entry_1',
  'entry_2',
  'entry_3',
  'entry_4',
  'entry_5',
];

export interface AboutViewProps {
  /** Optional back navigation (the route wires `router.back()`). */
  readonly onBack?: () => void;
}

export default function AboutView({ onBack }: AboutViewProps) {
  return (
    <ScrollView
      testID="about-screen"
      role="main"
      style={styles.scroll}
      contentContainerStyle={styles.container}
    >
      <Text accessibilityRole="header" style={styles.title}>
        {resolveSid('about.title_sid')}
      </Text>

      {onBack !== undefined ? (
        <Pressable
          testID="about-back"
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.backButton}
          onPress={onBack}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
      ) : null}

      {/* Front-matter disclaimer */}
      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionHeading}>
          {resolveSid('about.disclaimer_heading_sid')}
        </Text>
        <Text
          testID="about-disclaimer-body"
          accessibilityLabel={resolveSid('about.disclaimer_body_sid')}
          style={styles.body}
        >
          {resolveSid('about.disclaimer_body_sid')}
        </Text>
      </View>

      {/* Lineage notes (hardcoded fallback; era packs layer on top later) */}
      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionHeading}>
          {resolveSid('about.lineage_heading_sid')}
        </Text>
        <Text
          testID="about-lineage-body"
          accessibilityLabel={resolveSid('about.lineage_body_sid')}
          style={styles.body}
        >
          {resolveSid('about.lineage_body_sid')}
        </Text>
      </View>

      {/* Glossary */}
      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionHeading}>
          {resolveSid('about.glossary_heading_sid')}
        </Text>
        <View style={styles.glossaryList}>
          {GLOSSARY_KEYS.map((key) => {
            const term = resolveSid(`about.glossary.${key}_term_sid`);
            const definition = resolveSid(`about.glossary.${key}_definition_sid`);
            return (
              <View key={key} style={styles.glossaryItem} testID={`about-glossary-${key}`}>
                <Text style={styles.glossaryTerm}>{term}</Text>
                <Text
                  accessibilityLabel={`${term}: ${definition}`}
                  style={styles.glossaryDefinition}
                >
                  {definition}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Source bibliography */}
      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionHeading}>
          {resolveSid('about.bibliography_heading_sid')}
        </Text>
        <View style={styles.bibliographyList}>
          {BIBLIOGRAPHY_KEYS.map((key, idx) => {
            const citation = resolveSid(`about.bibliography.${key}_sid`);
            return (
              <Text
                key={key}
                testID={`about-biblio-${idx + 1}`}
                accessibilityLabel={citation}
                style={styles.bibliographyEntry}
              >
                {citation}
              </Text>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: t.bg },
  container: { paddingHorizontal: 24, paddingVertical: 28, gap: 28 },
  title: { fontSize: 26, fontWeight: '700', color: t.text },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: t.line,
  },
  backButtonText: { fontSize: 14, fontWeight: '600', color: t.text },
  section: { gap: 10 },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'uppercase',
    opacity: 0.8,
    color: t.gold,
  },
  body: { fontSize: 15, lineHeight: 22, color: t.text },
  glossaryList: { gap: 12 },
  glossaryItem: { gap: 2 },
  glossaryTerm: { fontSize: 15, fontWeight: '700', color: t.text },
  glossaryDefinition: { fontSize: 14, lineHeight: 20, opacity: 0.8, color: t.muted },
  bibliographyList: { gap: 8 },
  bibliographyEntry: { fontSize: 13, lineHeight: 19, opacity: 0.75, color: t.muted },
});
