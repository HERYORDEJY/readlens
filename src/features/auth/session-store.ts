import { create } from "zustand";

import type { AuthTokens, SessionStore } from "@/lib/http-client";

import type { User } from "./types";
import { clearTokens, readTokens, writeTokens } from "./token-storage";

export type SessionStatus = "hydrating" | "authenticated" | "unauthenticated";

interface SessionState {
  status: SessionStatus;
  user: User | null;
  tokens: AuthTokens | null;
  /** Read persisted tokens once at startup, before any routing decision. */
  hydrate: () => Promise<void>;
  startSession: (user: User, tokens: AuthTokens) => Promise<void>;
  setTokens: (tokens: AuthTokens) => Promise<void>;
  clearSession: () => Promise<void>;
}

export const useSessionStore = create<SessionState>((set) => ({
  status: "hydrating",
  user: null,
  tokens: null,

  hydrate: async () => {
    const tokens = await readTokens();
    set({ tokens, status: tokens ? "authenticated" : "unauthenticated" });
  },

  startSession: async (user, tokens) => {
    await writeTokens(tokens);
    set({ user, tokens, status: "authenticated" });
  },

  setTokens: async (tokens) => {
    await writeTokens(tokens);
    set({ tokens });
  },

  clearSession: async () => {
    await clearTokens();
    set({ user: null, tokens: null, status: "unauthenticated" });
  },
}));

/**
 * The store as the narrow port HttpClient depends on. Keeping this adapter
 * explicit is what lets the refresh logic be tested with a plain fake.
 */
export const sessionStorePort: SessionStore = {
  getTokens: () => useSessionStore.getState().tokens,
  setTokens: (tokens) => useSessionStore.getState().setTokens(tokens),
  clearSession: () => useSessionStore.getState().clearSession(),
};
