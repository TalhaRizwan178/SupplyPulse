import React from 'react';
import { View, Text, Platform, useWindowDimensions, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { ThemeProvider, useTheme } from './src/ThemeContext';
import { Icons } from './src/components/Icons';
import { io } from 'socket.io-client';
import useAppStore from './src/store/useAppStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import axios from 'axios';

axios.interceptors.request.use(
  (config) => {
    const token = useAppStore.getState().authToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const queryClient = new QueryClient();

import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import SSOScreen from './src/screens/SSOScreen';
import FeedScreen from './src/screens/FeedScreen';
import DetailScreen from './src/screens/DetailScreen';
import ContradictionScreen from './src/screens/ContradictionScreen';
import ApprovalScreen from './src/screens/ApprovalScreen';
import ExecutionScreen from './src/screens/ExecutionScreen';
import FailureScreen from './src/screens/FailureScreen';
import OutcomesScreen from './src/screens/OutcomesScreen';
import TraceScreen from './src/screens/TraceScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import PlansScreen from './src/screens/PlansScreen';
import AnalystScreen from './src/screens/AnalystScreen';
import DirectorScreen from './src/screens/DirectorScreen';
import AdminScreen from './src/screens/AdminScreen';
import SupplierUploadScreen from './src/screens/SupplierUploadScreen';
import StockMonitorScreen from './src/screens/StockMonitorScreen';
import ComplaintLogScreen from './src/screens/ComplaintLogScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const FeedStack = createStackNavigator();

function FeedStackNavigator() {
  return (
    <FeedStack.Navigator screenOptions={{ headerShown: false }}>
      <FeedStack.Screen name="Feed" component={FeedScreen} />
      <FeedStack.Screen name="Detail" component={DetailScreen} />
      <FeedStack.Screen name="Contradiction" component={ContradictionScreen} />
      <FeedStack.Screen name="Approval" component={ApprovalScreen} />
      <FeedStack.Screen name="Execution" component={ExecutionScreen} />
      <FeedStack.Screen name="Failure" component={FailureScreen} />
      <FeedStack.Screen name="Outcomes" component={OutcomesScreen} />
      <FeedStack.Screen name="Trace" component={TraceScreen} />
    </FeedStack.Navigator>
  );
}

function MainTabs() {
  const { theme: t } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: t.bg2,
          borderTopColor: t.line,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 4,
          paddingTop: 6,
        },
        tabBarActiveTintColor: t.pulse,
        tabBarInactiveTintColor: t.text3,
        tabBarLabelStyle: {
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="FeedTab"
        component={FeedStackNavigator}
        options={{
          tabBarLabel: 'Feed',
          tabBarIcon: ({ color }) => <Icons.Pulse size={18} color={color} />,
        }}
      />
      <Tab.Screen
        name="Plans"
        component={PlansScreen}
        options={{
          tabBarLabel: 'Plans',
          tabBarIcon: ({ color }) => <Icons.Box size={18} color={color} />,
        }}
      />
      <Tab.Screen
        name="TraceTab"
        component={TraceScreen}
        options={{
          tabBarLabel: 'Trace',
          tabBarIcon: ({ color }) => <Icons.Trace size={18} color={color} />,
        }}
      />
      <Tab.Screen
        name="StockMonitor"
        component={StockMonitorScreen}
        options={{
          tabBarLabel: 'Stock',
          tabBarIcon: ({ color }) => <Icons.Pulse size={18} color={color} />,
        }}
      />
      <Tab.Screen
        name="Complaints"
        component={ComplaintLogScreen}
        options={{
          tabBarLabel: 'Complaints',
          tabBarIcon: ({ color }) => <Icons.Bell size={18} color={color} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color }) => <Icons.Gear size={18} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

function AnalystTabs() {
  const { theme: t } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: t.bg2, borderTopColor: t.line, borderTopWidth: 1,
          height: 60 + insets.bottom, paddingBottom: insets.bottom + 4, paddingTop: 6,
        },
        tabBarActiveTintColor: t.info,
        tabBarInactiveTintColor: t.text3,
        tabBarLabelStyle: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
      }}
    >
      <Tab.Screen name="AnalystFeed" component={AnalystScreen}
        options={{ tabBarLabel: 'Feed', tabBarIcon: ({ color }) => <Icons.Pulse size={18} color={color} /> }} />
      <Tab.Screen name="AnalystTrace" component={TraceScreen}
        options={{ tabBarLabel: 'Trace', tabBarIcon: ({ color }) => <Icons.Trace size={18} color={color} /> }} />
      <Tab.Screen name="AnalystSettings" component={SettingsScreen}
        options={{ tabBarLabel: 'Settings', tabBarIcon: ({ color }) => <Icons.Gear size={18} color={color} /> }} />
    </Tab.Navigator>
  );
}

