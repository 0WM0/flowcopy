import { createContext } from "react";

export type FloatingTermCallbacksContextValue = {
  onPillClick: (entryId: string) => void;
};

export const FloatingTermCallbacksContext =
  createContext<FloatingTermCallbacksContextValue | null>(null);