import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path, Line, Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import { Icons } from '../components/Icons';
import { Pill, ThemeToggle, SectionLabel, Btn, Spinner } from '../components/Atoms';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { getBackendUrl } from '../utils/api';

export default function OutcomesScreen({ navigation }) {
  const { theme: t } = useTheme();
  const insets = useSafeAreaInsets();

  const { data: outcomeData, isLoading } = useQuery({
    queryKey: ['outcomes'],
    queryFn: async () => {
      const res = await axios.get(`${getBackendUrl()}/api/execution/outcomes`);
      return res.data;
    }
  });

  const STATS = outcomeData?.stats || [];

  const toneColor = (tone) => ({ ok: t.ok, warn: t.warn, alert: t.alert, up: t.ok, down: t.info }[tone] || t.ok);

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      {/* App bar */}
      <View style={[styles.appBar, { backgroundColor: t.bg, borderBottomColor: t.line, paddingTop: insets.top, height: 54 + insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icons.Back size={20} color={t.text2} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.appBarSub, { color: t.text3 }]}>run_4f2c1 · resolved</Text>
          <Text style={[styles.appBarTitle, { color: t.text }]}>Outcomes</Text>
        </View>
        <ThemeToggle />
        <Icons.Dots size={18} color={t.text2} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: t.tintPulse }]}>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <Pill tone="ok">resolved</Pill>
            <Pill tone="ghost">4m 12s</Pill>
          </View>
          <Text style={[styles.eyebrow, { color: t.text3 }]}>REVENUE PROTECTED</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <Text style={[styles.revenueLabel, { color: t.text }]}>PKR</Text>
            <Text style={[styles.revenueAmount, { color: t.ok }]}>4.8M</Text>
          </View>
          <Text style={[styles.heroSub, { color: t.text2 }]}>
            38 retailers protected · 1 SKU stabilized · 1 recovery
          </Text>
        </View>

        <SectionLabel right="vs. predicted no-op">Before → After</SectionLabel>

        {/* Stat cards */}
        {isLoading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Spinner color={t.pulse} />
          </View>
        ) : (
          <View style={styles.statsGrid}>
            {STATS.map((s, i) => (
              <View key={i} style={[styles.statCard, { backgroundColor: t.surface, borderColor: t.line }]}>
                <Text style={[styles.statLabel, { color: t.text3 }]}>{s.label}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
                  <Text style={[styles.statValue, { color: t.text }]}>{s.newValue}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.statBefore, { color: t.text3 }]}>{s.oldValue}</Text>
                  <Icons.ArrowRight size={10} color={t.text3} />
                  <Text style={[styles.statDelta, { color: toneColor(s.type) }]}>
                    {s.delta}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Sparkline */}
        <SectionLabel right="48h horizon">Stock-on-hand projection</SectionLabel>
        <View style={{ paddingHorizontal: 16 }}>
          <View style={[styles.chartCard, { backgroundColor: t.surface, borderColor: t.line }]}>
            <Svg width="100%" height={92} viewBox="0 0 300 92" preserveAspectRatio="none">
              {/* Gridlines */}
              {[0, 23, 46, 69, 92].map(y => (
                <Line key={y} x1="0" y1={y} x2="300" y2={y} stroke={t.line} strokeWidth="0.5" />
              ))}
              {/* No-op forecast (dashed, dropping) */}
              <Path d="M0 30 L60 38 L120 55 L180 76 L240 88 L300 90"
                fill="none" stroke={t.alert} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.7" />
              {/* With-pulse (solid, recovering) */}
              <Path d="M0 30 L60 36 L80 60 L100 30 L160 22 L220 18 L300 16"
                fill="none" stroke={t.ok} strokeWidth="2" strokeLinecap="round" />
              <Circle cx="90" cy="45" r="3" fill={t.alert} />
              <Line x1="90" y1="45" x2="90" y2="92" stroke={t.alert} strokeWidth="0.5" strokeDasharray="2 2" />
            </Svg>
            <View style={styles.chartAxis}>
              {['now', '+12h', '+24h', '+48h'].map(l => (
                <Text key={l} style={[styles.axisLabel, { color: t.text3 }]}>{l}</Text>
              ))}
            </View>
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendLine, { backgroundColor: t.ok }]} />
                <Text style={[styles.legendLabel, { color: t.text3 }]}>with SupplyPulse</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendLine, { backgroundColor: t.alert, opacity: 0.7 }]} />
                <Text style={[styles.legendLabel, { color: t.text3 }]}>no-op forecast</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Footer actions */}
        <View style={{ padding: 16, paddingBottom: 32, gap: 8 }}>
          <Btn onPress={() => navigation.navigate('Trace')} style={{ width: '100%' }}>
            <Icons.Trace size={14} color={t.text2} />
            <Text style={{ color: t.text, fontSize: 15, fontWeight: '500' }}>Open full trace</Text>
          </Btn>
          <Text style={[styles.auditLog, { color: t.text3 }]}>
            Audit log · <Text style={{ color: t.text2 }}>run_4f2c1.json</Text>
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  appBar: {
    height: 54, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 2, marginRight: 2 },
  appBarSub: { fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' },
  appBarTitle: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
  hero: { padding: 20, paddingBottom: 16 },
  eyebrow: { fontSize: 10, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  revenueLabel: { fontSize: 28, fontWeight: '600', letterSpacing: -0.5 },
  revenueAmount: { fontSize: 40, fontWeight: '600', letterSpacing: -1.5 },
  heroSub: { fontSize: 13, marginTop: 4 },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: 16,
  },
  statCard: {
    width: '47%', borderRadius: 12, borderWidth: 1, padding: 12,
  },
  statLabel: { fontSize: 10, letterSpacing: 0.3, marginBottom: 6 },
  statValue: { fontSize: 22, fontWeight: '600', letterSpacing: -0.5 },
  statUnit: { fontSize: 11 },
  statBefore: { fontSize: 11, textDecorationLine: 'line-through' },
  statDelta: { fontSize: 11, fontWeight: '600' },
  chartCard: { borderRadius: 14, borderWidth: 1, padding: 14 },
  chartAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  axisLabel: { fontSize: 10 },
  legend: { flexDirection: 'row', gap: 14, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendLine: { width: 14, height: 2, borderRadius: 1 },
  legendLabel: { fontSize: 10 },
  auditLog: { fontSize: 12, textAlign: 'center' },
});
