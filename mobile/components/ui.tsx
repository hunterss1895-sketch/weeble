import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { colors } from '@/lib/theme';

export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const content = <View style={styles.cardInner}>{children}</View>;
  if (Platform.OS === 'web') {
    return <View style={[styles.card, styles.cardFallback, style]}>{content}</View>;
  }
  return (
    <View style={[styles.card, style]}>
      <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.cardOverlay]} />
      {content}
    </View>
  );
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
    <View style={[styles.badge, { borderColor: c, backgroundColor: `${c}18` }]}>
      <Text style={{ color: c, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 20, paddingTop: 8 },
  card: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glass,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  cardFallback: {
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  cardOverlay: {
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  cardInner: {
    padding: 14,
  },
  title: { color: colors.text, fontSize: 26, fontWeight: '600', letterSpacing: -0.6 },
  subtitle: { color: colors.muted, fontSize: 14, marginTop: 4, lineHeight: 20 },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  btn: {
    borderRadius: 999,
    paddingVertical: 13,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhost: {
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  btnText: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
});
