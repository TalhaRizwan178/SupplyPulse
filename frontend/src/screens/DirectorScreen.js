import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import { Icons } from '../components/Icons';
import { Pill, ThemeToggle, Avatar, SectionLabel, Spinner } from '../components/Atoms';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { getBackendUrl } from '../utils/api';

export default function DirectorScreen({ navigation }) {
  const { theme: t } = useTheme();
  const insets = useSafeAreaInsets();
  const [approved, setApproved] = useState({});
  const [rejected, setRejected] = useState({});

  const { data, isLoading } = useQuery({
    queryKey: ['directorDashboard'],
    queryFn: async () => {
      const res = await axios.get(`${getBackendUrl()}/api/dashboard/director`);
      return res.data;
    }
  });

  const ESCALATIONS = (data?.escalations || []).map(e => e.data);
  const BUDGETS = (data?.budgets || []).map(b => b.data);
  const TEAM = (data?.team || []).map(t => t.data);

  const totalUsed = BUDGETS.reduce((s, b) => s + (b.spent || 0), 0);
  const totalCap  = BUDGETS.reduce((s, b) => s + (b.total || 0), 0);
  const pct = totalCap ? Math.round(totalUsed / totalCap * 100) : 0;

  const handleApprove = (id) => setApproved(p => ({ ...p, [id]: true }));
  const handleReject  = (id) => setRejected(p => ({ ...p, [id]: true }));

  return (
    <View style={[styles.screen, { backgroundColor: t.bg, paddingBottom: insets.bottom }]}>
      {/* Top bar */}
      <View style={[styles.topBar, {
        backgroundColor: t.bg, borderBottomColor: t.line,
        paddingTop: insets.top, height: 64 + insets.top,
      }]}>
        <View style={[styles.roleTag, { backgroundColor: t.warnDim, borderColor: t.warn }]}>
          <Text style={[styles.roleTagText, { color: t.warn }]}>DIRECTOR</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.barTitle, { color: t.text }]}>Command Overview</Text>
          <Text style={[styles.barSub, { color: t.text3 }]}>all regions · 4 zones</Text>
        </View>
        <ThemeToggle />
        <Avatar initials="SI" size={30} tone={t.warnDim} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Spinner color={t.pulse} />
          </View>
        ) : (
          <>
            {/* Portfolio budget */}
            <View style={{ padding: 16, paddingBottom: 6 }}>
              <View style={[styles.budgetCard, { backgroundColor: t.surface, borderColor: t.line }]}>
                <View style={styles.budgetRow}>
                  <Text style={[styles.eyebrow, { color: t.text3 }]}>PORTFOLIO BUDGET</Text>
                  <Text style={[styles.meta, { color: t.text3 }]}>{pct}% deployed</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 12 }}>
                  <Text style={[styles.budgetAmount, { color: t.text }]}>PKR {(totalUsed / 1000).toFixed(0)}k</Text>
                  <Text style={[styles.meta, { color: t.text3 }]}>/ {(totalCap / 1000000).toFixed(1)}M cap</Text>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: t.bg2 }]}>
                  <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: pct > 60 ? t.warn : t.pulse }]} />
                </View>
                <View style={styles.budgetMeta}>
                  <View style={[styles.dot, { backgroundColor: t.ok }]} />
                  <Text style={[styles.meta, { color: t.text3 }]}>4 active regions</Text>
                  <View style={[styles.dot, { backgroundColor: t.alert, marginLeft: 12 }]} />
                  <Text style={[styles.meta, { color: t.text3 }]}>4 open crises</Text>
                </View>
              </View>
            </View>

            {/* Escalations */}
            <SectionLabel right={`${ESCALATIONS.length} pending`}>Escalations</SectionLabel>
            <View style={{ paddingHorizontal: 16, gap: 12 }}>
              {ESCALATIONS.map(e => {
                const isApproved = approved[e.id];
                const isRejected = rejected[e.id];
                const resolved = isApproved || isRejected;
                return (
                  <View key={e.id} style={[styles.escCard, {
                    backgroundColor: t.surface,
                    borderColor: resolved ? t.line : (e.severity === 'alert' ? t.alert : t.warn),
                    opacity: resolved ? 0.6 : 1,
                  }]}>
                    {/* Header */}
                    <View style={styles.escHeader}>
                      <Pill tone={e.severity === 'alert' ? 'alert' : 'warn'}>{e.severity}</Pill>
                      <Text style={[styles.meta, { color: t.text3 }]}>{e.id}</Text>
                      <Text style={[styles.meta, { color: t.text3, marginLeft: 'auto' }]}>{e.time} ago</Text>
                    </View>
                    <Text style={[styles.escSku, { color: t.text }]}>{e.sku}</Text>
                    <Text style={[styles.escReason, { color: t.text2 }]}>{e.headline}</Text>

                    {/* Actions */}
                    {resolved ? (
                      <View style={[styles.resolvedBadge, {
                        backgroundColor: isApproved ? t.okDim : t.alertDim,
                      }]}>
                        {isApproved
                          ? <Icons.Check size={14} color={t.ok} stroke={2} />
                          : <Icons.X size={14} color={t.alert} />
                        }
                        <Text style={{ color: isApproved ? t.ok : t.alert, fontSize: 13, fontWeight: '600' }}>
                          {isApproved ? 'Approved by you' : 'Rejected by you'}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.escActions}>
                        <TouchableOpacity
                          onPress={() => handleReject(e.id)}
                          style={[styles.escBtn, { borderColor: t.alert }]}
                        >
                          <Text style={[styles.escBtnText, { color: t.alert }]}>Reject</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleApprove(e.id)}
                          style={[styles.escBtn, styles.escBtnPrimary, { backgroundColor: t.pulse, borderColor: t.pulse, flex: 1.4 }]}
                        >
                          <Icons.Check size={14} color={t.onPulse} stroke={2.2} />
                          <Text style={[styles.escBtnText, { color: t.onPulse }]}>Approve</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Regional budget breakdown */}
            <SectionLabel right="all regions">Budget breakdown</SectionLabel>
            <View style={{ paddingHorizontal: 16, gap: 8 }}>
              {BUDGETS.map((b, i) => {
                const p = b.total ? Math.round((b.spent || 0) / b.total * 100) : 0;
                return (
                  <View key={i} style={[styles.regionCard, { backgroundColor: t.surface, borderColor: t.line }]}>
                    <View style={styles.regionRow}>
                      <Text style={[styles.regionName, { color: t.text }]}>{b.name}</Text>
                      <Text style={[styles.meta, { color: t.text3 }]}>{b.crises || 1} crisis</Text>
                    </View>
                    <View style={styles.regionAmounts}>
                      <Text style={[styles.regionUsed, { color: p > 60 ? t.warn : t.text }]}>
                        PKR {((b.spent || 0) / 1000).toFixed(0)}k
                      </Text>
                      <Text style={[styles.meta, { color: t.text3 }]}>/ {((b.total || 0) / 1000).toFixed(0)}k</Text>
                      <View style={{ flex: 1 }} />
                      <Text style={[styles.meta, { color: p > 60 ? t.warn : t.text3 }]}>{p}%</Text>
                    </View>
                    <View style={[styles.progressTrack, { backgroundColor: t.bg2, marginTop: 8 }]}>
                      <View style={[styles.progressFill, {
                        width: `${p}%`,
                        backgroundColor: p > 60 ? t.warn : t.pulse,
                      }]} />
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Team status */}
            <SectionLabel right="on shift">Team</SectionLabel>
            <View style={{ paddingHorizontal: 16, gap: 8, paddingBottom: 32 }}>
              {TEAM.map((m, i) => (
                <View key={i} style={[styles.teamCard, { backgroundColor: t.surface, borderColor: t.line }]}>
                  <Avatar initials={m.name.substring(0,2).toUpperCase()} size={36} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.teamName, { color: t.text }]}>{m.name}</Text>
                    <Text style={[styles.meta, { color: t.text3 }]}>{m.role}</Text>
                  </View>
                  <Pill tone={m.status === 'online' ? 'ok' : 'ghost'}>
                    {m.status}
                  </Pill>
                </View>
              ))}
            </View>
          </>
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
    borderBottomWidth: 1,
  },
  roleTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  roleTagText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  barTitle: { fontSize: 15, fontWeight: '600' },
  barSub: { fontSize: 11 },
  budgetCard: { borderRadius: 14, borderWidth: 1, padding: 14 },
  budgetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  eyebrow: { fontSize: 10, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  meta: { fontSize: 11, letterSpacing: 0.2 },
  budgetAmount: { fontSize: 26, fontWeight: '600', letterSpacing: -0.5 },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  budgetMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  escCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  escHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  escSku: { fontSize: 16, fontWeight: '600', letterSpacing: -0.2 },
  escReason: { fontSize: 13, lineHeight: 18 },
  escAmount: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 10, borderWidth: 1, padding: 10,
  },
  amountVal: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  resolvedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 10, padding: 10,
  },
  escActions: { flexDirection: 'row', gap: 8 },
  escBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 44, borderRadius: 12, borderWidth: 1,
  },
  escBtnPrimary: {},
  escBtnText: { fontSize: 14, fontWeight: '600' },
  regionCard: { borderRadius: 12, borderWidth: 1, padding: 12 },
  regionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  regionName: { fontSize: 14, fontWeight: '500' },
  regionAmounts: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  regionUsed: { fontSize: 16, fontWeight: '600' },
  teamCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 12, borderWidth: 1, padding: 12,
  },
  teamName: { fontSize: 14, fontWeight: '500' },
});
