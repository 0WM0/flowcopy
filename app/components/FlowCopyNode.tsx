"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Handle,
  Position,
  useReactFlow,
  useUpdateNodeInternals,
  type NodeProps,
} from "@xyflow/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type {
  EditableMicrocopyField,
  FlowEdge,
  FlowNode,
  MenuNodeConfig,
  MenuNodeTerm,
  NodeContentConfig,
  NodeContentGroup,
  NodeContentSlot,
  RibbonNodeConfig,
  RibbonNodeCell,
  NodeType,
  PersistableMicrocopyNodeData,
} from "../types";

import {
  MENU_NODE_RIGHT_CONNECTIONS_MIN,
  MENU_NODE_RIGHT_CONNECTIONS_MAX,
  MENU_SOURCE_HANDLE_PREFIX,
  RIBBON_SOURCE_HANDLE_PREFIX,
  RIBBON_CELL_MAX_KEY_COMMAND_LENGTH,
  FRAME_SHADE_STYLES,
  SEQUENTIAL_SOURCE_HANDLE_ID,
  SEQUENTIAL_TARGET_HANDLE_ID,
  PARALLEL_SOURCE_HANDLE_ID,
  PARALLEL_TARGET_HANDLE_ID,
  PARALLEL_ALT_SOURCE_HANDLE_ID,
  PARALLEL_ALT_TARGET_HANDLE_ID,
  CONTROLLED_LANGUAGE_FIELD_LABELS,
  DIAMOND_CLIP_PATH,
  DEFAULT_NODE_DISPLAY_FIELDS,
  MULTI_TERM_DEFAULT_SLOT_TYPES,
  inputStyle,
  buttonStyle,
} from "../constants";

import {
  normalizeMenuNodeConfig,
  normalizeFrameNodeConfig,
  normalizeRibbonNodeConfig,
  normalizeNodeContentConfig,
  clampMenuRightConnections,
  createMenuNodeTerm,
  createContentGroupId,
  createContentSlotId,
  buildMenuSourceHandleId,
  buildRibbonSourceHandleId,
  resolveNodeHighlightColor,
  getNodeShapeStyle,
  getDiamondBorderLayerStyle,
  getDiamondSurfaceLayerStyle,
  getNodeContentStyle,
  getFallbackNodeSize,
  getNodeVisualSize,
} from "../lib/node-utils";
import { syncSequentialEdgesForMenuNode } from "../lib/edge-utils";

function BodyTextPreview({ value }: { value: string }) {
  if (value.trim().length === 0) {
    return (
      <p
        style={{
          margin: 0,
          fontSize: 11,
          color: "#94a3b8",
          fontStyle: "italic",
        }}
      >
        Markdown preview will appear here.
      </p>
    );
  }

  return (
    <div className="body-text-preview">
      <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
        {value}
      </ReactMarkdown>
    </div>
  );
}

type FlowCopyNodeProps = NodeProps<FlowNode> & {
  onBeforeChange: () => void;
  onTextEditBlur: () => void;
  onCommitRegistryField: (
    nodeId: string,
    field: RegistryTrackedField | `menu_term:[${string}]` | `ribbon_cell:[${string}]:label` | `ribbon_cell:[${string}]:key_command` | `ribbon_cell:[${string}]:tool_tip`,
    value: string
  ) => void;
  onRegistryPickerOpen: (
    nodeId: string,
    field:
      | RegistryTrackedField
      | `menu_term:[${string}]`
      | `ribbon_cell:[${string}]:label`
      | `ribbon_cell:[${string}]:key_command`
      | `ribbon_cell:[${string}]:tool_tip`
  ) => void;
  menuTermGlossaryTerms: string[];
  glossaryHighlightedNodeIds: ReadonlySet<string>;
  showNodeId: boolean;
  showDefaultNodeTitleOnCanvas: boolean;
  onMenuTermDeleteBlocked: () => void;
  onMenuNodeConfigChange: (
    nodeId: string,
    updater: (currentConfig: MenuNodeConfig) => MenuNodeConfig,
    historyCaptureMode?: "discrete" | "text"
  ) => void;
  onCanDropRegistryEntry: (dataTransfer: DataTransfer | null) => boolean;
  onDropRegistryEntryOnField: (
    nodeId: string,
    field: RegistryTrackedField,
    dataTransfer: DataTransfer | null
  ) => void;
  onResolveDroppedRegistryTerm: (dataTransfer: DataTransfer | null) => {
    entryId: string;
    termValue: string;
    referenceKey: string | null;
  } | null;
  onAssignPendingRibbonTermToField: (
    nodeId: string,
    field:
      | `ribbon_cell:[${string}]:label`
      | `ribbon_cell:[${string}]:key_command`
      | `ribbon_cell:[${string}]:tool_tip`,
    pendingTerm: {
      entryId: string;
      termValue: string;
      referenceKey: string | null;
    }
  ) => void;
};

const REGISTRY_TRACKED_FIELDS = [
  "title",
  "body_text",
  "primary_cta",
  "secondary_cta",
  "helper_text",
  "error_text",
  "notes",
] as const;

type RegistryTrackedField = (typeof REGISTRY_TRACKED_FIELDS)[number];

type PendingRibbonRegistryTerm = {
  entryId: string;
  termValue: string;
  referenceKey: string | null;
};

type VerticalTermRow = {
  group: NodeContentGroup;
  slots: NodeContentSlot[];
  primarySlot: NodeContentSlot | null;
};

const isRegistryTrackedField = (
  field: EditableMicrocopyField
): field is RegistryTrackedField =>
  REGISTRY_TRACKED_FIELDS.includes(field as RegistryTrackedField);

const buildMenuTermRegistryField = (menuTermId: string): `menu_term:[${string}]` =>
  `menu_term:[${menuTermId}]`;

const buildContentSlotRegistryField = (slotId: string): `slot:[${string}]` =>
  `slot:[${slotId}]`;

const sortContentGroups = (a: NodeContentGroup, b: NodeContentGroup): number => {
  if (a.row !== b.row) {
    return a.row - b.row;
  }

  return a.column - b.column;
};

const sortContentSlots = (a: NodeContentSlot, b: NodeContentSlot): number =>
  a.position - b.position;

const getContentSlotLabel = (slot: NodeContentSlot, index: number): string => {
  if (typeof slot.termType === "string" && slot.termType.trim().length > 0) {
    return slot.termType;
  }

  return `Slot ${index + 1}`;
};

const buildRibbonCellRegistryField = (
  cellId: string,
  field: "label" | "key_command" | "tool_tip"
):
  | `ribbon_cell:[${string}]:label`
  | `ribbon_cell:[${string}]:key_command`
  | `ribbon_cell:[${string}]:tool_tip` => `ribbon_cell:[${cellId}]:${field}`;

const getCanvasRegistryButtonStyle = (): React.CSSProperties => ({
  ...buttonStyle,
  width: 16,
  height: 16,
  minWidth: 16,
  padding: 0,
  borderRadius: 4,
  fontSize: 11,
  lineHeight: 1,
  borderColor: "#d4d4d8",
  background: "#fff",
  color: "#1e3a8a",
  flexShrink: 0,
});

