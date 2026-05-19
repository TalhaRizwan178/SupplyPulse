import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import { Icons } from '../components/Icons';
import { Pill, ThemeToggle, Avatar, SectionLabel, Spinner } from '../components/Atoms';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { getBackendUrl } from '../utils/api';
import useAppStore from '../store/useAppStore';

const BASE = getBackendUrl();

function timeAgo(date) {
  if (!date) return '';
  const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (secs < 60)  return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

const TONE_MAP = {
  alert: 'alert',
  warn: 'warn',
  info: 'info',
};

// Mini inline stock bar for a SKU shown on the crisis card
function StockMiniBar({ sku, stockData }) {
  const item = stockData.find(s => s.sku === sku);
  if (!item) return null;

  const pct = Math.max(0, Math.min(100, item.pct ?? 100));
  const barColor = item.status === 'critical' ? '#D45C48'
    : item.status === 'warning' ? '#D4A840'
    : '#6ADE95';

  return (
    <View style={miniStyles.wrap}>
      <View style={miniStyles.track}>
        <View style={[miniStyles.fill, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>
      <Text style={[miniStyles.label, { color: barColor }]}>
        {item.current_stock?.toLocaleString()} units
        {item.status === 'critical' ? ' · CRITICAL' : item.status === 'warning' ? ' · LOW' : ''}
      </Text>
    </View>
  );
}

const miniStyles = StyleSheet.create({
  wrap:  { marginTop: 6, gap: 4 },
  track: { height: 4, backgroundColor: '#332E29', borderRadius: 2, overflow: 'hidden' },
  fill:  { height: '100%', borderRadius: 2 },
  label: { fontSize: 10, fontWeight: '600', letterSpacing: 0.3 },
});

// Pending trigger approval card shown in the feed
function PendingTriggerCard({ trigger, onApprove, onReject, isDismissing, onRemove }) {
  const [loading, setLoading] = useState(false);
  const translateX = useRef(new Animated.Value(60)).current;
  const opacity    = useRef(new Animated.Value(0)).current;

  // Slide in on mount
  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateX, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
      Animated.timing(opacity,    { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, []);

  // Animate out then remove when isDismissing becomes true
  useEffect(() => {
    if (!isDismissing) return;
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 0, duration: 280, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: -40, duration: 280, useNativeDriver: true }),
    ]).start(() => onRemove(trigger._id));
  }, [isDismissing]);

  const dismissAnim = (callback) => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 30, duration: 250, useNativeDriver: true }),
    ]).start(() => callback());
  };

  const approve = async () => {
    setLoading(true);
    try {
      await fetch(`${BASE}/api/settings/pending-triggers/${trigger._id}/approve`, { method: 'POST' });
      dismissAnim(() => onApprove(trigger._id));
    } catch {
      setLoading(false);
    }
  };

  const reject = async () => {
    setLoading(true);
    try {
      await fetch(`${BASE}/api/settings/pending-triggers/${trigger._id}/reject`, { method: 'POST' });
      dismissAnim(() => onReject(trigger._id));
    } catch {
      setLoading(false);
    }
  };

  return (
    <Animated.View style={[pendingStyles.card, { opacity, transform: [{ translateX }] }]}>
      <View style={pendingStyles.header}>
        <Text style={pendingStyles.icon}>⏳</Text>
        <View style={{ flex: 1 }}>
          <Text style={pendingStyles.title}>Approval Required</Text>
          <Text style={pendingStyles.sub}>Stock breach detected — auto-trigger is OFF</Text>
        </View>
      </View>
      <Text style={pendingStyles.sku}>{trigger.sku}</Text>
      <Text style={pendingStyles.detail}>
        {trigger.product_name} · Stock {trigger.current_stock} &lt; threshold {trigger.threshold}
      </Text>
      <Text style={pendingStyles.time}>{new Date(trigger.timestamp || trigger.createdAt).toLocaleTimeString()}</Text>
      {loading ? (
        <ActivityIndicator color="#6ADE95" style={{ marginTop: 12 }} />
      ) : (
        <View style={pendingStyles.actions}>
          <TouchableOpacity style={pendingStyles.approveBtn} onPress={approve}>
            <Text style={pendingStyles.approveTxt}>Run Agents</Text>
          </TouchableOpacity>
          <TouchableOpacity style={pendingStyles.rejectBtn} onPress={reject}>
            <Text style={pendingStyles.rejectTxt}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
}

const pendingStyles = StyleSheet.create({
  card:       { backgroundColor: '#1C2E3E', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#3A7BD544', marginBottom: 2 },
  header:     { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 8 },
  icon:       { fontSize: 20 },
  title:      { fontSize: 13, fontWeight: '700', color: '#60B0FF' },
  sub:        { fontSize: 11, color: '#B7AFA7', marginTop: 2 },
  sku:        { fontSize: 14, fontWeight: '800', color: '#F4EFE8', fontFamily: 'monospace', marginBottom: 2 },
  detail:     { fontSize: 12, color: '#B7AFA7' },
  time:       { fontSize: 11, color: '#615B54', marginTop: 4 },
  actions:    { flexDirection: 'row', gap: 8, marginTop: 12 },
  approveBtn: { flex: 1, backgroundColor: '#1A3E2C', borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#6ADE9566' },
  approveTxt: { color: '#6ADE95', fontWeight: '700', fontSize: 13 },
  rejectBtn:  { flex: 1, backgroundColor: '#2A1F1C', borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#D45C4844' },
  rejectTxt:  { color: '#D45C48', fontWeight: '700', fontSize: 13 },
});

export default function FeedScreen({ navigation }) {
  const { theme: t } = useTheme();
  const insets = useSafeAreaInsets();

  const currentUser       = useAppStore(s => s.currentUser);
  const stockData         = useAppStore(s => s.stockData);
  const autoTriggerEvents = useAppStore(s => s.autoTriggerEvents);
  const pendingTriggers   = useAppStore(s => s.pendingTriggers);
  const removePending     = useAppStore(s => s.removePendingTrigger);
  const dismissingIds     = useAppStore(s => s.dismissingIds);
  const unmarkDismissing  = useAppStore(s => s.unmarkDismissing);

  const initials = currentUser?.email
    ? currentUser.email.split('@')[0].slice(0, 2).toUpperCase()
    : '??';

  const { data: CRISES = [], isLoading } = useQuery({
    queryKey: ['crises'],
    queryFn: async () => {
      const res = await axios.get(`${BASE}/api/crisis/feed`);
      return res.data;
    },
    refetchInterval: 30000,
  });

  // Dynamic summary — live stock overrides static stockoutRisk per SKU
  const stockMap = {};
  stockData.forEach(s => { stockMap[s.sku] = s.status; });

  let criticalCount = 0, watchCount = 0, resolvedCount = 0;
  CRISES.forEach(c => {
    const liveStatus = stockMap[c.sku];
    const isCritical = liveStatus === 'critical' || (!liveStatus && c.stockoutRisk > 70);
    const isWatch    = !isCritical && (liveStatus === 'warning' || liveStatus === 'low' || (!liveStatus && c.stockoutRisk > 30));
    if (isCritical) criticalCount++;
    else if (isWatch) watchCount++;
    else resolvedCount++;
  });
  // Also count triggered stock SKUs not yet in crisis feed
  stockData.forEach(s => {
    const alreadyCounted = CRISES.some(c => c.sku === s.sku);
    if (!alreadyCounted) {
      if (s.status === 'critical') criticalCount++;
      else if (s.status === 'warning' || s.status === 'low') watchCount++;
    }
  });
  const sourceCount = Math.max(5, CRISES.reduce((acc, c) => acc + (c.sources || 0), 0));

  // Derive region label from crisis data
  const regionLabel = CRISES.length > 0
    ? (CRISES[0].region || 'karachi-north').toLowerCase().replace(/\s·\s/g, '-').replace(/\s/g, '-')
    : 'karachi-north';

  // Hint text based on severity
  const getHint = (c, severity) => {
    if (c.hint) return c.hint;
    if (severity === 'alert') return 'Immediate action needed';
    if (severity === 'warn')  return 'Monitor closely';
    return 'No action required';
  };

  const summaryItems = [
    { v: String(criticalCount), l: 'critical', color: t.alert },
    { v: String(watchCount),    l: 'watch',    color: t.warn  },
    { v: String(resolvedCount), l: 'resolved', color: t.ok   },
  ];

  const toneColor = (severity) => ({
    alert: t.alert,
    warn: t.warn,
    info: t.info,
  }[severity] || t.info);

  const toneCardBg = (severity) => {
    if (severity === 'alert') return t.tintAlert;
    if (severity === 'warn')  return t.tintWarn;
    return t.surface;
  };

  const toneCardBorder = (severity) => {
    if (severity === 'alert') return t.alert;
    if (severity === 'warn')  return t.warn;
    return t.line;
  };

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { borderBottomColor: t.line, paddingTop: insets.top, height: 60 + insets.top }]}>
        <View style={[styles.logoMark, { backgroundColor: t.pulse }]}>
          <Icons.Pulse size={16} color={t.onPulse} stroke={2.2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.barTitle, { color: t.text }]}>Crisis Feed</Text>
          <Text style={[styles.barSub, { color: t.text3 }]}>
            {regionLabel} · live · {sourceCount} sources
          </Text>
        </View>
        <ThemeToggle />
        <View style={{ position: 'relative' }}>
          <Icons.Bell size={18} color={t.text2} />
          {(pendingTriggers.length > 0 || criticalCount > 0) && (
            <View style={[styles.badge, { backgroundColor: t.alert, borderColor: t.bg }]} />
          )}
        </View>
        <Avatar initials={initials} size={30} />
      </View>

      {/* Search + filter */}
      <View style={[styles.searchRow, { paddingHorizontal: 16, paddingVertical: 12 }]}>
        <View style={[styles.searchBox, { backgroundColor: t.surface, borderColor: t.line }]}>
          <Icons.Search size={15} color={t.text3} />
          <Text style={[styles.searchPlaceholder, { color: t.text3 }]}>SKU, region, source...</Text>
        </View>
        <View style={[styles.filterBtn, { backgroundColor: t.surface, borderColor: t.line }]}>
          <Icons.Filter size={16} color={t.text2} />
        </View>
      </View>

      {/* Summary strip */}
      <View style={styles.summaryStrip}>
        {summaryItems.map(s => (
          <View key={s.l} style={[styles.summaryCard, { backgroundColor: t.surface, borderColor: t.line }]}>
            <Text style={[styles.summaryNum, { color: s.color }]}>{s.v}</Text>
            <Text style={[styles.summaryLabel, { color: t.text3 }]}>{s.l.toUpperCase()}</Text>
          </View>
        ))}
      </View>

      <SectionLabel right="auto-refresh · 30s">Live · today</SectionLabel>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>

        {/* Pending approval triggers */}
        {pendingTriggers.length > 0 && (
          <View style={{ gap: 8, marginBottom: 4 }}>
            <Text style={[styles.sectionHeader, { color: t.warn }]}>PENDING APPROVAL</Text>
            {pendingTriggers.map((trigger, i) => (
              <PendingTriggerCard
                key={trigger._id || i}
                trigger={trigger}
                onApprove={(id) => removePending(id)}
                onReject={(id) => removePending(id)}
                isDismissing={dismissingIds.includes(String(trigger._id))}
                onRemove={(id) => { removePending(id); unmarkDismissing(id); }}
              />
            ))}
          </View>
        )}

        {/* Auto-trigger events */}
        {autoTriggerEvents.length > 0 && (
          <View style={{ gap: 6, marginBottom: 4 }}>
            <Text style={[styles.sectionHeader, { color: '#6ADE95' }]}>AUTO-TRIGGERED</Text>
            {autoTriggerEvents.slice(0, 3).map((ev, i) => (
              <View key={i} style={styles.autoEventCard}>
                <Text style={styles.autoEventIcon}>🤖</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.autoEventTitle}>Agent pipeline fired — {ev.sku}</Text>
                  <Text style={styles.autoEventSub}>
                    Stock {ev.current_stock} &lt; threshold {ev.threshold}
                  </Text>
                </View>
                <Text style={styles.autoEventTime}>
                  {new Date(ev.timestamp).toLocaleTimeString()}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Live stock ticker strip */}
        {stockData.length > 0 && (
          <View style={[styles.stockStrip, { backgroundColor: t.surface, borderColor: t.line }]}>
            <Text style={[styles.stockStripLabel, { color: t.text3 }]}>LIVE STOCK</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {stockData.map(s => {
                  const color = s.status === 'critical' ? '#D45C48'
                    : s.status === 'warning' ? '#D4A840'
                    : '#6ADE95';
                  return (
                    <View key={s.sku} style={[styles.stockChip, { borderColor: color + '44' }]}>
                      <Text style={[styles.stockChipSku, { color }]}>{s.sku}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
                        <Text style={[styles.stockChipVal, { color: t.text }]}>
                          {s.current_stock?.toLocaleString()}
                        </Text>
                        <Text style={{ fontSize: 12, color: s.trend === 'down' ? '#D45C48' : s.trend === 'up' ? '#6ADE95' : '#615B54' }}>
                          {s.trend === 'down' ? '↓' : s.trend === 'up' ? '↑' : '–'}
                        </Text>
                      </View>
                      <Text style={[styles.stockChipPct, { color }]}>
                        {s.pct}%
                      </Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Crisis cards */}
        {isLoading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Spinner color={t.pulse} />
          </View>
        ) : (
          CRISES.map((c) => {
            // Override severity with live stock status if available
            const liveStock = stockData.find(s => s.sku === c.sku);
            const liveSeverity = liveStock?.status === 'critical' ? 'alert'
              : liveStock?.status === 'warning' ? 'warn'
              : liveStock?.status === 'low'     ? 'warn'
              : null;
            const severity = liveSeverity
              ?? (c.stockoutRisk > 70 ? 'alert' : c.stockoutRisk > 30 ? 'warn' : 'info');
            const severityLabel = severity === 'alert' ? 'critical' : severity === 'warn' ? 'watch' : 'resolved';
            const headline = liveStock
              ? `${liveStock.current_stock?.toLocaleString()} units in stock · ${c.headline || `Stockout risk ${c.stockoutRisk}%`}`
              : (c.headline || `Stockout risk ${c.stockoutRisk}%`);
            return (
              <TouchableOpacity
                key={c._id || c.id}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Detail', { crisis: c })}
                style={[styles.crisisCard, {
                  backgroundColor: toneCardBg(severity),
                  borderColor: toneCardBorder(severity),
                }]}
              >
                <View style={[styles.rail, { backgroundColor: toneColor(severity) }]} />
                <View style={styles.cardInner}>
                  <View style={styles.cardRow}>
                    <Pill tone={TONE_MAP[severity] || 'info'}>{severityLabel}</Pill>
                    <Text style={[styles.crisisId, { color: t.text3 }]}>{c._id?.substring(0, 8) || c.id}</Text>
                    <Text style={[styles.timeAgo, { color: t.text3 }]}>{timeAgo(c.createdAt)}</Text>
                  </View>
                  <Text style={[styles.skuName, { color: t.text }]}>{c.sku}</Text>
                  <Text style={[styles.region, { color: t.text3 }]}>{c.region}</Text>
                  <Text style={[styles.headline, { color: t.text2 }]}>{headline}</Text>

                  {/* Live stock mini-bar for this SKU */}
                  <StockMiniBar sku={c.sku} stockData={stockData} />

                  <View style={[styles.cardFooter, { borderTopColor: t.line }]}>
                    <Text style={[styles.metaSmall, { color: t.text3 }]}>{c.sources || sourceCount} sources</Text>
                    <Text style={{ color: t.text3 }}> · </Text>
                    {c.conflicts > 0 || severity === 'alert'
                      ? <Text style={[styles.conflicts, { color: t.warn }]}>conflicts detected</Text>
                      : <Text style={[styles.metaSmall, { color: t.text3 }]}>no conflicts</Text>
                    }
                    <View style={{ flex: 1 }} />
                    <Text style={[styles.hint, { color: t.text2 }]}>{getHint(c, severity)}</Text>
                    <Icons.Chevron size={14} color={t.text3} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Stock-only products (added via + Product, no crisis entry yet) */}
        {stockData.filter(s => !CRISES.some(c => c.sku === s.sku)).length > 0 && (
          <View style={{ gap: 8 }}>
            <Text style={[styles.sectionHeader, { color: t.text3 }]}>ALL INVENTORY</Text>
            {stockData
              .filter(s => !CRISES.some(c => c.sku === s.sku))
              .map(s => {
                const severity = s.status === 'critical' ? 'alert'
                  : s.status === 'warning' || s.status === 'low' ? 'warn'
                  : 'info';
                const pct = Math.max(0, Math.min(100, s.pct ?? 100));
                const barColor = severity === 'alert' ? t.alert : severity === 'warn' ? t.warn : t.ok;
                return (
                  <View key={s.sku} style={[styles.crisisCard, {
                    backgroundColor: toneCardBg(severity),
                    borderColor: toneCardBorder(severity),
                  }]}>
                    <View style={[styles.rail, { backgroundColor: toneColor(severity) }]} />
                    <View style={styles.cardInner}>
                      <View style={styles.cardRow}>
                        <Pill tone={TONE_MAP[severity] || 'info'}>
                          {severity === 'alert' ? 'critical' : severity === 'warn' ? 'watch' : 'normal'}
                        </Pill>
                        <Text style={[styles.crisisId, { color: t.text3 }]}>{s.category || 'stock'}</Text>
                        <Text style={[styles.timeAgo, { color: t.text3 }]}>live</Text>
                      </View>
                      <Text style={[styles.skuName, { color: t.text }]}>{s.sku}</Text>
                      <Text style={[styles.region, { color: t.text3 }]}>{s.product_name}</Text>
                      <Text style={[styles.headline, { color: t.text2 }]}>
                        {s.current_stock?.toLocaleString()} units · supplier: {s.supplier || '—'}
                      </Text>
                      {/* Mini stock bar */}
                      <View style={{ marginTop: 6, gap: 4 }}>
                        <View style={{ height: 4, backgroundColor: '#332E29', borderRadius: 2, overflow: 'hidden' }}>
                          <View style={{ height: '100%', width: `${pct}%`, backgroundColor: barColor, borderRadius: 2 }} />
                        </View>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: barColor }}>
                          {s.current_stock?.toLocaleString()} / {s.initial_stock?.toLocaleString()} units · {pct}%
                          {s.trend === 'down' ? ' ↓' : s.trend === 'up' ? ' ↑' : ''}
                        </Text>
                      </View>
                      <View style={[styles.cardFooter, { borderTopColor: t.line }]}>
                        <Text style={[styles.metaSmall, { color: t.text3 }]}>
                          threshold: {s.threshold} · -{s.sales_per_tick}/tick
                        </Text>
                        <View style={{ flex: 1 }} />
                        <Text style={[styles.hint, { color: t.text2 }]}>
                          {severity === 'alert' ? 'Immediate action needed'
                            : severity === 'warn' ? 'Monitor closely'
                            : 'No action required'}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: {
    paddingHorizontal: 16, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderBottomWidth: 1,
  },
  logoMark: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  barTitle: { fontSize: 16, fontWeight: '600', letterSpacing: -0.2 },
  barSub: { fontSize: 11, letterSpacing: 0.2 },
  badge: {
    position: 'absolute', top: -2, right: -3,
    width: 8, height: 8, borderRadius: 4, borderWidth: 1.5,
  },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchBox: {
    flex: 1, height: 40, borderRadius: 10, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12,
  },
  searchPlaceholder: { fontSize: 13 },
  filterBtn: {
    width: 40, height: 40, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  summaryStrip: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 4 },
  summaryCard: { flex: 1, borderRadius: 10, borderWidth: 1, padding: 10 },
  summaryNum: { fontSize: 22, fontWeight: '500', letterSpacing: -0.5 },
  summaryLabel: { fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 1 },

  sectionHeader: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },

  autoEventCard: { flexDirection: 'row', gap: 10, backgroundColor: '#1C3E2C', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#6ADE9544', alignItems: 'center' },
  autoEventIcon: { fontSize: 18 },
  autoEventTitle: { fontSize: 12, fontWeight: '700', color: '#6ADE95' },
  autoEventSub:   { fontSize: 11, color: '#B7AFA7', marginTop: 1 },
  autoEventTime:  { fontSize: 10, color: '#615B54' },

  stockStrip: { borderRadius: 12, padding: 12, borderWidth: 1, marginBottom: 4 },
  stockStripLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  stockChip: { borderRadius: 10, borderWidth: 1, padding: 8, alignItems: 'center', minWidth: 80 },
  stockChipSku: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5, fontFamily: 'monospace' },
  stockChipVal: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  stockChipPct: { fontSize: 10, fontWeight: '600', marginTop: 1 },

  list: { paddingHorizontal: 16, gap: 10 },
  crisisCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden', position: 'relative' },
  rail: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  cardInner: { padding: 14, paddingLeft: 16 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  crisisId: { fontSize: 11, letterSpacing: 0.3 },
  timeAgo: { fontSize: 11, marginLeft: 'auto' },
  skuName: { fontSize: 16, fontWeight: '600', letterSpacing: -0.2, marginBottom: 2 },
  region: { fontSize: 12, marginBottom: 8 },
  headline: { fontSize: 13, lineHeight: 18, marginBottom: 4 },
  cardFooter: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth,
  },
  metaSmall: { fontSize: 11, letterSpacing: 0.2 },
  conflicts: { fontSize: 11, letterSpacing: 0.2, fontWeight: '600' },
  hint: { fontSize: 12 },
});
