import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { colors } from '@/lib/theme';

export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Subtitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.subtitle}>{children}</Text>;
}

export function Muted({ children }: { children: React.ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}) {
  const bg =
    variant === 'primary' ? colors.text : variant === 'danger' ? colors.danger : 'transparent';
  const fg = variant === 'primary' ? colors.bg : colors.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, opacity: disabled || loading ? 0.5 : pressed ? 0.85 : 1 },
        variant === 'ghost' && styles.btnGhost,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.btnText, { color: fg }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Input(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.muted2}
      {...props}
      style={[styles.input, props.style]}
    />
  );
}

export function Badge({ label, tone = 'default' }: { label: string; tone?: 'default' | 'green' | 'amber' }) {
  const c =
    tone === 'green' ? colors.success : tone === 'amber' ? colors.amber : colors.muted;
  return (
    <View style={[styles.badge, { borderColor: c }]}>
      <Text style={{ color: c, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 20, paddingTop: 12 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { color: colors.text, fontSize: 28, fontWeight: '600', letterSpacing: -0.5 },
  subtitle: { color: colors.muted, fontSize: 15, marginTop: 6, lineHeight: 22 },
  muted: { color: colors.muted, fontSize: 13 },
  btn: {
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhost: { borderWidth: 1, borderColor: colors.borderLight },
  btnText: { fontSize: 15, fontWeight: '600' },
  input: {
    backgroundColor: colors.cardAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 16,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
});
