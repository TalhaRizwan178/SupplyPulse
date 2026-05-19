import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Returns the backend base URL.
 * - Web: localhost (same machine)
 * - Native (Expo Go / dev build): derives IP from the Metro bundler host so
 *   it works on both physical devices and emulators without manual config.
 * - Fallback: Android emulator loopback (10.0.2.2)
 */
export const getBackendUrl = () => {
  if (Platform.OS === 'web') return 'http://localhost:5000';

  const metroHost =
    Constants.expoConfig?.hostUri?.split(':')[0] ||
    Constants.manifest?.debuggerHost?.split(':')[0];

  if (metroHost) return `http://${metroHost}:5000`;

  return 'http://10.0.2.2:5000';
};
