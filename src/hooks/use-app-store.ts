"use client";

import { useContext } from "react";
import { useStore } from "zustand";
import { AppStoreContext } from "@/components/providers/AppStoreProvider";
import type { AppState } from "@/stores/app-store";

/** Reads a slice of the app store, e.g. `useAppStore((s) => s.user)`. Only inside the signed-in (app) layout. */
export function useAppStore<T>(selector: (state: AppState) => T): T {
  const store = useContext(AppStoreContext);
  if (!store) throw new Error("useAppStore must be used inside <AppStoreProvider>.");
  return useStore(store, selector);
}
