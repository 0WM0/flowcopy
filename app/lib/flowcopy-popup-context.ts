"use client";

import { createContext } from "react";

import type { NodeContentGroup, NodeContentSlot } from "../types";

export type PendingRibbonRegistryTerm = {
  entryId: string;
  termValue: string;
  referenceKey: string | null;
};

export type ActiveRibbonPopupTarget = {
  nodeId: string;
  cellId: string;
};

export type ActiveVerticalPopupTarget = {
  nodeId: string;
  groupId: string;
};

export type HorizontalCellView = {
  id: string;
  row: number;
  column: number;
  label: string;
  key_command: string;
  tool_tip: string;
};

export type VerticalTermRow = {
  group: NodeContentGroup;
  slots: NodeContentSlot[];
  primarySlot: NodeContentSlot | null;
};

export type FlowCopyPopupContextValue = {
  editingCellId: ActiveRibbonPopupTarget | null;
  cellPopupPosition: { x: number; y: number } | null;
  pendingRibbonRegistryTerm: PendingRibbonRegistryTerm | null;
  stagedPopupSlotId: string | null;
  setStagedPopupSlotId: (slotId: string | null) => void;
  activeRibbonDropCellId: ActiveRibbonPopupTarget | null;
  editingVerticalGroupId: ActiveVerticalPopupTarget | null;
  verticalTermPopupPosition: { x: number; y: number } | null;
  pendingVerticalRegistryTerm: PendingRibbonRegistryTerm | null;
  activeVerticalDropGroupId: ActiveVerticalPopupTarget | null;
  editingRibbonCell: HorizontalCellView | null;
  editingRibbonSlots: NodeContentSlot[];
  editingVerticalRow: VerticalTermRow | null;
};

export const FlowCopyPopupContext =
  createContext<FlowCopyPopupContextValue | null>(null);