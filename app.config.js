// Dynamic app config.
//
// The API base URL and the assessment's HTTP Basic Auth credentials are read
// from the environment (.env, gitignored) and surfaced through `extra` so they
// never enter source control. See .env.example for the required keys.
//
// Honest caveat, also stated in the README: anything placed in `extra` is
// bundled into the app binary and is extractable by a determined attacker.
// This keeps credentials out of the repo — which is what the assessment asks —
// but it is not true secrecy. That would require a backend proxy.

const REQUIRED_ENV = [
  "READLENS_API_BASE_URL",
  "READLENS_BASIC_AUTH_USERNAME",
  "READLENS_BASIC_AUTH_PASSWORD",
];

const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
  // Warn rather than throw: config is also evaluated by tooling that has no
  // .env available. The app fails loudly at runtime instead (src/lib/config).
  console.warn(
    `[app.config] Missing env: ${missing.join(", ")}. Copy .env.example to .env and fill it in.`,
  );
}

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  name: "readlens",
  slug: "readlens",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "readlens",
  userInterfaceStyle: "automatic",
  ios: {
    icon: "./assets/expo.icon",
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#208AEF",
        image: "./assets/images/splash-icon.png",
        imageWidth: 76,
      },
    ],
    "expo-secure-store",
    [
      "expo-image-picker",
      {
        photosPermission:
          "Allow $(PRODUCT_NAME) to access your photos so you can attach a supporting file to a report.",
        // The report flow attaches existing files only — no capture, so neither
        // permission is requested on Android.
        cameraPermission: false,
        microphonePermission: false,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    apiBaseUrl: process.env.READLENS_API_BASE_URL,
    // Encoded at build time rather than in the app: React Native has no global
    // `btoa`, which is what axios's `auth` option relies on. Base64 is not
    // obfuscation — see the caveat at the top of this file.
    basicAuthHeader: `Basic ${Buffer.from(
      `${process.env.READLENS_BASIC_AUTH_USERNAME ?? ""}:${process.env.READLENS_BASIC_AUTH_PASSWORD ?? ""}`,
    ).toString("base64")}`,
  },
};
