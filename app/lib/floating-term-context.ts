import { createContext } from "react";

export type FloatingTermCallbacksContextValue = {
  onPillClick: (entryId: string) => void;
  highlightedNodeIds: Set<string>;
};

export const FloatingTermCallbacksContext =
  createContext<FloatingTermCallbacksContextValue | null>(null);