const FlowCopyNode = React.memo(function FlowCopyNode({
  id,
  data,
  selected,
  onBeforeChange,
  onTextEditBlur,
  onCommitRegistryField,
  onRegistryPickerOpen,
  menuTermGlossaryTerms,
  glossaryHighlightedNodeIds,
  showNodeId,
  onMenuTermDeleteBlocked,
  onMenuNodeConfigChange,
  onCanDropRegistryEntry,
  onDropRegistryEntryOnField,
  onResolveDroppedRegistryTerm,
  onAssignPendingRibbonTermToField,
}: FlowCopyNodeProps) {
  const { setNodes, setEdges } = useReactFlow<FlowNode, FlowEdge>();
  const updateNodeInternals = useUpdateNodeInternals();
  const frameTitleInputRef = useRef<HTMLInputElement | null>(null);
  const ribbonContainerRef = useRef<HTMLDivElement | null>(null);
  const ribbonPopupRef = useRef<HTMLDivElement | null>(null);
  const verticalTermsContainerRef = useRef<HTMLDivElement | null>(null);
  const verticalTermPopupRef = useRef<HTMLDivElement | null>(null);
  const [isEditingFrameTitle, setIsEditingFrameTitle] = useState(false);
  const [editingCellId, setEditingCellId] = useState<string | null>(null);
  const [editingVerticalGroupId, setEditingVerticalGroupId] = useState<string | null>(null);
  const [pendingRibbonRegistryTerm, setPendingRibbonRegistryTerm] =
    useState<PendingRibbonRegistryTerm | null>(null);
  const [activeRibbonDropCellId, setActiveRibbonDropCellId] =
    useState<string | null>(null);
  const [activeRegistryDropField, setActiveRegistryDropField] =
    useState<RegistryTrackedField | null>(null);
  const [cellPopupPosition, setCellPopupPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [verticalPopupPosition, setVerticalPopupPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const isGlossaryHighlighted = glossaryHighlightedNodeIds.has(id);

  const isMenuNode = data.node_type === "menu";
  const isVerticalMultiTermNode = data.node_type === "vertical_multi_term";
  const isVerticalTermsNode = isMenuNode || isVerticalMultiTermNode;
  const isFrameNode = data.node_type === "frame";
  const isRibbonNode = data.node_type === "ribbon";
  const contentConfig = useMemo(
    () =>
      normalizeNodeContentConfig(
        data.content_config,
        isVerticalTermsNode ? "vertical" : isRibbonNode ? "horizontal" : "single"
      ),
    [data.content_config, isRibbonNode, isVerticalTermsNode]
  );
  const frameConfig = useMemo(
    () => normalizeFrameNodeConfig(data.frame_config),
    [data.frame_config]
  );
  const ribbonConfig = useMemo(
    () => normalizeRibbonNodeConfig(data.ribbon_config),
    [data.ribbon_config]
  );
  const sortedRibbonCells = useMemo<RibbonNodeCell[]>(() => {
    if (!isRibbonNode) {
      return [];
    }

    return [...ribbonConfig.cells].sort((a, b) => {
      if (a.row !== b.row) {
        return a.row - b.row;
      }

      return a.column - b.column;
    });
  }, [isRibbonNode, ribbonConfig.cells]);
  const frameShadeStyle = FRAME_SHADE_STYLES[frameConfig.shade];
  const verticalTermRows = useMemo<VerticalTermRow[]>(() => {
    if (!isVerticalTermsNode) {
      return [];
    }

    const sortedGroups = [...contentConfig.groups].sort(sortContentGroups);

    return sortedGroups.map((group) => {
      const slots = contentConfig.slots
        .filter((slot) => slot.groupId === group.id)
        .sort(sortContentSlots);
      const primarySlot = slots.find((slot) => slot.position === 0) ?? slots[0] ?? null;

      return {
        group,
        slots,
        primarySlot,
      };
    });
  }, [contentConfig.groups, contentConfig.slots, isVerticalTermsNode]);

  const visibleDisplayTermFieldTypes = useMemo(
    () => {
      const fieldSet = new Set(
        Array.isArray(data.display_term_fields)
          ? data.display_term_fields
          : [data.display_term_field]
      );
      return DEFAULT_NODE_DISPLAY_FIELDS.filter((field) => fieldSet.has(field));
    },
    [data.display_term_field, data.display_term_fields]
  );
  const editingRibbonCell = useMemo(() => {
    if (!isRibbonNode || !editingCellId) {
      return null;
    }

    return ribbonConfig.cells.find((cell) => cell.id === editingCellId) ?? null;
  }, [editingCellId, isRibbonNode, ribbonConfig.cells]);
  const editingRibbonSlots = useMemo<NodeContentSlot[]>(() => {
    if (!isRibbonNode || !editingCellId) {
      return [];
    }

    // Find the matching group in content_config
    const matchingGroup = data.content_config.groups.find(
      (group) => group.id === editingCellId
    );

    if (!matchingGroup) {
      // Fallback: try matching by row/column position from the ribbon cell
      const editingCell = ribbonConfig.cells.find((cell) => cell.id === editingCellId);
      if (!editingCell) {
        return [];
      }

      const positionalGroup = data.content_config.groups.find(
        (group) => group.row === editingCell.row && group.column === editingCell.column
      );

      if (!positionalGroup) {
        return [];
      }

      return data.content_config.slots
        .filter((slot) => slot.groupId === positionalGroup.id)
        .sort(sortContentSlots);
    }

    return data.content_config.slots
      .filter((slot) => slot.groupId === matchingGroup.id)
      .sort(sortContentSlots);
  }, [isRibbonNode, editingCellId, data.content_config, ribbonConfig.cells]);
  const editingVerticalTermRow = useMemo(() => {
    if (!isVerticalTermsNode || !editingVerticalGroupId) {
      return null;
    }

    return (
      verticalTermRows.find((row) => row.group.id === editingVerticalGroupId) ?? null
    );
  }, [editingVerticalGroupId, isVerticalTermsNode, verticalTermRows]);

  const stopNodeSelectionPropagation = useCallback(
    (event: React.SyntheticEvent<HTMLElement>) => {
      event.stopPropagation();
    },
    []
  );

  const handleDefaultRegistryFieldDragOver = useCallback(
    (
      event: React.DragEvent<HTMLInputElement | HTMLTextAreaElement>,
      field: RegistryTrackedField
    ) => {
      if (data.node_type !== "default") {
        return;
      }

      const canDropRegistryEntry = onCanDropRegistryEntry(event.dataTransfer);
      if (!canDropRegistryEntry) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "copy";

      setActiveRegistryDropField((currentField) =>
        currentField === field ? currentField : field
      );
    },
    [data.node_type, onCanDropRegistryEntry]
  );

  const handleDefaultRegistryFieldDragLeave = useCallback(
    (
      event: React.DragEvent<HTMLInputElement | HTMLTextAreaElement>,
      field: RegistryTrackedField
    ) => {
      const relatedTarget = event.relatedTarget;

      if (
        relatedTarget instanceof Node &&
        event.currentTarget.contains(relatedTarget)
      ) {
        return;
      }

      setActiveRegistryDropField((currentField) =>
        currentField === field ? null : currentField
      );
    },
    []
  );

  const handleDefaultRegistryFieldDrop = useCallback(
    (
      event: React.DragEvent<HTMLInputElement | HTMLTextAreaElement>,
      field: RegistryTrackedField
    ) => {
      if (data.node_type !== "default") {
        return;
      }

      const canDropRegistryEntry = onCanDropRegistryEntry(event.dataTransfer);
      if (!canDropRegistryEntry) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      onDropRegistryEntryOnField(id, field, event.dataTransfer);
      setActiveRegistryDropField(null);
    },
    [data.node_type, id, onCanDropRegistryEntry, onDropRegistryEntryOnField]
  );

  const getDefaultRegistryFieldInputStyle = useCallback(
    (
      field: RegistryTrackedField,
      baseStyle: React.CSSProperties
    ): React.CSSProperties => {
      if (activeRegistryDropField !== field) {
        return baseStyle;
      }

      const {
        border: _borderShorthand,
        borderTop: _borderTopShorthand,
        borderRight: _borderRightShorthand,
        borderBottom: _borderBottomShorthand,
        borderLeft: _borderLeftShorthand,
        borderColor: _borderColor,
        borderStyle: _borderStyle,
        borderWidth: _borderWidth,
        ...styleWithoutBorderShorthand
      } = baseStyle;

      return {
        ...styleWithoutBorderShorthand,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "#60a5fa",
        background: "#eff6ff",
        boxShadow: "0 0 0 1px rgba(37, 99, 235, 0.28)",
      };
    },
    [activeRegistryDropField]
  );

  useEffect(() => {
    updateNodeInternals(id);
  }, [
    data.node_type,
    id,
    verticalTermRows.length,
    ribbonConfig.columns,
    ribbonConfig.cells.length,
    visibleDisplayTermFieldTypes.length,
    updateNodeInternals,
  ]);

  useEffect(() => {
    if (!isEditingFrameTitle) {
      return;
    }

    frameTitleInputRef.current?.focus();
    frameTitleInputRef.current?.select();
  }, [isEditingFrameTitle]);

  const updateField = useCallback(
    <K extends EditableMicrocopyField>(
      field: K,
      value: PersistableMicrocopyNodeData[K]
    ) => {
      onBeforeChange();
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, [field]: value } } : n
        )
      );
    },
    [id, onBeforeChange, setNodes]
  );

  const commitRegistryField = useCallback(
    (field: EditableMicrocopyField, value: string) => {
      onTextEditBlur();

      if (!isRegistryTrackedField(field) || isFrameNode) {
        return;
      }

      onCommitRegistryField(id, field, value);
    },
    [id, isFrameNode, onCommitRegistryField, onTextEditBlur]
  );

  const commitContentSlotRegistryField = useCallback(
    (slotId: string, value: string) => {
      onTextEditBlur();

      if (!isVerticalTermsNode && !isRibbonNode) {
        return;
      }

      onCommitRegistryField(
        id,
        buildContentSlotRegistryField(slotId) as unknown as `menu_term:[${string}]`,
        value
      );
    },
    [id, isVerticalTermsNode, isRibbonNode, onCommitRegistryField, onTextEditBlur]
  );

  const commitRibbonCellRegistryField = useCallback(
    (cellId: string, field: "label" | "key_command" | "tool_tip", value: string) => {
      onTextEditBlur();

      if (!isRibbonNode) {
        return;
      }

      onCommitRegistryField(id, buildRibbonCellRegistryField(cellId, field), value);
    },
    [id, isRibbonNode, onCommitRegistryField, onTextEditBlur]
  );

  const toBridgedMenuConfig = useCallback(
    (nextContentConfig: NodeContentConfig, fallbackMenuConfig: MenuNodeConfig): MenuNodeConfig => {
      const sortedGroups = [...nextContentConfig.groups].sort(sortContentGroups);
      const nextTerms = sortedGroups.map((group): MenuNodeTerm => {
        const groupSlots = nextContentConfig.slots
          .filter((slot) => slot.groupId === group.id)
          .sort(sortContentSlots);
        const primarySlot =
          groupSlots.find((slot) => slot.position === 0) ?? groupSlots[0] ?? null;

        return {
          id: group.id,
          term: primarySlot?.value ?? "",
        };
      });

      const fallbackTerms = fallbackMenuConfig.terms.slice(0, MENU_NODE_RIGHT_CONNECTIONS_MIN);
      const terms = nextTerms.length > 0 ? nextTerms : fallbackTerms;

      return normalizeMenuNodeConfig(
        {
          max_right_connections: clampMenuRightConnections(
            Math.max(MENU_NODE_RIGHT_CONNECTIONS_MIN, terms.length)
          ),
          terms,
        },
        data.primary_cta,
        Math.max(MENU_NODE_RIGHT_CONNECTIONS_MIN, terms.length)
      );
    },
    [data.primary_cta]
  );

  const updateVerticalTermsContentConfig = useCallback(
    (
      updater: (currentConfig: NodeContentConfig) => NodeContentConfig,
      historyCaptureMode: "discrete" | "text" = "discrete"
    ) => {
      if (!isVerticalTermsNode) {
        return;
      }

      onBeforeChange();

      let nextMenuConfigForEdges: MenuNodeConfig | null = null;

      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          if (node.id !== id) {
            return node;
          }

          if (
            node.data.node_type !== "menu" &&
            node.data.node_type !== "vertical_multi_term"
          ) {
            return node;
          }

          const currentContentConfig = normalizeNodeContentConfig(
            node.data.content_config,
            "vertical"
          );
          const requestedNextContentConfig = updater(currentContentConfig);
          const nextContentConfig = normalizeNodeContentConfig(
            requestedNextContentConfig,
            "vertical"
          );
          const normalizedNextMenuConfig = toBridgedMenuConfig(
            nextContentConfig,
            normalizeMenuNodeConfig(
              node.data.menu_config,
              node.data.primary_cta,
              Math.max(
                MENU_NODE_RIGHT_CONNECTIONS_MIN,
                node.data.menu_config.max_right_connections
              )
            )
          );

          if (node.data.node_type === "menu") {
            nextMenuConfigForEdges = normalizedNextMenuConfig;
          }

          return {
            ...node,
            data: {
              ...node.data,
              content_config: nextContentConfig,
              menu_config: normalizedNextMenuConfig,
              primary_cta: normalizedNextMenuConfig.terms[0]?.term ?? node.data.primary_cta,
              secondary_cta:
                normalizedNextMenuConfig.terms[1]?.term ?? node.data.secondary_cta,
            },
          };
        })
      );

      if (isMenuNode) {
        setEdges((currentEdges) =>
          nextMenuConfigForEdges
            ? syncSequentialEdgesForMenuNode(currentEdges, id, nextMenuConfigForEdges)
            : currentEdges
        );
      }
    },
    [id, isMenuNode, isVerticalTermsNode, onBeforeChange, setEdges, setNodes, toBridgedMenuConfig]
  );

  const addVerticalTermGroup = useCallback(() => {
    if (!isVerticalTermsNode) {
      return;
    }

    updateVerticalTermsContentConfig((currentConfig) => {
      const sortedGroups = [...currentConfig.groups].sort(sortContentGroups);
      const nextRow =
        sortedGroups.length > 0
          ? sortedGroups[sortedGroups.length - 1]!.row + 1
          : 0;
      const groupId = createContentGroupId();

      const nextGroup: NodeContentGroup = {
        id: groupId,
        row: nextRow,
        column: 0,
      };

      const nextSlots = MULTI_TERM_DEFAULT_SLOT_TYPES.map((termType, index) => ({
        id: createContentSlotId(),
        value: "",
        termType,
        groupId,
        position: index,
      }));

      return {
        ...currentConfig,
        groups: [...currentConfig.groups, nextGroup],
        slots: [...currentConfig.slots, ...nextSlots],
        rows: Math.max(1, currentConfig.groups.length + 1),
      };
    });
  }, [isVerticalTermsNode, updateVerticalTermsContentConfig]);

  const updateVerticalSlotValue = useCallback(
    (slotId: string, value: string) => {
      updateVerticalTermsContentConfig(
        (currentConfig) => ({
          ...currentConfig,
          slots: currentConfig.slots.map((slot) =>
            slot.id === slotId
              ? {
                  ...slot,
                  value,
                }
              : slot
          ),
        }),
        "text"
      );
    },
    [updateVerticalTermsContentConfig]
  );

  const deleteVerticalTermGroup = useCallback(
    (groupId: string) => {
      if (!isVerticalTermsNode) {
        return;
      }

      if (verticalTermRows.length <= MENU_NODE_RIGHT_CONNECTIONS_MIN) {
        onMenuTermDeleteBlocked();
        return;
      }

      const rowToDelete = verticalTermRows.find((row) => row.group.id === groupId);
      const rowLabel = rowToDelete?.primarySlot?.value || "Untitled";
      const confirmed = window.confirm(
        `Delete this menu term (${rowLabel})? This will also remove any sequential edge attached to it.`
      );

      if (!confirmed) {
        return;
      }

      updateVerticalTermsContentConfig((currentConfig) => {
        const remainingGroups = currentConfig.groups
          .filter((group) => group.id !== groupId)
          .sort(sortContentGroups)
          .map((group, index) => ({
            ...group,
            row: index,
          }));

        return {
          ...currentConfig,
          groups: remainingGroups,
          slots: currentConfig.slots.filter((slot) => slot.groupId !== groupId),
          rows: Math.max(1, remainingGroups.length),
        };
      });

      setEditingVerticalGroupId((currentGroupId) =>
        currentGroupId === groupId ? null : currentGroupId
      );
    },
    [
      isVerticalTermsNode,
      onMenuTermDeleteBlocked,
      updateVerticalTermsContentConfig,
      verticalTermRows,
    ]
  );

  const moveVerticalTermGroup = useCallback(
    (groupId: string, direction: -1 | 1) => {
      if (!isVerticalTermsNode) {
        return;
      }

      updateVerticalTermsContentConfig((currentConfig) => {
        const sortedGroups = [...currentConfig.groups].sort(sortContentGroups);
        const currentIndex = sortedGroups.findIndex((group) => group.id === groupId);
        if (currentIndex < 0) {
          return currentConfig;
        }

        const swapIndex = currentIndex + direction;
        if (swapIndex < 0 || swapIndex >= sortedGroups.length) {
          return currentConfig;
        }

        const currentGroup = sortedGroups[currentIndex]!;
        const swapGroup = sortedGroups[swapIndex]!;

        return {
          ...currentConfig,
          groups: currentConfig.groups.map((group) => {
            if (group.id === currentGroup.id) {
              return { ...group, row: swapGroup.row };
            }

            if (group.id === swapGroup.id) {
              return { ...group, row: currentGroup.row };
            }

            return group;
          }),
        };
      });

      if (typeof window !== "undefined") {
        window.requestAnimationFrame(() => {
          updateNodeInternals(id);
        });
      }
    },
    [id, isVerticalTermsNode, updateNodeInternals, updateVerticalTermsContentConfig]
  );

  const closeVerticalTermPopup = useCallback(() => {
    setEditingVerticalGroupId(null);
  }, []);

  const openVerticalTermEditor = useCallback(
    (rowElement: HTMLDivElement, groupId: string) => {
      const containerElement = verticalTermsContainerRef.current;

      if (containerElement) {
        let offsetX = 0;
        let offsetY = 0;
        let currentElement: HTMLElement | null = rowElement;

        while (currentElement && currentElement !== containerElement) {
          offsetX += currentElement.offsetLeft;
          offsetY += currentElement.offsetTop;

          const nextOffsetParent: Element | null = currentElement.offsetParent;
          currentElement =
            nextOffsetParent instanceof HTMLElement ? nextOffsetParent : null;
        }

        if (currentElement === containerElement) {
          setVerticalPopupPosition({
            x: offsetX + 8,
            y: offsetY + rowElement.offsetHeight + 6,
          });
        } else {
          setVerticalPopupPosition({ x: 8, y: 8 });
        }
      } else {
        setVerticalPopupPosition({ x: 8, y: 8 });
      }

      setEditingVerticalGroupId(groupId);
    },
    []
  );

  const closeRibbonCellPopup = useCallback(() => {
    setEditingCellId(null);
    setPendingRibbonRegistryTerm(null);
    setActiveRibbonDropCellId(null);
  }, []);

  const openRibbonCellEditor = useCallback(
    (
      cellElement: HTMLDivElement,
      cellId: string,
      pendingTerm: PendingRibbonRegistryTerm | null = null
    ) => {
      const containerElement = ribbonContainerRef.current;

      if (containerElement) {
        let offsetX = 0;
        let offsetY = 0;
        let currentElement: HTMLElement | null = cellElement;

        while (currentElement && currentElement !== containerElement) {
          offsetX += currentElement.offsetLeft;
          offsetY += currentElement.offsetTop;

          const nextOffsetParent: Element | null = currentElement.offsetParent;
          currentElement =
            nextOffsetParent instanceof HTMLElement ? nextOffsetParent : null;
        }

        if (currentElement === containerElement) {
          setCellPopupPosition({
            x: offsetX + 8,
            y: offsetY + cellElement.offsetHeight + 6,
          });
        } else {
          setCellPopupPosition({ x: 8, y: 8 });
        }
      } else {
        setCellPopupPosition({ x: 8, y: 8 });
      }

      setEditingCellId(cellId);
      setPendingRibbonRegistryTerm(pendingTerm);
      setActiveRibbonDropCellId(null);
    },
    []
  );

  const handleRibbonCellDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>, cellId: string) => {
      if (!isRibbonNode) {
        return;
      }

      const canDropRegistryEntry = onCanDropRegistryEntry(event.dataTransfer);
      if (!canDropRegistryEntry) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "copy";

      setActiveRibbonDropCellId((currentCellId) =>
        currentCellId === cellId ? currentCellId : cellId
      );
    },
    [isRibbonNode, onCanDropRegistryEntry]
  );

  const handleRibbonCellDragLeave = useCallback(
    (event: React.DragEvent<HTMLDivElement>, cellId: string) => {
      const relatedTarget = event.relatedTarget;

      if (
        relatedTarget instanceof Node &&
        event.currentTarget.contains(relatedTarget)
      ) {
        return;
      }

      setActiveRibbonDropCellId((currentCellId) =>
        currentCellId === cellId ? null : currentCellId
      );
    },
    []
  );

  const handleRibbonCellDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>, cellId: string) => {
      if (!isRibbonNode) {
        return;
      }

      const canDropRegistryEntry = onCanDropRegistryEntry(event.dataTransfer);
      if (!canDropRegistryEntry) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const pendingTerm = onResolveDroppedRegistryTerm(event.dataTransfer);

      if (!pendingTerm) {
        setActiveRibbonDropCellId(null);
        return;
      }

      openRibbonCellEditor(event.currentTarget, cellId, pendingTerm);
    },
    [
      isRibbonNode,
      onCanDropRegistryEntry,
      onResolveDroppedRegistryTerm,
      openRibbonCellEditor,
    ]
  );

  const updateRibbonCellField = useCallback(
    <K extends keyof Pick<RibbonNodeCell, "label" | "key_command" | "tool_tip">>(
      cellId: string,
      field: K,
      value: RibbonNodeCell[K]
    ) => {
      onBeforeChange();

      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          if (node.id !== id || node.data.node_type !== "ribbon") {
            return node;
          }

          const currentRibbonConfig = normalizeRibbonNodeConfig(node.data.ribbon_config);
          const nextRibbonConfig: RibbonNodeConfig = {
            ...currentRibbonConfig,
            cells: currentRibbonConfig.cells.map((cell) =>
              cell.id === cellId
                ? {
                    ...cell,
                    [field]: value,
                  }
                : cell
            ),
          };

          return {
            ...node,
            data: {
              ...node.data,
              ribbon_config: nextRibbonConfig,
            },
          };
        })
      );
    },
    [id, onBeforeChange, setNodes]
  );
  const updateRibbonSlotValue = useCallback(
    (slotId: string, value: string) => {
      onBeforeChange();

      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          if (node.id !== id || node.data.node_type !== "ribbon") {
            return node;
          }

          const nextContentConfig: NodeContentConfig = {
            ...node.data.content_config,
            slots: node.data.content_config.slots.map((slot) =>
              slot.id === slotId ? { ...slot, value } : slot
            ),
          };

          // Bridge-sync: find which group this slot belongs to, find the cell, update it
          const changedSlot = nextContentConfig.slots.find((s) => s.id === slotId);
          let nextRibbonConfig = normalizeRibbonNodeConfig(node.data.ribbon_config);

          if (changedSlot?.groupId) {
            const group = nextContentConfig.groups.find(
              (g) => g.id === changedSlot.groupId
            );

            if (group) {
              const groupSlots = nextContentConfig.slots
                .filter((s) => s.groupId === group.id)
                .sort(sortContentSlots);

              nextRibbonConfig = {
                ...nextRibbonConfig,
                cells: nextRibbonConfig.cells.map((cell) => {
                  if (cell.row === group.row && cell.column === group.column) {
                    return {
                      ...cell,
                      label: groupSlots[0]?.value ?? cell.label,
                      key_command: groupSlots[1]?.value ?? cell.key_command,
                      tool_tip: groupSlots[2]?.value ?? cell.tool_tip,
                    };
                  }
                  return cell;
                }),
              };
            }
          }

          return {
            ...node,
            data: {
              ...node.data,
              content_config: nextContentConfig,
              ribbon_config: nextRibbonConfig,
            },
          };
        })
      );
    },
    [id, onBeforeChange, setNodes]
  );
  const assignPendingRibbonTermToField = useCallback(
    (field: "label" | "key_command" | "tool_tip") => {
      if (!editingRibbonCell || !pendingRibbonRegistryTerm) {
        return;
      }

      updateRibbonCellField(editingRibbonCell.id, field, pendingRibbonRegistryTerm.termValue);
      onAssignPendingRibbonTermToField(
        id,
        buildRibbonCellRegistryField(editingRibbonCell.id, field),
        pendingRibbonRegistryTerm
      );
      setPendingRibbonRegistryTerm(null);
    },
    [
      editingRibbonCell,
      id,
      onAssignPendingRibbonTermToField,
      pendingRibbonRegistryTerm,
      updateRibbonCellField,
    ]
  );

  useEffect(() => {
    if (!isRibbonNode) {
      setEditingCellId(null);
      setPendingRibbonRegistryTerm(null);
      setActiveRibbonDropCellId(null);
      return;
    }

    if (editingCellId && !ribbonConfig.cells.some((cell) => cell.id === editingCellId)) {
      setEditingCellId(null);
      setPendingRibbonRegistryTerm(null);
    }
  }, [editingCellId, isRibbonNode, ribbonConfig.cells]);

  useEffect(() => {
    if (!editingCellId) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (ribbonPopupRef.current?.contains(target)) {
        return;
      }

      if (
        target instanceof HTMLElement &&
        target.closest("[data-ribbon-cell-id]") &&
        ribbonContainerRef.current?.contains(target)
      ) {
        return;
      }

      closeRibbonCellPopup();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      closeRibbonCellPopup();
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeRibbonCellPopup, editingCellId]);

  if (isFrameNode) {
    const frameTitle = data.title.trim();
    const frameHighlightColor = resolveNodeHighlightColor({
      selected,
      uiJourneyHighlighted: Boolean(data.ui_journey_highlighted),
      uiJourneyRecalled: Boolean(data.ui_journey_recalled),
      glossaryHighlighted: isGlossaryHighlighted,
    });

    return (
      <div
        style={{
          width: frameConfig.width,
          minHeight: frameConfig.height,
          boxSizing: "border-box",
          borderRadius: 10,
          border: `2px solid ${frameHighlightColor ?? frameShadeStyle.border}`,
          background: frameShadeStyle.background,
          boxShadow: frameHighlightColor
            ? `0 0 0 3px ${frameHighlightColor}, inset 0 0 0 1px rgba(255,255,255,0.7)`
            : "inset 0 0 0 1px rgba(255,255,255,0.7)",
          position: "relative",
        }}
      >
        <Handle
          type="target"
          position={Position.Left}
          id={SEQUENTIAL_TARGET_HANDLE_ID}
          style={{
            position: "absolute",
            top: "50%",
            left: -3,
            transform: "translateY(-50%)",
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#64748b",
          }}
        />
        <Handle
          type="target"
          position={Position.Left}
          id={PARALLEL_TARGET_HANDLE_ID}
          style={{
            position: "absolute",
            top: -5,
            left: -5,
            transform: "translateY(0%) !important" as any,
            width: 10,
            height: 10,
            borderRadius: 2,
            background: "#1e293b",
            zIndex: 10,
          }}
        />
        <Handle
          type="source"
          position={Position.Left}
          id={PARALLEL_ALT_SOURCE_HANDLE_ID}
          style={{
            position: "absolute",
            top: -5,
            left: -5,
            transform: "translateY(0%) !important" as any,
            width: 10,
            height: 10,
            borderRadius: 2,
            background: "#1e293b",
            zIndex: 10,
          }}
        />

        <div
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            fontSize: 11,
            color: "#1d4ed8",
            fontWeight: 600,
            border: "1px solid #bfdbfe",
            borderRadius: 999,
            background: "rgba(255, 255, 255, 0.9)",
            padding: "1px 7px",
          }}
        >
          #{data.sequence_index ?? "-"}
        </div>

        <div
          role="button"
          tabIndex={0}
          style={{
            position: "absolute",
            top: -14,
            left: 14,
            maxWidth: "70%",
            borderRadius: "8px 8px 0 0",
            borderTop: `1px solid ${frameShadeStyle.border}`,
            borderLeft: `1px solid ${frameShadeStyle.border}`,
            borderRight: `1px solid ${frameShadeStyle.border}`,
            background: frameShadeStyle.tabBackground,
            color: frameShadeStyle.tabText,
            padding: "2px 10px",
            fontSize: 11,
            fontWeight: 700,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            cursor: "text",
          }}
          title={frameTitle || "Add title"}
          onClick={() => setIsEditingFrameTitle(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setIsEditingFrameTitle(true);
            }
          }}
        >
          {isEditingFrameTitle ? (
            <input
              ref={frameTitleInputRef}
              className="nodrag"
              style={{
                width: "100%",
                border: "none",
                background: "transparent",
                outline: "none",
                padding: 0,
                margin: 0,
                fontSize: 11,
                fontWeight: 700,
                color: frameShadeStyle.tabText,
              }}
              value={data.title}
              placeholder="Add title"
              onPointerDown={stopNodeSelectionPropagation}
              onMouseDown={stopNodeSelectionPropagation}
              onClick={stopNodeSelectionPropagation}
              onChange={(event) => updateField("title", event.target.value)}
              onBlur={(event) => {
                onTextEditBlur();
                setIsEditingFrameTitle(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  event.currentTarget.blur();
                }

                if (event.key === "Escape") {
                  event.preventDefault();
                  setIsEditingFrameTitle(false);
                }
              }}
            />
          ) : (
            frameTitle || "Add title"
          )}
        </div>

        {showNodeId && (
          <div
            style={{
              position: "absolute",
              right: 8,
              bottom: 6,
              fontSize: 10,
              color: "#64748b",
            }}
          >
            id: {id}
          </div>
        )}

        <Handle
          type="source"
          position={Position.Right}
          id={SEQUENTIAL_SOURCE_HANDLE_ID}
        />
        <Handle
          type="source"
          position={Position.Left}
          id={PARALLEL_SOURCE_HANDLE_ID}
          style={{
            position: "absolute",
            top: "calc(100% - 5px)",
            left: -5,
            transform: "translateY(0%) !important" as any,
            width: 10,
            height: 10,
            borderRadius: 2,
            background: "#1e293b",
            zIndex: 10,
          }}
        />
        <Handle
          type="target"
          position={Position.Left}
          id={PARALLEL_ALT_TARGET_HANDLE_ID}
          style={{
            position: "absolute",
            top: "calc(100% - 5px)",
            left: -5,
            transform: "translateY(0%) !important" as any,
            width: 10,
            height: 10,
            borderRadius: 2,
            background: "#1e293b",
            zIndex: 10,
          }}
        />
      </div>
    );
  }

  if (isRibbonNode) {
    const ribbonHighlightColor = resolveNodeHighlightColor({
      selected,
      uiJourneyHighlighted: Boolean(data.ui_journey_highlighted),
      uiJourneyRecalled: Boolean(data.ui_journey_recalled),
      glossaryHighlighted: isGlossaryHighlighted,
    });

    const totalCells = sortedRibbonCells.length;
    const minNodeHeight = Math.max(50, totalCells > 0 ? 58 : 50);

    return (
      <div
        ref={ribbonContainerRef}
        data-ribbon-source-prefix={RIBBON_SOURCE_HANDLE_PREFIX}
        style={{
          display: "flex",
          flexDirection: "row",
          position: "relative",
          boxSizing: "border-box",
          borderRadius: 8,
          border: `2px solid ${ribbonHighlightColor ?? "#94a3b8"}`,
          background: "#f1f5f9",
          boxShadow: ribbonHighlightColor
            ? `0 0 0 3px ${ribbonHighlightColor}, 0 3px 10px rgba(0, 0, 0, 0.12)`
            : "0 1px 3px rgba(0,0,0,0.08)",
          minHeight: minNodeHeight,
          overflow: "visible",
          paddingBottom: 3,
        }}
      >
        <Handle
          type="target"
          position={Position.Left}
          id={SEQUENTIAL_TARGET_HANDLE_ID}
          style={{
            position: "absolute",
            top: "50%",
            left: -3,
            transform: "translateY(-50%)",
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#64748b",
          }}
        />
        <Handle
          type="target"
          position={Position.Left}
          id={PARALLEL_TARGET_HANDLE_ID}
          style={{
            position: "absolute",
            top: -5,
            left: -5,
            transform: "translateY(0%) !important" as any,
            width: 10,
            height: 10,
            borderRadius: 2,
            background: "#1e293b",
            zIndex: 10,
          }}
        />
        <Handle
          type="source"
          position={Position.Left}
          id={PARALLEL_ALT_SOURCE_HANDLE_ID}
          style={{
            position: "absolute",
            top: -5,
            left: -5,
            transform: "translateY(0%) !important" as any,
            width: 10,
            height: 10,
            borderRadius: 2,
            background: "#1e293b",
            zIndex: 10,
          }}
        />
        <Handle
          type="source"
          position={Position.Left}
          id={PARALLEL_SOURCE_HANDLE_ID}
          style={{
            position: "absolute",
            top: "calc(100% - 5px)",
            left: -5,
            transform: "translateY(0%) !important" as any,
            width: 10,
            height: 10,
            borderRadius: 2,
            background: "#1e293b",
            zIndex: 10,
          }}
        />
        <Handle
          type="target"
          position={Position.Left}
          id={PARALLEL_ALT_TARGET_HANDLE_ID}
          style={{
            position: "absolute",
            top: "calc(100% - 5px)",
            left: -5,
            transform: "translateY(0%) !important" as any,
            width: 10,
            height: 10,
            borderRadius: 2,
            background: "#1e293b",
            zIndex: 10,
          }}
        />

        <div
          style={{
            flex: 1,
          }}
        >
          <div
            style={{
              background: "#e2e8f0",
              borderBottom: "1px solid #94a3b8",
              borderRadius: "6px 6px 0 0",
              padding: "3px 8px",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 10, color: "#1d4ed8", fontWeight: 600 }}>
              #{data.sequence_index ?? "-"}
            </span>
            <span
              style={{
                flex: 1,
                minWidth: 0,
                fontSize: 11,
                fontWeight: 600,
                color: "#334155",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={data.title || "Ribbon"}
            >
              {data.title || "Ribbon"}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gap: 0,
              padding: 4,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${Math.max(1, sortedRibbonCells.length)}, minmax(80px, auto))`,
              }}
            >
              {sortedRibbonCells.map((cell) => {
                const cellDisplayText = cell.label || cell.key_command || "—";
                const isShowingLabel = Boolean(cell.label);
                const isShowingKeyCommand = !isShowingLabel && Boolean(cell.key_command);
                const isRibbonDropTargetActive = activeRibbonDropCellId === cell.id;

                return (
                  <div
                    key={`ribbon-cell:${cell.id}`}
                    data-ribbon-cell-id={cell.id}
                    className="nodrag nopan"
                    role="button"
                    tabIndex={0}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                    }}
                    onDragOver={(event) => handleRibbonCellDragOver(event, cell.id)}
                    onDragLeave={(event) => handleRibbonCellDragLeave(event, cell.id)}
                    onDrop={(event) => handleRibbonCellDrop(event, cell.id)}
                    onClick={(event) => {
                      event.stopPropagation();
                      openRibbonCellEditor(event.currentTarget, cell.id, null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        event.stopPropagation();
                        openRibbonCellEditor(event.currentTarget, cell.id, null);
                      }
                    }}
                    style={{
                      position: "relative",
                      overflow: "visible",
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: isRibbonDropTargetActive ? "#60a5fa" : "#cbd5e1",
                      background: isRibbonDropTargetActive ? "#eff6ff" : "#ffffff",
                      boxShadow: isRibbonDropTargetActive
                        ? "0 0 0 1px rgba(37, 99, 235, 0.28)"
                        : "none",
                      padding: "3px 6px",
                      minWidth: 80,
                      minHeight: 24,
                      display: "flex",
                      alignItems: "center",
                      cursor: "text",
                    }}
                    title={cell.tool_tip || "Click to edit label, key command, and tool tip"}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        color:
                          isShowingLabel || isShowingKeyCommand ? "#1e293b" : "#94a3b8",
                        fontFamily: isShowingKeyCommand
                          ? "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                          : "inherit",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        width: "100%",
                        fontStyle:
                          isShowingLabel || isShowingKeyCommand ? "normal" : "italic",
                      }}
                    >
                      {cellDisplayText}
                    </span>

                    <Handle
                      id={buildRibbonSourceHandleId(cell.id)}
                      type="source"
                      position={Position.Bottom}
                      style={{
                        position: "absolute",
                        top: "calc(100% + 2px)",
                        left: "50%",
                        transform: "translateX(-50%) translateY(0%) !important" as any,
                        width: 8,
                        height: 8,
                        background: "#3b82f6",
                        border: "2px solid #ffffff",
                        borderRadius: "50%",
                        zIndex: 5,
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {showNodeId && (
            <div
              style={{
                margin: "0 8px 0",
                padding: "2px 0 2px",
                borderTop: "1px solid #94a3b8",
                fontSize: 9,
                color: "#64748b",
              }}
            >
              id: {id}
            </div>
          )}
        </div>

        {editingRibbonCell && (
          <div
            ref={ribbonPopupRef}
            className="nodrag nopan"
            onPointerDown={(event) => {
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.stopPropagation();
            }}
            style={{
              position: "absolute",
              left: cellPopupPosition.x,
              top: cellPopupPosition.y,
              width: 220,
              background: "#ffffff",
              border: "1px solid #94a3b8",
              borderRadius: 8,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              padding: "8px 10px",
              zIndex: 10,
              display: "grid",
              gap: 6,
            }}
          >
            {pendingRibbonRegistryTerm && (
              <div
                style={{
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "#bfdbfe",
                  borderRadius: 6,
                  background: "#eff6ff",
                  padding: "6px 8px",
                  display: "grid",
                  gap: 2,
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, color: "#1e3a8a" }}>
                  Assign term: {pendingRibbonRegistryTerm.termValue}
                </div>
                {pendingRibbonRegistryTerm.referenceKey && (
                  <div style={{ fontSize: 10, color: "#475569" }}>
                    Key: {pendingRibbonRegistryTerm.referenceKey}
                  </div>
                )}
                <div style={{ fontSize: 10, color: "#334155" }}>
                  Click a field below to place this term.
                </div>
              </div>
            )}
{editingRibbonSlots.map((slot, slotIndex) => (
              <label key={`ribbon-slot:${slot.id}`}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "#64748b",
                    marginBottom: 4,
                  }}
                >
                  {getContentSlotLabel(slot, slotIndex)}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    className="nodrag"
                    style={{
                      ...inputStyle,
                      flex: 1,
                      minWidth: 0,
                      fontSize: 11,
                    }}
                    value={slot.value}
                    onPointerDown={stopNodeSelectionPropagation}
                    onMouseDown={stopNodeSelectionPropagation}
                    onClick={stopNodeSelectionPropagation}
                    onChange={(event) =>
                      updateRibbonSlotValue(slot.id, event.target.value)
                    }
                    onBlur={(event) =>
                      commitContentSlotRegistryField(slot.id, event.currentTarget.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") {
                        return;
                      }

                      event.preventDefault();
                      event.currentTarget.blur();
                    }}
                  />
                  <button
                    type="button"
                    className="nodrag"
                    style={getCanvasRegistryButtonStyle()}
                    title="Open CLP registry"
                    aria-label="Open CLP registry"
                    onPointerDown={stopNodeSelectionPropagation}
                    onMouseDown={stopNodeSelectionPropagation}
                    onClick={(event) => {
                      stopNodeSelectionPropagation(event);
                      onRegistryPickerOpen(
                        id,
                        buildContentSlotRegistryField(
                          slot.id
                        ) as unknown as `ribbon_cell:[${string}]:label`
                      );
                    }}
                  >
                    📋
                  </button>
                </div>
              </label>
            ))}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="nodrag"
                style={{
                  ...buttonStyle,
                  fontSize: 11,
                  padding: "4px 10px",
                }}
                onClick={closeRibbonCellPopup}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const nodeBaseStyle = getNodeShapeStyle(
    data.node_shape,
    selected,
    data.action_type_color,
    {
      uiJourneyHighlighted: Boolean(data.ui_journey_highlighted),
      uiJourneyRecalled: Boolean(data.ui_journey_recalled),
      glossaryHighlighted: isGlossaryHighlighted,
    }
  );
  const compactNodeStyle: React.CSSProperties = {
    ...nodeBaseStyle,
    padding:
      data.node_shape === "pill"
        ? "13px 20px 8px 20px"
        : data.node_shape === "diamond"
          ? nodeBaseStyle.padding
          : "6px 6px 4px 6px",
  };
  const baseContentStyle = getNodeContentStyle(data.node_shape);
  const compactContentStyle: React.CSSProperties =
    data.node_shape === "diamond"
      ? {
          ...baseContentStyle,
          padding: "70px 72px",
        }
      : baseContentStyle;
  const shouldRenderCanvasTitle = data.showTitle === true;

  return (
    <div
      style={compactNodeStyle}
    >
      <Handle
        type="target"
        position={Position.Left}
        id={SEQUENTIAL_TARGET_HANDLE_ID}
        style={{
          position: "absolute",
          top: "50%",
          left: -3,
          transform: "translateY(-50%)",
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "#64748b",
        }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id={PARALLEL_TARGET_HANDLE_ID}
        style={{
          position: "absolute",
          top: -5,
          left: -5,
          transform: "translateY(0%) !important" as any,
          width: 10,
          height: 10,
          borderRadius: 2,
          background: "#1e293b",
          zIndex: 10,
        }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id={PARALLEL_ALT_SOURCE_HANDLE_ID}
        style={{
          position: "absolute",
          top: -5,
          left: -5,
          transform: "translateY(0%) !important" as any,
          width: 10,
          height: 10,
          borderRadius: 2,
          background: "#1e293b",
          zIndex: 10,
        }}
      />

      {data.node_shape === "diamond" && (
        <>
          <div style={getDiamondBorderLayerStyle(data.action_type_color)} />
          <div style={getDiamondSurfaceLayerStyle()} />
        </>
      )}

      <div style={compactContentStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 6,
            paddingBottom: 3,
            borderBottom: "1px solid #94a3b8",
          }}
        >
          <span style={{ fontSize: 10, color: "#1d4ed8", fontWeight: 600 }}>
            #{data.sequence_index ?? "-"}
          </span>
        </div>

        {isVerticalTermsNode ? (
          <>
            {shouldRenderCanvasTitle && (
              <div style={{ marginTop: 4 }}>
                <div style={{ fontSize: 9, color: "#71717a", marginBottom: 2 }}>Title</div>
                <input
                  className="nodrag"
                  style={inputStyle}
                  value={data.title}
                  placeholder="Add title"
                  onPointerDown={stopNodeSelectionPropagation}
                  onMouseDown={stopNodeSelectionPropagation}
                  onClick={stopNodeSelectionPropagation}
                  onChange={(event) => updateField("title", event.target.value)}
                  onBlur={(event) =>
                    commitRegistryField("title", event.currentTarget.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") {
                      return;
                    }

                    event.preventDefault();
                    event.currentTarget.blur();
                  }}
                />
              </div>
            )}

            <div
              ref={verticalTermsContainerRef}
              style={{
                marginTop: 4,
                border: "1px solid #93c5fd",
                borderRadius: 8,
                padding: 4,
                paddingBottom: 1,
                background: "#f8fbff",
                display: "grid",
                gap: 3,
                position: "relative",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 6,
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, color: "#1d4ed8" }}>
                  {isMenuNode ? "Menu Terms" : "Terms"}
                </div>
                <button
                  type="button"
                  className="nodrag"
                  style={{
                    ...buttonStyle,
                    width: 18,
                    height: 18,
                    minWidth: 18,
                    padding: 0,
                    borderRadius: 999,
                    fontSize: 12,
                    lineHeight: 1,
                    fontWeight: 700,
                    color: "#1d4ed8",
                    borderColor: "#93c5fd",
                  }}
                  title="Add term"
                  aria-label="Add term"
                  onPointerDown={stopNodeSelectionPropagation}
                  onMouseDown={stopNodeSelectionPropagation}
                  onClick={(event) => {
                    stopNodeSelectionPropagation(event);
                    addVerticalTermGroup();
                  }}
                >
                  +
                </button>
              </div>

              {verticalTermRows.map((row, index) => {
                const isFirst = index === 0;
                const isLast = index === verticalTermRows.length - 1;

                return (
                  <div
                    key={`vertical-row:${row.group.id}`}
                    data-vertical-group-row-id={row.group.id}
                    className="nodrag nopan"
                    onPointerDown={stopNodeSelectionPropagation}
                    style={{
                      border: "1px solid #93c5fd",
                      borderRadius: 6,
                      padding: 3,
                      display: "grid",
                      gap: 3,
                      background: "#fff",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <button
                        type="button"
                        className="nodrag"
                        style={{
                          ...buttonStyle,
                          fontSize: 9,
                          padding: "1px 5px",
                          borderColor: "#fca5a5",
                          color: "#b91c1c",
                          flexShrink: 0,
                        }}
                        title="Delete this term"
                        onPointerDown={stopNodeSelectionPropagation}
                        onMouseDown={stopNodeSelectionPropagation}
                        onClick={(event) => {
                          stopNodeSelectionPropagation(event);
                          deleteVerticalTermGroup(row.group.id);
                        }}
                      >
                        X
                      </button>

                      <button
                        type="button"
                        className="nodrag"
                        style={{
                          ...buttonStyle,
                          fontSize: 9,
                          padding: "1px 5px",
                          color: "#1d4ed8",
                          borderColor: "#93c5fd",
                          flexShrink: 0,
                          opacity: isFirst ? 0.45 : 1,
                        }}
                        title="Move up"
                        disabled={isFirst}
                        onPointerDown={stopNodeSelectionPropagation}
                        onMouseDown={stopNodeSelectionPropagation}
                        onClick={(event) => {
                          stopNodeSelectionPropagation(event);
                          moveVerticalTermGroup(row.group.id, -1);
                        }}
                      >
                        ↑
                      </button>

                      <button
                        type="button"
                        className="nodrag"
                        style={{
                          ...buttonStyle,
                          fontSize: 9,
                          padding: "1px 5px",
                          color: "#1d4ed8",
                          borderColor: "#93c5fd",
                          flexShrink: 0,
                          opacity: isLast ? 0.45 : 1,
                        }}
                        title="Move down"
                        disabled={isLast}
                        onPointerDown={stopNodeSelectionPropagation}
                        onMouseDown={stopNodeSelectionPropagation}
                        onClick={(event) => {
                          stopNodeSelectionPropagation(event);
                          moveVerticalTermGroup(row.group.id, 1);
                        }}
                      >
                        ↓
                      </button>

                      <div style={{ position: "relative", paddingRight: 14, flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <input
                            className="nodrag"
                            data-menu-term-input="true"
                            style={{
                              ...inputStyle,
                              flex: 1,
                              minWidth: 0,
                            }}
                            value={row.primarySlot?.value ?? ""}
                            placeholder="Add term"
                            onPointerDown={stopNodeSelectionPropagation}
                            onMouseDown={stopNodeSelectionPropagation}
                            onClick={stopNodeSelectionPropagation}
                            onChange={(event) => {
                              if (!row.primarySlot) {
                                return;
                              }

                              updateVerticalSlotValue(row.primarySlot.id, event.target.value);
                            }}
                            onBlur={(event) => {
                              if (!row.primarySlot) {
                                return;
                              }

                              commitContentSlotRegistryField(
                                row.primarySlot.id,
                                event.currentTarget.value
                              );
                            }}
                            onKeyDown={(event) => {
                              if (event.key !== "Enter") {
                                return;
                              }

                              event.preventDefault();
                              event.currentTarget.blur();
                            }}
                          />

                          <button
                            type="button"
                            className="nodrag"
                            style={getCanvasRegistryButtonStyle()}
                            title="Open CLP registry"
                            aria-label="Open CLP registry"
                            onPointerDown={stopNodeSelectionPropagation}
                            onMouseDown={stopNodeSelectionPropagation}
                            onClick={(event) => {
                              stopNodeSelectionPropagation(event);

                              if (!row.primarySlot) {
                                return;
                              }

                              onRegistryPickerOpen(
                                id,
                                buildContentSlotRegistryField(
                                  row.primarySlot.id
                                ) as unknown as `menu_term:[${string}]`
                              );
                            }}
                          >
                            📋
                          </button>

                          <button
                            type="button"
                            className="nodrag"
                            style={getCanvasRegistryButtonStyle()}
                            title="Edit all term fields"
                            aria-label="Edit all term fields"
                            onPointerDown={stopNodeSelectionPropagation}
                            onMouseDown={stopNodeSelectionPropagation}
                            onClick={(event) => {
                              stopNodeSelectionPropagation(event);
                              const rowElement = event.currentTarget.closest(
                                "[data-vertical-group-row-id]"
                              );

                              if (!(rowElement instanceof HTMLDivElement)) {
                                return;
                              }

                              openVerticalTermEditor(rowElement, row.group.id);
                            }}
                          >
                            ↗
                          </button>
                        </div>

                        <Handle
                          type="source"
                          position={Position.Right}
                          id={buildMenuSourceHandleId(row.group.id)}
                          style={{
                            top: "50%",
                            right: -9,
                            transform: "translateY(-50%)",
                            width: 10,
                            height: 10,
                            borderRadius: 999,
                            background: "#2563eb",
                            border: "2px solid #fff",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              {editingVerticalTermRow && (
                <div
                  ref={verticalTermPopupRef}
                  className="nodrag nopan"
                  onPointerDown={stopNodeSelectionPropagation}
                  onClick={stopNodeSelectionPropagation}
                  style={{
                    position: "absolute",
                    left: verticalPopupPosition.x,
                    top: verticalPopupPosition.y,
                    width: 260,
                    background: "#ffffff",
                    border: "1px solid #94a3b8",
                    borderRadius: 8,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    padding: "8px 10px",
                    zIndex: 10,
                    display: "grid",
                    gap: 6,
                  }}
                >
                  {editingVerticalTermRow.slots.map((slot, slotIndex) => (
                    <label key={`vertical-slot:${slot.id}`}>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: "#64748b",
                          marginBottom: 4,
                        }}
                      >
                        {getContentSlotLabel(slot, slotIndex)}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input
                          className="nodrag"
                          style={{
                            ...inputStyle,
                            flex: 1,
                            minWidth: 0,
                            fontSize: 11,
                          }}
                          value={slot.value}
                          onPointerDown={stopNodeSelectionPropagation}
                          onMouseDown={stopNodeSelectionPropagation}
                          onClick={stopNodeSelectionPropagation}
                          onChange={(event) =>
                            updateVerticalSlotValue(slot.id, event.target.value)
                          }
                          onBlur={(event) =>
                            commitContentSlotRegistryField(slot.id, event.currentTarget.value)
                          }
                          onKeyDown={(event) => {
                            if (event.key !== "Enter") {
                              return;
                            }

                            event.preventDefault();
                            event.currentTarget.blur();
                          }}
                        />
                        <button
                          type="button"
                          className="nodrag"
                          style={getCanvasRegistryButtonStyle()}
                          title="Open CLP registry"
                          aria-label="Open CLP registry"
                          onPointerDown={stopNodeSelectionPropagation}
                          onMouseDown={stopNodeSelectionPropagation}
                          onClick={(event) => {
                            stopNodeSelectionPropagation(event);
                            onRegistryPickerOpen(
                              id,
                              buildContentSlotRegistryField(
                                slot.id
                              ) as unknown as `menu_term:[${string}]`
                            );
                          }}
                        >
                          📋
                        </button>
                      </div>
                    </label>
                  ))}

                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className="nodrag"
                      style={{
                        ...buttonStyle,
                        fontSize: 11,
                        padding: "4px 10px",
                      }}
                      onClick={closeVerticalTermPopup}
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {shouldRenderCanvasTitle && (
              <div style={{ marginTop: 4 }}>
                <div style={{ fontSize: 9, color: "#71717a", marginBottom: 2 }}>Title</div>
                <input
                  className="nodrag"
                  style={getDefaultRegistryFieldInputStyle("title", inputStyle)}
                  value={data.title}
                  placeholder="Add title"
                  onPointerDown={stopNodeSelectionPropagation}
                  onMouseDown={stopNodeSelectionPropagation}
                  onClick={stopNodeSelectionPropagation}
                  onDragOver={(event) =>
                    handleDefaultRegistryFieldDragOver(event, "title")
                  }
                  onDragLeave={(event) =>
                    handleDefaultRegistryFieldDragLeave(event, "title")
                  }
                  onDrop={(event) => handleDefaultRegistryFieldDrop(event, "title")}
                  onChange={(event) => updateField("title", event.target.value)}
                  onBlur={(event) =>
                    commitRegistryField("title", event.currentTarget.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") {
                      return;
                    }

                    event.preventDefault();
                    event.currentTarget.blur();
                  }}
                />
              </div>
            )}

            {visibleDisplayTermFieldTypes.map((displayTermFieldType) => (
              <div
                key={`display-term:${displayTermFieldType}`}
                style={{
                  marginTop: 4,
                  paddingTop: 4,
                }}
              >
                <div style={{ fontSize: 9, color: "#71717a", marginBottom: 2 }}>
                  {displayTermFieldType === "body_text"
                    ? "Body Text"
                    : CONTROLLED_LANGUAGE_FIELD_LABELS[displayTermFieldType]}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  {displayTermFieldType === "body_text" ? (
                    <textarea
                      className="nodrag"
                      rows={3}
                      style={getDefaultRegistryFieldInputStyle(displayTermFieldType, {
                        ...inputStyle,
                        flex: 1,
                        minWidth: 0,
                        minHeight: 52,
                        resize: "vertical",
                      })}
                      value={data[displayTermFieldType]}
                      placeholder="Add body text"
                      onPointerDown={stopNodeSelectionPropagation}
                      onMouseDown={stopNodeSelectionPropagation}
                      onClick={stopNodeSelectionPropagation}
                      onDragOver={(event) =>
                        handleDefaultRegistryFieldDragOver(event, displayTermFieldType)
                      }
                      onDragLeave={(event) =>
                        handleDefaultRegistryFieldDragLeave(event, displayTermFieldType)
                      }
                      onDrop={(event) =>
                        handleDefaultRegistryFieldDrop(event, displayTermFieldType)
                      }
                      onChange={(event) =>
                        updateField(displayTermFieldType, event.target.value)
                      }
                      onBlur={(event) =>
                        commitRegistryField(displayTermFieldType, event.currentTarget.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") {
                          return;
                        }

                        event.preventDefault();
                        event.currentTarget.blur();
                      }}
                    />
                  ) : (
                    <input
                      className="nodrag"
                      style={getDefaultRegistryFieldInputStyle(displayTermFieldType, {
                        ...inputStyle,
                        flex: 1,
                        minWidth: 0,
                      })}
                      value={data[displayTermFieldType]}
                      placeholder="Add term"
                      onPointerDown={stopNodeSelectionPropagation}
                      onMouseDown={stopNodeSelectionPropagation}
                      onClick={stopNodeSelectionPropagation}
                      onDragOver={(event) =>
                        handleDefaultRegistryFieldDragOver(event, displayTermFieldType)
                      }
                      onDragLeave={(event) =>
                        handleDefaultRegistryFieldDragLeave(event, displayTermFieldType)
                      }
                      onDrop={(event) =>
                        handleDefaultRegistryFieldDrop(event, displayTermFieldType)
                      }
                      onChange={(event) =>
                        updateField(displayTermFieldType, event.target.value)
                      }
                      onBlur={(event) =>
                        commitRegistryField(displayTermFieldType, event.currentTarget.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") {
                          return;
                        }

                        event.preventDefault();
                        event.currentTarget.blur();
                      }}
                    />
                  )}
                  <button
                    type="button"
                    className="nodrag"
                    style={getCanvasRegistryButtonStyle()}
                    title="Open CLP registry"
                    aria-label="Open CLP registry"
                    onPointerDown={stopNodeSelectionPropagation}
                    onMouseDown={stopNodeSelectionPropagation}
                    onClick={(event) => {
                      stopNodeSelectionPropagation(event);
                      onRegistryPickerOpen(id, displayTermFieldType);
                    }}
                  >
                    📋
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        {showNodeId && (
          <div
            style={{
              marginTop: 4,
              paddingTop: 3,
              borderTop: "1px solid #94a3b8",
              fontSize: 9,
              color: "#71717a",
            }}
          >
            id: {id}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id={SEQUENTIAL_SOURCE_HANDLE_ID}
        style={{ opacity: isMenuNode ? 0 : 1 }}
        isConnectable={!isMenuNode}
      />

      <Handle
        type="source"
        position={Position.Left}
        id={PARALLEL_SOURCE_HANDLE_ID}
        style={{
          position: "absolute",
          top: "calc(100% - 5px)",
          left: -5,
          transform: "translateY(0%) !important" as any,
          width: 10,
          height: 10,
          borderRadius: 2,
          background: "#1e293b",
          zIndex: 10,
        }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id={PARALLEL_ALT_TARGET_HANDLE_ID}
        style={{
          position: "absolute",
          top: "calc(100% - 5px)",
          left: -5,
          transform: "translateY(0%) !important" as any,
          width: 10,
          height: 10,
          borderRadius: 2,
          background: "#1e293b",
          zIndex: 10,
        }}
      />
    </div>
  );
});

export type { FlowCopyNodeProps };
export { FlowCopyNode, BodyTextPreview };
