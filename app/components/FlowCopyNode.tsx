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
  menuTermGlossaryTerms: string[];
  showNodeId: boolean;
  showDefaultNodeTitleOnCanvas: boolean;
  onMenuTermDeleteBlocked: () => void;
  onMenuNodeConfigChange: (
    nodeId: string,
    updater: (currentConfig: MenuNodeConfig) => MenuNodeConfig
  ) => void;
};

function FlowCopyNode({
  id,
  data,
  selected,
  onBeforeChange,
  menuTermGlossaryTerms,
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
  const [openMenuGlossaryTermId, setOpenMenuGlossaryTermId] = useState<string | null>(
    null
  );
  const [isEditingFrameTitle, setIsEditingFrameTitle] = useState(false);
  const [editingCellId, setEditingCellId] = useState<string | null>(null);
  const [cellPopupPosition, setCellPopupPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

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

  const visibleMenuGlossaryTermId =
    isMenuNode &&
    openMenuGlossaryTermId &&
    menuConfig.terms.some((term) => term.id === openMenuGlossaryTermId)
      ? openMenuGlossaryTermId
      : null;

  const displayTermFieldType = data.display_term_field;
  const displayTermFieldLabel = CONTROLLED_LANGUAGE_FIELD_LABELS[displayTermFieldType];
  const displayTermValue = data[displayTermFieldType];
  const editingRibbonCell = useMemo(() => {
    if (!isRibbonNode || !editingCellId) {
      return null;
    }

    return ribbonConfig.cells.find((cell) => cell.id === editingCellId) ?? null;
  }, [editingCellId, isRibbonNode, ribbonConfig.cells]);

  useEffect(() => {
    updateNodeInternals(id);
  }, [
    data.node_type,
    id,
    menuConfig.terms.length,
    ribbonConfig.columns,
    ribbonConfig.cells.length,
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
      setOpenMenuGlossaryTermId((current) => (current === termId ? null : current));
    },
    [isMenuNode, menuConfig, onMenuTermDeleteBlocked, replaceMenuConfig]
  );

  const toggleMenuTermGlossary = useCallback((termId: string) => {
    setOpenMenuGlossaryTermId((current) => (current === termId ? null : termId));
  }, []);

  const applyGlossaryTermToMenuTerm = useCallback(
    (termId: string, glossaryTerm: string) => {
      updateMenuTermById(termId, glossaryTerm);
      setOpenMenuGlossaryTermId(null);
    },
    [updateMenuTermById]
  );

  const closeRibbonCellPopup = useCallback(() => {
    setEditingCellId(null);
  }, []);

  const openRibbonCellEditor = useCallback(
    (
      cellElement: HTMLDivElement,
      cellId: string,
      pointerPosition?: { x: number; y: number }
    ) => {
      const containerBounds = ribbonContainerRef.current?.getBoundingClientRect();
      const cellBounds = cellElement.getBoundingClientRect();

      if (containerBounds) {
        if (pointerPosition) {
          setCellPopupPosition({
            x: pointerPosition.x - containerBounds.left + 8,
            y: pointerPosition.y - containerBounds.top + 10,
          });
        } else {
          setCellPopupPosition({
            x: cellBounds.left - containerBounds.left + 8,
            y: cellBounds.bottom - containerBounds.top + 6,
          });
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
              onChange={(event) => updateField("title", event.target.value)}
              onBlur={() => setIsEditingFrameTitle(false)}
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
    });

    const totalCells = sortedRibbonCells.length;
    const minNodeHeight = Math.max(70, totalCells > 0 ? 86 : 70);

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
          paddingBottom: 12,
        }}
      >
        <div
          style={{
            flex: 1,
          }}
        >
          <div
            style={{
              background: "#e2e8f0",
              borderBottom: "1px solid #cbd5e1",
              borderRadius: "6px 6px 0 0",
              padding: "6px 10px",
              fontSize: 12,
              fontWeight: 600,
              color: "#334155",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={data.title || "Ribbon"}
          >
            {data.title || "Ribbon"}
          </div>

          <div
            style={{
              display: "grid",
              gap: 0,
              padding: 8,
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
                    className="nodrag"
                    role="button"
                    tabIndex={0}
                    onClick={(event) =>
                      openRibbonCellEditor(event.currentTarget, cell.id, {
                        x: event.clientX,
                        y: event.clientY,
                      })
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openRibbonCellEditor(event.currentTarget, cell.id);
                      }
                    }}
                    style={{
                      position: "relative",
                      overflow: "visible",
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      padding: "4px 8px",
                      minWidth: 80,
                      minHeight: 28,
                      display: "flex",
                      alignItems: "center",
                      cursor: "text",
                    }}
                    title={cell.tool_tip || "Click to edit label, key command, and tool tip"}
                  >
                    <span
                      style={{
                        fontSize: 11,
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
                padding: "0 10px 8px",
                fontSize: 10,
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
            className="nodrag"
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
                onChange={(event) =>
                  updateRibbonCellField(
                    editingRibbonCell.id,
                    "label",
                    event.target.value
                  )
                }
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
              <input
                className="nodrag"
                style={{
                  ...inputStyle,
                  fontSize: 11,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                }}
                value={editingRibbonCell.key_command}
                maxLength={RIBBON_CELL_MAX_KEY_COMMAND_LENGTH}
                onChange={(event) =>
                  updateRibbonCellField(
                    editingRibbonCell.id,
                    "key_command",
                    event.target.value
                  )
                }
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
                Tool Tip
              </div>
              <textarea
                className="nodrag"
                style={{
                  ...inputStyle,
                  fontSize: 11,
                  resize: "vertical",
                  minHeight: 44,
                }}
                rows={2}
                value={editingRibbonCell.tool_tip}
                onChange={(event) =>
                  updateRibbonCellField(
                    editingRibbonCell.id,
                    "tool_tip",
                    event.target.value
                  )
                }
              />
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

  return (
    <div
      style={getNodeShapeStyle(data.node_shape, selected, data.action_type_color, {
        uiJourneyHighlighted: Boolean(data.ui_journey_highlighted),
        uiJourneyRecalled: Boolean(data.ui_journey_recalled),
      })}
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

      <div style={getNodeContentStyle(data.node_shape)}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: 11, color: "#1d4ed8", fontWeight: 600 }}>
            #{data.sequence_index ?? "-"}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: data.action_type_color,
              border: `1px solid ${data.action_type_color}`,
              borderRadius: 999,
              padding: "2px 8px",
              background: "#fff",
            }}
          >
            {data.action_type_name}
          </span>
        </div>

        {isMenuNode ? (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, color: "#71717a", marginBottom: 4 }}>Title</div>
            <input
              className="nodrag"
              style={inputStyle}
              value={data.title}
              placeholder="Add title"
              onChange={(event) => updateField("title", event.target.value)}
            />
          </div>
        ) : (
          <>
            {showDefaultNodeTitleOnCanvas && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 11, color: "#71717a", marginBottom: 4 }}>Title</div>
                <input
                  className="nodrag"
                  style={inputStyle}
                  value={data.title}
                  placeholder="Add title"
                  onChange={(event) => updateField("title", event.target.value)}
                />
              </div>
            )}

            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, color: "#71717a", marginBottom: 4 }}>
                {displayTermFieldLabel}
              </div>
              <input
                className="nodrag"
                style={inputStyle}
                value={displayTermValue}
                placeholder="Add term"
                onChange={(event) =>
                  updateField(displayTermFieldType, event.target.value)
                }
              />
            </div>
          </>
        )}

        {isMenuNode && (
          <div
            style={{
              marginTop: 8,
              border: "1px solid #dbeafe",
              borderRadius: 8,
              padding: 6,
              background: "#f8fbff",
              display: "grid",
              gap: 6,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8" }}>
                Menu Terms
              </div>
              <button
                type="button"
                className="nodrag"
                style={{
                  ...buttonStyle,
                  width: 20,
                  height: 20,
                  minWidth: 20,
                  padding: 0,
                  borderRadius: 999,
                  fontSize: 14,
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
                  border: "1px solid #bfdbfe",
                  borderRadius: 6,
                  padding: 5,
                  display: "grid",
                  gap: 5,
                  background: "#fff",
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
                  <div style={{ fontSize: 10, color: "#334155", fontWeight: 700 }}>
                    Term {index + 1}
                  </div>
                  <button
                    type="button"
                    className="nodrag"
                    style={{
                      ...buttonStyle,
                      fontSize: 10,
                      padding: "2px 6px",
                      background:
                        visibleMenuGlossaryTermId === menuTerm.id ? "#dbeafe" : "#fff",
                      borderColor:
                        visibleMenuGlossaryTermId === menuTerm.id ? "#93c5fd" : "#d4d4d8",
                    }}
                    onClick={() => toggleMenuTermGlossary(menuTerm.id)}
                  >
                    Glossary ▾
                  </button>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button
                    type="button"
                    className="nodrag"
                    style={{
                      ...buttonStyle,
                      fontSize: 10,
                      padding: "2px 6px",
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
                    <input
                      className="nodrag"
                      data-menu-term-input="true"
                      style={inputStyle}
                      value={menuTerm.term}
                      placeholder="Add term"
                      onChange={(event) => updateMenuTermById(menuTerm.id, event.target.value)}
                    />

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

                {visibleMenuGlossaryTermId === menuTerm.id && (
                  <div
                    style={{
                      border: "1px solid #dbeafe",
                      borderRadius: 6,
                      background: "#f8fbff",
                      padding: 6,
                    }}
                  >
                    {menuTermGlossaryTerms.length === 0 ? (
                      <div style={{ fontSize: 10, color: "#64748b" }}>
                        No Menu Term options yet. Add one in a Menu node or include one in Controlled Language.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {menuTermGlossaryTerms.map((glossaryTerm) => (
                          <button
                            key={`menu-node-glossary:${menuTerm.id}:${glossaryTerm}`}
                            type="button"
                            className="nodrag"
                            style={{
                              ...buttonStyle,
                              fontSize: 10,
                              padding: "2px 6px",
                            }}
                            onClick={() =>
                              applyGlossaryTermToMenuTerm(menuTerm.id, glossaryTerm)
                            }
                          >
                            {glossaryTerm}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {showNodeId && (
          <div style={{ marginTop: 8, fontSize: 10, color: "#71717a" }}>id: {id}</div>
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
