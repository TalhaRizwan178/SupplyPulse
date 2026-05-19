import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import { Icons } from '../components/Icons';
import { Pill, ThemeToggle, SectionLabel, Card, Btn, Spinner } from '../components/Atoms';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { getBackendUrl } from '../utils/api';

export default function DetailScreen({ navigation, route }) {
  const { theme: t } = useTheme();
  const insets = useSafeAreaInsets();
  const crisisParam = route?.params?.crisis || {};

  const { data, isLoading } = useQuery({
    queryKey: ['crisis', crisisParam._id],
    queryFn: async () => {
      if (!crisisParam._id) return null;
      const res = await axios.get(`${getBackendUrl()}/api/crisis/${crisisParam._id}`);
      return res.data;
    },
    enabled: !!crisisParam._id
  });

  const crisis = data?.crisis || crisisParam;
  const SOURCES = data?.sources || [];

  const toneColor = (tone) => ({
    info: t.info, ok: t.ok, warn: t.warn, alert: t.alert,
  }[tone] || t.info);

  const toneDim = (tone) => ({
    info: t.infoDim, ok: t.okDim, warn: t.warnDim, alert: t.alertDim,
  }[tone] || t.infoDim);

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      {/* App bar */}
      <View style={[styles.appBar, { backgroundColor: t.bg, borderBottomColor: t.line, paddingTop: insets.top, height: 54 + insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icons.Back size={20} color={t.text2} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.appBarSub, { color: t.text3 }]}>cr-1142 · 47 min ago</Text>
          <Text style={[styles.appBarTitle, { color: t.text }]}>Crisis detail</Text>
        </View>
        <ThemeToggle />
        <Icons.Dots size={18} color={t.text2} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: t.tintAlert }]}>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
            <Pill tone="alert">critical</Pill>
            <Pill tone="ghost">stockout risk</Pill>
          </View>
          <Text style={[styles.heroTitle, { color: t.text }]}>Lays Masala 70g</Text>
          <Text style={[styles.heroSub, { color: t.text2 }]}>Karachi · North region · 38 retailers affected</Text>

          {/* Mini stats */}
          <View style={styles.miniStats}>
            {[
              { l: 'Days of cover', v: '1.4', sub: 'd', color: t.alert },
              { l: 'Stockout risk', v: '78',  sub: '%', color: t.alert },
              { l: 'Rev. exposed',  v: '4.8', sub: 'M PKR', color: t.warn },
            ].map(s => (
              <View key={s.l} style={[styles.statCard, { backgroundColor: t.surface, borderColor: t.line }]}>
                <Text style={[styles.statLabel, { color: t.text3 }]}>{s.l}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                  <Text style={[styles.statValue, { color: s.color }]}>{s.v}</Text>
                  <Text style={[styles.statSub, { color: t.text3 }]}>{s.sub}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {isLoading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Spinner color={t.pulse} />
          </View>
        ) : (
          <>
            <SectionLabel right={`updated 09:24`}>Source ingest · {SOURCES.length}</SectionLabel>

            <View style={{ paddingHorizontal: 16, gap: 8 }}>
              {SOURCES.map(s => (
                <View key={s._id || s.sourceId} style={[styles.sourceCard, { backgroundColor: t.surface, borderColor: t.line }]}>
                  <View style={[styles.sourceId, { backgroundColor: toneDim(s.tone) }]}>
                    <Text style={[styles.sourceIdText, { color: toneColor(s.tone) }]}>{s.sourceId}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.sourceLabel, { color: t.text2 }]}>{s.label}</Text>
                    <Text style={[styles.sourceSnippet, { color: t.text3 }]} numberOfLines={1}>{s.snippet}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.credValue, { color: t.text2 }]}>{(s.credibility || 0).toFixed(2)}</Text>
                    <Text style={[styles.credLabel, { color: t.text3 }]}>cred</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Contradictions banner */}
            <View style={{ padding: 16 }}>
              <TouchableOpacity
                onPress={() => navigation.navigate('Contradiction')}
                activeOpacity={0.8}
                style={[styles.contradictionBanner, { backgroundColor: t.tintWarn, borderColor: t.warn }]}
              >
                <View style={[styles.warnIcon, { backgroundColor: t.warnDim }]}>
                  <Icons.Warn size={18} color={t.warn} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.warnTitle, { color: t.text }]}>3 contradictions detected</Text>
                  <Text style={[styles.warnSub, { color: t.text2 }]}>stock count · ETA · velocity</Text>
                </View>
                <Icons.Chevron color={t.warn} />
              </TouchableOpacity>
            </View>

            <View style={{ paddingHorizontal: 16, paddingBottom: 32 }}>
              <Btn variant="primary" onPress={() => navigation.navigate('Contradiction')} style={{ width: '100%' }}>
                <Text style={[styles.btnLabel, { color: t.onPulse }]}>Resolve conflicts</Text>
                <Icons.ArrowRight size={14} color={t.onPulse} stroke={2} />
              </Btn>
            </View>
          </>
        )}
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
  hero: { padding: 18, paddingBottom: 14 },
  heroTitle: { fontSize: 22, fontWeight: '600', letterSpacing: -0.5, lineHeight: 28 },
  heroSub: { fontSize: 13, marginTop: 4, marginBottom: 14 },
  miniStats: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 10 },
  statLabel: { fontSize: 10, letterSpacing: 0.3, marginBottom: 3 },
  statValue: { fontSize: 20, fontWeight: '500', letterSpacing: -0.5 },
  statSub: { fontSize: 10 },
  sourceCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 12, borderWidth: 1, padding: 10,
  },
  sourceId: {
    width: 30, height: 30, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  sourceIdText: { fontSize: 11, fontWeight: '700' },
  sourceLabel: { fontSize: 12, fontWeight: '500', marginBottom: 2 },
  sourceSnippet: { fontSize: 12 },
  credValue: { fontSize: 11, fontWeight: '600' },
  credLabel: { fontSize: 10 },
  contradictionBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 14,
  },
  warnIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  warnTitle: { fontSize: 14, fontWeight: '600' },
  warnSub: { fontSize: 12, marginTop: 2 },
  btnLabel: { fontSize: 15, fontWeight: '600' },
});
