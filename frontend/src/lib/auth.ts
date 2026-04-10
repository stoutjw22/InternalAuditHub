import { atom } from "jotai";
import { apiClient, tokenStorage } from "./api-client";
import type { UserProfile } from "@/generated/models";

// ── Jotai atoms ───────────────────────────────────────────────────────────────
export const currentUserAtom = atom<UserProfile | null>(null);
export const authLoadingAtom = atom<boolean>(true);

// ── Auth helpers ──────────────────────────────────────────────────────────────
export async function login(email: string, password: string): Promise<UserProfile> {
  const { data } = await apiClient.post("/auth/token/", { email, password });
  tokenStorage.setTokens(data.access, data.refresh);
  return data.user as UserProfile;
}

export async function logout(): Promise<void> {
  const refresh = tokenStorage.getRefresh();
  if (refresh) {
    try {
      await apiClient.post("/auth/token/blacklist/", { refresh });
    } catch {
      // ignore errors on blacklist — just clear local storage
    }
  }
  tokenStorage.clear();
}

export async function fetchCurrentUser(): Promise<UserProfile> {
  const { data } = await apiClient.get<UserProfile>("/auth/me/");
  return data;
}
