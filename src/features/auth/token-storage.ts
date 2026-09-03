import * as SecureStore from "expo-secure-store";

import type { AuthTokens } from "@/lib/http-client";

/**
 * Tokens live in the iOS Keychain / Android Keystore via expo-secure-store.
 * AsyncStorage would be plaintext on disk and readable on a rooted device.
 */
const KEYS = {
  accessToken: "readlens.access_token",
  refreshToken: "readlens.refresh_token",
  sessionKey: "readlens.session_key",
} as const;

export async function readTokens(): Promise<AuthTokens | null> {
  const [accessToken, refreshToken, sessionKey] = await Promise.all([
    SecureStore.getItemAsync(KEYS.accessToken),
    SecureStore.getItemAsync(KEYS.refreshToken),
    SecureStore.getItemAsync(KEYS.sessionKey),
  ]);

  // A partial set is unusable — every authenticated call needs the access token
  // and the session key, and recovering needs the refresh token.
  if (!accessToken || !refreshToken || !sessionKey) return null;
  return { accessToken, refreshToken, sessionKey };
}

export async function writeTokens(tokens: AuthTokens): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(KEYS.accessToken, tokens.accessToken),
    SecureStore.setItemAsync(KEYS.refreshToken, tokens.refreshToken),
    SecureStore.setItemAsync(KEYS.sessionKey, tokens.sessionKey),
  ]);
}

export async function clearTokens(): Promise<void> {
  await Promise.all(Object.values(KEYS).map((key) => SecureStore.deleteItemAsync(key)));
}
