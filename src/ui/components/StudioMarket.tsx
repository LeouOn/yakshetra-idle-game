import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TEA_COST, SUPPLIES_COST, type MarketPurchase } from '@/engine/market';
import { formatSid, resolveSid } from '@/i18n';
import { studioTheme as t } from '@/ui/studio-theme';

interface Props {
  readonly copper: number;
  readonly receipt: { readonly id: number; readonly text: string } | null;
  readonly onWork: () => void;
  readonly onBuy: (purchase: MarketPurchase) => void;
}
export default function StudioMarket({ copper, receipt, onWork, onBuy }: Props) {
  return (
    <View testID="studio-market" style={styles.panel}>
      <Text testID="market-wallet" accessibilityRole="header" style={styles.wallet}>
        {formatSid('studio.market_wallet_sid', { n: copper })}
      </Text>
      <Text style={styles.hint}>{resolveSid('studio.market_intro_sid')}</Text>
      <Pressable role="button" testID="market-work" onPress={onWork} style={styles.button}>
        <Text style={styles.label}>{resolveSid('studio.market_work_sid')}</Text>
      </Pressable>
      <Text style={styles.hint}>{resolveSid('studio.market_odds_sid')}</Text>
      <View style={styles.choices}>
        {(['tea', 'supplies'] as const).map((purchase) => {
          const cost = purchase === 'tea' ? TEA_COST : SUPPLIES_COST;
          const disabled = copper < cost;
          return (
            <Pressable
              key={purchase}
              role="button"
              testID={`market-${purchase}`}
              disabled={disabled}
              accessibilityState={{ disabled }}
              onPress={() => onBuy(purchase)}
              style={[styles.choice, disabled ? styles.disabled : null]}
            >
              <Text style={styles.label}>
                {formatSid(`studio.market_${purchase}_sid`, { cost })}
              </Text>
              <Text style={styles.hint}>{resolveSid(`studio.market_${purchase}_hint_sid`)}</Text>
            </Pressable>
          );
        })}
      </View>
      <View accessibilityLiveRegion="polite" testID="market-receipt">
        <Text key={receipt?.id ?? 0} style={styles.receipt}>
          {receipt?.text ?? resolveSid('studio.market_receipt_empty_sid')}
        </Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderColor: t.line,
    backgroundColor: t.surface,
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  wallet: { fontSize: 22, fontWeight: '700', color: t.gold },
  hint: { color: t.muted, fontSize: 13, lineHeight: 19 },
  button: {
    minHeight: 48,
    backgroundColor: t.accentDeep,
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
  },
  label: { color: t.text, fontSize: 15, fontWeight: '600' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  choice: {
    flexGrow: 1,
    flexBasis: 220,
    minHeight: 72,
    backgroundColor: t.chip,
    padding: 12,
    gap: 6,
    borderRadius: 8,
  },
  disabled: { backgroundColor: t.disabled },
  receipt: { color: t.harvestText, fontSize: 15, lineHeight: 22 },
});
