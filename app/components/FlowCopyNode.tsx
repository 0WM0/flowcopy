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
  inputStyle,
  buttonStyle,
} from "../constants";

import {
  normalizeMenuNodeConfig,
  normalizeFrameNodeConfig,
  normalizeRibbonNodeConfig,
  clampMenuRightConnections,
  createMenuNodeTerm,
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
    updater: (currentConfig: MenuNodeConfig) => MenuNodeConfig
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

const isRegistryTrackedField = (
  field: EditableMicrocopyField
): field is RegistryTrackedField =>
  REGISTRY_TRACKED_FIELDS.includes(field as RegistryTrackedField);

const buildMenuTermRegistryField = (menuTermId: string): `menu_term:[${string}]` =>
  `menu_term:[${menuTermId}]`;

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

function FlowCopyNode({
  id,
  data,
  selected,
  onBeforeChange,
  onCommitRegistryField,
  onRegistryPickerOpen,
  menuTermGlossaryTerms,
  glossaryHighlightedNodeIds,
  showNodeId,
  showDefaultNodeTitleOnCanvas,
  onMenuTermDeleteBlocked,
  onMenuNodeConfigChange,
}: FlowCopyNodeProps) {
  const { setNodes } = useReactFlow<FlowNode, FlowEdge>();
  const updateNodeInternals = useUpdateNodeInternals();
  const frameTitleInputRef = useRef<HTMLInputElement | null>(null);
  const ribbonContainerRef = useRef<HTMLDivElement | null>(null);
  const ribbonPopupRef = useRef<HTMLDivElement | null>(null);
  const [isEditingFrameTitle, setIsEditingFrameTitle] = useState(false);
  const [editingCellId, setEditingCellId] = useState<string | null>(null);
  const [cellPopupPosition, setCellPopupPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const isGlossaryHighlighted = glossaryHighlightedNodeIds.has(id);

  const isMenuNode = data.node_type === "menu";
  const isFrameNode = data.node_type === "frame";
  const isRibbonNode = data.node_type === "ribbon";
  const menuConfig = useMemo(
    () =>
      normalizeMenuNodeConfig(
        data.menu_config,
        data.primary_cta,
        Math.max(
          MENU_NODE_RIGHT_CONNECTIONS_MIN,
          data.menu_config.max_right_connections
        )
      ),
    [data.menu_config, data.primary_cta]
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

  const visibleDisplayTermFieldTypes = useMemo(
    () =>
      Array.from(
        new Set(
          Array.isArray(data.display_term_fields)
            ? data.display_term_fields
            : [data.display_term_field]
        )
      ),
    [data.display_term_field, data.display_term_fields]
  );
  const editingRibbonCell = useMemo(() => {
    if (!isRibbonNode || !editingCellId) {
      return null;
    }

    return ribbonConfig.cells.find((cell) => cell.id === editingCellId) ?? null;
  }, [editingCellId, isRibbonNode, ribbonConfig.cells]);

  const stopNodeSelectionPropagation = useCallback(
    (event: React.SyntheticEvent<HTMLElement>) => {
      event.stopPropagation();
    },
    []
  );

  useEffect(() => {
    updateNodeInternals(id);
  }, [
    data.node_type,
    id,
    menuConfig.terms.length,
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
      if (!isRegistryTrackedField(field) || isFrameNode) {
        return;
      }

      onCommitRegistryField(id, field, value);
    },
    [id, isFrameNode, onCommitRegistryField]
  );

  const commitMenuTermRegistryField = useCallback(
    (menuTermId: string, value: string) => {
      if (!isMenuNode) {
        return;
      }

      onCommitRegistryField(id, buildMenuTermRegistryField(menuTermId), value);
    },
    [id, isMenuNode, onCommitRegistryField]
  );

  const commitRibbonCellRegistryField = useCallback(
    (cellId: string, field: "label" | "key_command" | "tool_tip", value: string) => {
      if (!isRibbonNode) {
        return;
      }

      onCommitRegistryField(id, buildRibbonCellRegistryField(cellId, field), value);
    },
    [id, isRibbonNode, onCommitRegistryField]
  );

  const replaceMenuConfig = useCallback(
    (nextMenuConfig: MenuNodeConfig) => {
      if (!isMenuNode) {
        return;
      }

      onMenuNodeConfigChange(id, () => nextMenuConfig);
    },
    [id, isMenuNode, onMenuNodeConfigChange]
  );

  const addMenuTerm = useCallback(() => {
    if (!isMenuNode) {
      return;
    }

    replaceMenuConfig({
      max_right_connections: clampMenuRightConnections(menuConfig.max_right_connections + 1),
      terms: [...menuConfig.terms, createMenuNodeTerm("")],
    });
  }, [isMenuNode, menuConfig, replaceMenuConfig]);

  const updateMenuTermById = useCallback(
    (termId: string, term: string) => {
      if (!isMenuNode) {
        return;
      }

      const nextTerms = menuConfig.terms.map((menuTerm) =>
        menuTerm.id === termId
          ? {
              ...menuTerm,
              term,
            }
          : menuTerm
      );

      replaceMenuConfig({
        ...menuConfig,
        terms: nextTerms,
      });
    },
    [isMenuNode, menuConfig, replaceMenuConfig]
  );

  const deleteMenuTermById = useCallback(
    (termId: string) => {
      if (!isMenuNode) {
        return;
      }

      if (menuConfig.terms.length <= MENU_NODE_RIGHT_CONNECTIONS_MIN) {
        onMenuTermDeleteBlocked();
        return;
      }

      const termToDelete = menuConfig.terms.find((term) => term.id === termId);
      if (!termToDelete) {
        return;
      }

      const confirmed = window.confirm(
        `Delete this menu term (${termToDelete.term || "Untitled"})? This will also remove any sequential edge attached to it.`
      );

      if (!confirmed) {
        return;
      }

      const filteredTerms = menuConfig.terms.filter((term) => term.id !== termId);
      const nextMax = clampMenuRightConnections(
        Math.max(filteredTerms.length, MENU_NODE_RIGHT_CONNECTIONS_MIN)
      );

      replaceMenuConfig({
        max_right_connections: nextMax,
        terms: filteredTerms,
      });
    },
    [isMenuNode, menuConfig, onMenuTermDeleteBlocked, replaceMenuConfig]
  );

  const closeRibbonCellPopup = useCallback(() => {
    setEditingCellId(null);
  }, []);

  const openRibbonCellEditor = useCallback(
    (cellElement: HTMLDivElement, cellId: string) => {
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
    },
    []
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

  useEffect(() => {
    if (!isRibbonNode) {
      setEditingCellId(null);
      return;
    }

    if (editingCellId && !ribbonConfig.cells.some((cell) => cell.id === editingCellId)) {
      setEditingCellId(null);
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
                    onClick={(event) => {
                      event.stopPropagation();
                      openRibbonCellEditor(event.currentTarget, cell.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        event.stopPropagation();
                        openRibbonCellEditor(event.currentTarget, cell.id);
                      }
                    }}
                    style={{
                      position: "relative",
                      overflow: "visible",
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
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
            <label>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "#64748b",
                  marginBottom: 4,
                }}
              >
                Label
              </div>
              <input
                className="nodrag"
                style={{
                  ...inputStyle,
                  fontSize: 11,
                }}
                value={editingRibbonCell.label}
                onPointerDown={stopNodeSelectionPropagation}
                onMouseDown={stopNodeSelectionPropagation}
                onClick={stopNodeSelectionPropagation}
                onChange={(event) =>
                  updateRibbonCellField(
                    editingRibbonCell.id,
                    "label",
                    event.target.value
                  )
                }
                onBlur={(event) =>
                  commitRibbonCellRegistryField(
                    editingRibbonCell.id,
                    "label",
                    event.currentTarget.value
                  )
                }
                onKeyDown={(event) => {
                  if (event.key !== "Enter") {
                    return;
                  }

                  event.preventDefault();
                  event.currentTarget.blur();
                }}
              />
            </label>

            <label>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "#64748b",
                  marginBottom: 4,
                }}
              >
                Key Command
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  className="nodrag"
                  style={{
                    ...inputStyle,
                    flex: 1,
                    minWidth: 0,
                    fontSize: 11,
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  }}
                  value={editingRibbonCell.key_command}
                  maxLength={RIBBON_CELL_MAX_KEY_COMMAND_LENGTH}
                  onPointerDown={stopNodeSelectionPropagation}
                  onMouseDown={stopNodeSelectionPropagation}
                  onClick={stopNodeSelectionPropagation}
                  onChange={(event) =>
                    updateRibbonCellField(
                      editingRibbonCell.id,
                      "key_command",
                      event.target.value
                    )
                  }
                  onBlur={(event) =>
                    commitRibbonCellRegistryField(
                      editingRibbonCell.id,
                      "key_command",
                      event.currentTarget.value
                    )
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
                      buildRibbonCellRegistryField(editingRibbonCell.id, "key_command")
                    );
                  }}
                >
                  📋
                </button>
              </div>
            </label>

            <label>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "#64748b",
                  marginBottom: 4,
                }}
              >
                Tool Tip
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                <textarea
                  className="nodrag"
                  style={{
                    ...inputStyle,
                    flex: 1,
                    minWidth: 0,
                    fontSize: 11,
                    resize: "vertical",
                    minHeight: 44,
                  }}
                  rows={2}
                  value={editingRibbonCell.tool_tip}
                  onPointerDown={stopNodeSelectionPropagation}
                  onMouseDown={stopNodeSelectionPropagation}
                  onClick={stopNodeSelectionPropagation}
                  onChange={(event) =>
                    updateRibbonCellField(
                      editingRibbonCell.id,
                      "tool_tip",
                      event.target.value
                    )
                  }
                  onBlur={(event) =>
                    commitRibbonCellRegistryField(
                      editingRibbonCell.id,
                      "tool_tip",
                      event.currentTarget.value
                    )
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
                      buildRibbonCellRegistryField(editingRibbonCell.id, "tool_tip")
                    );
                  }}
                >
                  📋
                </button>
              </div>
            </label>

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
          <span
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: data.action_type_color,
              border: `1px solid ${data.action_type_color}`,
              borderRadius: 2,
              padding: "0px 4px",
              background: "#fff",
            }}
          >
            {data.action_type_name}
          </span>
        </div>

        {isMenuNode ? (
          <>
            {showDefaultNodeTitleOnCanvas && (
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
          </>
        ) : (
          <>
            {showDefaultNodeTitleOnCanvas && (
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

            {visibleDisplayTermFieldTypes.map((displayTermFieldType) => (
              <div
                key={`display-term:${displayTermFieldType}`}
                style={{
                  marginTop: 4,
                  paddingTop: 4,
                }}
              >
                <div style={{ fontSize: 9, color: "#71717a", marginBottom: 2 }}>
                  {CONTROLLED_LANGUAGE_FIELD_LABELS[displayTermFieldType]}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <input
                    className="nodrag"
                    style={{
                      ...inputStyle,
                      flex: 1,
                      minWidth: 0,
                    }}
                    value={data[displayTermFieldType]}
                    placeholder="Add term"
                    onPointerDown={stopNodeSelectionPropagation}
                    onMouseDown={stopNodeSelectionPropagation}
                    onClick={stopNodeSelectionPropagation}
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

        {isMenuNode && (
          <div
            style={{
              marginTop: 4,
              border: "1px solid #93c5fd",
              borderRadius: 8,
              padding: 4,
              paddingBottom: 1,
              background: "#f8fbff",
              display: "grid",
              gap: 3,
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
                Menu Terms
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
                title="Add menu term"
                aria-label="Add menu term"
                onClick={addMenuTerm}
              >
                +
              </button>
            </div>

            {menuConfig.terms.map((menuTerm, index) => (
              <div
                key={`menu-term:${menuTerm.id}`}
                style={{
                  border: "1px solid #93c5fd",
                  borderRadius: 6,
                  padding: 3,
                  display: "grid",
                  gap: 3,
                  background: "#fff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <div style={{ fontSize: 9, color: "#334155", fontWeight: 700 }}>
                    Term {index + 1}
                  </div>
                </div>

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
                    onClick={() => deleteMenuTermById(menuTerm.id)}
                  >
                    X
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
                        value={menuTerm.term}
                        placeholder="Add term"
                        onPointerDown={stopNodeSelectionPropagation}
                        onMouseDown={stopNodeSelectionPropagation}
                        onClick={stopNodeSelectionPropagation}
                        onChange={(event) => updateMenuTermById(menuTerm.id, event.target.value)}
                        onBlur={(event) =>
                          commitMenuTermRegistryField(menuTerm.id, event.currentTarget.value)
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
                          onRegistryPickerOpen(id, buildMenuTermRegistryField(menuTerm.id));
                        }}
                      >
                        📋
                      </button>
                    </div>

                    <Handle
                      type="source"
                      position={Position.Right}
                      id={buildMenuSourceHandleId(menuTerm.id)}
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
            ))}
          </div>
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
}

export type { FlowCopyNodeProps };
export { FlowCopyNode, BodyTextPreview };
