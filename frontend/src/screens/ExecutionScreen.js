import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import { Icons } from '../components/Icons';
import { ThemeToggle, SectionLabel, Spinner, Btn } from '../components/Atoms';
import useAppStore from '../store/useAppStore';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { getBackendUrl } from '../utils/api';

export default function ExecutionScreen({ navigation }) {
  const { theme: t } = useTheme();
  const insets = useSafeAreaInsets();
  
  const agentTraces = useAppStore(state => state.agentTraces);
  const agentStatus = useAppStore(state => state.agentStatus);
  const outcomes = useAppStore(state => state.outcomes);

  const { data: planData, isLoading } = useQuery({
    queryKey: ['actionPlan'],
    queryFn: async () => {
      const res = await axios.get(`${getBackendUrl()}/api/execution/plan`);
      return res.data;
    }
  });

  const STEPS = planData?.actions || [];

  React.useEffect(() => {
    if (agentStatus === 'completed' && outcomes) {
      setTimeout(() => navigation.navigate('Outcomes'), 1500);
    }
  }, [agentStatus, outcomes, navigation]);

  const statusGlyph = (status) => {
    if (status === 'done') return (
      <View style={[styles.statusIcon, { backgroundColor: t.okDim, borderColor: t.ok }]}>
        <Icons.Check size={15} color={t.ok} stroke={2.2} />
      </View>
    );
    if (status === 'running') return (
      <View style={[styles.statusIcon, { backgroundColor: t.infoDim, borderColor: t.info }]}>
        <Spinner size={14} color={t.info} />
      </View>
    );
    return (
      <View style={[styles.statusIcon, { backgroundColor: t.surface, borderColor: t.line }]}>
        <View style={[styles.queuedDot, { backgroundColor: t.text3 }]} />
      </View>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      {/* App bar */}
      <View style={[styles.appBar, { backgroundColor: t.bg, borderBottomColor: t.line, paddingTop: insets.top, height: 54 + insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icons.Back size={20} color={t.text2} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.appBarSub, { color: t.text3 }]}>run_4f2c1 · live</Text>
          <Text style={[styles.appBarTitle, { color: t.text }]}>Executing chain</Text>
        </View>
        <ThemeToggle />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Elapsed strip */}
        <View style={[styles.elapsedStrip, { backgroundColor: t.tintInfo, borderBottomColor: t.line }]}>
          {/* Ring chart */}
          <View style={styles.ringWrap}>
            <Svg width={50} height={50} viewBox="0 0 50 50" style={{ transform: [{ rotate: '-90deg' }] }}>
              <Circle cx="25" cy="25" r="22" stroke={t.line} strokeWidth="3" fill="none" />
              <Circle cx="25" cy="25" r="22" stroke={t.info} strokeWidth="3" fill="none"
                strokeDasharray="138" strokeDashoffset="55" strokeLinecap="round" />
            </Svg>
            <View style={styles.ringCenter}>
              <Text style={[styles.ringPct, { color: t.info }]}>60%</Text>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.elapsed, { color: t.text }]}>
              00:38<Text style={{ color: t.text3 }}>.7</Text>
            </Text>
            <Text style={[styles.elapsedMeta, { color: t.text3 }]}>elapsed · eta 00:54</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Failure')}
            style={[styles.stopBtn, { backgroundColor: 'transparent', borderColor: t.alert }]}
          >
            <Text style={[styles.stopBtnText, { color: t.alert }]}>Stop</Text>
          </TouchableOpacity>
        </View>

        <SectionLabel right="serial">Pipeline</SectionLabel>

        {/* Steps */}
        <View style={{ paddingHorizontal: 16, position: 'relative' }}>
          <View style={[styles.connLine, { backgroundColor: t.line }]} />
          <View style={{ gap: 8 }}>
            {isLoading ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                 <Spinner color={t.pulse} />
              </View>
            ) : STEPS.map(s => {
              // Determine visual status loosely based on traces or running state
              const stepTraceFound = agentTraces.some(tr => tr.action.includes(s.actionType));
              const isDone = agentStatus === 'completed' || stepTraceFound;
              const active = agentStatus === 'running' && !isDone;
              const status = isDone ? 'done' : active ? 'running' : 'queued';
              
              return (
                <View key={s.step} style={styles.stepRow}>
                  <View style={styles.stepIconWrap}>
                    {statusGlyph(status)}
                  </View>
                  <View style={[styles.stepCard, {
                    backgroundColor: active ? t.tintInfoStrong : t.surface,
                    borderColor: active ? t.info : t.line,
                    flex: 1,
                  }]}>
                    <View style={styles.stepHeader}>
                      <Text style={[styles.stepNum, { color: t.text3 }]}>step {s.step}</Text>
                      <Text style={[styles.stepTitle, { color: t.text }]}>{s.target}</Text>
                      <Text style={[styles.stepDur, { color: active ? t.info : t.text3 }]}>{s.details?.eta || '2s'}</Text>
                    </View>
                    <Text style={[styles.stepDetail, { color: t.text2 }]}>{s.actionType}</Text>
                    {active && (
                      <View style={[styles.progressTrack, { backgroundColor: t.bg2, marginTop: 8 }]}>
                        <View style={[styles.progressFill, { width: '74%', backgroundColor: t.info }]} />
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <SectionLabel right="tail -f">Trace log</SectionLabel>
        <View style={{ paddingHorizontal: 16, paddingBottom: 32 }}>
          <View style={[styles.logBox, { backgroundColor: t.bg2, borderColor: t.line }]}>
            {agentTraces.length === 0 && (
               <View style={styles.logLine}>
                 <Text style={[styles.logTime, { color: t.text3 }]}>--:--</Text>
                 <Text style={[styles.logMsg, { color: t.text2 }]}>Waiting for agent connection...</Text>
               </View>
            )}
            {agentTraces.map((trace, i) => {
              const dt = new Date(trace.timestamp);
              const timeStr = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}:${String(dt.getSeconds()).padStart(2, '0')}`;
              return (
                <View key={i} style={styles.logLine}>
                  <Text style={[styles.logTime, { color: t.text3 }]}>{timeStr}</Text>
                  <Text style={[styles.logMsg, { color: trace.action.includes('Failed') || trace.action.includes('Failure') ? t.alert : t.text2 }]}>
                    [{trace.agentName}] {trace.action}
                  </Text>
                </View>
              );
            })}
            <View style={styles.logLine}>
              <Text style={[styles.logTime, { color: t.pulse }]}>{new Date().toLocaleTimeString()}</Text>
              <Text style={[styles.logMsg, { color: t.pulse }]}>{agentStatus === 'completed' ? 'Execution Complete' : '$ _'}</Text>
            </View>
          </View>
        </View>

        {/* Simulate completion */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 32 }}>
          <Btn variant="primary" onPress={() => navigation.navigate('Outcomes')} style={{ width: '100%' }}>
            <Text style={{ color: t.onPulse, fontSize: 15, fontWeight: '600' }}>View outcomes (simulate done)</Text>
          </Btn>
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
  elapsedStrip: {
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: 1,
  },
  ringWrap: { width: 50, height: 50, position: 'relative' },
  ringCenter: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' },
  ringPct: { fontSize: 11, fontWeight: '600' },
  elapsed: { fontSize: 22, fontWeight: '500', letterSpacing: -0.5 },
  elapsedMeta: { fontSize: 11, letterSpacing: 0.2 },
  stopBtn: {
    height: 36, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  stopBtnText: { fontSize: 12, fontWeight: '600' },
  connLine: { position: 'absolute', left: 16 + 16, top: 20, bottom: 20, width: 1 },
  stepRow: { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
  stepIconWrap: { width: 32, alignItems: 'center', paddingTop: 12, zIndex: 1 },
  statusIcon: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  queuedDot: { width: 6, height: 6, borderRadius: 3 },
  stepCard: { borderRadius: 12, borderWidth: 1, padding: 12 },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  stepNum: { fontSize: 10, letterSpacing: 0.3 },
  stepTitle: { flex: 1, fontSize: 13.5, fontWeight: '500' },
  stepDur: { fontSize: 11 },
  stepDetail: { fontSize: 11, lineHeight: 16 },
  progressTrack: { height: 3, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  logBox: { borderRadius: 12, borderWidth: 1, padding: 10, gap: 2 },
  logLine: { flexDirection: 'row', gap: 8 },
  logTime: { fontSize: 10.5, width: 64 },
  logMsg: { fontSize: 10.5, flex: 1 },
});
