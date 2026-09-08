import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Muted, Screen, Subtitle, Title } from '@/components/ui';
import { fetchPlans, purchasePlan, type Plan } from '@/lib/api';
import { colors, formatData, formatPrice } from '@/lib/theme';

export default function PlanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchPlans('US');
        const plans = Array.isArray(res?.plans) ? res.plans : [];
        const found =
          plans.find((p) => p.id === id) ||
          plans.find((p) => p.id === decodeURIComponent(id || ''));
        setPlan(found || null);
      } catch (e) {
        Alert.alert('Error', e instanceof Error ? e.message : 'Failed to load plan');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function onPurchase() {
    if (!plan) return;
    setBuying(true);
    try {
      await purchasePlan(plan.id);
      Alert.alert('Purchased', 'Your eSIM is ready. Open Devices to scan the QR.', [
        { text: 'View devices', onPress: () => router.replace('/(tabs)/devices') },
      ]);
    } catch (e) {
      Alert.alert('Purchase failed', e instanceof Error ? e.message : 'Try again');
    } finally {
      setBuying(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <Muted>Loading…</Muted>
      </Screen>
    );
  }

  if (!plan) {
    return (
      <Screen>
        <Title>Plan not found</Title>
        <Subtitle>This plan may no longer be available.</Subtitle>
      </Screen>
    );
  }

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Title>{plan.name}</Title>
        <Subtitle>{plan.description}</Subtitle>
        <View style={{ height: 16 }} />
        <Card>
          <Text style={styles.price}>{formatPrice(plan.priceCents, plan.currency)}</Text>
          <Text style={styles.meta}>
            {formatData(plan.dataMb)} · {plan.validityDays} days · {plan.region}
          </Text>
          <View style={{ height: 12 }} />
          {(plan.features || []).map((f) => (
            <Text key={f} style={styles.feat}>
              · {f}
            </Text>
          ))}
        </Card>
        <View style={{ height: 20 }} />
        <Button title="Purchase eSIM" onPress={onPurchase} loading={buying} />
        <View style={{ height: 12 }} />
        <Muted>Instant QR after purchase. Same Weeble account as the web app.</Muted>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  price: { color: colors.text, fontSize: 34, fontWeight: '600', letterSpacing: -1 },
  meta: { color: colors.muted, fontSize: 13, marginTop: 4 },
  feat: { color: colors.text, fontSize: 14, marginTop: 5 },
});
