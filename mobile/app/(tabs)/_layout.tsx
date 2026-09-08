import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '@/lib/theme';

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={{ color: focused ? colors.text : colors.muted2, fontSize: 11, fontWeight: '600' }}>
      {label}
    </Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.muted2,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Plans',
          tabBarLabel: ({ focused }) => <TabLabel label="Plans" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="devices"
        options={{
          title: 'Devices',
          tabBarLabel: ({ focused }) => <TabLabel label="Devices" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarLabel: ({ focused }) => <TabLabel label="Account" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
