import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import { Icons } from '../components/Icons';
import { Pill, ThemeToggle, Avatar, SectionLabel, Spinner } from '../components/Atoms';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { getBackendUrl } from '../utils/api';

export default function AnalystScreen({ navigation }) {
  const { theme: t } = useTheme();
  const insets = useSafeAreaInsets();

  const { data: CRISES = [], isLoading: loadingCrises } = useQuery({
    queryKey: ['crises'],
    queryFn: async () => {
      const res = await axios.get(`${getBackendUrl()}/api/crisis/feed`);
      return res.data;
    }
  });

  const { data: rawTraces = [], isLoading: loadingTraces } = useQuery({
    queryKey: ['traces'],
    queryFn: async () => {
      const res = await axios.get(`${getBackendUrl()}/api/dashboard/traces`);
      return res.data;
    }
  });

  // Format raw backend traces for the summary view
  const RECENT_TRACES = rawTraces.slice(0, 5).map((tr, i) => ({
    id: `run_${tr._id?.substring(0, 5) || i}`,
    crisis: tr.agentName || 'Execution Trace',
    status: tr.action?.includes('Failed') ? 'err' : 'ok', 
    dur: 'N/A', 
    steps: 1
  }));

  const toneColor = (s) => ({ alert: t.alert, warn: t.warn, info: t.info }[s] || t.info);

  return (
    <View style={[styles.screen, { backgroundColor: t.bg, paddingBottom: insets.bottom }]}>
      {/* Top bar */}
      <View style={[styles.topBar, {
        backgroundColor: t.bg, borderBottomColor: t.line,
        paddingTop: insets.top, height: 60 + insets.top,
      }]}>
        <View style={[styles.roleTag, { backgroundColor: t.infoDim, borderColor: t.info }]}>
          <Text style={[styles.roleTagText, { color: t.info }]}>ANALYST</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.barTitle, { color: t.text }]}>Read-only View</Text>
          <Text style={[styles.barSub, { color: t.text3 }]}>karachi-north · 5 sources</Text>
        </View>
        <ThemeToggle />
        <Avatar initials="AN" size={30} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Read-only notice */}
        <View style={[styles.readOnlyBanner, { backgroundColor: t.infoDim, borderColor: t.info }]}>
          <Icons.Lock size={14} color={t.info} />
          <Text style={[styles.readOnlyText, { color: t.info }]}>
            Read-only access · Approvals require Ops Manager or Director
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { v: '1', l: 'critical', color: t.alert },
            { v: '2', l: 'watch',    color: t.warn },
            { v: '1', l: 'resolved', color: t.ok },
          ].map(s => (
            <View key={s.l} style={[styles.statCard, { backgroundColor: t.surface, borderColor: t.line }]}>
              <Text style={[styles.statNum, { color: s.color }]}>{s.v}</Text>
              <Text style={[styles.statLabel, { color: t.text3 }]}>{s.l.toUpperCase()}</Text>
            </View>
          ))}
        </View>

        <SectionLabel right="live · today">Crisis feed</SectionLabel>
        {loadingCrises ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Spinner color={t.pulse} />
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16, gap: 10 }}>
            {CRISES.map((c, i) => {
              const severity = c.stockoutRisk > 70 ? 'alert' : c.stockoutRisk > 30 ? 'warn' : 'info';
              const severityLabel = severity === 'alert' ? 'critical' : severity === 'warn' ? 'watch' : 'resolved';
              return (
                <View key={c._id || i} style={[styles.crisisCard, {
                  backgroundColor: i === 0 ? t.tintAlert : t.surface,
                  borderColor: i === 0 ? t.alert : t.line,
                }]}>
                  <View style={[styles.rail, { backgroundColor: toneColor(severity) }]} />
                  <View style={{ padding: 14, paddingLeft: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <Pill tone={severity}>{severityLabel}</Pill>
                      <Text style={[styles.meta, { color: t.text3 }]}>{c._id?.substring(0, 8) || c.id}</Text>
                      <Text style={[styles.meta, { color: t.text3, marginLeft: 'auto' }]}>Just now</Text>
                    </View>
                    <Text style={[styles.skuName, { color: t.text }]}>{c.sku}</Text>
                    <Text style={[styles.regionText, { color: t.text3 }]}>{c.region}</Text>
                    <Text style={[styles.headline, { color: t.text2 }]}>{c.headline || 'Stockout risk detected'}</Text>
                    <View style={[styles.cardFooter, { borderTopColor: t.line }]}>
                      <Text style={[styles.meta, { color: t.text3 }]}>5 sources · 3 conflicts</Text>
                      <View style={[styles.viewOnly, { backgroundColor: t.infoDim }]}>
                        <Text style={[styles.viewOnlyText, { color: t.info }]}>view only</Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Recent traces */}
        <SectionLabel right="last 24h">Recent traces</SectionLabel>
        {loadingTraces ? (
           <View style={{ padding: 40, alignItems: 'center' }}>
             <Spinner color={t.pulse} />
           </View>
        ) : (
          <View style={{ paddingHorizontal: 16, gap: 8, paddingBottom: 32 }}>
            {RECENT_TRACES.map(r => (
              <TouchableOpacity
                key={r.id}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('AnalystTrace')}
                style={[styles.traceCard, { backgroundColor: t.surface, borderColor: t.line }]}
              >
                <View style={[styles.traceStatus, {
                  backgroundColor: r.status === 'ok' ? t.okDim : t.alertDim,
                }]}>
                  {r.status === 'ok'
                    ? <Icons.Check size={14} color={t.ok} stroke={2.2} />
                    : <Icons.X size={14} color={t.alert} />
                  }
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.traceId, { color: t.text }]}>{r.id}</Text>
                  <Text style={[styles.traceCrisis, { color: t.text3 }]}>{r.crisis}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.meta, { color: t.text2 }]}>{r.dur}</Text>
                  <Text style={[styles.meta, { color: t.text3 }]}>{r.steps} steps</Text>
                </View>
                <Icons.Chevron size={14} color={t.text3} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: {
    paddingHorizontal: 16, paddingBottom: 10,
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    borderBottomWidth: 1, paddingBottom: 10,
  },
  roleTag: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1,
  },
  roleTagText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  barTitle: { fontSize: 15, fontWeight: '600' },
  barSub: { fontSize: 11 },
  readOnlyBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 16, marginBottom: 8, borderRadius: 10, borderWidth: 1, padding: 10,
  },
  readOnlyText: { fontSize: 12, flex: 1 },
  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 4 },
  statCard: { flex: 1, borderRadius: 10, borderWidth: 1, padding: 10 },
  statNum: { fontSize: 22, fontWeight: '500', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase' },
  crisisCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden', position: 'relative' },
  rail: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  meta: { fontSize: 11, letterSpacing: 0.2 },
  skuName: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2, marginBottom: 2 },
  regionText: { fontSize: 12, marginBottom: 6 },
  headline: { fontSize: 13, lineHeight: 18, marginBottom: 10 },
  cardFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth,
  },
  viewOnly: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  viewOnlyText: { fontSize: 10, fontWeight: '600' },
  traceCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 12, borderWidth: 1, padding: 12,
  },
  traceStatus: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  traceId: { fontSize: 13, fontWeight: '600' },
  traceCrisis: { fontSize: 11, marginTop: 2 },
});
