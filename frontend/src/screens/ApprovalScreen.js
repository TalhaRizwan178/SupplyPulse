import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import { Icons } from '../components/Icons';
import { ThemeToggle, SectionLabel, Btn, Spinner } from '../components/Atoms';
import useAppStore from '../store/useAppStore';
import Toast from 'react-native-toast-message';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { getBackendUrl } from '../utils/api';

export default function ApprovalScreen({ navigation }) {
  const { theme: t } = useTheme();
  const insets = useSafeAreaInsets();
  
  const clearTraces = useAppStore(state => state.clearTraces);
  const setAgentStatus = useAppStore(state => state.setAgentStatus);

  const { data: planData, isLoading } = useQuery({
    queryKey: ['actionPlan'],
    queryFn: async () => {
      const res = await axios.get(`${getBackendUrl()}/api/execution/plan`);
      return res.data;
    }
  });

  const ACTIONS = planData?.actions || [];
  const TOTAL = ACTIONS.reduce((acc, act) => acc + (act.details?.cost || 0), 0);
  const BUDGET = 500000;
  const PCT = Math.round((TOTAL / BUDGET) * 100) || 0;

  const toneColor = (tone) => ({
    info: t.info, ok: t.ok, warn: t.warn, alert: t.alert, pulse: t.pulse,
  }[tone] || t.info);
  
  const handleApprove = async () => {
    try {
      clearTraces();
      setAgentStatus('idle');
      
      await fetch(`${getBackendUrl()}/api/agents/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId: 'CRISIS-1142' })
      });
      
      Toast.show({
        type: 'success',
        text1: 'Execution Started',
        text2: 'The autonomous agent is now executing the action chain.',
        position: 'top',
        topOffset: insets.top + 10
      });
      
      navigation.navigate('Execution');
    } catch (error) {
      console.error('Trigger failed', error);
      Toast.show({
        type: 'error',
        text1: 'Execution Failed',
        text2: 'Could not connect to the agent backend.',
        position: 'top',
        topOffset: insets.top + 10
      });
      navigation.navigate('Execution');
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      {/* App bar */}
      <View style={[styles.appBar, { backgroundColor: t.bg, borderBottomColor: t.line, paddingTop: insets.top, height: 54 + insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icons.Back size={20} color={t.text2} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.appBarSub, { color: t.text3 }]}>5-step plan · v3</Text>
          <Text style={[styles.appBarTitle, { color: t.text }]}>Approve action chain</Text>
        </View>
        <ThemeToggle />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Budget envelope */}
        <View style={{ padding: 16, paddingBottom: 6 }}>
          <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.line }]}>
            <View style={styles.budgetRow}>
              <Text style={[styles.eyebrow, { color: t.text3 }]}>BUDGET ENVELOPE</Text>
              <Text style={[styles.pctText, { color: t.text3 }]}>{PCT}% used</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
              <Text style={[styles.budgetAmount, { color: t.text }]}>PKR 313,200</Text>
              <Text style={[styles.metaSmall, { color: t.text3 }]}>/ 500,000 cap</Text>
            </View>
            {/* Progress bar */}
            <View style={[styles.progressTrack, { backgroundColor: t.bg2 }]}>
              <View style={[styles.progressFill, { width: `${PCT}%`, backgroundColor: t.pulse }]} />
              <View style={[styles.capMarker, { backgroundColor: t.warn, left: '80%' }]} />
            </View>
            {/* Checkmarks */}
            <View style={styles.checkRow}>
              {[['budget', 'ok'], ['shelf-life', 'ok'], ['SLA window', 'ok'], ['vendor cap', 'warn']].map(([k, tone]) => (
                <View key={k} style={styles.checkItem}>
                  <View style={[styles.dot, { backgroundColor: tone === 'ok' ? t.ok : t.warn }]} />
                  <Text style={[styles.metaSmall, { color: t.text3 }]}>{k}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <SectionLabel right="serial · with hedge">Action chain</SectionLabel>

        {isLoading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Spinner color={t.pulse} />
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16, marginBottom: 6, position: 'relative' }}>
            {/* Vertical connector line */}
            <View style={[styles.connLine, { backgroundColor: t.line }]} />
            <View style={{ gap: 8 }}>
              {ACTIONS.map(a => (
                <View key={a.step} style={styles.actionRow}>
                  <View style={styles.stepNumWrap}>
                    <View style={[styles.stepNum, {
                      backgroundColor: t.surface, borderColor: toneColor(a.details?.tone || 'info'),
                    }]}>
                      <Text style={[styles.stepNumText, { color: toneColor(a.details?.tone || 'info') }]}>{a.step}</Text>
                    </View>
                  </View>
                  <View style={[styles.actionCard, { backgroundColor: t.surface, borderColor: t.line, flex: 1 }]}>
                    <Text style={[styles.actionTitle, { color: t.text }]}>{a.target}</Text>
                    <View style={styles.actionMeta}>
                      <View style={[styles.execTag, { backgroundColor: t.bg2 }]}>
                        <Text style={[styles.execText, { color: t.text3 }]}>{a.actionType}()</Text>
                      </View>
                      <Text style={[styles.metaSmall, { color: t.text3 }]}>~{a.details?.eta || '2s'}</Text>
                      <View style={{ flex: 1 }} />
                      <Text style={[styles.costText, { color: (a.details?.cost || 0) > 0 ? t.text : t.text3 }]}>
                        {(a.details?.cost || 0) === 0 ? '—' : `${((a.details?.cost || 0) / 1000).toFixed(1)}k`}
                      </Text>
                      {(a.details?.cost || 0) > 0 && <Text style={[styles.metaSmall, { color: t.text3 }]}>PKR</Text>}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ padding: 16, gap: 10 }}>
          <Btn variant="primary" onPress={handleApprove} style={{ width: '100%' }}>
            <Icons.Spark size={14} color={t.onPulse} />
            <Text style={{ color: t.onPulse, fontSize: 15, fontWeight: '600' }}>Approve & execute</Text>
          </Btn>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn style={{ flex: 1 }} onPress={() => {}}>
              <Text style={{ color: t.text, fontSize: 15, fontWeight: '500' }}>Modify</Text>
            </Btn>
            <Btn variant="danger" style={{ flex: 1 }} onPress={() => navigation.goBack()}>
              <Text style={{ color: t.alert, fontSize: 15, fontWeight: '500' }}>Reject</Text>
            </Btn>
          </View>
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
  card: { borderRadius: 14, borderWidth: 1, padding: 14 },
  budgetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  eyebrow: { fontSize: 10, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  pctText: { fontSize: 11 },
  budgetAmount: { fontSize: 22, fontWeight: '600', letterSpacing: -0.5 },
  metaSmall: { fontSize: 11, letterSpacing: 0.2 },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden', position: 'relative' },
  progressFill: { height: '100%', borderRadius: 4 },
  capMarker: { position: 'absolute', top: -3, bottom: -3, width: 1.5 },
  checkRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  connLine: {
    position: 'absolute', left: 16 + 16, top: 16, bottom: 16, width: 1,
  },
  actionRow: { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
  stepNumWrap: { width: 32, alignItems: 'center', paddingTop: 12, zIndex: 1 },
  stepNum: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5,
  },
  stepNumText: { fontSize: 12, fontWeight: '700' },
  actionCard: { borderRadius: 12, borderWidth: 1, padding: 12 },
  actionTitle: { fontSize: 13.5, fontWeight: '500', lineHeight: 19, marginBottom: 6 },
  actionMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  execTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  execText: { fontSize: 10 },
  costText: { fontSize: 12, fontWeight: '500' },
});