function DirectorTabs() {
  const { theme: t } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: t.bg2, borderTopColor: t.line, borderTopWidth: 1,
          height: 60 + insets.bottom, paddingBottom: insets.bottom + 4, paddingTop: 6,
        },
        tabBarActiveTintColor: t.warn,
        tabBarInactiveTintColor: t.text3,
        tabBarLabelStyle: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
      }}
    >
      <Tab.Screen name="DirectorDash" component={DirectorScreen}
        options={{ tabBarLabel: 'Escalations', tabBarIcon: ({ color }) => <Icons.Warn size={18} color={color} /> }} />
      <Tab.Screen name="DirectorTrace" component={TraceScreen}
        options={{ tabBarLabel: 'Trace', tabBarIcon: ({ color }) => <Icons.Trace size={18} color={color} /> }} />
      <Tab.Screen name="DirectorSettings" component={SettingsScreen}
        options={{ tabBarLabel: 'Settings', tabBarIcon: ({ color }) => <Icons.Gear size={18} color={color} /> }} />
    </Tab.Navigator>
  );
}

function AdminTabs() {
  const { theme: t } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: t.bg2, borderTopColor: t.line, borderTopWidth: 1,
          height: 60 + insets.bottom, paddingBottom: insets.bottom + 4, paddingTop: 6,
        },
        tabBarActiveTintColor: t.alert,
        tabBarInactiveTintColor: t.text3,
        tabBarLabelStyle: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
      }}
    >
      <Tab.Screen name="AdminUsers" component={AdminScreen}
        options={{ tabBarLabel: 'Users', tabBarIcon: ({ color }) => <Icons.Gear size={18} color={color} /> }} />
      <Tab.Screen name="AdminSuppliers" component={SupplierUploadScreen}
        options={{ tabBarLabel: 'Suppliers', tabBarIcon: ({ color }) => <Icons.Box size={18} color={color} /> }} />
    </Tab.Navigator>
  );
}

