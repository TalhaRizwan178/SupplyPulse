import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import { Icons } from '../components/Icons';
import { Spinner, Btn } from '../components/Atoms';

export default function FailureScreen({ navigation }) {
  const { theme: t } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      {/* Faded backdrop */}
      <View style={[styles.appBar, { opacity: 0.35, borderBottomColor: t.line, paddingTop: insets.top, height: 54 + insets.top }]}>
        <Icons.Back size={20} color={t.text2} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.appBarSub, { color: t.text3 }]}>run_4f2c1 · paused</Text>
          <Text style={[styles.appBarTitle, { color: t.text }]}>Executing chain</Text>
        </View>
      </View>
      <View style={{ flex: 1, opacity: 0.2, padding: 16, gap: 8 }}>
        {[1, 2, 3].map(i => (
          <View key={i} style={[styles.fadedCard, { backgroundColor: t.surface, borderColor: t.line }]} />
        ))}
      </View>

      {/* Dim overlay */}
      <View style={[styles.dimOverlay, { backgroundColor: t.backdrop }]} />

      {/* Modal card */}
      <View style={[styles.modal, { backgroundColor: t.surface, borderColor: t.alert }]}>
        {/* Header */}
        <View style={[styles.modalHeader, { backgroundColor: t.alertDim, borderBottomColor: t.line }]}>
          <View style={[styles.alertIcon, { backgroundColor: t.alertDim, borderColor: t.alert }]}>
            <Icons.Warn size={18} color={t.alert} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.modalTitle, { color: t.text }]}>Step 2 failed</Text>
            <Text style={[styles.modalSub, { color: t.text3 }]}>tools.po.create · 11.4s elapsed</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icons.X size={18} color={t.text3} />
          </TouchableOpacity>
        </View>

        <View style={{ padding: 16, gap: 14 }}>
          {/* Error block */}
          <View style={[styles.errorBlock, { backgroundColor: t.bg2, borderColor: t.line }]}>
            <Text style={[styles.mono, { color: t.text3 }]}>// pepsi.direct returned</Text>
            <Text style={[styles.mono, { color: t.alert }]}>HTTP 503 — service_unavailable</Text>
            <Text style={[styles.mono, { color: t.text2 }]}>"warehouse offline · ETA 4h"</Text>
          </View>

          {/* Recovery banner */}
          <View style={[styles.recoveryBanner, { backgroundColor: t.tintPulseSoft, borderColor: t.pulse }]}>
            <Spinner size={14} color={t.pulse} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.recoveryTitle, { color: t.text }]}>Antigravity is rerouting</Text>
              <Text style={[styles.recoverySub, { color: t.text3 }]}>picking hedge supplier · 2.1s</Text>
            </View>
          </View>

          {/* Plan diff */}
          <Text style={[styles.eyebrow, { color: t.text3 }]}>PLAN DIFF</Text>
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Text style={[styles.mono, { color: t.alert }]}>−</Text>
              <Text style={[styles.mono, { color: t.text3, textDecorationLine: 'line-through', flex: 1 }]}>
                po.create(supplier_a, 400u, 312k)
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Text style={[styles.mono, { color: t.ok }]}>+</Text>
              <Text style={[styles.mono, { color: t.text, flex: 1 }]}>
                po.create(<Text style={{ color: t.pulse }}>supplier_b</Text>, 400u, <Text style={{ color: t.warn }}>320k</Text>)
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Text style={[styles.mono, { color: t.ok }]}>+</Text>
              <Text style={[styles.mono, { color: t.text, flex: 1 }]}>
                notify.ops(<Text style={{ color: t.text2 }}>"sup_a outage · fallback"</Text>)
              </Text>
            </View>
          </View>

          {/* Cost delta */}
          <View style={[styles.costDelta, { backgroundColor: t.bg2, borderColor: t.line }]}>
            <Text style={[styles.metaSmall, { color: t.text3 }]}>cost Δ</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icons.ArrowUp color={t.warn} />
              <Text style={[styles.deltaAmount, { color: t.warn }]}>+PKR 8,000</Text>
            </View>
            <View style={{ flex: 1 }} />
            <Text style={[styles.metaSmall, { color: t.text3 }]}>still under cap</Text>
          </View>

          {/* Buttons */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn style={{ flex: 1 }} onPress={() => navigation.goBack()}>
              <Text style={{ color: t.text, fontSize: 15, fontWeight: '600' }}>Pause</Text>
            </Btn>
            <Btn variant="primary" style={{ flex: 1.6 }} onPress={() => navigation.navigate('Execution')}>
              <Text style={{ color: t.onPulse, fontSize: 15, fontWeight: '600' }}>Continue</Text>
              <Icons.ArrowRight size={14} color={t.onPulse} stroke={2} />
            </Btn>
          </View>
        </View>
      </View>
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
  appBarSub: { fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' },
  appBarTitle: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
  fadedCard: { height: 64, borderRadius: 12, borderWidth: 1 },
  dimOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  modal: {
    position: 'absolute', left: 12, right: 12, top: 80,
    borderRadius: 18, borderWidth: 1, overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderBottomWidth: 1,
  },
  alertIcon: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  modalTitle: { fontSize: 15, fontWeight: '600' },
  modalSub: { fontSize: 11, letterSpacing: 0.2, marginTop: 1 },
  errorBlock: {
    borderRadius: 10, borderWidth: 1, padding: 12, gap: 2,
  },
  mono: { fontSize: 11, lineHeight: 18 },
  recoveryBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 10, borderWidth: 1, padding: 10,
  },
  recoveryTitle: { fontSize: 12.5, fontWeight: '500' },
  recoverySub: { fontSize: 11, marginTop: 1 },
  eyebrow: { fontSize: 10, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  costDelta: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 10, borderRadius: 10, borderWidth: 1,
  },
  deltaAmount: { fontSize: 16, fontWeight: '500' },
  metaSmall: { fontSize: 11, letterSpacing: 0.2 },
});
