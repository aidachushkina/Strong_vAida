import { ExpoConfig, ConfigContext } from 'expo/config';

/**
 * Expo app config. Reads Supabase credentials from environment variables
 * (loaded from .env via the `dotenv` that Expo CLI applies) and exposes them
 * to the running app through `expo-constants` (`Constants.expoConfig.extra`).
 *
 * Never hardcode secrets here. The anon key is safe to ship in a client app
 * (RLS is what protects the data), but we still keep it out of source control.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Strong vAida',
  slug: 'strong-vaida',
  version: '0.1.0',
  orientation: 'portrait',
  scheme: 'strongvaida',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.strongvaida.app',
  },
  android: {
    package: 'com.strongvaida.app',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-image-picker',
      {
        photosPermission:
          'Allow Strong vAida to access your videos so you can upload technique clips for your trainer.',
        cameraPermission:
          'Allow Strong vAida to use the camera so you can record technique clips for your trainer.',
      },
    ],
  ],
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
});
