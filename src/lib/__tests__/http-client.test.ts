import { AxiosError } from "axios";
import type { AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";

import { NetworkError, SessionExpiredError } from "../api-error";
import { HttpClient, type AuthTokens, type SessionStore } from "../http-client";

const INITIAL: AuthTokens = {
  accessToken: "access-1",
  refreshToken: "refresh-1",
  sessionKey: "session-1",
};

function fakeSession(initial: AuthTokens | null = INITIAL) {
  const state = { tokens: initial, setCalls: 0, clearCalls: 0 };
  const store: SessionStore = {
    getTokens: () => state.tokens,
    setTokens: async (tokens) => {
      state.setCalls += 1;
      state.tokens = tokens;
    },
    clearSession: async () => {
      state.clearCalls += 1;
      state.tokens = null;
    },
  };
  return { store, state };
}

const envelope = (config: InternalAxiosRequestConfig, data: unknown) => ({
  data: { success: true, data, status_code: 200 },
  status: 200,
  statusText: "OK",
  headers: {},
  config,
});

// A custom adapter must reject non-2xx itself; axios does not apply
// validateStatus to whatever an adapter resolves with.
const failure = (config: InternalAxiosRequestConfig, errorCode: number) =>
  Promise.reject(
    new AxiosError("Request failed with status code 401", "ERR_BAD_REQUEST", config, null, {
      data: {
        success: false,
        message: "nope",
        errors: ["nope"],
        error_code: errorCode,
        status_code: 401,
      },
      status: 401,
      statusText: "Unauthorized",
      headers: {},
      config,
    }),
  );

/**
 * Serves 401s until a refresh happens, then succeeds — and counts how many
 * refresh calls it saw, which is the property under test.
 */
function scriptedAdapter({
  errorCode = 1,
  refreshSucceeds = true,
  refreshDelayMs = 20,
} = {}) {
  const calls = { refresh: 0, data: 0 };
  let refreshed = false;

  const adapter = async (config: InternalAxiosRequestConfig) => {
    const url = config.url ?? "";

    if (url.includes("/auth/refresh_token")) {
      calls.refresh += 1;
      // A real refresh takes time; the delay is what lets concurrent 401s
      // overlap, so a broken implementation would fire more than one.
      await new Promise((resolve) => setTimeout(resolve, refreshDelayMs));
      if (!refreshSucceeds) return failure(config, 2);
      refreshed = true;
      return envelope(config, {
        access_token: "access-2",
        refresh_token: "refresh-2",
        session_key: "session-2",
      });
    }

    calls.data += 1;
    if (!refreshed) return failure(config, errorCode);
    return envelope(config, { ok: true });
  };

  return { adapter, calls };
}

const build = (
  adapter: AxiosRequestConfig["adapter"],
  session: SessionStore,
  timeoutMs = 1_000,
) =>
  new HttpClient(
    { baseUrl: "https://example.test", basicAuthHeader: "Basic test", timeoutMs, adapter },
    session,
  );

const getReports = (client: HttpClient) =>
  client.request({ method: "GET", url: "/reports/test" });

describe("HttpClient refresh lifecycle", () => {
  it("collapses concurrent 401s onto a single refresh", async () => {
    const { adapter, calls } = scriptedAdapter();
    const { store, state } = fakeSession();
    const client = build(adapter, store);

    const results = await Promise.all([
      getReports(client),
      getReports(client),
      getReports(client),
      getReports(client),
    ]);

    expect(results).toHaveLength(4);
    expect(calls.refresh).toBe(1);
    expect(state.setCalls).toBe(1);
    expect(state.clearCalls).toBe(0);
    expect(state.tokens?.accessToken).toBe("access-2");
  });

  it("retries the original request with the refreshed token", async () => {
    const seen: string[] = [];
    const { adapter } = scriptedAdapter();
    const spy: AxiosRequestConfig["adapter"] = async (config) => {
      if (!config.url?.includes("refresh")) {
        seen.push(String(config.headers?.get?.("X-Access-Token") ?? ""));
      }
      return adapter(config as InternalAxiosRequestConfig);
    };

    const { store } = fakeSession();
    await getReports(build(spy, store));

    // First attempt carries the stale token, the retry the refreshed one.
    expect(seen).toEqual(["access-1", "access-2"]);
  });

  it("treats a network failure as transient, never as a logout", async () => {
    const failing: AxiosRequestConfig["adapter"] = async () => {
      throw Object.assign(new Error("timeout of 1000ms exceeded"), {
        code: "ECONNABORTED",
      });
    };
    const { store, state } = fakeSession();

    await expect(getReports(build(failing, store))).rejects.toBeInstanceOf(NetworkError);
    expect(state.clearCalls).toBe(0);
    expect(state.tokens).not.toBeNull();
  });

  it("clears the session when the refresh itself fails", async () => {
    const { adapter, calls } = scriptedAdapter({ refreshSucceeds: false });
    const { store, state } = fakeSession();

    await expect(getReports(build(adapter, store))).rejects.toBeInstanceOf(SessionExpiredError);
    expect(calls.refresh).toBe(1);
    expect(state.clearCalls).toBe(1);
    expect(state.tokens).toBeNull();
  });

  it("logs out without attempting a refresh when the code says credentials are invalid", async () => {
    // error_code 2 means refresh cannot help, so spending the round-trip is wrong.
    const { adapter, calls } = scriptedAdapter({ errorCode: 2 });
    const { store, state } = fakeSession();

    await expect(getReports(build(adapter, store))).rejects.toBeInstanceOf(SessionExpiredError);
    expect(calls.refresh).toBe(0);
    expect(state.clearCalls).toBe(1);
  });

  it("does not attempt a refresh when there is no refresh token to use", async () => {
    const { adapter, calls } = scriptedAdapter();
    const { store, state } = fakeSession({
      accessToken: "access-1",
      refreshToken: "",
      sessionKey: "session-1",
    });

    await expect(getReports(build(adapter, store))).rejects.toBeInstanceOf(SessionExpiredError);
    expect(calls.refresh).toBe(0);
    expect(state.clearCalls).toBe(1);
  });

  it("retries at most once, so a repeat 401 cannot loop", async () => {
    let dataCalls = 0;
    const alwaysExpired: AxiosRequestConfig["adapter"] = async (config) => {
      if (config.url?.includes("/auth/refresh_token")) {
        return envelope(config as InternalAxiosRequestConfig, {
          access_token: "access-2",
          refresh_token: "refresh-2",
          session_key: "session-2",
        });
      }
      dataCalls += 1;
      return failure(config as InternalAxiosRequestConfig, 1);
    };
    const { store, state } = fakeSession();

    await expect(getReports(build(alwaysExpired, store))).rejects.toBeInstanceOf(
      SessionExpiredError,
    );
    expect(dataCalls).toBe(2); // original + one retry, then it stops
    expect(state.clearCalls).toBe(1);
  });
});
