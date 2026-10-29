"use client";

import { createContext, useEffect, useState, type ReactNode } from "react";
import { createAppStore, type AppData, type AppStore } from "@/stores/app-store";

export const AppStoreContext = createContext<AppStore | null>(null);

/** Seeds the app store with the layout's server data and keeps it in sync when that data is re-rendered. */
export function AppStoreProvider({ data, children }: { data: AppData; children: ReactNode }) {
  const [store] = useState(() => createAppStore(data));
  useEffect(() => store.getState().hydrate(data), [store, data]);
  return <AppStoreContext.Provider value={store}>{children}</AppStoreContext.Provider>;
}
