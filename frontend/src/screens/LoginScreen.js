import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, TextInput, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import { Icons } from '../components/Icons';
import { Pill, ThemeToggle, Btn, Eyebrow } from '../components/Atoms';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import useAppStore from '../store/useAppStore';

import { getBackendUrl } from '../utils/api';

export default function LoginScreen({ navigation }) {
  const { theme: t } = useTheme();
  const insets = useSafeAreaInsets();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const setAuthToken = useAppStore(state => state.setAuthToken);
  const setCurrentUser = useAppStore(state => state.setCurrentUser);

  const handleLogin = async () => {
    if (!email || !password) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Please fill in all fields' });
      return;
    }
    
    try {
      setLoading(true);
      const res = await axios.post(`${getBackendUrl()}/api/auth/login`, {
        email: email.trim(),
        password: password
      });
      
      const { role } = res.data.user;
      setAuthToken(res.data.token);
      setCurrentUser(res.data.user);
      Toast.show({ type: 'success', text1: 'Login Successful', text2: `Welcome back (${role})` });

      if (role === 'analyst') navigation.replace('AnalystMain');
      else if (role === 'director') navigation.replace('DirectorMain');
      else if (role === 'admin') navigation.replace('AdminMain');
      else navigation.replace('Main');
      
    } catch (err) {
      console.log('Login error:', err);
      Toast.show({ type: 'error', text1: 'Login Failed', text2: err.response?.data?.message || 'Invalid credentials' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <ScrollView contentContainerStyle={[styles.body, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logoMark}
            resizeMode="contain"
          />
          <Text style={[styles.appName, { color: t.text }]}>SupplyPulse</Text>
          <ThemeToggle />
        </View>

        <Text style={[styles.headline, { color: t.text }]}>
          Sign in to your{'\n'}command post.
        </Text>
        <Text style={[styles.subline, { color: t.text3 }]}>
          karachi-north · region 03 · 18 SKUs under watch
        </Text>

        {/* Email field */}
        <View style={styles.field}>
          <Eyebrow>Work email</Eyebrow>
          <View style={[styles.input, { backgroundColor: t.surface, borderColor: t.line }]}>
            <Icons.Mail size={16} color={t.text3} />
            <TextInput
              style={[styles.inputText, { color: t.text, flex: 1, outlineStyle: 'none' }]}
              placeholder="email@company.com"
              placeholderTextColor={t.text3}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>
        </View>

        {/* Password field */}
        <View style={styles.field}>
          <Eyebrow>Password</Eyebrow>
          <View style={[styles.input, { backgroundColor: t.surface, borderColor: t.line }]}>
            <Icons.Lock size={16} color={t.text3} />
            <TextInput
              style={[styles.inputText, { color: t.text, flex: 1, outlineStyle: 'none' }]}
              placeholder="••••••••••"
              placeholderTextColor={t.text3}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)} hitSlop={8}>
              {showPassword
                ? <Icons.EyeOff size={16} color={t.text3} />
                : <Icons.Eye size={16} color={t.text3} />
              }
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 24 }} />

        {/* CTA */}
        <Btn
          variant="primary"
          onPress={handleLogin}
          style={{ width: '100%' }}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={t.onPulse} />
          ) : (
            <>
              <Text style={[styles.btnLabel, { color: t.onPulse }]}>Sign In</Text>
              <Icons.ArrowRight size={14} color={t.onPulse} stroke={2} />
            </>
          )}
        </Btn>

        <TouchableOpacity
          onPress={() => navigation.navigate('SSO')}
          style={[styles.ssoBtn, { borderColor: t.line }]}
          activeOpacity={0.75}
        >
          <Text style={[styles.ssoBtnText, { color: t.text2 }]}>Continue with SSO</Text>
          <Icons.ArrowRight size={13} color={t.text3} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Register')}
          style={[styles.ssoBtn, { borderColor: t.line, marginTop: 12, backgroundColor: t.surface2 }]}
          activeOpacity={0.75}
        >
          <Text style={[styles.ssoBtnText, { color: t.pulse }]}>Create New Organization</Text>
          <Icons.Plus size={13} color={t.pulse} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { padding: 22 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 36 },
  logoMark: { width: 64, height: 64 },
  appName: { flex: 1, fontSize: 17, fontWeight: '600', letterSpacing: -0.2 },
  headline: { fontSize: 26, fontWeight: '500', letterSpacing: -0.5, lineHeight: 34, marginBottom: 8 },
  subline: { fontSize: 11, letterSpacing: 0.3, marginBottom: 28 },
  field: { marginBottom: 14 },
  input: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, height: 48,
  },
  inputText: { fontSize: 15 },
  roleCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 12, borderWidth: 1,
  },
  radioOuter: {
    width: 18, height: 18, borderRadius: 9, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  radioInner: { width: 8, height: 8, borderRadius: 4 },
  roleLabel: { fontSize: 15, fontWeight: '500' },
  roleDesc: { fontSize: 12, marginTop: 1 },
  btnLabel: { fontSize: 15, fontWeight: '600' },
  ssoBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 48, borderRadius: 14, borderWidth: 1, marginTop: 10,
  },
  ssoBtnText: { fontSize: 15, fontWeight: '500' },
});
