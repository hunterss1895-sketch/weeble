import { Tabs } from 'expo-router';
import { Platform, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors } from '@/lib/theme';

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text
      style={{
        color: focused ? colors.text : colors.muted2,
        fontSize: 11,
        fontWeight: focused ? '700' : '500',
        letterSpacing: 0.2,
      }}
    >
      {label}
    </Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : colors.bgElevated,
        },
        headerTransparent: Platform.OS === 'ios',
        headerBackground: () =>
          Platform.OS === 'ios' ? (
            <BlurView intensity={40} tint="dark" style={{ flex: 1 }}>
              <View style={{ flex: 1, backgroundColor: 'rgba(5,5,5,0.55)', borderBottomWidth: 1, borderBottomColor: colors.glassBorder }} />
            </BlurView>
          ) : (
            <View style={{ flex: 1, backgroundColor: colors.bgElevated, borderBottomWidth: 1, borderBottomColor: colors.glassBorder }} />
          ),
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600', letterSpacing: -0.3, fontSize: 16 },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(10,10,10,0.92)',
          borderTopColor: colors.glassBorder,
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
          position: 'absolute',
          elevation: 0,
        },
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
            <BlurView intensity={50} tint="dark" style={{ flex: 1 }}>
              <View style={{ flex: 1, backgroundColor: 'rgba(5,5,5,0.45)' }} />
            </BlurView>
          ) : (
            <View style={{ flex: 1, backgroundColor: 'rgba(10,10,10,0.92)' }} />
          ),
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