function AppNavigation() {
  const { mode } = useTheme();
  const authToken = useAppStore(state => state.authToken);
  
  const setSocketConnected    = useAppStore(state => state.setSocketConnected);
  const addAgentTrace         = useAppStore(state => state.addAgentTrace);
  const setAgentStatus        = useAppStore(state => state.setAgentStatus);
  const setOutcomes           = useAppStore(state => state.setOutcomes);
  const addAutoTriggerEvent   = useAppStore(state => state.addAutoTriggerEvent);
  const setStockData          = useAppStore(state => state.setStockData);
  const addPendingTrigger     = useAppStore(state => state.addPendingTrigger);
  const setPendingTriggers    = useAppStore(state => state.setPendingTriggers);
  const setAutoTriggerEnabled = useAppStore(state => state.setAutoTriggerEnabled);
  const setAutoApproveEnabled = useAppStore(state => state.setAutoApproveEnabled);
  const setPauseOnFailure     = useAppStore(state => state.setPauseOnFailure);
  const markDismissing        = useAppStore(state => state.markDismissing);

  React.useEffect(() => {
    if (!authToken) return;

    const { getBackendUrl } = require('./src/utils/api');
    const BASE = getBackendUrl();
    const headers = { Authorization: `Bearer ${authToken}` };

    // Load settings + pending triggers from server
    fetch(`${BASE}/api/settings`, { headers })
      .then(r => r.json())
      .then(s => {
        if (s.autoTriggerEnabled  !== undefined) setAutoTriggerEnabled(s.autoTriggerEnabled);
        if (s.autoApproveEnabled  !== undefined) setAutoApproveEnabled(s.autoApproveEnabled);
        if (s.pauseOnFailure      !== undefined) setPauseOnFailure(s.pauseOnFailure);
      })
      .catch(() => {});

    fetch(`${BASE}/api/settings/pending-triggers`, { headers })
      .then(r => r.json())
      .then(list => { if (Array.isArray(list)) setPendingTriggers(list); })
      .catch(() => {});

    // Load initial stock data
    fetch(`${BASE}/api/stock`, { headers })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setStockData(data); })
      .catch(() => {});

    const socket = io(BASE, {
      auth: { token: authToken },
      query: { token: authToken }
    });

    socket.on('connect', () => {
      setSocketConnected(true);
      console.log('Connected to agent backend');
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socket.on('agent_trace', (trace) => {
      addAgentTrace(trace);
    });

    socket.on('agent_status', (data) => {
      setAgentStatus(data.status);
      if (data.outcomes) setOutcomes(data.outcomes);
    });

    socket.on('auto_trigger', (event) => {
      addAutoTriggerEvent(event);
    });

    socket.on('stock_update', (data) => {
      setStockData(data);
    });

    socket.on('pending_trigger', (event) => {
      addPendingTrigger(event);
    });

    socket.on('trigger_approved', ({ triggerId }) => {
      markDismissing(triggerId);
    });

    return () => {
      socket.disconnect();
    };
  }, [authToken]);

  return (
    <NavigationContainer>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="SSO" component={SSOScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="AdminMain" component={AdminTabs} />
        <Stack.Screen name="AnalystMain" component={AnalystTabs} />
        <Stack.Screen name="DirectorMain" component={DirectorTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ─── Responsive phone-frame wrapper for web desktop ──────────
function DesktopFrame({ children }) {
  const { theme: t } = useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width > 768;

  if (!isDesktop) return <>{children}</>;

  return (
    <View style={[desktopStyles.canvas, { backgroundColor: '#17140F' }]}>
      <View style={desktopStyles.frameWrap}>
        {/* Phone shell */}
        <View style={[desktopStyles.phone, { borderColor: '#3E382F' }]}>
          {/* Top notch bar */}
          <View style={[desktopStyles.statusBar, { backgroundColor: '#111' }]}>
            <View style={[desktopStyles.notch, { backgroundColor: '#1A1A1A' }]}>
              <View style={desktopStyles.camera} />
            </View>
          </View>
          {/* Screen */}
          <View style={desktopStyles.screenArea}>
            {children}
          </View>
          {/* Home indicator */}
          <View style={[desktopStyles.homeBar, { backgroundColor: '#111' }]}>
            <View style={[desktopStyles.homeIndicator, { backgroundColor: '#3E382F' }]} />
          </View>
        </View>

        {/* Floating label */}
        <View style={desktopStyles.badge}>
          <View style={[desktopStyles.badgeDot, { backgroundColor: t.pulse }]} />
          <Text style={[desktopStyles.badgeText, { color: t.text2 }]}>
            SupplyPulse · Android · v0.4.1
          </Text>
        </View>
      </View>
    </View>
  );
}

const desktopStyles = StyleSheet.create({
  canvas: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
  },
  frameWrap: { alignItems: 'center', gap: 24 },
  phone: {
    width: 412 + 20,
    borderRadius: 50,
    borderWidth: 10,
    backgroundColor: '#0D0B08',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 32 },
    shadowOpacity: 0.7,
    shadowRadius: 80,
    elevation: 30,
  },
  statusBar: {
    height: 40, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 4,
  },
  notch: {
    width: 130, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  camera: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: '#333',
  },
  screenArea: {
    width: 412, height: 812,
    alignSelf: 'center', overflow: 'hidden',
  },
  homeBar: {
    height: 32, alignItems: 'center', justifyContent: 'center',
  },
  homeIndicator: { width: 120, height: 5, borderRadius: 3 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 12, letterSpacing: 0.5 },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ThemeProvider>
            <DesktopFrame>
              <AppNavigation />
              <Toast />
            </DesktopFrame>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
