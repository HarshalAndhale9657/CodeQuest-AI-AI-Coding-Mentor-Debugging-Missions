"use client";

import { useSyncExternalStore } from "react";
import { getName, getToken } from "./api";

const noop = () => () => {};

/** Session values from localStorage, null during SSR and the first client render. */
export function useHydratedSession() {
  const token = useSyncExternalStore(noop, getToken, () => null);
  const name = useSyncExternalStore(noop, getName, () => null);
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  return { token, name, hydrated };
}
