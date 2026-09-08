import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined;

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  extra?.apiBaseUrl ||
  'http://45.33.15.93:3000';
