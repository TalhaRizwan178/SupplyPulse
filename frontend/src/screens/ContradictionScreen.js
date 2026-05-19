import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import { Icons } from '../components/Icons';
import { ThemeToggle, SectionLabel, Btn, Spinner } from '../components/Atoms';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { getBackendUrl } from '../utils/api';

export default function ContradictionScreen({ navigation, route }) {
  const { theme: t } = useTheme();
  const insets = useSafeAreaInsets();
  
  const crisisId = route?.params?.crisisId;

  const { data: contradictions = [], isLoading } = useQuery({
    queryKey: ['contradictions', crisisId],
    queryFn: async () => {
      // Default fallback if not passed for mock UI purposes
      const id = crisisId || 'CRISIS-1142';
      const res = await axios.get(`${getBackendUrl()}/api/crisis/${id}/contradictions`);
      return res.data;
    }
  });

  const toneColor = (tone) => ({ info: t.info, ok: t.ok, warn: t.warn, alert: t.alert }[tone] || t.info);
  const toneDim   = (tone) => ({ info: t.infoDim, ok: t.okDim, warn: t.warnDim, alert: t.alertDim }[tone] || t.infoDim);

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      {/* App bar */}
      <View style={[styles.appBar, { backgroundColor: t.bg, borderBottomColor: t.line, paddingTop: insets.top, height: 54 + insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icons.Back size={20} color={t.text2} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.appBarSub, { color: t.text3 }]}>conflict 1 of 3</Text>
          <Text style={[styles.appBarTitle, { color: t.text }]}>Stock on hand</Text>
        </View>
        <ThemeToggle />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Question */}
        <View style={{ padding: 18, paddingBottom: 6 }}>
          <Text style={[styles.eyebrow, { color: t.text3 }]}>THREE SOURCES DISAGREE</Text>
          <Text style={[styles.question, { color: t.text2 }]}>
            How many units of{' '}
            <Text style={{ color: t.text, fontWeight: '600' }}>Lays Masala 70g</Text>
            {' '}are on hand right now?
          </Text>
        </View>

        {/* Claims */}
        <View style={{ paddingHorizontal: 16, gap: 8, marginBottom: 4 }}>
          {isLoading ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Spinner color={t.pulse} />
            </View>
          ) : (
            contradictions.map((c, i) => (
              <View key={c._id || i} style={[styles.claimCard, { backgroundColor: t.surface, borderColor: t.line }]}>
                {/* weight bar behind */}
                <View style={[styles.weightBar, { width: `50%`, backgroundColor: toneDim(c.severity || 'info') }]} />
                <View style={styles.claimContent}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.claimSrc, { color: toneColor(c.severity || 'info') }]}>{c.dimension}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                      <Text style={[styles.claimValue, { color: t.text }]}>{c.sources.join(', ')}</Text>
                    </View>
                    <Text style={[styles.claimMeta, { color: t.text3 }]}>
                      {c.snippet}
                    </Text>
                    <Text style={[styles.claimMeta, { color: t.warn }]}>
                      {c.impact}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Reasoning trace */}
        <SectionLabel right="weighted-bayes">Reasoning trace</SectionLabel>
        <View style={{ paddingHorizontal: 16 }}>
          <View style={[styles.traceBox, { backgroundColor: t.bg2, borderColor: t.line }]}>
            <Text style={[styles.traceLine, { color: t.info }]}>→ <Text style={{ color: t.info }}>credibility</Text><Text style={{ color: t.text2 }}>(pos.feed) = 0.89 // freshness 8s</Text></Text>
            <Text style={[styles.traceLine, { color: t.text2 }]}>→ credibility(warehouse) = 0.62 // 3h lag</Text>
            <Text style={[styles.traceLine, { color: t.text2 }]}>→ supplier.email: NLP-extracted, low precision</Text>
            <Text style={[styles.traceLine, { color: t.text3 }]}>→ apply soft-weighted average + freshness decay</Text>
            <Text style={[styles.traceLine, { color: t.pulse }]}>→ resolved = 168u (95% CI: 152-184)</Text>
          </View>
        </View>

        {/* Resolution */}
        <View style={{ padding: 16 }}>
          <View style={[styles.resolution, { backgroundColor: t.tintPulse, borderColor: t.pulse }]}>
            <Text style={[styles.resolutionEyebrow, { color: t.pulse }]}>AGENT RESOLUTION</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
              <Text style={[styles.resolutionValue, { color: t.text }]}>168</Text>
              <Text style={[styles.resolutionUnit, { color: t.text3 }]}>units on hand</Text>
            </View>
            <Text style={[styles.resolutionMeta, { color: t.text3 }]}>95% CI · 152 – 184 · 0.91 confidence</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Btn style={{ flex: 1 }} onPress={() => navigation.goBack()}>
            <Text style={{ color: t.text, fontSize: 15, fontWeight: '600' }}>Override</Text>
          </Btn>
          <Btn variant="primary" style={{ flex: 1.4 }} onPress={() => navigation.navigate('Approval')}>
            <Text style={{ color: t.onPulse, fontSize: 15, fontWeight: '600' }}>Accept & continue</Text>
          </Btn>
        </View>
        <View style={{ height: 32 }} />
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
  eyebrow: { fontSize: 10, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  question: { fontSize: 16, lineHeight: 24 },
  claimCard: {
    borderRadius: 12, borderWidth: 1, overflow: 'hidden', position: 'relative',
  },
  weightBar: { position: 'absolute', top: 0, left: 0, bottom: 0, opacity: 0.4 },
  claimContent: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  claimSrc: { fontSize: 11, fontWeight: '600', marginBottom: 2, letterSpacing: 0.3 },
  claimValue: { fontSize: 26, fontWeight: '600', letterSpacing: -0.5 },
  claimUnit: { fontSize: 11, letterSpacing: 0.2 },
  claimMeta: { fontSize: 11, marginTop: 4, letterSpacing: 0.2 },
  credScore: { fontSize: 18, fontWeight: '600' },
  credLabel: { fontSize: 10 },
  traceBox: {
    borderRadius: 12, borderWidth: 1, padding: 12, gap: 2,
  },
  traceLine: { fontSize: 11, lineHeight: 18 },
  resolution: { borderRadius: 14, borderWidth: 1, padding: 14 },
  resolutionEyebrow: { fontSize: 10, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  resolutionValue: { fontSize: 36, fontWeight: '600', letterSpacing: -1 },
  resolutionUnit: { fontSize: 13 },
  resolutionMeta: { fontSize: 11, letterSpacing: 0.2 },
  actions: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
});
