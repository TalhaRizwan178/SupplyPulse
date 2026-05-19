import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Alert, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { darkTheme as T } from '../theme';
import { getBackendUrl } from '../utils/api';
import useAppStore from '../store/useAppStore';

const BASE = getBackendUrl();

// Top-level field component — prevents focus-loss bug from inline component defs
function Field({ label, value, onChangeText, placeholder, autoCapitalize, keyboardType }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#867E76"
        autoCapitalize={autoCapitalize || 'none'}
        keyboardType={keyboardType || 'default'}
      />
    </View>
  );
}

export default function SupplierUploadScreen() {
  const authToken = useAppStore(s => s.authToken);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Form fields — individual state to avoid re-render focus issues
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [phone, setPhone]       = useState('');
  const [products, setProducts] = useState('');

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${BASE}/api/suppliers`, { headers: { Authorization: `Bearer ${authToken}` } });
      const data = await res.json();
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('[Suppliers] fetch error:', e.message);
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const handleAdd = async () => {
    if (!name.trim() || !email.trim()) {
      Alert.alert('Required', 'Name and email are required.');
      return;
    }
    setSaving(true);
    try {
      const res  = await fetch(`${BASE}/api/suppliers/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.trim(), products: products.trim() }),
      });
      const data = await res.json();
      if (data.error) { Alert.alert('Error', data.error); return; }
      setName(''); setEmail(''); setPhone(''); setProducts('');
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
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.name?.[0]?.toUpperCase() || 'S'}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.supplierName}>{item.name}</Text>
            <Text style={styles.supplierEmail}>{item.email}</Text>
            {item.phone ? <Text style={styles.supplierPhone}>{item.phone}</Text> : null}
          </View>
          <TouchableOpacity
            onPress={() => deleteSupplier(String(item._id))}
            style={styles.deleteBtn}
            disabled={isDeleting}
          >
            {isDeleting
              ? <ActivityIndicator size="small" color="#D45C48" />
              : <Text style={styles.deleteBtnText}>✕</Text>
            }
          </TouchableOpacity>
        </View>
        {item.products?.length > 0 && (
          <View style={styles.skuRow}>
            {item.products.map(sku => (
              <View key={sku} style={styles.skuPill}>
                <Text style={styles.skuText}>{sku}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Supplier Directory</Text>
        <Text style={styles.headerSub}>Agents auto-email suppliers by SKU match</Text>
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
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Add Supplier</Text>
              <Field label="Name *"  value={name}  onChangeText={setName}  placeholder="Pepsi Direct"           autoCapitalize="words" />
              <Field label="Email *" value={email} onChangeText={setEmail} placeholder="pepsi@example.com"      keyboardType="email-address" />
              <Field label="Phone"   value={phone} onChangeText={setPhone} placeholder="923001234567"           keyboardType="phone-pad" />
              <Field label="SKUs (comma-separated)" value={products} onChangeText={setProducts} placeholder="LAYS-MAS-70, STING-250" autoCapitalize="characters" />

              <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleAdd} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#0E2015" />
                  : <Text style={styles.saveBtnText}>+ Add Supplier</Text>
                }
              </TouchableOpacity>
            </View>

            {/* List header */}
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>
                {loading ? 'Loading...' : `${suppliers.length} Supplier${suppliers.length !== 1 ? 's' : ''}`}
              </Text>
              <TouchableOpacity onPress={fetchSuppliers}>
                <Text style={styles.refresh}>Refresh</Text>
              </TouchableOpacity>
            </View>

            {loading && <ActivityIndicator color={T.pulse} style={{ marginTop: 24 }} />}
          </>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>No suppliers yet</Text>
              <Text style={styles.emptySubText}>Add a supplier above to enable smart supplier emailing</Text>
            </View>
          ) : null
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#1E1B18' },
  header:        { padding: 20, paddingTop: 16, backgroundColor: '#272320', borderBottomWidth: 1, borderBottomColor: '#4D4740' },
  headerTitle:   { fontSize: 20, fontWeight: '800', color: '#F4EFE8' },
  headerSub:     { fontSize: 12, color: '#867E76', marginTop: 3 },

  formCard:      { margin: 16, backgroundColor: '#272320', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#4D4740' },
  formTitle:     { fontSize: 15, fontWeight: '800', color: '#F4EFE8', marginBottom: 16 },

  fieldWrap:     { marginBottom: 12 },
  fieldLabel:    { fontSize: 11, fontWeight: '700', color: '#6ADE95', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 },
  fieldInput:    { backgroundColor: '#1E1B18', borderRadius: 10, borderWidth: 1, borderColor: '#4D4740', color: '#F4EFE8', fontSize: 14, paddingHorizontal: 14, paddingVertical: 10 },

  saveBtn:       { backgroundColor: '#6ADE95', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  saveBtnText:   { color: '#0E2015', fontSize: 14, fontWeight: '800' },

  listHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  listTitle:     { fontSize: 13, fontWeight: '700', color: '#B7AFA7' },
  refresh:       { fontSize: 13, color: '#6ADE95' },

  card:          { marginHorizontal: 16, marginBottom: 10, backgroundColor: '#272320', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#4D4740' },
  cardHeader:    { flexDirection: 'row', alignItems: 'center' },
  avatar:        { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1C3E2C', borderWidth: 1, borderColor: '#6ADE9555', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText:    { color: '#6ADE95', fontSize: 16, fontWeight: '800' },
  cardInfo:      { flex: 1 },
  supplierName:  { fontSize: 14, fontWeight: '700', color: '#F4EFE8' },
  supplierEmail: { fontSize: 12, color: '#B7AFA7', marginTop: 1 },
  supplierPhone: { fontSize: 11, color: '#867E76', marginTop: 1 },
  deleteBtn:     { padding: 6 },
  deleteBtnText: { color: '#D45C48', fontSize: 14, fontWeight: '700' },

  skuRow:        { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 6 },
  skuPill:       { backgroundColor: '#1C3E2C', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#6ADE9533' },
  skuText:       { color: '#6ADE95', fontSize: 11, fontWeight: '600', fontFamily: 'monospace' },

  empty:         { alignItems: 'center', padding: 40 },
  emptyIcon:     { fontSize: 40, marginBottom: 12 },
  emptyText:     { fontSize: 16, fontWeight: '700', color: '#B7AFA7' },
  emptySubText:  { fontSize: 13, color: '#867E76', marginTop: 6, textAlign: 'center' },
});
