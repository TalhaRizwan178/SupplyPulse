import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import { Icons } from '../components/Icons';
import { Pill, ThemeToggle, Avatar, SectionLabel } from '../components/Atoms';
import useAppStore from '../store/useAppStore';
import { getBackendUrl } from '../utils/api';

const SOURCES = [
  { id: 'wh', l: 'Warehouse CSV',   sub: 'gdrive · auto-sync 5m',  ok: true },
  { id: 'ps', l: 'POS feed',        sub: 'oracle-retail · live',   ok: true },
  { id: 'sp', l: 'Supplier emails', sub: 'imap · 4 inboxes',       ok: true },
  { id: 'cx', l: 'Complaints',      sub: 'zendesk · webhook',      ok: true },
  { id: 'nw', l: 'News scrape',     sub: 'GDELT · 12h',            ok: false },
];

const healthyCount = SOURCES.filter(s => s.ok).length;

function Row({ icon, title, sub, right, danger, t }) {
  return (
    <View style={[styles.row, { borderBottomColor: t.line }]}>
      <View style={[styles.rowIcon, { backgroundColor: t.surface, borderColor: t.line }]}>
        {icon}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.rowTitle, { color: danger ? t.alert : t.text }]}>{title}</Text>
        {sub ? <Text style={[styles.rowSub, { color: t.text3 }]}>{sub}</Text> : null}
      </View>
      {right}
    </View>
  );
}

function Toggle({ on, onPress, t }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.toggle, { backgroundColor: on ? t.pulse : t.surface2, borderColor: on ? t.pulse : t.line2 }]}>
        <View style={[styles.toggleKnob, {
          backgroundColor: on ? t.onPulse : t.text2,
          left: on ? 17 : 1,
        }]} />
      </View>
    </TouchableOpacity>
  );
}

const ROLE_LABEL = { admin: 'Administrator', ops: 'Ops Manager', analyst: 'Analyst', director: 'Director' };

