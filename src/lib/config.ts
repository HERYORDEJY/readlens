import Constants from "expo-constants";

import type { HttpClientConfig } from "./http-client";

interface ExpoExtra {
  apiBaseUrl?: string;
  basicAuthHeader?: string;
}

const extra = (Constants.expoConfig?.extra ?? {}) as ExpoExtra;

function required(key: keyof ExpoExtra): string {
  const value = extra[key];
  if (!value) {
    // Fails at startup with an actionable message rather than as a wave of
    // opaque 401s once the user tries to log in.
    throw new Error(
      `Missing app config "${key}". Copy .env.example to .env, fill it in, then restart the dev server.`,
    );
  }
  return value;
}

export const appConfig: HttpClientConfig = {
  baseUrl: required("apiBaseUrl"),
  basicAuthHeader: required("basicAuthHeader"),
  // The dev server sleeps; a short timeout would report a healthy API as down.
  timeoutMs: 60_000,
};
