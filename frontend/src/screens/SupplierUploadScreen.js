import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Alert, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import { ThemeToggle } from '../components/Atoms';
import { getBackendUrl } from '../utils/api';
import useAppStore from '../store/useAppStore';

const BASE = getBackendUrl();

export default function SupplierUploadScreen() {
  const { theme: t } = useTheme();
  const insets = useSafeAreaInsets();
  const authToken = useAppStore(s => s.authToken);
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` };

  const [suppliers, setSuppliers]   = useState([]);
  const [stocks, setStocks]         = useState([]);
  const [loading, setLoading]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [phone, setPhone]         = useState('');
  const [selectedSkus, setSelectedSkus] = useState([]);

  useEffect(() => {
    fetch(`${BASE}/api/stock`, { headers })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setStocks(d); })
      .catch(() => {});
  }, []);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${BASE}/api/suppliers`, { headers: { Authorization: `Bearer ${authToken}` } });
      const data = await res.json();
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (e) {
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const toggleSku = (sku) => {
    setSelectedSkus(prev =>
      prev.includes(sku) ? prev.filter(s => s !== sku) : [...prev, sku]
    );
  };

  const handleAdd = async () => {
    if (!name.trim() || !email.trim()) {
      Alert.alert('Required', 'Name and email are required.');
      return;
    }
    setSaving(true);
    try {
      const res  = await fetch(`${BASE}/api/suppliers/add`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.trim(), products: selectedSkus }),
      });
      const data = await res.json();
      if (data.error) { Alert.alert('Error', data.error); return; }
      setName(''); setEmail(''); setPhone(''); setSelectedSkus([]);
      fetchSuppliers();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteSupplier = async (id) => {
    if (deletingId) return;
    setDeletingId(id);
    try {
      const res  = await fetch(`${BASE}/api/suppliers/${String(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (!data.success) { Alert.alert('Error', data.error || 'Delete failed'); }
      else { setSuppliers(prev => prev.filter(s => String(s._id) !== String(id))); }
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setDeletingId(null);
    }
  };

  const renderSupplier = ({ item }) => {
    const isDeleting = deletingId === String(item._id);
    return (
      <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.line }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.avatar, { backgroundColor: t.okDim, borderColor: t.ok + '55' }]}>
            <Text style={[styles.avatarText, { color: t.ok }]}>{item.name?.[0]?.toUpperCase() || 'S'}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.supplierName, { color: t.text }]}>{item.name}</Text>
            <Text style={[styles.supplierEmail, { color: t.text2 }]}>{item.email}</Text>
            {item.phone ? <Text style={[styles.supplierPhone, { color: t.text3 }]}>{item.phone}</Text> : null}
          </View>
          <TouchableOpacity
            onPress={() => deleteSupplier(String(item._id))}
            style={styles.deleteBtn}
            disabled={isDeleting}
          >
            {isDeleting
              ? <ActivityIndicator size="small" color={t.alert} />
              : <Text style={[styles.deleteBtnText, { color: t.alert }]}>✕</Text>
            }
          </TouchableOpacity>
        </View>
        {item.products?.length > 0 && (
          <View style={styles.skuRow}>
            {item.products.map(sku => (
              <View key={sku} style={[styles.skuPill, { backgroundColor: t.okDim, borderColor: t.ok + '33' }]}>
                <Text style={[styles.skuText, { color: t.ok }]}>{sku}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: t.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: t.bg, borderBottomColor: t.line, paddingTop: insets.top, height: 54 + insets.top }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerSub, { color: t.text3 }]}>admin</Text>
          <Text style={[styles.headerTitle, { color: t.text }]}>Supplier Directory</Text>
        </View>
        <ThemeToggle />
      </View>

      <FlatList
        data={suppliers}
        keyExtractor={i => i._id}
        renderItem={renderSupplier}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="always"
        ListHeaderComponent={
          <>
            {/* Add Supplier Form */}
            <View style={[styles.formCard, { backgroundColor: t.surface, borderColor: t.line }]}>
              <Text style={[styles.sectionLabel, { color: t.text3 }]}>ADD SUPPLIER</Text>

              <Text style={[styles.fieldLabel, { color: t.text2 }]}>Name *</Text>
              <TextInput
                style={[styles.fieldInput, { backgroundColor: t.bg, borderColor: t.line, color: t.text }]}
                value={name} onChangeText={setName}
                placeholder="Pepsi Direct" placeholderTextColor={t.text3}
                autoCapitalize="words"
              />

              <Text style={[styles.fieldLabel, { color: t.text2 }]}>Email *</Text>
              <TextInput
                style={[styles.fieldInput, { backgroundColor: t.bg, borderColor: t.line, color: t.text }]}
                value={email} onChangeText={setEmail}
                placeholder="pepsi@example.com" placeholderTextColor={t.text3}
                keyboardType="email-address" autoCapitalize="none"
              />

              <Text style={[styles.fieldLabel, { color: t.text2 }]}>Phone</Text>
              <TextInput
                style={[styles.fieldInput, { backgroundColor: t.bg, borderColor: t.line, color: t.text }]}
                value={phone} onChangeText={setPhone}
                placeholder="923001234567" placeholderTextColor={t.text3}
                keyboardType="phone-pad"
              />

              <Text style={[styles.fieldLabel, { color: t.text2 }]}>SKUs</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {stocks.map(s => {
                    const selected = selectedSkus.includes(s.sku);
                    return (
                      <TouchableOpacity
                        key={s.sku}
                        onPress={() => toggleSku(s.sku)}
                        style={[styles.chip, {
                          backgroundColor: selected ? t.ok : t.bg,
                          borderColor: selected ? t.ok : t.line,
                        }]}
                      >
                        <Text style={[styles.chipText, { color: selected ? t.onPulse : t.text2 }]}>{s.sku}</Text>
                      </TouchableOpacity>
                    );
                  })}
                  {stocks.length === 0 && (
                    <Text style={{ color: t.text3, fontSize: 12, paddingVertical: 6 }}>No stock found — add products first</Text>
                  )}
                </View>
              </ScrollView>

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: t.ok, opacity: saving ? 0.6 : 1 }]}
                onPress={handleAdd} disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color={t.bg} />
                  : <Text style={[styles.saveBtnText, { color: t.bg }]}>+ Add Supplier</Text>
                }
              </TouchableOpacity>
            </View>

            {/* List header */}
            <View style={styles.listHeader}>
              <Text style={[styles.listTitle, { color: t.text3 }]}>
                {loading ? 'LOADING...' : `${suppliers.length} SUPPLIER${suppliers.length !== 1 ? 'S' : ''}`}
              </Text>
              <TouchableOpacity onPress={fetchSuppliers}>
                <Text style={[styles.refresh, { color: t.ok }]}>Refresh</Text>
              </TouchableOpacity>
            </View>

            {loading && <ActivityIndicator color={t.pulse} style={{ marginTop: 24 }} />}
          </>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: t.text2 }]}>No suppliers yet</Text>
              <Text style={[styles.emptySubText, { color: t.text3 }]}>Add a supplier above to enable smart supplier emailing</Text>
            </View>
          ) : null
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  header:       { paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1 },
  headerSub:    { fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' },
  headerTitle:  { fontSize: 17, fontWeight: '600', letterSpacing: -0.3 },

  formCard:     { margin: 16, borderRadius: 14, borderWidth: 1, padding: 16 },
  sectionLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 14 },
  fieldLabel:   { fontSize: 11, fontWeight: '600', letterSpacing: 0.4, marginBottom: 6 },
  fieldInput:   { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 12 },
  chip:         { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  chipText:     { fontSize: 12, fontWeight: '600' },

  saveBtn:      { height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  saveBtnText:  { fontSize: 14, fontWeight: '800' },

  listHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  listTitle:    { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  refresh:      { fontSize: 13, fontWeight: '600' },

  card:         { marginHorizontal: 16, marginBottom: 10, borderRadius: 12, padding: 14, borderWidth: 1 },
  cardHeader:   { flexDirection: 'row', alignItems: 'center' },
  avatar:       { width: 40, height: 40, borderRadius: 20, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText:   { fontSize: 16, fontWeight: '800' },
  cardInfo:     { flex: 1 },
  supplierName: { fontSize: 14, fontWeight: '700' },
  supplierEmail:{ fontSize: 12, marginTop: 1 },
  supplierPhone:{ fontSize: 11, marginTop: 1 },
  deleteBtn:    { padding: 6 },
  deleteBtnText:{ fontSize: 14, fontWeight: '700' },

  skuRow:       { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 6 },
  skuPill:      { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  skuText:      { fontSize: 11, fontWeight: '600', fontFamily: 'monospace' },

  empty:        { alignItems: 'center', padding: 40 },
  emptyText:    { fontSize: 16, fontWeight: '700' },
  emptySubText: { fontSize: 13, marginTop: 6, textAlign: 'center' },
});
