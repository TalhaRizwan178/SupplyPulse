import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import { Icons } from '../components/Icons';
import { ThemeToggle } from '../components/Atoms';

export default function SplashScreen({ navigation }) {
  const { theme: t } = useTheme();
  const insets = useSafeAreaInsets();

  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 800, useNativeDriver: true }).start();

    const animateRing = (anim, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(anim, { toValue: 1, duration: 2400, useNativeDriver: true }),
          ]),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );

    animateRing(ring1, 0).start();
    animateRing(ring2, 800).start();
    animateRing(ring3, 1600).start();
  }, []);

  const ringStyle = (anim) => ({
    opacity: anim.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.7, 0] }),
    transform: [{
      scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 2.4] }),
    }],
  });

  return (
    <LinearGradient
      colors={[t.tintPulse, t.bg, t.bg]}
      locations={[0, 0.5, 1]}
      style={[styles.screen, { backgroundColor: t.bg }]}
    >
      <View style={[styles.topRight, { top: insets.top + 10 }]}>
        <ThemeToggle />
      </View>

      <View style={styles.center}>
        {/* Logo */}
        <View style={styles.logoWrap}>
          {[ring1, ring2, ring3].map((anim, i) => (
            <Animated.View
              key={i}
              style={[styles.ring, { borderColor: t.pulse }, ringStyle(anim)]}
            />
          ))}
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        {/* Wordmark */}
        <View style={styles.wordmarkWrap}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={[styles.wordmark, { color: t.text }]}>Supply</Text>
            <Text style={[styles.wordmark, { color: t.pulse }]}>Pulse</Text>
          </View>
          <Text style={[styles.tagline, { color: t.text2 }]}>
            Autonomous crisis response for distributors
          </Text>
        </View>

        {/* Status */}
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: t.pulse }]} />
          <Text style={[styles.statusText, { color: t.text3 }]}>
            INITIALIZING AGENT · V0.4.1
          </Text>
        </View>
      </View>

      {/* Bottom */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={[styles.orchestratedBy, { color: t.text3 }]}>Orchestrated by</Text>
        <Text style={[styles.orchestratedName, { color: t.text2 }]}>GOOGLE · ANTIGRAVITY</Text>

        <TouchableOpacity
          style={[styles.enterBtn, { backgroundColor: t.pulse }]}
          onPress={() => navigation.replace('Login')}
          activeOpacity={0.8}
        >
          <Text style={[styles.enterBtnText, { color: t.onPulse }]}>Enter App</Text>
          <Icons.ArrowRight size={16} color={t.onPulse} stroke={2} />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topRight: { position: 'absolute', top: 52, right: 16, zIndex: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28 },
  logoWrap: {
    width: 210, height: 210,
    alignItems: 'center', justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 205, height: 205, borderRadius: 103,
    borderWidth: 1.5,
  },
  logoImage: {
    width: 190, height: 190,
  },
  wordmarkWrap: { alignItems: 'center', gap: 6 },
  wordmark: { fontSize: 32, fontWeight: '600', letterSpacing: -1 },
  tagline: { fontSize: 13, marginTop: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, letterSpacing: 1.5, fontWeight: '500' },
  bottom: {
    padding: 32, paddingBottom: 48, alignItems: 'center', gap: 6,
  },
  orchestratedBy: { fontSize: 11, letterSpacing: 0.5 },
  orchestratedName: { fontSize: 11, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 24 },
  enterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 28, height: 50, borderRadius: 14,
  },
  enterBtnText: { fontSize: 15, fontWeight: '700' },
});
