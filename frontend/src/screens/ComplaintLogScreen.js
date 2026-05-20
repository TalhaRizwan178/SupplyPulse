import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import { Icons } from '../components/Icons';
import { getBackendUrl } from '../utils/api';
import useAppStore from '../store/useAppStore';
import Toast from 'react-native-toast-message';

const BASE = getBackendUrl();
const CHANNELS = ['Phone', 'WhatsApp', 'Walk-in', 'Email'];

export default function ComplaintLogScreen() {
  const { theme: t } = useTheme();
  const insets = useSafeAreaInsets();
  const authToken = useAppStore(s => s.authToken);
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` };

  const [stocks, setStocks] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [sku, setSku] = useState('');
  const [outlet, setOutlet] = useState('');
  const [channel, setChannel] = useState('Phone');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch(`${BASE}/api/stock`, { headers }).then(r => r.json()).then(d => {
      if (Array.isArray(d)) setStocks(d);
    }).catch(() => {});

    loadComplaints();
  }, []);

  const loadComplaints = () => {
    setLoading(true);
    fetch(`${BASE}/api/complaints`, { headers })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setComplaints(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const submit = async () => {
    if (!sku) { Toast.show({ type: 'error', text1: 'Select a SKU' }); return; }
    if (!message.trim()) { Toast.show({ type: 'error', text1: 'Enter complaint message' }); return; }

    setSubmitting(true);
    try {
      const res = await fetch(`${BASE}/api/complaints`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ sku, outlet: outlet.trim(), channel, message: message.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');

      Toast.show({ type: 'success', text1: 'Complaint logged', text2: `${sku} · ${channel}` });
      setOutlet('');
      setMessage('');
      loadComplaints();
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed', text2: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const sentimentColor = (s) => s === 'negative' ? t.alert : s === 'neutral' ? t.warn : t.ok;

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      {/* Header */}
      <View style={[styles.appBar, { backgroundColor: t.bg, borderBottomColor: t.line, paddingTop: insets.top, height: 54 + insets.top }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.appBarSub, { color: t.text3 }]}>ops</Text>
          <Text style={[styles.appBarTitle, { color: t.text }]}>Log Complaint</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: t.alertDim, borderColor: t.alert + '44' }]}>
          <Text style={[styles.badgeText, { color: t.alert }]}>{complaints.length} logged</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Form */}
        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.line }]}>
          <Text style={[styles.sectionLabel, { color: t.text3 }]}>NEW COMPLAINT</Text>

          {/* SKU picker */}
          <Text style={[styles.fieldLabel, { color: t.text2 }]}>SKU *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {stocks.map(s => (
                <TouchableOpacity
                  key={s.sku}
                  onPress={() => setSku(s.sku)}
                  style={[styles.chip, {
                    backgroundColor: sku === s.sku ? t.pulse : t.bg,
                    borderColor: sku === s.sku ? t.pulse : t.line,
                  }]}
                >
                  <Text style={[styles.chipText, { color: sku === s.sku ? t.onPulse : t.text2 }]}>{s.sku}</Text>
                </TouchableOpacity>
              ))}
              {stocks.length === 0 && (
                <Text style={{ color: t.text3, fontSize: 12 }}>No stock found — add products first</Text>
              )}
            </View>
          </ScrollView>

          {/* Outlet */}
          <Text style={[styles.fieldLabel, { color: t.text2 }]}>Outlet Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: t.bg, borderColor: t.line, color: t.text }]}
            placeholder="e.g. Imtiaz DHA"
            placeholderTextColor={t.text3}
            value={outlet}
            onChangeText={setOutlet}
          />

          {/* Channel */}
          <Text style={[styles.fieldLabel, { color: t.text2 }]}>Channel</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            {CHANNELS.map(c => (
              <TouchableOpacity
                key={c}
                onPress={() => setChannel(c)}
                style={[styles.chip, {
                  backgroundColor: channel === c ? t.infoDim : t.bg,
                  borderColor: channel === c ? t.info : t.line,
                }]}
              >
                <Text style={[styles.chipText, { color: channel === c ? t.info : t.text2 }]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Message */}
          <Text style={[styles.fieldLabel, { color: t.text2 }]}>Complaint Message *</Text>
          <TextInput
            style={[styles.input, styles.textarea, { backgroundColor: t.bg, borderColor: t.line, color: t.text }]}
            placeholder="e.g. Retailer says shelves empty for 2 days, customers asking for Lays"
            placeholderTextColor={t.text3}
            multiline
            numberOfLines={3}
            value={message}
            onChangeText={setMessage}
          />

          <TouchableOpacity
            onPress={submit}
            disabled={submitting}
            style={[styles.submitBtn, { backgroundColor: t.alert, opacity: submitting ? 0.6 : 1 }]}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitText}>Log Complaint</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Complaints list */}
        <Text style={[styles.listHeader, { color: t.text3 }]}>RECENT COMPLAINTS</Text>

        {loading ? (
          <ActivityIndicator color={t.pulse} style={{ margin: 24 }} />
        ) : complaints.length === 0 ? (
          <Text style={[styles.empty, { color: t.text3 }]}>No complaints logged yet</Text>
        ) : (
          complaints.map(c => (
            <View key={c._id} style={[styles.complaintRow, { backgroundColor: t.surface, borderColor: t.line }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={[styles.sku, { color: t.pulse }]}>{c.sku}</Text>
                <Text style={[styles.channel, { color: t.text3 }]}>{c.channel}</Text>
              </View>
              <Text style={[styles.outlet, { color: t.text2 }]}>{c.outlet}</Text>
              <Text style={[styles.msg, { color: t.text }]}>{c.message}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                <View style={[styles.sentimentBadge, { backgroundColor: sentimentColor(c.sentiment) + '22', borderColor: sentimentColor(c.sentiment) + '44' }]}>
                  <Text style={[styles.sentimentText, { color: sentimentColor(c.sentiment) }]}>{c.sentiment}</Text>
                </View>
                <Text style={[styles.time, { color: t.text3 }]}>{new Date(c.received_at).toLocaleString()}</Text>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  appBar: { paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1 },
  appBarSub: { fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' },
  appBarTitle: { fontSize: 17, fontWeight: '600', letterSpacing: -0.3 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  card: { margin: 16, borderRadius: 14, borderWidth: 1, padding: 16 },
  sectionLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 14 },
  fieldLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.4, marginBottom: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 12 },
  textarea: { height: 80, textAlignVertical: 'top' },
  submitBtn: { height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  listHeader: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginHorizontal: 16, marginTop: 8, marginBottom: 8 },
  empty: { fontSize: 13, textAlign: 'center', padding: 24 },
  complaintRow: { marginHorizontal: 16, marginBottom: 8, borderRadius: 12, borderWidth: 1, padding: 12 },
  sku: { fontSize: 12, fontWeight: '800', fontFamily: 'monospace' },
  channel: { fontSize: 11 },
  outlet: { fontSize: 12, fontWeight: '500', marginBottom: 4 },
  msg: { fontSize: 13, lineHeight: 18 },
  sentimentBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  sentimentText: { fontSize: 10, fontWeight: '700' },
  time: { fontSize: 10 },
});
