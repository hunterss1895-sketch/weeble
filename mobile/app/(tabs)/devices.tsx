import { useCallback, useFocusEffect } from 'react';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Badge, Card, Muted, Screen, Subtitle, Title } from '@/components/ui';
import { fetchDevices, type Device } from '@/lib/api';
import { colors, formatData } from '@/lib/theme';

export default function DevicesScreen() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await fetchDevices();
      setDevices(res.devices || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load devices');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: 20, marginBottom: 8 }}>
        <Title>Devices</Title>
        <Subtitle>Your eSIMs — nickname, ICCID, QR install.</Subtitle>
      </View>
      {loading ? (
        <ActivityIndicator color={colors.text} style={{ marginTop: 40 }} />
      ) : error ? (
        <View style={{ padding: 20 }}>
          <Muted>{error}</Muted>
        </View>
      ) : (
        <FlatList
          data={devices}
          keyExtractor={(d) => d.id}
          contentContainerStyle={{ padding: 20, gap: 14 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={colors.text}
            />
          }
          ListEmptyComponent={
            <Card>
              <Muted>No devices yet. Purchase a plan to get an eSIM QR.</Muted>
            </Card>
          }
          renderItem={({ item }) => (
            <Card>
              <View style={styles.head}>
                <Text style={styles.nick}>{item.nickname}</Text>
                <Badge
                  label={item.status}
                  tone={item.status === 'active' ? 'green' : 'amber'}
                />
              </View>
              <Text style={styles.label}>ICCID</Text>
              <Text style={styles.mono}>{item.iccid}</Text>
              {item.plan ? (
                <>
                  <Text style={styles.label}>Plan</Text>
                  <Text style={styles.body}>
                    {item.plan.name}
                    {item.dataRemainingMb != null
                      ? ` · ${formatData(item.dataRemainingMb)} left`
                      : ''}
                  </Text>
                </>
              ) : null}
              {item.activationCode ? (
                <>
                  <Text style={styles.label}>Activation</Text>
                  <Text style={[styles.mono, { fontSize: 11 }]}>{item.activationCode}</Text>
                </>
              ) : null}
              {item.qrPayload ? (
                <View style={styles.qrWrap}>
                  <View style={styles.qrBg}>
                    <QRCode value={item.qrPayload} size={180} backgroundColor="#fff" color="#000" />
                  </View>
                  <Muted>Scan in Settings → Cellular → Add eSIM</Muted>
                </View>
              ) : (
                <Muted>No QR available</Muted>
              )}
            </Card>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  nick: { color: colors.text, fontSize: 17, fontWeight: '600', flex: 1 },
  label: { color: colors.muted2, fontSize: 11, marginTop: 10, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 1 },
  mono: { color: colors.text, fontFamily: 'monospace', fontSize: 13 },
  body: { color: colors.text, fontSize: 14 },
  qrWrap: { alignItems: 'center', marginTop: 16, gap: 10 },
  qrBg: { backgroundColor: '#fff', padding: 12, borderRadius: 12 },
});