async function saveSetting(key, value) {
  await fetch(`${getBackendUrl()}/api/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value }),
  });
}

export default function SettingsScreen({ navigation }) {
  const { theme: t, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const authToken          = useAppStore(state => state.authToken);
  const currentUser        = useAppStore(state => state.currentUser);
  const autoTriggerEnabled = useAppStore(state => state.autoTriggerEnabled);
  const setAutoTriggerEnabled = useAppStore(state => state.setAutoTriggerEnabled);
  const autoApproveEnabled = useAppStore(state => state.autoApproveEnabled);
  const setAutoApproveEnabled = useAppStore(state => state.setAutoApproveEnabled);
  const pauseOnFailure     = useAppStore(state => state.pauseOnFailure);
  const setPauseOnFailure  = useAppStore(state => state.setPauseOnFailure);

  const [teamMembers, setTeamMembers] = useState([]);

  const initials = currentUser?.email
    ? currentUser.email.split('@')[0].slice(0, 2).toUpperCase()
    : '??';
  const roleLabel = ROLE_LABEL[currentUser?.role] || currentUser?.role || 'User';

  // Load team members (admin only)
  useEffect(() => {
    if (currentUser?.role !== 'admin') return;
    fetch(`${getBackendUrl()}/api/auth/users`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then(r => r.json())
      .then(users => { if (Array.isArray(users)) setTeamMembers(users); })
      .catch(() => {});
  }, [authToken, currentUser?.role]);

  const makeToggle = (val, setVal, key) => async () => {
    const next = !val;
    setVal(next);
    try { await saveSetting(key, next); }
    catch { setVal(!next); }
  };

  const toggleAutoTrigger  = makeToggle(autoTriggerEnabled, setAutoTriggerEnabled, 'autoTriggerEnabled');
  const toggleAutoApprove  = makeToggle(autoApproveEnabled,  setAutoApproveEnabled,  'autoApproveEnabled');
  const togglePauseFailure = makeToggle(pauseOnFailure,      setPauseOnFailure,      'pauseOnFailure');

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      {/* App bar */}
      <View style={[styles.appBar, { backgroundColor: t.bg, borderBottomColor: t.line, paddingTop: insets.top, height: 54 + insets.top }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.appBarSub, { color: t.text3 }]}>karachi-north</Text>
          <Text style={[styles.appBarTitle, { color: t.text }]}>Settings</Text>
        </View>
        <ThemeToggle />
        <Icons.Search size={18} color={t.text2} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile */}
        <View style={[styles.profile, { borderBottomColor: t.line }]}>
          <Avatar initials={initials} size={52} tone={t.pulseDim} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, { color: t.text }]} numberOfLines={1}>{currentUser?.email || '—'}</Text>
            <Text style={[styles.profileRole, { color: t.text2 }]}>{roleLabel} · karachi-north</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <Pill tone="ok">active</Pill>
            </View>
          </View>
        </View>

        {/* Appearance */}
        <SectionLabel right="syncs across devices">Appearance</SectionLabel>
        <Row t={t}
          icon={<Icons.Moon size={14} color={t.text2} />}
          title="Theme"
          sub={mode === 'dark' ? 'dark · command-center default' : 'light · bright mode'}
          right={<ThemeToggle size="lg" />}
        />

        {/* Data sources */}
        <SectionLabel right={`${healthyCount} of ${SOURCES.length} healthy`}>Data sources</SectionLabel>
        {SOURCES.map(s => (
          <Row key={s.id} t={t}
            icon={<Text style={[styles.srcId, { color: s.ok ? t.ok : t.alert }]}>{s.id.toUpperCase()}</Text>}
            title={s.l}
            sub={s.sub}
            right={s.ok ? <Pill tone="ok">live</Pill> : <Pill tone="alert">stale</Pill>}
          />
        ))}

        {/* Agent & budgets */}
        <SectionLabel>Agent & budgets</SectionLabel>
        <Row t={t}
          icon={<Icons.Spark size={15} color={t.pulse} />}
          title="Antigravity model"
          sub="ag-pro-1 · streaming · 32k ctx"
          right={<Icons.Chevron color={t.text3} />}
        />
        <Row t={t}
          icon={<Text style={[styles.pkrIcon, { color: t.text2 }]}>PKR</Text>}
          title="Daily budget cap"
          sub="PKR 500,000 per crisis"
          right={<Icons.Chevron color={t.text3} />}
        />
        <Row t={t}
          icon={<Icons.Spark size={15} color={autoTriggerEnabled ? t.ok : t.warn} />}
          title="Auto-trigger agents"
          sub={autoTriggerEnabled
            ? 'Agents fire automatically on stock breach — even when app is closed'
            : 'Approval required in app before agents run'}
          right={<Toggle on={autoTriggerEnabled} onPress={toggleAutoTrigger} t={t} />}
        />
        <Row t={t}
          icon={<Icons.Bell size={15} color={autoApproveEnabled ? t.ok : t.text2} />}
          title="Auto-approve under"
          sub={autoApproveEnabled ? 'PKR 50k · low-risk SKUs auto-approved' : 'All orders require approval'}
          right={<Toggle on={autoApproveEnabled} onPress={toggleAutoApprove} t={t} />}
        />
        <Row t={t}
          icon={<Icons.Warn size={15} color={pauseOnFailure ? t.warn : t.text2} />}
          title="Pause on failure"
          sub={pauseOnFailure ? 'Will ask before running recovery branch' : 'Recovery runs automatically'}
          right={<Toggle on={pauseOnFailure} onPress={togglePauseFailure} t={t} />}
        />

        {/* Team */}
        {currentUser?.role === 'admin' && (
          <>
            <SectionLabel right={teamMembers.length ? `${teamMembers.length} members` : ''}>Team</SectionLabel>
            {teamMembers.map(u => {
              const ini = u.email ? u.email.split('@')[0].slice(0, 2).toUpperCase() : '??';
              const tone = u.role === 'director' ? t.infoDim : u.role === 'analyst' ? t.warnDim : t.pulseDim;
              const roleLbl = ROLE_LABEL[u.role] || u.role;
              return (
                <Row key={u._id} t={t}
                  icon={<Avatar initials={ini} size={28} tone={tone} />}
                  title={u.email}
                  sub={`${roleLbl} · ${u.isActive !== false ? 'active' : 'inactive'}`}
                  right={<Pill tone={u.isActive !== false ? 'ok' : 'alert'}>{u.isActive !== false ? 'active' : 'off'}</Pill>}
                />
              );
            })}
            <Row t={t}
              icon={<Icons.Plus size={16} color={t.text2} />}
              title="Invite teammate"
              sub="email or SSO"
              right={<Icons.Chevron color={t.text3} />}
            />
          </>
        )}

        {/* About */}
        <View style={{ padding: 16, paddingBottom: 32, alignItems: 'center', gap: 14 }}>
          <Text style={[styles.metaSmall, { color: t.text3 }]}>
            SupplyPulse v0.4.1 · build a8f1c · 2026-05
          </Text>
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
  appBarSub: { fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' },
  appBarTitle: { fontSize: 17, fontWeight: '600', letterSpacing: -0.3 },
  profile: {
    padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: 1,
  },
  profileName: { fontSize: 16, fontWeight: '600' },
  profileRole: { fontSize: 12.5, marginTop: 2 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: {
    width: 32, height: 32, borderRadius: 9, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  rowTitle: { fontSize: 14.5 },
  rowSub: { fontSize: 11.5, marginTop: 1 },
  toggle: {
    width: 36, height: 20, borderRadius: 999, borderWidth: 1, position: 'relative', flexShrink: 0,
  },
  toggleKnob: {
    position: 'absolute', top: 1, width: 16, height: 16, borderRadius: 8,
  },
  metaSmall: { fontSize: 11, letterSpacing: 0.2 },
  srcId: { fontSize: 11, fontWeight: '700' },
  pkrIcon: { fontSize: 10, fontWeight: '600' },
  signOutBtn: {
    width: '100%', height: 48, borderRadius: 14, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  signOutText: { fontSize: 15, fontWeight: '600' },
});
