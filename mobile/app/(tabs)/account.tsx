import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Muted, Screen, Subtitle, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth-context';
import { API_BASE_URL } from '@/lib/config';
import { colors } from '@/lib/theme';

export default function AccountScreen() {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);

  async function onLogout() {
    setLoading(true);
    try {
      await signOut();
    } catch (e) {
      Alert.alert('Logout failed', e instanceof Error ? e.message : 'Try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Title>Account</Title>
      <Subtitle>Weeble profile and session.</Subtitle>
      <View style={{ height: 20 }} />
      <Card>
        <Text style={styles.label}>Name</Text>
        <Text style={styles.value}>{user?.name || '—'}</Text>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{user?.email}</Text>
        <Text style={styles.label}>User ID</Text>
        <Text style={[styles.value, { fontFamily: 'monospace', fontSize: 12 }]}>{user?.id}</Text>
        <Text style={styles.label}>API</Text>
        <Muted>{API_BASE_URL}</Muted>
      </Card>
      <View style={{ height: 24 }} />
      <Button title="Log out" onPress={onLogout} loading={loading} variant="ghost" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.muted2,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 4,
  },
  value: { color: colors.text, fontSize: 16 },
});
