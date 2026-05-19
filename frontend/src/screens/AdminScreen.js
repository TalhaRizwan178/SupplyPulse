import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import { Icons } from '../components/Icons';
import { Pill, ThemeToggle, Avatar, SectionLabel, Eyebrow } from '../components/Atoms';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import useAppStore from '../store/useAppStore';
import { getBackendUrl } from '../utils/api';

const ROLES = ['ops', 'analyst', 'director'];

const ROLE_TONE = { admin: 'alert', ops: 'ok', analyst: 'info', director: 'warn' };

export default function AdminScreen({ navigation }) {
  const { theme: t } = useTheme();
  const insets = useSafeAreaInsets();
  const authToken = useAppStore(state => state.authToken);
  const queryClient = useQueryClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('ops');
  const [creating, setCreating] = useState(false);
  const [resending, setResending] = useState(null); // userId being resent
  const [resendModal, setResendModal] = useState(null); // { id, email }
  const [resendPassword, setResendPassword] = useState('');

  const headers = { Authorization: `Bearer ${authToken}` };

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: async () => {
      const res = await axios.get(`${getBackendUrl()}/api/auth/users`, { headers });
      return res.data;
    },
    enabled: !!authToken,
  });

  const handleResendConfirm = async () => {
    if (!resendPassword.trim()) {
      Toast.show({ type: 'error', text1: 'Enter a password to send' });
      return;
    }
    const { id, email } = resendModal;
    setResendModal(null);
    setResending(id);
    try {
      await axios.post(
        `${getBackendUrl()}/api/auth/resend-credentials/${id}`,
        { password: resendPassword },
        { headers }
      );
      Toast.show({ type: 'success', text1: 'Credentials resent', text2: `Email sent to ${email}` });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed', text2: err.response?.data?.message || 'Could not resend' });
    } finally {
      setResending(null);
      setResendPassword('');
    }
  };

  const handleCreate = async () => {
    if (!email.trim() || !password) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Email and password are required' });
      return;
    }
    try {
      setCreating(true);
      await axios.post(`${getBackendUrl()}/api/auth/create-user`, { email: email.trim(), password, role }, { headers });
      Toast.show({ type: 'success', text1: 'User created', text2: `${email.trim()} (${role})` });
      setEmail('');
      setPassword('');
      setRole('ops');
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed', text2: err.response?.data?.message || 'Could not create user' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <View style={[styles.appBar, { backgroundColor: t.bg, borderBottomColor: t.line, paddingTop: insets.top, height: 54 + insets.top }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.appBarSub, { color: t.text3 }]}>system</Text>
          <Text style={[styles.appBarTitle, { color: t.text }]}>Admin Panel</Text>
        </View>
        <ThemeToggle />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Create user form */}
        <SectionLabel>Create User</SectionLabel>

        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.line }]}>
          <View style={styles.field}>
            <Eyebrow>Work email</Eyebrow>
            <View style={[styles.input, { backgroundColor: t.bg, borderColor: t.line }]}>
              <Icons.Mail size={15} color={t.text3} />
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

          <View style={styles.field}>
            <Eyebrow>Password</Eyebrow>
            <View style={[styles.input, { backgroundColor: t.bg, borderColor: t.line }]}>
              <Icons.Lock size={15} color={t.text3} />
              <TextInput
                style={[styles.inputText, { color: t.text, flex: 1, outlineStyle: 'none' }]}
                placeholder="••••••••"
                placeholderTextColor={t.text3}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(v => !v)} hitSlop={8}>
                {showPassword ? <Icons.EyeOff size={15} color={t.text3} /> : <Icons.Eye size={15} color={t.text3} />}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.field}>
            <Eyebrow>Role</Eyebrow>
            <View style={styles.roleRow}>
              {ROLES.map(r => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setRole(r)}
                  style={[styles.roleChip, {
                    backgroundColor: role === r ? t.pulse : t.bg,
                    borderColor: role === r ? t.pulse : t.line,
                  }]}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.roleChipText, { color: role === r ? t.onPulse : t.text2 }]}>
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            onPress={handleCreate}
            disabled={creating}
            style={[styles.createBtn, { backgroundColor: t.pulse, opacity: creating ? 0.6 : 1 }]}
            activeOpacity={0.8}
          >
            {creating
              ? <ActivityIndicator color={t.onPulse} />
              : <Text style={[styles.createBtnText, { color: t.onPulse }]}>Create User</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Users list */}
        <SectionLabel right={`${users.length} total`}>Team Members</SectionLabel>

        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={t.pulse} />
          </View>
        ) : users.length === 0 ? (
          <Text style={[styles.emptyText, { color: t.text3 }]}>No users yet.</Text>
        ) : (
          users.map(u => (
            <View key={u._id} style={[styles.userRow, { borderBottomColor: t.line }]}>
              <Avatar initials={u.email.slice(0, 2).toUpperCase()} size={36} tone={t.pulseDim} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.userEmail, { color: t.text }]} numberOfLines={1}>{u.email}</Text>
                <Text style={[styles.userDate, { color: t.text3 }]}>
                  joined {new Date(u.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <Pill tone={ROLE_TONE[u.role] || 'info'}>{u.role}</Pill>
              <TouchableOpacity
                onPress={() => { setResendModal({ id: u._id, email: u.email }); setResendPassword(''); }}
                disabled={resending === u._id}
                style={[styles.resendBtn, { borderColor: t.line, backgroundColor: t.surface2 }]}
                hitSlop={4}
              >
                {resending === u._id
                  ? <ActivityIndicator size="small" color={t.pulse} />
                  : <Text style={[styles.resendText, { color: t.pulse }]}>Resend</Text>
                }
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* Sign out */}
        <View style={{ padding: 20, paddingBottom: 32 }}>
          <TouchableOpacity
            onPress={() => {
              const root = navigation.getParent() ?? navigation;
              root.reset({ index: 0, routes: [{ name: 'Login' }] });
            }}
            style={[styles.signOutBtn, { borderColor: t.alert }]}
            activeOpacity={0.75}
          >
            <Text style={[styles.signOutText, { color: t.alert }]}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Resend credentials modal */}
      <Modal visible={!!resendModal} transparent animationType="fade" onRequestClose={() => setResendModal(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: t.surface, borderColor: t.line }]}>
            <Text style={[styles.modalTitle, { color: t.text }]}>Resend Credentials</Text>
            <Text style={[styles.modalSub, { color: t.text3 }]}>{resendModal?.email}</Text>
            <Text style={[styles.modalLabel, { color: t.text2 }]}>Enter the password to send</Text>
            <View style={[styles.input, { backgroundColor: t.bg, borderColor: t.line, marginBottom: 16 }]}>
              <Icons.Lock size={15} color={t.text3} />
              <TextInput
                style={[styles.inputText, { color: t.text, flex: 1, outlineStyle: 'none' }]}
                placeholder="Password to send"
                placeholderTextColor={t.text3}
                value={resendPassword}
                onChangeText={setResendPassword}
                autoFocus
              />
            </View>
            <Text style={[styles.modalHint, { color: t.text3 }]}>
              This will update the user's password in the system and email them the new credentials.
            </Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity onPress={() => { setResendModal(null); setResendPassword(''); }} style={[styles.modalBtnCancel, { borderColor: t.line }]}>
                <Text style={[styles.modalBtnCancelText, { color: t.text2 }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleResendConfirm} style={[styles.modalBtnConfirm, { backgroundColor: t.pulse }]}>
                <Text style={[styles.modalBtnConfirmText, { color: t.onPulse }]}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  appBar: {
    paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1,
  },
  appBarSub: { fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' },
  appBarTitle: { fontSize: 17, fontWeight: '600', letterSpacing: -0.3 },
  card: {
    marginHorizontal: 16, marginBottom: 8, borderRadius: 14, borderWidth: 1, padding: 16, gap: 14,
  },
  field: { gap: 6 },
  input: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, height: 44,
  },
  inputText: { fontSize: 14 },
  roleRow: { flexDirection: 'row', gap: 8 },
  roleChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, borderWidth: 1,
  },
  roleChipText: { fontSize: 13, fontWeight: '500', textTransform: 'capitalize' },
  createBtn: {
    height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  createBtnText: { fontSize: 14, fontWeight: '600' },
  loadingRow: { padding: 24, alignItems: 'center' },
  emptyText: { fontSize: 13, textAlign: 'center', padding: 20 },
  userRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  userEmail: { fontSize: 14, fontWeight: '500' },
  userDate: { fontSize: 11, marginTop: 2 },
  resendBtn: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, marginLeft: 6, minWidth: 58, alignItems: 'center',
  },
  resendText: { fontSize: 12, fontWeight: '600' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { width: '100%', maxWidth: 360, borderRadius: 16, borderWidth: 1, padding: 20 },
  modalTitle: { fontSize: 17, fontWeight: '700', marginBottom: 2 },
  modalSub: { fontSize: 12, marginBottom: 16 },
  modalLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  modalHint: { fontSize: 12, lineHeight: 18, marginBottom: 16 },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalBtnCancel: { flex: 1, height: 42, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  modalBtnCancelText: { fontSize: 14, fontWeight: '600' },
  modalBtnConfirm: { flex: 1, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modalBtnConfirmText: { fontSize: 14, fontWeight: '700' },
  signOutBtn: {
    height: 48, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  signOutText: { fontSize: 15, fontWeight: '600' },
});
