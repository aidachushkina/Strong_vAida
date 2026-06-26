import { Stack } from 'expo-router';
import { colors } from '@/theme/theme';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="trainer" options={{ title: 'Dashboard' }} />
      <Stack.Screen name="client" options={{ title: 'Home' }} />
      <Stack.Screen name="link-trainer" options={{ title: 'Connect with trainer' }} />
    </Stack>
  );
}
