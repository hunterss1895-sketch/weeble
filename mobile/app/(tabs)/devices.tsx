import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { Badge, Card, Muted, Screen, Subtitle, Title } from '@/components/ui';
import { fetchDevices, type Device } from '@/lib/api';
import { colors, formatData } from '@/lib/theme';

const QR_MAX_LEN = 2000;

function isImageUri(value: string | null | undefined): boolean {
  if (!value) return false;
  const v = value.trim();
  return v.startsWith('data:image') || /^https?:\/\//i.test(v);
}

function isSafeQrValue(value: string | null | undefined): boolean {
  if (!value) return false;
  const v = value.trim();
  if (!v) return false;
  if (v.startsWith('data:')) return false;
  if (v.length > QR_MAX_LEN) return false;
  if (v.startsWith('{') || v.startsWith('[')) return false;
  return true;
}

/** Prefer short LPA activation string — never a Citrus PNG data URL. */
function resolveInstallString(device: Device): string | null {
  const candidates = [
    device.lpa,
    device.lpaString,
    device.lpa_string,
    device.activationCode,
    device.qrPayload,
  ];
  for (const c of candidates) {
    if (!c) continue;
    const line =
      c
        .split('\n')
        .map((s) => s.trim())
        .find((l) => l.startsWith('LPA:')) || c.trim().split('\n')[0]?.trim();
    if (line && isSafeQrValue(line)) return line;
  }
  return null;
}

function resolveQrImage(device: Device): string | null {
  const candidates = [device.qrImage, device.qrCode, device.qr_code, device.qrPayload];
  for (const c of candidates) {
    if (c && isImageUri(c)) return c.trim();
  }
  return null;
}

async function copyInstallString(text: string) {
  try {
    await Share.share({ message: text, title: 'eSIM install string' });
  } catch {
    Alert.alert('Install string', text);
  }
}

function DeviceQr({ device }: { device: Device }) {
  const installString = resolveInstallString(device);
  const qrImage = resolveQrImage(device);

  if (installString) {
    return (
      <View style={styles.qrWrap}>
        <View style={styles.qrBg}>
          <QRCode value={installString} size={180} backgroundColor="#fff" color="#000" />
        </View>
        <Muted>Scan in Settings → Cellular → Add eSIM</Muted>
        <Text style={[styles.mono, { fontSize: 11, textAlign: 'center' }]}>{installString}</Text>
        <Pressable onPress={() => copyInstallString(installString)} style={styles.copyBtn}>
          <Text style={styles.copyText}>Share / copy install string</Text>
        </Pressable>
      </View>
    );
  }

  if (qrImage) {
    return (
      <View style={styles.qrWrap}>
        <View style={styles.qrBg}>
          <Image source={{ uri: qrImage }} style={{ width: 180, height: 180 }} resizeMode="contain" />
        </View>
        <Muted>Scan in Settings → Cellular → Add eSIM</Muted>
      </View>
    );
  }

  const fallback = (device.activationCode || device.qrPayload || '').trim();
  if (fallback && !isImageUri(fallback) && fallback.length <= QR_MAX_LEN) {
    return (
      <View style={styles.qrWrap}>
        <Muted>Install string</Muted>
        <Text style={[styles.mono, { fontSize: 11, textAlign: 'center' }]}>{fallback}</Text>
        <Pressable onPress={() => copyInstallString(fallback)} style={styles.copyBtn}>
          <Text style={styles.copyText}>Share / copy install string</Text>
        </Pressable>
      </View>
    );
  }

  return <Muted>No QR available</Muted>;
}

export default function DevicesScreen() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await fetchDevices();
      const list = Array.isArray(res?.devices) ? res.devices : [];
      setDevices(list.filter((d): d is Device => !!d && typeof d.id === 'string'));
    } catch (e) {
      setDevices([]);
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
      <View style={{ paddingHorizontal: 20, marginBottom: 6 }}>
        <Title>Devices</Title>
        <Subtitle>Your eSIMs — nickname, ICCID, QR install.</Subtitle>
      </View>
      {loading ? (
        <ActivityIndicator color={colors.text} style={{ marginTop: 40 }} />
      ) : error ? (
        <View style={{ padding: 20 }}>
          <Card>
            <Muted>{error}</Muted>
            <Text style={styles.retry} onPress={load}>
              Tap to retry
            </Text>
          </Card>
        </View>
      ) : (
        <FlatList
          data={devices}
          keyExtractor={(d, i) => d?.id || `device-${i}`}
          contentContainerStyle={{ padding: 20, paddingTop: 8, gap: 12, paddingBottom: 88 }}
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
                <Text style={styles.nick}>{item.nickname || 'eSIM'}</Text>
                <Badge
                  label={item.status || 'unknown'}
                  tone={item.status === 'active' ? 'green' : 'amber'}
                />
              </View>
              <Text style={styles.label}>ICCID</Text>
              <Text style={styles.mono}>{item.iccid || '—'}</Text>
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
              {resolveInstallString(item) ? (
                <>
                  <Text style={styles.label}>Activation</Text>
                  <Text style={[styles.mono, { fontSize: 11 }]}>{resolveInstallString(item)}</Text>
                </>
              ) : null}
              <DeviceQr device={item} />
            </Card>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  nick: { color: colors.text, fontSize: 16, fontWeight: '600', flex: 1, letterSpacing: -0.2 },
  label: {
    color: colors.muted2,
    fontSize: 10,
    marginTop: 10,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontWeight: '600',
  },
  mono: { color: colors.text, fontFamily: 'monospace', fontSize: 13 },
  body: { color: colors.text, fontSize: 14 },
  qrWrap: { alignItems: 'center', marginTop: 14, gap: 10 },
  qrBg: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  copyBtn: {
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  copyText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  retry: { color: colors.text, marginTop: 12, fontWeight: '600', fontSize: 14 },
});
