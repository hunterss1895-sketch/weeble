# Weeble Mobile (Expo SDK 57)

Expo Go app for Weeble eSIM.

## API
Base URL configured in app.json extra.apiBaseUrl (http://45.33.15.93:3000).
JWT stored in SecureStore; Authorization Bearer on API calls.

## Expo Go (required for SDK 57)
App Store Expo Go is frozen at SDK 54. Install a current Expo Go build:

- iOS: https://sign.expo.dev
- Android: https://expo.dev/go

Then open: exp://45.33.15.93:8081

## Run
npm install
npx expo start --port 8081 --lan

Hosted on the VPS via systemd weeble-expo.service (0.0.0.0:8081).
