import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import { Icons } from '../components/Icons';
import { Pill, ThemeToggle, SectionLabel, Spinner } from '../components/Atoms';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { getBackendUrl } from '../utils/api';
import { io } from 'socket.io-client';

const BASE = getBackendUrl();

const TONE_MAP = { info: 'info', ok: 'ok', warn: 'warn', alert: 'alert', pulse: 'pulse' };

// Normalise action fields — orchestrator and seeded data use different shapes
function normalise(action) {
  return {
    title:     action.target || action.action || action.tool || '—',
    tone:      action.tone || action.details?.tone || action.details?.eta ? 'info' : 'info',
    cost:      action.cost_pkr ?? action.details?.cost ?? 0,
    duration:  action.eta_seconds != null
                 ? `${action.eta_seconds}s`
                 : (action.details?.duration || action.details?.eta || null),
    rationale: action.constraint_notes || action.details?.rationale || null,
    status:    action.status || 'pending',
    tool:      action.tool || action.actionType || null,
  };
}

function statusColor(s) {
  if (s === 'approved' || s === 'completed') return '#6ADE95';
  if (s === 'rejected')                      return '#D45C48';
  if (s === 'modified')                      return '#D4A840';
  return '#867E76';
}

function PlanCard({ plan, index }) {
  const { theme: t } = useTheme();
  const actions    = plan.actions || [];
  const totalCost  = actions.reduce((acc, a) => acc + (a.cost_pkr ?? a.details?.cost ?? 0), 0);
  const BUDGET     = 500000;
  const pct        = Math.round((totalCost / BUDGET) * 100) || 0;
  const isAuto     = plan.scenarioId?.startsWith('AUTO-');
  const skuLabel   = plan.scenarioId?.replace(/^AUTO-/, '').replace(/-\d+$/, '') || plan.scenarioId;

  return (
    <View style={[styles.planBlock, { borderColor: t.line }]}>
      {/* Plan header */}
      <View style={[styles.planHeader, { backgroundColor: t.surface, borderColor: t.line }]}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Pill tone={isAuto ? 'ok' : 'pulse'}>{isAuto ? 'AUTO' : 'MANUAL'}</Pill>
            <Pill tone={plan.status === 'completed' ? 'ok' : plan.status === 'failed' ? 'alert' : 'warn'}>
              {plan.status?.toUpperCase() || 'EXECUTING'}
            </Pill>
          </View>
          <Text style={[styles.planSku, { color: t.text }]}>{skuLabel}</Text>
          <Text style={[styles.planId, { color: t.text3 }]}>{plan.scenarioId}</Text>
        </View>
        <Text style={[styles.planTime, { color: t.text3 }]}>
          {plan.createdAt ? new Date(plan.createdAt).toLocaleTimeString() : ''}
        </Text>
      </View>

      {/* Budget bar */}
      {totalCost > 0 && (
        <View style={[styles.budgetCard, { backgroundColor: t.surface, borderColor: t.line }]}>
          <View style={styles.budgetRow}>
            <Text style={[styles.budgetLabel, { color: t.text3 }]}>Budget used</Text>
            <Text style={[styles.budgetAmt, { color: t.text }]}>
              PKR {totalCost.toLocaleString()}
              <Text style={[styles.budgetOf, { color: t.text3 }]}> / 500,000</Text>
            </Text>
          </View>
          <View style={[styles.barTrack, { backgroundColor: t.line }]}>
            <View style={[styles.barFill, {
              width: `${Math.min(pct, 100)}%`,
              backgroundColor: pct > 80 ? t.alert : t.pulse,
            }]} />
          </View>
          <Text style={[styles.pctLabel, { color: t.text3 }]}>{pct}% of daily cap</Text>
        </View>
      )}

      <SectionLabel right={`${actions.length} steps`}>Action Chain</SectionLabel>

      {actions.map((raw, i) => {
        const a = normalise(raw);
        return (
          <View key={i} style={[styles.actionCard, { backgroundColor: t.surface, borderColor: t.line }]}>
            <View style={styles.actionHeader}>
              <View style={[styles.stepBadge, { backgroundColor: t.pulseDim }]}>
                <Text style={[styles.stepNum, { color: t.pulse }]}>{raw.step || i + 1}</Text>
              </View>
              <Text style={[styles.actionTitle, { color: t.text, flex: 1 }]} numberOfLines={2}>
                {a.title}
              </Text>
              <Pill tone={TONE_MAP[a.tone] || 'info'}>{a.tone}</Pill>
            </View>

            {a.rationale ? (
              <Text style={[styles.rationale, { color: t.text3 }]} numberOfLines={2}>{a.rationale}</Text>
            ) : null}

            <View style={styles.metaRow}>
              {a.cost > 0 && (
                <Text style={[styles.metaTag, { color: t.text3 }]}>PKR {a.cost.toLocaleString()}</Text>
              )}
              {a.duration && (
                <Text style={[styles.metaTag, { color: t.text3 }]}>{a.duration}</Text>
              )}
              {a.tool && (
                <Text style={[styles.metaTag, { color: t.text3, fontFamily: 'monospace' }]}>{a.tool}</Text>
              )}
              <View style={[styles.statusDot, { backgroundColor: statusColor(a.status) }]} />
              <Text style={[styles.metaTag, { color: statusColor(a.status) }]}>{a.status}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function PlansScreen() {
  const { theme: t } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['actionPlans'],
    queryFn: async () => {
      const res = await axios.get(`${BASE}/api/execution/plan`);
      return Array.isArray(res.data) ? res.data : (res.data ? [res.data] : []);
    },
    refetchInterval: 30000,
  });

  // Refetch instantly when orchestrator emits a new plan
  useEffect(() => {
    const socket = io(BASE);
    socket.on('plan_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['actionPlans'] });
    });
    return () => socket.disconnect();
  }, []);

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <View style={[styles.appBar, { backgroundColor: t.bg, borderBottomColor: t.line, paddingTop: insets.top, height: 54 + insets.top }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.appBarSub, { color: t.text3 }]}>ops · action</Text>
          <Text style={[styles.appBarTitle, { color: t.text }]}>
            Active Plans {plans.length > 0 ? `· ${plans.length}` : ''}
          </Text>
        </View>
        <ThemeToggle />
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Spinner color={t.pulse} />
        </View>
      ) : plans.length === 0 ? (
        <View style={styles.empty}>
          <Icons.Box size={36} color={t.text3} />
          <Text style={[styles.emptyTitle, { color: t.text2 }]}>No active plans</Text>
          <Text style={[styles.emptyDesc, { color: t.text3 }]}>
            Plans appear here once a stock breach triggers the agent pipeline.
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {plans.map((plan, i) => (
            <PlanCard key={plan._id || i} plan={plan} index={i} />
          ))}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen:   { flex: 1 },
  appBar:   { paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1 },
  appBarSub:   { fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' },
  appBarTitle: { fontSize: 17, fontWeight: '600', letterSpacing: -0.3 },

  empty:     { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '500' },
  emptyDesc:  { fontSize: 13, textAlign: 'center', lineHeight: 20 },

  planBlock:  { borderBottomWidth: 1, marginBottom: 8, paddingBottom: 8 },
  planHeader: { flexDirection: 'row', alignItems: 'flex-start', margin: 16, marginBottom: 0, borderRadius: 14, borderWidth: 1, padding: 14 },
  planSku:    { fontSize: 15, fontWeight: '700', letterSpacing: -0.2, fontFamily: 'monospace' },
  planId:     { fontSize: 10, marginTop: 2, letterSpacing: 0.3 },
  planTime:   { fontSize: 11 },

  budgetCard: { marginHorizontal: 16, marginTop: 10, borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  budgetRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  budgetLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  budgetAmt:  { fontSize: 14, fontWeight: '600' },
  budgetOf:   { fontSize: 12, fontWeight: '400' },
  barTrack:   { height: 4, borderRadius: 2 },
  barFill:    { height: 4, borderRadius: 2 },
  pctLabel:   { fontSize: 11 },

  actionCard:   { marginHorizontal: 16, marginTop: 8, borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  actionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  stepBadge:    { width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepNum:      { fontSize: 11, fontWeight: '700' },
  actionTitle:  { fontSize: 13.5, fontWeight: '500', lineHeight: 18 },
  rationale:    { fontSize: 12, lineHeight: 17 },
  metaRow:      { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  metaTag:      { fontSize: 11 },
  statusDot:    { width: 6, height: 6, borderRadius: 3 },
});
