import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextProps,
  View,
  ViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, radius, spacing } from '@/theme/theme';

// --- Screen --------------------------------------------------------------- //
export function Screen({
  children,
  scroll = true,
  style,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewProps['style'];
}) {
  const inner = (
    <View style={[styles.screenInner, style]}>{children}</View>
  );
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

// --- Text ----------------------------------------------------------------- //
type Variant = 'title' | 'heading' | 'body' | 'muted' | 'label' | 'caption';

const textVariant: Record<Variant, object> = {
  title: { fontSize: font.size.xxl, fontWeight: font.weight.bold, color: colors.text },
  heading: { fontSize: font.size.xl, fontWeight: font.weight.semibold, color: colors.text },
  body: { fontSize: font.size.md, color: colors.text },
  muted: { fontSize: font.size.sm, color: colors.textMuted },
  label: { fontSize: font.size.sm, fontWeight: font.weight.medium, color: colors.textMuted },
  caption: { fontSize: font.size.xs, color: colors.textFaint },
};

export function AppText({
  variant = 'body',
  style,
  ...rest
}: TextProps & { variant?: Variant }) {
  return <Text style={[textVariant[variant], style]} {...rest} />;
}

// --- Button --------------------------------------------------------------- //
export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}: {
  title: string;
  onPress?: PressableProps['onPress'];
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewProps['style'];
}) {
  const isDisabled = disabled || loading;
  const palette = {
    primary: { bg: colors.accent, fg: colors.onAccent },
    secondary: { bg: colors.surfaceAlt, fg: colors.text },
    ghost: { bg: 'transparent', fg: colors.accent },
    danger: { bg: colors.danger, fg: colors.onAccent },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.bg, opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <Text style={[styles.buttonText, { color: palette.fg }]}>{title}</Text>
      )}
    </Pressable>
  );
}

// --- TextField ------------------------------------------------------------ //
export function TextField({
  label,
  style,
  ...rest
}: TextInputProps & { label?: string }) {
  return (
    <View style={styles.field}>
      {label ? <AppText variant="label" style={styles.fieldLabel}>{label}</AppText> : null}
      <TextInput
        placeholderTextColor={colors.textFaint}
        style={[styles.input, style]}
        {...rest}
      />
    </View>
  );
}

// --- Card ----------------------------------------------------------------- //
export function Card({ children, style }: { children: React.ReactNode; style?: ViewProps['style'] }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// --- Divider / spacing helper -------------------------------------------- //
export function Spacer({ size = spacing.md }: { size?: number }) {
  return <View style={{ height: size }} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  screenInner: { flex: 1, paddingHorizontal: spacing.xl },
  scrollContent: { paddingBottom: spacing.xxl, flexGrow: 1 },
  button: {
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  buttonText: { fontSize: font.size.md, fontWeight: font.weight.semibold },
  field: { marginBottom: spacing.lg },
  fieldLabel: { marginBottom: spacing.xs },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    fontSize: font.size.md,
    color: colors.text,
  },
  card: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
});
