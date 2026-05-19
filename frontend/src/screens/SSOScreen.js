import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image, TextInput, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import { Icons } from '../components/Icons';
import { Eyebrow } from '../components/Atoms';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import useAppStore from '../store/useAppStore';
import { getBackendUrl } from '../utils/api';

const SSO_PROVIDERS = [
  { id: 'google',    label: 'Google Workspace',  icon: 'G',  color: '#4285F4' },
  { id: 'microsoft', label: 'Microsoft Azure AD', icon: 'M',  color: '#00A4EF' },
  { id: 'saml',      label: 'SAML / Okta',        icon: 'S',  color: '#007DC1' },
];

const navigateByRole = (navigation, role) => {
  if (role === 'analyst') navigation.replace('AnalystMain');
  else if (role === 'director' || role === 'dir') navigation.replace('DirectorMain');
  else navigation.replace('Main');
};

export default function SSOScreen({ navigation }) {
  const { theme: t } = useTheme();
  const insets = useSafeAreaInsets();
  const setAuthToken = useAppStore(state => state.setAuthToken);
  const setCurrentUser = useAppStore(state => state.setCurrentUser);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(null);

  const handleSSO = async (provider) => {
    if (!email.trim()) {
      Toast.show({ type: 'error', text1: 'Email required', text2: 'Enter your work email before choosing a provider.' });
      return;
    }

    setLoading(provider.id);
    try {
      const res = await axios.post(`${getBackendUrl()}/api/auth/sso`, {
        provider: provider.id,
        ssoToken: 'mock-sso-token',
        email: email.trim(),
      });

      const { role } = res.data.user;
      setAuthToken(res.data.token);
      setCurrentUser(res.data.user);
      Toast.show({ type: 'success', text1: 'SSO Login Successful', text2: `Signed in via ${provider.label} (${role})` });
      navigateByRole(navigation, role);
    } catch (err) {
      Toast.show({ type: 'error', text1: 'SSO Failed', text2: err.response?.data?.message || 'Authentication failed. Try again.' });
    } finally {
      setLoading(null);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: t.bg, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* App bar */}
      <View style={[styles.appBar, { borderBottomColor: t.line }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icons.Back size={20} color={t.text2} />
        </TouchableOpacity>
        <Text style={[styles.appBarTitle, { color: t.text }]}>Single Sign-On</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Logo */}
        <View style={styles.logoWrap}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logoMark}
            resizeMode="contain"
          />
          <Text style={[styles.logoText, { color: t.text }]}>
            Supply<Text style={{ color: t.pulse }}>Pulse</Text>
          </Text>
          <Text style={[styles.logoSub, { color: t.text3 }]}>
            Sign in with your organisation account
          </Text>
        </View>

        {/* Email input */}
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
              editable={!loading}
            />
          </View>
        </View>

        {/* SSO providers */}
        <View style={styles.providers}>
          {SSO_PROVIDERS.map(p => {
            const isLoading = loading === p.id;
            const isDisabled = !!loading && !isLoading;
            return (
              <TouchableOpacity
                key={p.id}
                onPress={() => handleSSO(p)}
                activeOpacity={0.75}
                disabled={!!loading}
                style={[
                  styles.providerBtn,
                  { backgroundColor: t.surface, borderColor: isLoading ? t.pulse : t.line, opacity: isDisabled ? 0.45 : 1 },
                ]}
              >
                <View style={[styles.providerIcon, { backgroundColor: p.color }]}>
                  {isLoading
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.providerIconText}>{p.icon}</Text>
                  }
                </View>
                <Text style={[styles.providerLabel, { color: t.text }]}>
                  {isLoading ? 'Authenticating...' : `Continue with ${p.label}`}
                </Text>
                {!isLoading && <Icons.Chevron size={16} color={t.text3} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Domain hint */}
        <View style={[styles.domainCard, { backgroundColor: t.surface, borderColor: t.line }]}>
          <Text style={[styles.domainEyebrow, { color: t.text3 }]}>ORGANISATION DOMAIN</Text>
          <Text style={[styles.domainText, { color: t.text2 }]}>distco.pk · region 03</Text>
        </View>

        <Text style={[styles.footerNote, { color: t.text3 }]}>
          Your credentials are never stored by SupplyPulse.{'\n'}Authentication is handled entirely by your identity provider.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  appBar: {
    height: 54, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 2 },
  appBarTitle: { fontSize: 16, fontWeight: '600' },
  body: { padding: 24, gap: 24 },
  logoWrap: { alignItems: 'center', gap: 12 },
  logoMark: { width: 120, height: 120 },
  logoText: { fontSize: 26, fontWeight: '600', letterSpacing: -0.5 },
  logoSub: { fontSize: 13, textAlign: 'center' },
  field: { gap: 6 },
  input: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, height: 48,
  },
  inputText: { fontSize: 15 },
  providers: { gap: 10 },
  providerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1, borderRadius: 14, padding: 14,
  },
  providerIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  providerIconText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  providerLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  domainCard: {
    borderRadius: 12, borderWidth: 1, padding: 14, gap: 4,
  },
  domainEyebrow: { fontSize: 10, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  domainText: { fontSize: 14 },
  footerNote: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
