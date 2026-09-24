"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export interface SessionUser {
  name: string;
}

interface SessionContextValue {
  user: SessionUser | null;
  signIn: (user: SessionUser) => void;
  signOut: () => void;
}

const STORAGE_KEY = "av_user";
const listeners = new Set<() => void>();

function readRaw(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeRaw(value: string | null) {
  try {
    if (value === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, value);
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  // El snapshot de servidor es null, así que la hidratación siempre parte como invitado.
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);

  const user = useMemo<SessionUser | null>(() => {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed?.name === "string" ? { name: parsed.name } : null;
    } catch {
      return null;
    }
  }, [raw]);

  const signIn = useCallback((u: SessionUser) => writeRaw(JSON.stringify(u)), []);
  const signOut = useCallback(() => writeRaw(null), []);

  const value = useMemo(() => ({ user, signIn, signOut }), [user, signIn, signOut]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession debe usarse dentro de <SessionProvider>");
  return ctx;
}
