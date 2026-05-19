/**
 * ResponsiveWrapper
 *
 * - On a phone (narrow viewport): renders children full-screen.
 * - On a desktop/laptop browser (wide viewport): centers a phone-shaped
 *   frame (412 × 892) on a warm dark canvas, matching the original design.
 */
import React from 'react';
import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { useTheme } from '../ThemeContext';

const PHONE_W = 412;
const PHONE_H = 892;

export default function ResponsiveWrapper({ children }) {
  const { width, height } = useWindowDimensions();
  const { theme: t } = useTheme();
  const isDesktop = Platform.OS === 'web' && width > 768;

  if (!isDesktop) {
    return <>{children}</>;
  }

  return (
    <View style={[styles.canvas, { backgroundColor: '#1a1714' }]}>
      {/* Subtle grid dots */}
      <View style={styles.grid} pointerEvents="none" />

      {/* Centered phone frame */}
      <View style={styles.frameOuter}>
        {/* Frame decoration */}
        <View style={[styles.frame, { borderColor: '#3a3530' }]}>
          {/* Notch */}
          <View style={[styles.notch, { backgroundColor: '#111' }]}>
            <View style={[styles.camera, { backgroundColor: '#222' }]} />
          </View>

          {/* Screen area */}
          <View style={[styles.screen, { width: PHONE_W, height: PHONE_H - 80 }]}>
            {children}
          </View>

          {/* Home indicator */}
          <View style={styles.homeBar}>
            <View style={[styles.homeIndicator, { backgroundColor: '#3a3530' }]} />
          </View>
        </View>

        {/* Label */}
        <View style={styles.label}>
          <View style={[styles.labelDot, { backgroundColor: t.pulse }]} />
          <View style={{ fontSize: 11 }}>
            <View style={{ flexDirection: 'row' }}>
              <View style={[{ fontSize: 11, color: t.text2 }]}>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
  },
  grid: { position: 'absolute', inset: 0 },
  frameOuter: { alignItems: 'center', gap: 20 },
  frame: {
    borderRadius: 50, borderWidth: 10,
    overflow: 'hidden', alignItems: 'center',
    backgroundColor: '#111',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.6,
    shadowRadius: 60,
    elevation: 20,
  },
  notch: {
    width: 120, height: 28, borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    position: 'absolute', top: 0, zIndex: 10,
  },
  camera: { width: 10, height: 10, borderRadius: 5 },
  screen: { overflow: 'hidden' },
  homeBar: { height: 30, alignItems: 'center', justifyContent: 'center' },
  homeIndicator: { width: 100, height: 4, borderRadius: 2 },
  label: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  labelDot: { width: 6, height: 6, borderRadius: 3 },
});
