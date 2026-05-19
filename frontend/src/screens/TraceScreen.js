import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import { Icons } from '../components/Icons';
import { Pill, ThemeToggle, SectionLabel } from '../components/Atoms';
import useAppStore from '../store/useAppStore';

const AGENT_KIND = {
  'Orchestrator Agent':            { ch: '◇', key: 'plan' },
  'Ingestion Agent':               { ch: '▸', key: 'tool' },
  'Signal Extraction Agent':       { ch: '∼', key: 'reason' },
  'Contradiction Detection Agent': { ch: '⌥', key: 'branch' },
  'Credibility Scoring Agent':     { ch: '∼', key: 'reason' },
  'Conflict Resolution Agent':     { ch: '⌥', key: 'branch' },
  'Insight Synthesis Agent':       { ch: '∼', key: 'reason' },
  'Action Planning Agent':         { ch: '▸', key: 'tool' },
  'Constraint Validator Agent':    { ch: '∼', key: 'reason' },
  'Execution Agent':               { ch: '▸', key: 'tool' },
  'Recovery Agent':                { ch: '⌥', key: 'branch' },
  'Outcome Agent':                 { ch: '◇', key: 'plan' },
};

export default function TraceScreen({ navigation }) {
  const { theme: t } = useTheme();
  const insets = useSafeAreaInsets();
  const agentTraces = useAppStore(state => state.agentTraces);
  const agentStatus = useAppStore(state => state.agentStatus);

  const kindColor = (key) => ({ plan: t.pulse, reason: t.info, tool: t.text2, branch: t.warn }[key] || t.text3);

  const statusTone = (isLast) => {
    if (isLast && agentStatus === 'running') return 'run';
    if (agentStatus === 'failed') return 'err';
    return 'ok';
  };

  const statusColor = (tone) => ({ ok: t.ok, err: t.alert, run: t.info }[tone] || t.text3);

  const isRunning = agentStatus === 'running';
  const hasTraces = agentTraces.length > 0;

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      {/* App bar */}
      <View style={[styles.appBar, { backgroundColor: t.bg, borderBottomColor: t.line, paddingTop: insets.top, height: 54 + insets.top }]}>
        {navigation?.canGoBack?.() && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icons.Back size={20} color={t.text2} />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.appBarSub, { color: t.text3 }]}>antigravity · trace</Text>
          <Text style={[styles.appBarTitle, { color: t.text }]}>
            {hasTraces ? `run_${agentTraces[0]?.timestamp?.toString().slice(-6) || 'live'}` : 'no active run'}
          </Text>
        </View>
        <ThemeToggle />
        {isRunning && <ActivityIndicator color={t.pulse} size="small" />}
      </View>

      {/* Status strip */}
      {hasTraces && (
        <View style={[styles.statusStrip, { backgroundColor: t.surface, borderBottomColor: t.line }]}>
          <Pill tone={agentStatus === 'running' ? 'info' : agentStatus === 'completed' ? 'ok' : agentStatus === 'failed' ? 'alert' : 'info'}>
            {agentStatus}
          </Pill>
          <Text style={[styles.traceCount, { color: t.text3 }]}>{agentTraces.length} events</Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        {!hasTraces ? (
          <View style={styles.empty}>
            <Icons.Trace size={36} color={t.text3} />
            <Text style={[styles.emptyTitle, { color: t.text2 }]}>No trace yet</Text>
            <Text style={[styles.emptyDesc, { color: t.text3 }]}>
              Approve an action plan to start the agent pipeline. Trace events will stream here in real time.
            </Text>
          </View>
        ) : (
          agentTraces.map((trace, i) => {
            const meta = AGENT_KIND[trace.agentName] || { ch: '·', key: 'tool' };
            const isLast = i === agentTraces.length - 1;
            const tone = statusTone(isLast);
            const sc = statusColor(tone);
            const isOrchestrator = trace.agentName === 'Orchestrator Agent';
            return (
              <View
                key={i}
                style={[styles.treeRow, {
                  paddingLeft: 16 + (isOrchestrator ? 0 : 18),
                  borderLeftWidth: 2,
                  borderLeftColor: (isLast && isRunning) ? t.pulse : 'transparent',
                  backgroundColor: (isLast && isRunning) ? t.tintPulseSoft : 'transparent',
                }]}
              >
                <Text style={[styles.kindChar, { color: kindColor(meta.key) }]}>{meta.ch}</Text>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.nodeLabel, { color: tone === 'err' ? t.alert : t.text }]} numberOfLines={1}>
                    {trace.action}
                  </Text>
                  <Text style={[styles.agentName, { color: t.text3 }]}>{trace.agentName}</Text>
                </View>
                <Text style={[styles.dur, { color: t.text3 }]}>
                  {trace.timestamp ? new Date(trace.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}
                </Text>
                <View style={[styles.statusDot, {
                  backgroundColor: sc,
                  shadowColor: tone === 'run' ? sc : 'transparent',
                  shadowRadius: tone === 'run' ? 6 : 0,
                  shadowOpacity: tone === 'run' ? 0.8 : 0,
                }]} />
              </View>
            );
          })
        )}

        {/* Live indicator when running */}
        {isRunning && hasTraces && (
          <View style={[styles.treeRow, { paddingLeft: 16 }]}>
            <ActivityIndicator size="small" color={t.pulse} style={{ width: 14 }} />
            <Text style={[styles.nodeLabel, { color: t.text3 }]}>waiting for next event…</Text>
          </View>
        )}

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
  statusStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1,
  },
  traceCount: { fontSize: 11 },
  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 48, gap: 12, marginTop: 60,
  },
  emptyTitle: { fontSize: 15, fontWeight: '500' },
  emptyDesc: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  treeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 9, paddingRight: 16,
  },
  kindChar: { fontSize: 14, width: 14, textAlign: 'center' },
  nodeLabel: { fontSize: 12.5 },
  agentName: { fontSize: 10.5, marginTop: 1 },
  dur: { fontSize: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
});
