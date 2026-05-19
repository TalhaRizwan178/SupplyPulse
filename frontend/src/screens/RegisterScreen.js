import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import { Icons } from '../components/Icons';
import { Pill, ThemeToggle, Btn, Eyebrow, AppBar } from '../components/Atoms';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import useAppStore from '../store/useAppStore';
import { getBackendUrl } from '../utils/api';

export default function RegisterScreen({ navigation }) {
  const { theme: t } = useTheme();
  const insets = useSafeAreaInsets();
  
  const [step, setStep] = useState(1);
  const [orgName, setOrgName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [adminFullName, setAdminFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const setAuthToken = useAppStore(state => state.setAuthToken);
  const setCurrentUser = useAppStore(state => state.setCurrentUser);

  const handleNextStep = () => {
    if (!orgName || !businessEmail) {
      Toast.show({ type: 'error', text1: 'Required', text2: 'Please fill in all organization details' });
      return;
    }
    if (!businessEmail.includes('@')) {
      Toast.show({ type: 'error', text1: 'Invalid Email', text2: 'Please enter a valid business email' });
      return;
    }
    setStep(2);
  };

  const handleRegister = async () => {
    if (!adminFullName || !email || !password) {
      Toast.show({ type: 'error', text1: 'Required', text2: 'Please fill in all admin credentials' });
      return;
    }
    if (!email.includes('@')) {
      Toast.show({ type: 'error', text1: 'Invalid Email', text2: 'Please enter a valid personal email' });
      return;
    }
    if (password.length < 6) {
      Toast.show({ type: 'error', text1: 'Weak Password', text2: 'Password must be at least 6 characters' });
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(`${getBackendUrl()}/api/auth/signup`, {
        orgName: orgName.trim(),
        businessEmail: businessEmail.trim(),
        adminFullName: adminFullName.trim(),
        email: email.trim(),
        password: password
      });

      const { role } = res.data.user;
      setAuthToken(res.data.token);
      setCurrentUser(res.data.user);
      
      Toast.show({
        type: 'success',
        text1: 'Organization Created',
        text2: `Welcome to SupplyPulse, ${adminFullName}!`
      });

      // Navigate to AdminMain
      navigation.replace('AdminMain');
    } catch (err) {
      console.log('Signup error:', err);
      Toast.show({
        type: 'error',
        text1: 'Signup Failed',
        text2: err.response?.data?.error || err.response?.data?.message || 'Server error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <View style={[styles.screen, { backgroundColor: t.bg }]}>
        <AppBar
          title={step === 1 ? "Create Organization" : "Admin Credentials"}
          sub={`STEP ${step} OF 2`}
          onBack={step === 2 ? () => setStep(1) : () => navigation.goBack()}
        />
        
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 16 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Progress Indicators */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: t.line }]}>
              <View style={[styles.progressFill, { width: step === 1 ? '50%' : '100%', backgroundColor: t.pulse }]} />
            </View>
            <View style={styles.stepBadges}>
              <Pill tone={step === 1 ? 'pulse' : 'ok'}>1. Organization</Pill>
              <Pill tone={step === 2 ? 'pulse' : 'ghost'}>2. Admin Setup</Pill>
            </View>
          </View>

          {step === 1 ? (
            <View style={styles.formContainer}>
              <Text style={[styles.headline, { color: t.text }]}>
                Deploy your supply chain command center.
              </Text>
              <Text style={[styles.subline, { color: t.text3 }]}>
                Set up your company workspace to enable multi-tenant isolation, real-time alerts, and autonomous reorder agents.
              </Text>

              {/* Organization Name */}
              <View style={styles.field}>
                <Eyebrow>Organization / Company Name</Eyebrow>
                <View style={[styles.input, { backgroundColor: t.surface, borderColor: t.line }]}>
                  <Icons.Box size={16} color={t.text3} />
                  <TextInput
                    style={[styles.inputText, { color: t.text, flex: 1, outlineStyle: 'none' }]}
                    placeholder="e.g. PepsiCo Pakistan / DistCo Karachi"
                    placeholderTextColor={t.text3}
                    value={orgName}
                    onChangeText={setOrgName}
                  />
                </View>
              </View>

              {/* Business Email */}
              <View style={styles.field}>
                <Eyebrow>Business Contact Email</Eyebrow>
                <View style={[styles.input, { backgroundColor: t.surface, borderColor: t.line }]}>
                  <Icons.Mail size={16} color={t.text3} />
                  <TextInput
                    style={[styles.inputText, { color: t.text, flex: 1, outlineStyle: 'none' }]}
                    placeholder="contact@company.com"
                    placeholderTextColor={t.text3}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={businessEmail}
                    onChangeText={setBusinessEmail}
                  />
                </View>
              </View>

              <View style={{ height: 24 }} />

              <Btn
                variant="primary"
                onPress={handleNextStep}
                style={{ width: '100%' }}
              >
                <Text style={[styles.btnLabel, { color: t.onPulse }]}>Next: Admin Credentials</Text>
                <Icons.ArrowRight size={14} color={t.onPulse} stroke={2} />
              </Btn>
            </View>
          ) : (
            <View style={styles.formContainer}>
              <Text style={[styles.headline, { color: t.text }]}>
                Create your Admin profile.
              </Text>
              <Text style={[styles.subline, { color: t.text3 }]}>
                As admin of <Text style={{ fontWeight: '600', color: t.pulse }}>{orgName}</Text>, you will be able to add teammates, configure agent parameters, and upload suppliers.
              </Text>

              {/* Full Name */}
              <View style={styles.field}>
                <Eyebrow>Admin Full Name</Eyebrow>
                <View style={[styles.input, { backgroundColor: t.surface, borderColor: t.line }]}>
                  <Icons.Trace size={16} color={t.text3} />
                  <TextInput
                    style={[styles.inputText, { color: t.text, flex: 1, outlineStyle: 'none' }]}
                    placeholder="e.g. Muhammad Talha"
                    placeholderTextColor={t.text3}
                    value={adminFullName}
                    onChangeText={setAdminFullName}
                  />
                </View>
              </View>

              {/* Personal login email */}
              <View style={styles.field}>
                <Eyebrow>Work Login Email</Eyebrow>
                <View style={[styles.input, { backgroundColor: t.surface, borderColor: t.line }]}>
                  <Icons.Mail size={16} color={t.text3} />
                  <TextInput
                    style={[styles.inputText, { color: t.text, flex: 1, outlineStyle: 'none' }]}
                    placeholder="talha@company.com"
                    placeholderTextColor={t.text3}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.field}>
                <Eyebrow>Login Password</Eyebrow>
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

              <Btn
                variant="primary"
                onPress={handleRegister}
                style={{ width: '100%' }}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={t.onPulse} />
                ) : (
                  <>
                    <Text style={[styles.btnLabel, { color: t.onPulse }]}>Create command post & Sign In</Text>
                    <Icons.Check size={14} color={t.onPulse} stroke={2} />
                  </>
                )}
              </Btn>
            </View>
          )}

          {/* Go to Login Screen */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={[styles.loginBtn, { borderColor: t.line }]}
            activeOpacity={0.75}
          >
            <Text style={[styles.loginBtnText, { color: t.text2 }]}>Already have an account? Sign In</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { padding: 22 },
  progressContainer: { marginBottom: 28, gap: 10 },
  progressBar: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  stepBadges: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  formContainer: { gap: 4 },
  headline: { fontSize: 24, fontWeight: '500', letterSpacing: -0.5, lineHeight: 30, marginBottom: 8 },
  subline: { fontSize: 13, lineHeight: 18, marginBottom: 24 },
  field: { marginBottom: 14 },
  input: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, height: 48, marginTop: 4,
  },
  inputText: { fontSize: 15 },
  btnLabel: { fontSize: 15, fontWeight: '600' },
  loginBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 48, borderRadius: 14, borderWidth: 1, marginTop: 20,
  },
  loginBtnText: { fontSize: 15, fontWeight: '500' },
});
