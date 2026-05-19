import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Animated, Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { io } from 'socket.io-client';
import { useTheme } from '../ThemeContext';
import { ThemeToggle } from '../components/Atoms';
import { getBackendUrl } from '../utils/api';
import useAppStore from '../store/useAppStore';

const BASE = getBackendUrl();

function StatusDot({ status, T }) {
  const pulse = React.useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (status === 'critical') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.6, duration: 500, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1,   duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulse.setValue(1);
    }
  }, [status]);
  const color = status === 'critical' ? T.alert : status === 'warning' ? T.warn : status === 'low' ? '#F59E0B' : T.ok;
  return <Animated.View style={[{ width: 8, height: 8, borderRadius: 4 }, { backgroundColor: color, transform: [{ scale: pulse }] }]} />;
}

function StockBar({ pct, status, T }) {
  const color = status === 'critical' ? T.alert : status === 'warning' ? T.warn : status === 'low' ? '#F59E0B' : T.pulse;
  return (
    <View style={{ height: 6, backgroundColor: T.surface, borderRadius: 3, marginBottom: 10, overflow: 'hidden' }}>
      <View style={{ height: '100%', borderRadius: 3, width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: color }} />
    </View>
  );
}

function AdjustModal({ item, onClose, onDone, T }) {
  const [amount, setAmount]   = useState('');
  const [reason, setReason]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const submit = async (sign) => {
    const n = parseInt(amount);
    if (!n || n <= 0) { setError('Enter a valid number'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${BASE}/api/stock/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku: item.sku, amount: sign * n, reason: reason || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed'); return; }
      onDone();
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: T.backdrop, justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: T.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 10 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: T.text }}>Adjust Stock</Text>
          <Text style={{ fontSize: 13, fontWeight: '700', color: T.pulse, fontFamily: 'monospace' }}>{item.sku}</Text>
          <Text style={{ fontSize: 12, color: T.text2, marginBottom: 4 }}>Current: {item.current_stock?.toLocaleString()} units</Text>

          <TextInput style={{ backgroundColor: T.bg2, borderRadius: 10, borderWidth: 1, borderColor: T.line, padding: 12, color: T.text, fontSize: 14 }}
            placeholder="Units (e.g. 200)" placeholderTextColor={T.text3}
            keyboardType="numeric" value={amount} onChangeText={setAmount} />
          <TextInput style={{ backgroundColor: T.bg2, borderRadius: 10, borderWidth: 1, borderColor: T.line, padding: 12, color: T.text, fontSize: 14 }}
            placeholder="Reason (optional)" placeholderTextColor={T.text3}
            value={reason} onChangeText={setReason} />

          {error ? <Text style={{ color: T.alert, fontSize: 12 }}>{error}</Text> : null}

          {loading ? <ActivityIndicator color={T.pulse} style={{ marginTop: 12 }} /> : (
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <TouchableOpacity style={{ flex: 1, backgroundColor: T.okDim, borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: T.ok + '66' }} onPress={() => submit(1)}>
                <Text style={{ color: T.ok, fontWeight: '800', fontSize: 14 }}>+ Add Stock</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, backgroundColor: T.alertDim, borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: T.alert + '44' }} onPress={() => submit(-1)}>
                <Text style={{ color: T.alert, fontWeight: '800', fontSize: 14 }}>- Remove</Text>
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity style={{ paddingVertical: 12, alignItems: 'center' }} onPress={onClose}>
            <Text style={{ color: T.text3, fontSize: 14 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function AddProductField({ label, value, onChangeText, placeholder, numeric, autoCapitalize, T }) {
  return (
    <View style={{ gap: 4, marginBottom: 10 }}>
      <Text style={{ fontSize: 11, color: T.text3, fontWeight: '600', letterSpacing: 0.5 }}>{label}</Text>
      <TextInput
        style={{ backgroundColor: T.bg2, borderRadius: 10, borderWidth: 1, borderColor: T.line, padding: 12, color: T.text, fontSize: 14 }}
        placeholder={placeholder || label}
        placeholderTextColor={T.text3}
        keyboardType={numeric ? 'numeric' : 'default'}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize={autoCapitalize || 'words'}
      />
    </View>
  );
}

function AddProductModal({ onClose, onDone, T }) {
  const [sku, setSku]                     = useState('');
  const [product_name, setProductName]    = useState('');
  const [category, setCategory]           = useState('Snacks');
  const [initial_stock, setInitialStock]  = useState('');
  const [threshold, setThreshold]         = useState('');
  const [sales_per_tick, setSalesPerTick] = useState('');
  const [unit_cost_pkr, setUnitCost]      = useState('');
  const [supplier, setSupplier]           = useState('');
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');

  const submit = async () => {
    if (!sku.trim() || !product_name.trim()) { setError('SKU and Product Name are required'); return; }
    if (!initial_stock) { setError('Initial stock is required'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${BASE}/api/stock/product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: sku.trim().toUpperCase(), product_name: product_name.trim(),
          category: category.trim(), initial_stock: parseInt(initial_stock) || 0,
          threshold: parseInt(threshold) || 100, sales_per_tick: parseInt(sales_per_tick) || 5,
          unit_cost_pkr: parseInt(unit_cost_pkr) || 0, supplier: supplier.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed'); return; }
      onDone();
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: T.backdrop, justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: T.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '90%' }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: T.text, marginBottom: 4 }}>Add New Product</Text>
          <Text style={{ fontSize: 11, color: T.text3, marginBottom: 12 }}>Saved to MongoDB + warehouse</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <AddProductField T={T} label="SKU *"           value={sku}           onChangeText={setSku}          placeholder="e.g. PEPSI-500"             autoCapitalize="characters" />
            <AddProductField T={T} label="Product Name *"  value={product_name}  onChangeText={setProductName}  placeholder="e.g. Pepsi 500ml" />
            <AddProductField T={T} label="Category"        value={category}      onChangeText={setCategory}     placeholder="Snacks / Beverages / Dairy" />
            <AddProductField T={T} label="Initial Stock *" value={initial_stock} onChangeText={setInitialStock} placeholder="e.g. 500"   numeric />
            <AddProductField T={T} label="Threshold"       value={threshold}     onChangeText={setThreshold}    placeholder="e.g. 150"   numeric />
            <AddProductField T={T} label="Sales per tick"  value={sales_per_tick} onChangeText={setSalesPerTick} placeholder="Units/45s tick" numeric />
            <AddProductField T={T} label="Unit Cost (PKR)" value={unit_cost_pkr} onChangeText={setUnitCost}     placeholder="e.g. 120"   numeric />
            <AddProductField T={T} label="Supplier"        value={supplier}      onChangeText={setSupplier}     placeholder="e.g. Pepsi Direct" />
          </ScrollView>
          {error ? <Text style={{ color: T.alert, fontSize: 12, marginTop: 4 }}>{error}</Text> : null}
          {loading ? <ActivityIndicator color={T.pulse} style={{ marginTop: 12 }} /> : (
            <TouchableOpacity style={{ backgroundColor: T.pulse, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 10 }} onPress={submit}>
              <Text style={{ color: T.onPulse, fontWeight: '800', fontSize: 14 }}>Save Product</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={{ paddingVertical: 12, alignItems: 'center' }} onPress={onClose}>
            <Text style={{ color: T.text3, fontSize: 14 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function StockMonitorScreen() {
  const insets = useSafeAreaInsets();
  const { theme: T } = useTheme();
  const autoTriggerEnabled    = useAppStore(s => s.autoTriggerEnabled);
  const setAutoTriggerEnabled = useAppStore(s => s.setAutoTriggerEnabled);

  const [stocks, setStocks]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [lastTick, setLastTick]         = useState(null);
  const [autoEvents, setAutoEvents]     = useState([]);
  const [resetting, setResetting]       = useState(false);
  const [togglingAuto, setTogglingAuto] = useState(false);
  const [adjustItem, setAdjustItem]     = useState(null);
  const [showAddProduct, setShowAddProduct] = useState(false);

  const refreshStocks = () => {
    fetch(`${BASE}/api/stock`).then(r => r.json()).then(d => { if (Array.isArray(d)) setStocks(d); }).catch(() => {});
  };

  useEffect(() => {
    fetch(`${BASE}/api/stock`)
      .then(r => r.json())
      .then(d => { setStocks(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const socket = io(BASE);
    socket.on('stock_update', (newData) => {
      setStocks(prev => {
        const prevMap = {};
        prev.forEach(s => { prevMap[s.sku] = s.current_stock; });
        return newData.map(s => ({
          ...s,
          trend: prevMap[s.sku] === undefined ? 'same'
            : s.current_stock < prevMap[s.sku] ? 'down'
            : s.current_stock > prevMap[s.sku] ? 'up' : 'same',
        }));
      });
      setLastTick(new Date());
    });
    socket.on('auto_trigger', (ev) => setAutoEvents(prev => [ev, ...prev].slice(0, 10)));
    return () => socket.disconnect();
  }, []);

  const toggleAutoTrigger = async () => {
    const next = !autoTriggerEnabled;
    setTogglingAuto(true);
    setAutoTriggerEnabled(next);
    try {
      await fetch(`${BASE}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'autoTriggerEnabled', value: next }),
      });
    } catch { setAutoTriggerEnabled(!next); }
    finally { setTogglingAuto(false); }
  };

  const resetStock = async () => {
    setResetting(true);
    try { await fetch(`${BASE}/api/stock/reset`, { method: 'POST' }); }
    finally { setResetting(false); }
  };

  const criticalCount = stocks.filter(s => s.status === 'critical').length;
  const warningCount  = stocks.filter(s => s.status === 'warning').length;

  return (
    <View style={{ flex: 1, backgroundColor: T.bg2, paddingTop: insets.top }}>

      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: T.bg, borderBottomWidth: 1, borderBottomColor: T.line }}>
        <View>
          <Text style={{ fontSize: 9, fontWeight: '800', color: T.pulse, letterSpacing: 2, textTransform: 'uppercase' }}>LIVE</Text>
          <Text style={{ fontSize: 20, fontWeight: '800', color: T.text, marginTop: 2 }}>Stock Monitor</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {criticalCount > 0 && (
            <View style={{ backgroundColor: T.alertDim, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: T.alert + '44' }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: T.alert, letterSpacing: 0.5 }}>{criticalCount} CRITICAL</Text>
            </View>
          )}
          <ThemeToggle />
          <TouchableOpacity onPress={() => setShowAddProduct(true)} style={{ backgroundColor: T.pulseDim, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: T.pulse + '66' }}>
            <Text style={{ fontSize: 12, color: T.pulse, fontWeight: '700' }}>+ Product</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={resetStock} disabled={resetting} style={{ backgroundColor: T.surface, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: T.line }}>
            {resetting
              ? <ActivityIndicator size="small" color={T.text3} />
              : <Text style={{ fontSize: 12, color: T.text2, fontWeight: '600' }}>Reset</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {/* Auto-trigger panel */}
      <TouchableOpacity
        onPress={toggleAutoTrigger}
        activeOpacity={0.85}
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          marginHorizontal: 16, marginTop: 14, marginBottom: 2, borderRadius: 14, padding: 14, borderWidth: 1.5,
          backgroundColor: autoTriggerEnabled ? T.okDim  : T.warnDim,
          borderColor:     autoTriggerEnabled ? T.ok + '66' : T.warn + '66',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: autoTriggerEnabled ? T.ok : T.warn }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: '800', letterSpacing: 1, color: autoTriggerEnabled ? T.ok : T.warn }}>
              {autoTriggerEnabled ? 'AUTO-TRIGGER ON' : 'MANUAL APPROVAL'}
            </Text>
            <Text style={{ fontSize: 11, color: T.text3, marginTop: 2, flexShrink: 1 }}>
              {autoTriggerEnabled
                ? 'Agents fire instantly on breach — even when app is closed'
                : 'You approve each trigger in the Feed before agents run'}
            </Text>
          </View>
        </View>
        {togglingAuto
          ? <ActivityIndicator size="small" color={autoTriggerEnabled ? T.ok : T.warn} />
          : <View style={{ width: 42, height: 24, borderRadius: 12, padding: 3, justifyContent: 'center', backgroundColor: autoTriggerEnabled ? T.okDim : T.warnDim, borderWidth: 1, borderColor: autoTriggerEnabled ? T.ok + '88' : T.warn + '88' }}>
              <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: autoTriggerEnabled ? T.ok : T.warn, alignSelf: autoTriggerEnabled ? 'flex-end' : 'flex-start' }} />
            </View>
        }
      </TouchableOpacity>

      {/* Tick bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: T.bg, gap: 8, borderBottomWidth: 1, borderBottomColor: T.line, marginTop: 10 }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: T.pulse }} />
        <Text style={{ fontSize: 11, color: T.text3, flex: 1 }}>
          {lastTick ? `Updated ${Math.round((Date.now() - lastTick) / 1000)}s ago` : 'Waiting for first tick...'}
        </Text>
        <Text style={{ fontSize: 11, color: T.text2, fontWeight: '600' }}>
          {criticalCount > 0 ? `${criticalCount} critical` : warningCount > 0 ? `${warningCount} warning` : 'All normal'}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Auto-trigger events */}
        {autoEvents.length > 0 && (
          <View style={{ padding: 16, gap: 10 }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: T.text3, letterSpacing: 1.5, marginBottom: 4 }}>AUTO-TRIGGERED EVENTS</Text>
            {autoEvents.map((ev, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 12, backgroundColor: T.okDim, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: T.pulse + '44', alignItems: 'flex-start' }}>
                <Text style={{ fontSize: 20 }}>🤖</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: T.pulse }}>Agent triggered — {ev.sku}</Text>
                  <Text style={{ fontSize: 12, color: T.text2, marginTop: 2 }}>{ev.product_name} · {ev.current_stock} &lt; {ev.threshold}</Text>
                  <Text style={{ fontSize: 11, color: T.text3, marginTop: 4 }}>{new Date(ev.timestamp).toLocaleTimeString()}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Stock cards */}
        <View style={{ padding: 16, gap: 10 }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: T.text3, letterSpacing: 1.5, marginBottom: 4 }}>INVENTORY LEVELS · {stocks.length} SKUs</Text>

          {loading ? (
            <ActivityIndicator color={T.pulse} style={{ margin: 32 }} />
          ) : stocks.length === 0 ? (
            <Text style={{ color: T.text3, fontSize: 13, textAlign: 'center', padding: 32 }}>No stock data — server not running</Text>
          ) : (
            stocks.map(item => (
              <View key={item.sku} style={{
                backgroundColor: item.status === 'critical' ? T.alertDim : item.status === 'warning' ? T.warnDim : T.bg,
                borderRadius: 14, padding: 14, borderWidth: 1,
                borderColor: item.status === 'critical' ? T.alert + '88' : item.status === 'warning' ? T.warn + '88' : T.line,
              }}>
                {/* Top row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <StatusDot status={item.status} T={T} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: T.pulse, fontFamily: 'monospace', letterSpacing: 0.5 }}>{item.sku}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: T.text, marginTop: 1 }}>{item.product_name}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 22, fontWeight: '800', color: item.status === 'critical' ? T.alert : item.status === 'warning' ? T.warn : T.text }}>
                      {item.current_stock?.toLocaleString()}
                      <Text style={{ fontSize: 14, color: item.trend === 'down' ? T.alert : item.trend === 'up' ? T.ok : T.line2 }}>
                        {item.trend === 'down' ? ' ↓' : item.trend === 'up' ? ' ↑' : ''}
                      </Text>
                    </Text>
                    <Text style={{ fontSize: 10, color: T.text3, marginTop: -2 }}>units</Text>
                  </View>
                </View>

                <StockBar pct={item.pct} status={item.status} T={T} />

                {/* Bottom row */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, color: T.text3 }}>
                    Threshold: <Text style={{ color: T.warn }}>{item.threshold}</Text>
                  </Text>
                  <Text style={{ fontSize: 11, color: T.text3 }}>-{item.sales_per_tick}/tick</Text>
                  <Text style={{ fontSize: 11, fontWeight: item.status === 'critical' ? '800' : '600',
                    color: item.status === 'critical' ? T.alert : item.status === 'warning' ? T.warn : item.status === 'normal' ? T.ok : T.text2 }}>
                    {item.status === 'critical' ? '🔴 TRIGGERED' : item.status === 'warning' ? '🟡 WARNING' : item.status === 'low' ? '🟠 LOW' : '🟢 NORMAL'}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <Text style={{ fontSize: 10, color: T.text3 }}>{item.supplier}</Text>
                  <TouchableOpacity onPress={() => setAdjustItem(item)} style={{ backgroundColor: T.infoDim, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: T.info + '44' }}>
                    <Text style={{ fontSize: 11, color: T.info, fontWeight: '700' }}>± Adjust Stock</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {adjustItem && (
        <AdjustModal T={T} item={adjustItem} onClose={() => setAdjustItem(null)} onDone={() => { setAdjustItem(null); refreshStocks(); }} />
      )}

      {showAddProduct && (
        <AddProductModal T={T} onClose={() => setShowAddProduct(false)} onDone={() => { setShowAddProduct(false); refreshStocks(); }} />
      )}
    </View>
  );
}
