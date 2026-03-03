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
  NodeType,
  PersistableMicrocopyNodeData,
} from "../types";

import {
  MENU_NODE_RIGHT_CONNECTIONS_MIN,
  MENU_NODE_RIGHT_CONNECTIONS_MAX,
  MENU_SOURCE_HANDLE_PREFIX,
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
  clampMenuRightConnections,
  createMenuNodeTerm,
  buildMenuSourceHandleId,
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
  const [openMenuGlossaryTermId, setOpenMenuGlossaryTermId] = useState<string | null>(
    null
  );
  const [isEditingFrameTitle, setIsEditingFrameTitle] = useState(false);

  const isMenuNode = data.node_type === "menu";
  const isFrameNode = data.node_type === "frame";
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

  useEffect(() => {
    updateNodeInternals(id);
  }, [data.node_type, id, menuConfig.terms.length, updateNodeInternals]);

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
        />
        <Handle
          type="target"
          position={Position.Top}
          id={PARALLEL_TARGET_HANDLE_ID}
        />
        <Handle
          type="source"
          position={Position.Top}
          id={PARALLEL_ALT_SOURCE_HANDLE_ID}
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
          position={Position.Bottom}
          id={PARALLEL_SOURCE_HANDLE_ID}
        />
        <Handle
          type="target"
          position={Position.Bottom}
          id={PARALLEL_ALT_TARGET_HANDLE_ID}
        />
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
      />
      <Handle
        type="target"
        position={Position.Top}
        id={PARALLEL_TARGET_HANDLE_ID}
      />
      <Handle
        type="source"
        position={Position.Top}
        id={PARALLEL_ALT_SOURCE_HANDLE_ID}
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
        position={Position.Bottom}
        id={PARALLEL_SOURCE_HANDLE_ID}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id={PARALLEL_ALT_TARGET_HANDLE_ID}
      />
    </div>
  );
}

export type { FlowCopyNodeProps };
export { FlowCopyNode, BodyTextPreview };
