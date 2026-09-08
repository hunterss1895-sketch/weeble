import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Input, Screen, Subtitle, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth-context';
import { colors } from '@/lib/theme';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('demo@weeble.com');
  const [password, setPassword] = useState('demo1234');
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      Alert.alert('Sign in failed', e instanceof Error ? e.message : 'Try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'center' }}
      >
        <Text style={styles.brand}>WEEBLE</Text>
        <Title>Sign in</Title>
        <Subtitle>Same account as weeble.com — flat black, instant eSIM.</Subtitle>
        <View style={{ height: 22 }} />
        <Card>
          <Input
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            style={styles.inputFlush}
          />
          <View style={{ height: 10 }} />
          <Input
            secureTextEntry
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            autoComplete="password"
            style={styles.inputFlush}
          />
          <View style={{ height: 16 }} />
          <Button title="Continue" onPress={onSubmit} loading={loading} />
        </Card>
        <View style={{ height: 16 }} />
        <Link href="/(auth)/signup" style={styles.link}>
          Create a Weeble account
        </Link>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: {
    color: colors.muted2,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 4,
    marginBottom: 14,
  },
  link: { color: colors.muted, textAlign: 'center', fontSize: 14 },
  inputFlush: { backgroundColor: 'rgba(0,0,0,0.25)' },
});
