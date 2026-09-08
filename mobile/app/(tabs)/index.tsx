import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Card, Muted, Screen, Subtitle, Title } from '@/components/ui';
import { fetchPlans, type Plan } from '@/lib/api';
import { colors, formatData, formatPrice } from '@/lib/theme';

export default function PlansScreen() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await fetchPlans('US');
      setPlans(res.plans || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load plans');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: 20, marginBottom: 8 }}>
        <Text style={styles.brand}>WEEBLE</Text>
        <Title>Service Plans</Title>
        <Subtitle>United States eSIM data — T-Mobile, AT&T, Verizon.</Subtitle>
      </View>
      {loading ? (
        <ActivityIndicator color={colors.text} style={{ marginTop: 40 }} />
      ) : error ? (
        <View style={{ padding: 20 }}>
          <Muted>{error}</Muted>
        </View>
      ) : (
        <FlatList
          data={plans}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, paddingTop: 8, gap: 12 }}
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
          ListEmptyComponent={<Muted>No US plans available right now.</Muted>}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/plan/${encodeURIComponent(item.id)}`)}>
              <Card>
                <View style={styles.row}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={styles.name}>{item.name.replace(/^Weeble\s+/i, '')}</Text>
                    <Text style={styles.meta}>
                      {formatData(item.dataMb)} · {item.validityDays} days
                    </Text>
                    {item.popular ? <Text style={styles.popular}>Popular</Text> : null}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.price}>{formatPrice(item.priceCents, item.currency)}</Text>
                    <Text style={styles.order}>Order →</Text>
                  </View>
                </View>
              </Card>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: {
    color: colors.muted2,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  name: { color: colors.text, fontSize: 17, fontWeight: '600' },
  meta: { color: colors.muted, fontSize: 13, marginTop: 4 },
  popular: { color: colors.amber, fontSize: 11, marginTop: 6, fontWeight: '600' },
  price: { color: colors.text, fontSize: 22, fontWeight: '600' },
  order: { color: colors.muted, fontSize: 12, marginTop: 4 },
});
