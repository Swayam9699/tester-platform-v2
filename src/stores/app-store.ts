import { createStore } from "zustand/vanilla";
import type { MySide } from "@/api/queries";

/** The signed-in user as the app shell shows them. */
export type ShellUser = { name: string; email: string; avatarUrl: string | null; isAdmin: boolean; level: number };
/** Badge counts for the sidebar. */
export type ShellCounts = { incoming: number; unread: number; due: number; used: number; limit: number };

/** Server data for the signed-in app shell, loaded once by (app)/layout.tsx and read anywhere below it. */
export type AppData = { user: ShellUser; counts: ShellCounts; sides: MySide[] };

export type AppState = AppData & {
  /** The sidebar drawer on small screens. */
  navOpen: boolean;
  setNavOpen: (open: boolean) => void;
  /** Takes fresh server data after a navigation or a Server Action's revalidation. */
  hydrate: (data: AppData) => void;
};

export type AppStore = ReturnType<typeof createAppStore>;

/**
 * One store per request/tab (see AppStoreProvider), never a module-level singleton: on the server a shared store would
 * leak one user's data into another user's render.
 */
export const createAppStore = (data: AppData) =>
  createStore<AppState>()((set) => ({
    ...data,
    navOpen: false,
    setNavOpen: (navOpen) => set({ navOpen }),
    hydrate: (fresh) => set(fresh),
  }));
