import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Input, Screen, Subtitle, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth-context';
import { colors } from '@/lib/theme';

export default function SignupScreen() {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setLoading(true);
    try {
      await signUp(email.trim(), password, name.trim() || undefined);
    } catch (e) {
      Alert.alert('Sign up failed', e instanceof Error ? e.message : 'Try again');
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
        <Title>Create account</Title>
        <Subtitle>One Weeble login for web and mobile.</Subtitle>
        <View style={{ height: 22 }} />
        <Card>
          <Input placeholder="Name (optional)" value={name} onChangeText={setName} style={styles.inputFlush} />
          <View style={{ height: 10 }} />
          <Input
            autoCapitalize="none"
            keyboardType="email-address"
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
            style={styles.inputFlush}
          />
          <View style={{ height: 16 }} />
          <Button title="Create account" onPress={onSubmit} loading={loading} />
        </Card>
        <View style={{ height: 16 }} />
        <Link href="/(auth)/login" style={styles.link}>
          Already have an account? Sign in
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
