import React from 'react';
import Svg, {
  Path, Line, Circle, Polyline, Rect, G,
} from 'react-native-svg';

export const Icons = {
  Search: ({ size = 18, color = '#fff', stroke = 1.5 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="6" stroke={color} strokeWidth={stroke} />
      <Line x1="16" y1="16" x2="21" y2="21" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
    </Svg>
  ),
  Filter: ({ size = 18, color = '#fff', stroke = 1.5 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="4" y1="7" x2="20" y2="7" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
      <Line x1="7" y1="12" x2="17" y2="12" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
      <Line x1="10" y1="17" x2="14" y2="17" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
    </Svg>
  ),
  Bell: ({ size = 18, color = '#fff', stroke = 1.5 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 17h14l-2-3v-4a5 5 0 0 0-10 0v4l-2 3z" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="10" y1="20" x2="14" y2="20" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
    </Svg>
  ),
  Back: ({ size = 20, color = '#fff', stroke = 1.5 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="20" y1="12" x2="5" y2="12" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
      <Polyline points="11 6 5 12 11 18" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  Chevron: ({ size = 16, color = '#fff', stroke = 1.5 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="9 6 15 12 9 18" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  Check: ({ size = 16, color = '#fff', stroke = 2 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="5 12 10 17 19 7" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  X: ({ size = 16, color = '#fff', stroke = 1.8 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
      <Line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
    </Svg>
  ),
  Plus: ({ size = 16, color = '#fff', stroke = 1.8 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="12" y1="5" x2="12" y2="19" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
      <Line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
    </Svg>
  ),
  Dots: ({ size = 18, color = '#fff' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Circle cx="6" cy="12" r="1.4" fill={color} />
      <Circle cx="12" cy="12" r="1.4" fill={color} />
      <Circle cx="18" cy="12" r="1.4" fill={color} />
    </Svg>
  ),
  Pulse: ({ size = 20, color = '#fff', stroke = 1.6 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="2 12 6 12 9 5 13 19 16 12 22 12" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  Box: ({ size = 18, color = '#fff', stroke = 1.4 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="7" width="16" height="13" rx="1" stroke={color} strokeWidth={stroke} />
      <Line x1="4" y1="11" x2="20" y2="11" stroke={color} strokeWidth={stroke} />
    </Svg>
  ),
  Trace: ({ size = 18, color = '#fff', stroke = 1.4 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="6" cy="6" r="2" stroke={color} strokeWidth={stroke} />
      <Circle cx="18" cy="6" r="2" stroke={color} strokeWidth={stroke} />
      <Circle cx="6" cy="18" r="2" stroke={color} strokeWidth={stroke} />
      <Circle cx="18" cy="18" r="2" stroke={color} strokeWidth={stroke} />
      <Line x1="6" y1="8" x2="6" y2="16" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
      <Line x1="8" y1="6" x2="16" y2="6" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
      <Line x1="8" y1="18" x2="16" y2="18" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
    </Svg>
  ),
  Gear: ({ size = 18, color = '#fff', stroke = 1.4 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={stroke} />
      <Path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
    </Svg>
  ),
  Spark: ({ size = 16, color = '#fff', stroke = 1.4 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" stroke={color} strokeWidth={stroke} strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  ),
  Warn: ({ size = 16, color = '#fff', stroke = 1.6 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3l10 18H2L12 3z" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="12" y1="10" x2="12" y2="14" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
      <Circle cx="12" cy="17" r="0.6" fill={color} />
    </Svg>
  ),
  Lock: ({ size = 16, color = '#fff', stroke = 1.5 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="5" y="11" width="14" height="9" rx="1.5" stroke={color} strokeWidth={stroke} />
      <Path d="M8 11V8a4 4 0 0 1 8 0v3" stroke={color} strokeWidth={stroke} strokeLinejoin="round" />
    </Svg>
  ),
  Mail: ({ size = 16, color = '#fff', stroke = 1.5 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="6" width="18" height="13" rx="1.5" stroke={color} strokeWidth={stroke} />
      <Polyline points="3 7 12 13 21 7" stroke={color} strokeWidth={stroke} strokeLinejoin="round" />
    </Svg>
  ),
  ArrowRight: ({ size = 14, color = '#fff', stroke = 1.6 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="4" y1="12" x2="20" y2="12" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
      <Polyline points="14 6 20 12 14 18" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  ArrowUp: ({ size = 12, color = '#fff', stroke = 1.8 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="12" y1="19" x2="12" y2="5" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
      <Polyline points="6 11 12 5 18 11" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  Sun: ({ size = 14, color = '#fff', stroke = 1.6 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="3.6" fill={color} />
      <Line x1="12" y1="2.5" x2="12" y2="5.2" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
      <Line x1="12" y1="18.8" x2="12" y2="21.5" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
      <Line x1="2.5" y1="12" x2="5.2" y2="12" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
      <Line x1="18.8" y1="12" x2="21.5" y2="12" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
    </Svg>
  ),
  Moon: ({ size = 14, color = '#fff' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" fill={color} />
    </Svg>
  ),
  Eye: ({ size = 16, color = '#fff', stroke = 1.5 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M1 12S5 5 12 5s11 7 11 7-4 7-11 7S1 12 1 12z" stroke={color} strokeWidth={stroke} strokeLinejoin="round" />
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={stroke} />
    </Svg>
  ),
  EyeOff: ({ size = 16, color = '#fff', stroke = 1.5 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="2" y1="2" x2="22" y2="22" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
      <Path d="M6.7 6.7A10 10 0 0 0 1 12s4 7 11 7a10 10 0 0 0 5.3-1.7" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9.9 4.2A10 10 0 0 1 12 4c7 0 11 8 11 8a13 13 0 0 1-1.7 2.7" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
    </Svg>
  ),
};
