import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { colors } from '@/theme/theme';

/**
 * Entry route. The root layout has already ensured we have a session by the
 * time we get here; we just route by role once the profile loads.
 */
export default function Index() {
  const { session, profile } = useAuth();

  if (!session) return <Redirect href="/(auth)/sign-in" />;

  // Wait for the profile (created by the signup trigger) to be readable.
  if (!profile) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return profile.role === 'trainer'
    ? <Redirect href="/(app)/trainer" />
    : <Redirect href="/(app)/client" />;
}
