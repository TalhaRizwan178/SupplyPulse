import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Animated, StyleSheet,
} from 'react-native';
import { useTheme } from '../ThemeContext';
import { Icons } from './Icons';

// ─── Pill ────────────────────────────────────────────────────
export function Pill({ tone = 'info', children }) {
  const { theme: t } = useTheme();
  const map = {
    alert: { bg: t.alertDim, color: t.alert, dot: t.alert },
    warn:  { bg: t.warnDim,  color: t.warn,  dot: t.warn },
    ok:    { bg: t.okDim,    color: t.ok,    dot: t.ok },
    info:  { bg: t.infoDim,  color: t.info,  dot: t.info },
    ghost: { bg: 'transparent', color: t.text2, dot: t.text3 },
    pulse: { bg: t.pulseDim,  color: t.pulse, dot: t.pulse },
  };
  const s = map[tone] || map.info;
  return (
    <View style={[styles.pill, { backgroundColor: s.bg }]}>
      <View style={[styles.pillDot, { backgroundColor: s.dot }]} />
      <Text style={[styles.pillText, { color: s.color }]}>{children}</Text>
    </View>
  );
}

// ─── SectionLabel ────────────────────────────────────────────
export function SectionLabel({ children, right }) {
  const { theme: t } = useTheme();
  return (
    <View style={styles.sectionLabelRow}>
      <Text style={[styles.sectionLabelText, { color: t.text3 }]}>{children}</Text>
      {right ? <Text style={[styles.metaText, { color: t.text3 }]}>{right}</Text> : null}
    </View>
  );
}

// ─── Avatar ──────────────────────────────────────────────────
export function Avatar({ initials = 'AK', size = 32, tone }) {
  const { theme: t } = useTheme();
  const bg = tone || t.surface2;
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg, borderColor: t.line }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.34, color: t.text }]}>{initials}</Text>
    </View>
  );
}

// ─── Spinner ─────────────────────────────────────────────────
export function Spinner({ size = 16, color }) {
  const { theme: t } = useTheme();
  const c = color || t.info;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 900, useNativeDriver: true })
    );
    anim.start();
    return () => anim.stop();
  }, [spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <Icons.Pulse size={size} color={c} />
    </Animated.View>
  );
}

// ─── ThemeToggle ─────────────────────────────────────────────
export function ThemeToggle({ size = 'sm' }) {
  const { mode, toggleTheme, theme: t } = useTheme();
  const isDark = mode === 'dark';
  const w = size === 'lg' ? 60 : 50;
  const h = size === 'lg' ? 30 : 26;
  const knob = size === 'lg' ? 24 : 20;
  const gap = 3;

  return (
    <TouchableOpacity
      onPress={toggleTheme}
      style={[styles.toggle, { width: w, height: h, backgroundColor: t.bg2, borderColor: t.line }]}
      activeOpacity={0.8}
    >
      <View style={[styles.toggleKnob, {
        width: knob, height: knob, borderRadius: knob / 2,
        backgroundColor: t.pulse,
        left: isDark ? w - knob - gap - 1 : gap,
        top: gap,
      }]}>
        {isDark
          ? <Icons.Moon size={size === 'lg' ? 13 : 11} color={t.onPulse} />
          : <Icons.Sun  size={size === 'lg' ? 13 : 11} color={t.onPulse} />}
      </View>
    </TouchableOpacity>
  );
}

// ─── AppBar ──────────────────────────────────────────────────
export function AppBar({ onBack, title, sub, right, navigation }) {
  const { theme: t } = useTheme();
  return (
    <View style={[styles.appBar, { backgroundColor: t.bg, borderBottomColor: t.line }]}>
      {onBack || navigation ? (
        <TouchableOpacity onPress={onBack || (() => navigation.goBack())} style={styles.appBarBack}>
          <Icons.Back size={20} color={t.text2} />
        </TouchableOpacity>
      ) : null}
      <View style={{ flex: 1 }}>
        {sub ? <Text style={[styles.appBarSub, { color: t.text3 }]}>{sub}</Text> : null}
        <Text style={[styles.appBarTitle, { color: t.text }]}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

// ─── Card ────────────────────────────────────────────────────
export function Card({ children, style }) {
  const { theme: t } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.line }, style]}>
      {children}
    </View>
  );
}

// ─── Btn ─────────────────────────────────────────────────────
export function Btn({ children, variant = 'default', onPress, style }) {
  const { theme: t } = useTheme();
  const variantStyle = {
    default: { bg: t.surface, border: t.line, color: t.text },
    primary: { bg: t.pulse, border: t.pulse, color: t.onPulse },
    danger:  { bg: 'transparent', border: t.alert, color: t.alert },
  }[variant] || { bg: t.surface, border: t.line, color: t.text };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[styles.btn, { backgroundColor: variantStyle.bg, borderColor: variantStyle.border }, style]}
    >
      {typeof children === 'string'
        ? <Text style={[styles.btnText, { color: variantStyle.color }]}>{children}</Text>
        : children}
    </TouchableOpacity>
  );
}

// ─── Meta / EyebrowText helpers ──────────────────────────────
export function Meta({ children, style }) {
  const { theme: t } = useTheme();
  return <Text style={[styles.metaText, { color: t.text3 }, style]}>{children}</Text>;
}

export function Eyebrow({ children, style }) {
  const { theme: t } = useTheme();
  return <Text style={[styles.eyebrow, { color: t.text3 }, style]}>{children}</Text>;
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 999,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 10, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' },

  sectionLabelRow: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8,
  },
  sectionLabelText: { fontSize: 10, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },

  avatar: {
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  avatarText: { fontWeight: '500' },

  toggle: {
    borderRadius: 999, borderWidth: 1, position: 'relative',
    overflow: 'hidden',
  },
  toggleKnob: {
    position: 'absolute',
    alignItems: 'center', justifyContent: 'center',
  },

  appBar: {
    height: 54, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderBottomWidth: 1, flexShrink: 0,
  },
  appBarBack: { padding: 2, marginRight: 2 },
  appBarTitle: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
  appBarSub: { fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 1 },

  card: {
    borderRadius: 14, borderWidth: 1, padding: 14,
  },

  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 48, paddingHorizontal: 18, borderRadius: 14, borderWidth: 1,
  },
  btnText: { fontSize: 15, fontWeight: '600' },

  metaText: { fontSize: 11, letterSpacing: 0.2 },
  eyebrow: { fontSize: 10, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
});
