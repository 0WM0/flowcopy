"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  reconnectEdge,
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  useEdgesState,
  useNodesState,
  useReactFlow,
  useUpdateNodeInternals,
  type Connection,
  type DefaultEdgeOptions,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeProps,
  type ReactFlowInstance,
  type OnSelectionChangeParams,
} from "@xyflow/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import "@xyflow/react/dist/style.css";

type NodeShape = "rectangle" | "rounded" | "pill" | "diamond";
type EdgeKind = "sequential" | "parallel";
type EdgeLineStyle = "solid" | "dashed" | "dotted";
type NodeType = "default" | "menu";
type NodeControlledLanguageFieldType =
  | "primary_cta"
  | "secondary_cta"
  | "helper_text"
  | "error_text";
type ControlledLanguageFieldType = NodeControlledLanguageFieldType | "menu_term";

type MenuNodeTerm = {
  id: string;
  term: string;
};

type MenuNodeConfig = {
  max_right_connections: number;
  terms: MenuNodeTerm[];
};

type EdgeDirection = "forward" | "reversed";

type FlowEdgeData = {
  edge_kind: EdgeKind;
  stroke_color?: string;
  line_style?: EdgeLineStyle;
  is_reversed?: boolean;
};

type MicrocopyNodeData = {
  title: string;
  body_text: string;
  primary_cta: string;
  secondary_cta: string;
  helper_text: string;
  error_text: string;
  tone: string;
  polarity: string;
  reversibility: string;
  concept: string;
  notes: string;
  action_type_name: string;
  action_type_color: string;
  card_style: string;
  node_shape: NodeShape;
  node_type: NodeType;
  menu_config: MenuNodeConfig;
  parallel_group_id: string | null;
  sequence_index: number | null;
};

type PersistableMicrocopyNodeData = Omit<MicrocopyNodeData, "sequence_index">;
type EditableMicrocopyField = Exclude<
  keyof PersistableMicrocopyNodeData,
  "parallel_group_id" | "menu_config" | "node_type"
>;

type GlobalOptionConfig = {
  tone: string[];
  polarity: string[];
  reversibility: string[];
  concept: string[];
  action_type_name: string[];
  action_type_color: string[];
  card_style: string[];
};

type GlobalOptionField = keyof GlobalOptionConfig;

type FlowNode = Node<MicrocopyNodeData, "flowcopyNode">;
type FlowEdge = Edge<FlowEdgeData>;

type SerializableFlowNode = {
  id: string;
  position?: FlowNode["position"];
  data?: Partial<PersistableMicrocopyNodeData>;
};

type PersistedCanvasState = {
  nodes: SerializableFlowNode[];
  edges: FlowEdge[];
  adminOptions: GlobalOptionConfig;
  controlledLanguageGlossary: ControlledLanguageGlossaryEntry[];
};

type ControlledLanguageGlossaryEntry = {
  field_type: ControlledLanguageFieldType;
  term: string;
  include: boolean;
};

type ControlledLanguageAuditTermEntry = {
  field_type: ControlledLanguageFieldType;
  term: string;
};

type ControlledLanguageAuditRow = ControlledLanguageGlossaryEntry & {
  occurrences: number;
};

type ControlledLanguageDraftRow = {
  field_type: ControlledLanguageFieldType;
  term: string;
  include: boolean;
};

type FlowOrderingResult = {
  orderedNodeIds: string[];
  sequentialOrderedNodeIds: string[];
  sequenceByNodeId: Partial<Record<string, number>>;
  parallelGroupByNodeId: Partial<Record<string, string>>;
  hasCycle: boolean;
};

type ParallelGroupInfo = {
  parallelGroupByNodeId: Partial<Record<string, string>>;
  componentNodeIds: string[][];
};

type AppView = "account" | "dashboard" | "editor";
type EditorSurfaceMode = "canvas" | "table";

type ProjectRecord = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  canvas: PersistedCanvasState;
};

type AccountRecord = {
  id: string;
  code: string;
  projects: ProjectRecord[];
};

type AppStore = {
  version: 1;
  accounts: AccountRecord[];
  session: {
    activeAccountId: string | null;
    activeProjectId: string | null;
    view: AppView;
    editorMode: EditorSurfaceMode;
  };
};

const FLAT_EXPORT_COLUMNS = [
  "session_activeAccountId",
  "session_activeProjectId",
  "session_view",
  "session_editorMode",
  "account_id",
  "account_code",
  "project_id",
  "project_name",
  "project_createdAt",
  "project_updatedAt",
  "project_sequence_id",
  "node_id",
  "node_order_id",
  "sequence_index",
  "parallel_group_id",
  "position_x",
  "position_y",
  "title",
  "body_text",
  "primary_cta",
  "secondary_cta",
  "helper_text",
  "error_text",
  "tone",
  "polarity",
  "reversibility",
  "concept",
  "notes",
  "action_type_name",
  "action_type_color",
  "card_style",
  "node_shape",
  "node_type",
  "menu_config_json",
  "project_admin_options_json",
  "project_controlled_language_json",
  "project_edges_json",
] as const;

type FlatExportColumn = (typeof FLAT_EXPORT_COLUMNS)[number];
type FlatExportRow = Record<FlatExportColumn, string>;

type ParsedTabularPayload = {
  rows: Record<string, string>[];
  headers: string[];
};

type ImportFeedback = {
  type: "success" | "error" | "info";
  message: string;
};

type EditorSnapshot = {
  nodes: FlowNode[];
  edges: FlowEdge[];
  adminOptions: GlobalOptionConfig;
  controlledLanguageGlossary: ControlledLanguageGlossaryEntry[];
};

const APP_STORAGE_KEY = "flowcopy.store.v1";
const LEGACY_STORAGE_KEY = "flowcopy.canvas.v2";
const SINGLE_ACCOUNT_CODE = "000";

const NODE_SHAPE_OPTIONS: NodeShape[] = [
  "rectangle",
  "rounded",
  "pill",
  "diamond",
];

const NODE_TYPE_OPTIONS: NodeType[] = ["default", "menu"];

const MENU_NODE_RIGHT_CONNECTIONS_MIN = 1;
const MENU_NODE_RIGHT_CONNECTIONS_MAX = 12;
const MENU_SOURCE_HANDLE_PREFIX = "menu-src-";

const EDGE_STROKE_COLOR = "#1d4ed8";
const PARALLEL_EDGE_STROKE_COLOR = "#64748b";

const EDGE_LINE_STYLE_OPTIONS: EdgeLineStyle[] = ["solid", "dashed", "dotted"];

const EDGE_LINE_STYLE_DASH: Record<EdgeLineStyle, string | undefined> = {
  solid: undefined,
  dashed: "6 4",
  dotted: "2 4",
};

const EDGE_BASE_STYLE: React.CSSProperties = {
  stroke: EDGE_STROKE_COLOR,
  strokeWidth: 2.6,
};

const SEQUENTIAL_SOURCE_HANDLE_ID = "s-src";
const SEQUENTIAL_TARGET_HANDLE_ID = "s-tgt";
const PARALLEL_SOURCE_HANDLE_ID = "p-src";
const PARALLEL_TARGET_HANDLE_ID = "p-tgt";
const PARALLEL_ALT_SOURCE_HANDLE_ID = "p-src-top";
const PARALLEL_ALT_TARGET_HANDLE_ID = "p-tgt-bottom";

const SEQUENTIAL_SELECTED_STROKE_COLOR = "#0f172a";
const PARALLEL_SELECTED_STROKE_COLOR = "#334155";

const DIAMOND_CLIP_PATH = "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)";

const DEFAULT_EDGE_OPTIONS: DefaultEdgeOptions = {
  type: "smoothstep",
  animated: true,
};

const GLOBAL_OPTION_FIELDS: GlobalOptionField[] = [
  "tone",
  "polarity",
  "reversibility",
  "concept",
  "action_type_name",
  "action_type_color",
  "card_style",
];

const GLOBAL_OPTION_LABELS: Record<GlobalOptionField, string> = {
  tone: "Tone",
  polarity: "Polarity",
  reversibility: "Reversibility",
  concept: "Concept",
  action_type_name: "Action Type Name",
  action_type_color: "Action Type Color",
  card_style: "Card Style",
};

const DEFAULT_GLOBAL_OPTIONS: GlobalOptionConfig = {
  tone: ["neutral", "friendly", "formal", "urgent"],
  polarity: ["neutral", "positive", "destructive"],
  reversibility: ["reversible", "irreversible"],
  concept: ["Entry point", "Confirmation", "Error handling"],
  action_type_name: ["Submit Data", "Acknowledge", "Navigate"],
  action_type_color: ["#4f46e5", "#047857", "#dc2626"],
  card_style: ["default", "subtle", "warning", "success"],
};

const CONTROLLED_LANGUAGE_FIELDS: ControlledLanguageFieldType[] = [
  "primary_cta",
  "secondary_cta",
  "helper_text",
  "error_text",
  "menu_term",
];

const CONTROLLED_LANGUAGE_NODE_FIELDS: NodeControlledLanguageFieldType[] = [
  "primary_cta",
  "secondary_cta",
  "helper_text",
  "error_text",
];

const CONTROLLED_LANGUAGE_FIELD_LABELS: Record<ControlledLanguageFieldType, string> = {
  primary_cta: "Primary CTA",
  secondary_cta: "Secondary CTA",
  helper_text: "Helper Text",
  error_text: "Error Text",
  menu_term: "Menu Term",
};

const CONTROLLED_LANGUAGE_FIELD_ORDER: Record<ControlledLanguageFieldType, number> = {
  primary_cta: 0,
  secondary_cta: 1,
  helper_text: 2,
  error_text: 3,
  menu_term: 4,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #d4d4d8",
  borderRadius: 6,
  padding: "6px 8px",
  fontSize: 12,
  background: "#fff",
};

const buttonStyle: React.CSSProperties = {
  border: "1px solid #d4d4d8",
  borderRadius: 6,
  background: "#fff",
  padding: "6px 10px",
  cursor: "pointer",
  fontSize: 12,
};

const SIDE_PANEL_MIN_WIDTH = 420;
const SIDE_PANEL_MAX_WIDTH = Math.round(SIDE_PANEL_MIN_WIDTH * 1.5);
const SIDE_PANEL_WIDTH_STORAGE_KEY = "flowcopy.editor.canvasSidePanelWidth";

const clampSidePanelWidth = (value: number): number =>
  Math.min(SIDE_PANEL_MAX_WIDTH, Math.max(SIDE_PANEL_MIN_WIDTH, Math.round(value)));

const readInitialSidePanelWidth = (): number => {
  if (typeof window === "undefined") {
    return SIDE_PANEL_MIN_WIDTH;
  }

  const rawWidth = window.localStorage.getItem(SIDE_PANEL_WIDTH_STORAGE_KEY);
  if (!rawWidth) {
    return SIDE_PANEL_MIN_WIDTH;
  }

  const parsedWidth = Number(rawWidth);
  if (!Number.isFinite(parsedWidth)) {
    return SIDE_PANEL_MIN_WIDTH;
  }

  return clampSidePanelWidth(parsedWidth);
};

const TABLE_TEXTAREA_FIELDS = new Set<EditableMicrocopyField>(["body_text", "notes"]);

const TABLE_SELECT_FIELDS = new Set<EditableMicrocopyField>([
  "tone",
  "polarity",
  "reversibility",
  "concept",
  "action_type_name",
  "action_type_color",
  "card_style",
  "node_shape",
]);

const TABLE_FIELD_LABELS: Record<EditableMicrocopyField, string> = {
  title: "Title",
  body_text: "Body Text",
  primary_cta: "Primary CTA",
  secondary_cta: "Secondary CTA",
  helper_text: "Helper Text",
  error_text: "Error Text",
  tone: "Tone",
  polarity: "Polarity",
  reversibility: "Reversibility",
  concept: "Concept",
  notes: "Notes",
  action_type_name: "Action Type Name",
  action_type_color: "Action Type Color",
  card_style: "Card Style",
  node_shape: "Node Shape",
};

const TABLE_EDITABLE_FIELDS: EditableMicrocopyField[] = [
  "title",
  "body_text",
  "primary_cta",
  "secondary_cta",
  "helper_text",
  "error_text",
  "tone",
  "polarity",
  "reversibility",
  "concept",
  "notes",
  "action_type_name",
  "action_type_color",
  "card_style",
  "node_shape",
];

const GLOBAL_OPTION_TO_NODE_FIELD: Record<GlobalOptionField, EditableMicrocopyField> = {
  tone: "tone",
  polarity: "polarity",
  reversibility: "reversibility",
  concept: "concept",
  action_type_name: "action_type_name",
  action_type_color: "action_type_color",
  card_style: "card_style",
};

const isEditorSurfaceMode = (value: unknown): value is EditorSurfaceMode =>
  value === "canvas" || value === "table";

const isEdgeKind = (value: unknown): value is EdgeKind =>
  value === "sequential" || value === "parallel";

const isEdgeLineStyle = (value: unknown): value is EdgeLineStyle =>
  value === "solid" || value === "dashed" || value === "dotted";

const isControlledLanguageFieldType = (
  value: unknown
): value is ControlledLanguageFieldType =>
  value === "primary_cta" ||
  value === "secondary_cta" ||
  value === "helper_text" ||
  value === "error_text" ||
  value === "menu_term";

const normalizeControlledLanguageFieldType = (
  value: unknown
): ControlledLanguageFieldType | null => {
  if (value === "list_item") {
    return "menu_term";
  }

  return isControlledLanguageFieldType(value) ? value : null;
};

const isNodeType = (value: unknown): value is NodeType =>
  value === "default" || value === "menu";

const createMenuTermId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `menu-${crypto.randomUUID()}`
    : `menu-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const createMenuNodeTerm = (term: string): MenuNodeTerm => ({
  id: createMenuTermId(),
  term,
});

const clampMenuRightConnections = (
  value: number,
  minimum: number = MENU_NODE_RIGHT_CONNECTIONS_MIN
): number => {
  const sanitizedMinimum = Math.min(
    MENU_NODE_RIGHT_CONNECTIONS_MAX,
    Math.max(MENU_NODE_RIGHT_CONNECTIONS_MIN, Math.round(minimum))
  );

  if (!Number.isFinite(value)) {
    return sanitizedMinimum;
  }

  return Math.min(
    MENU_NODE_RIGHT_CONNECTIONS_MAX,
    Math.max(sanitizedMinimum, Math.round(value))
  );
};

const buildMenuSourceHandleId = (termId: string): string =>
  `${MENU_SOURCE_HANDLE_PREFIX}${termId}`;

const buildMenuSourceHandleIds = (menuConfig: MenuNodeConfig): string[] =>
  menuConfig.terms.map((term) => buildMenuSourceHandleId(term.id));

const isMenuSourceHandleId = (value: string | null | undefined): value is string =>
  typeof value === "string" && value.startsWith(MENU_SOURCE_HANDLE_PREFIX);

const syncSequentialEdgesForMenuNode = (
  edges: FlowEdge[],
  nodeId: string,
  menuConfig: MenuNodeConfig
): FlowEdge[] => {
  const allowedHandleIds = buildMenuSourceHandleIds(menuConfig);
  const allowedHandleIdSet = new Set(allowedHandleIds);
  const fallbackHandleId = allowedHandleIds[0] ?? null;

  return edges.flatMap((edge) => {
    if (edge.source !== nodeId || !isSequentialEdge(edge)) {
      return [edge];
    }

    if (!fallbackHandleId) {
      return [];
    }

    if (isMenuSourceHandleId(edge.sourceHandle)) {
      if (allowedHandleIdSet.has(edge.sourceHandle)) {
        return [edge];
      }

      return [];
    }

    return [
      {
        ...edge,
        sourceHandle: fallbackHandleId,
      },
    ];
  });
};

const assignSequentialEdgesToMenuHandles = (
  edges: FlowEdge[],
  nodeId: string,
  menuHandleIds: string[]
): FlowEdge[] => {
  if (menuHandleIds.length === 0) {
    return edges.filter((edge) => !(edge.source === nodeId && isSequentialEdge(edge)));
  }

  let sequentialIndex = 0;

  return edges.flatMap((edge) => {
    if (edge.source !== nodeId || !isSequentialEdge(edge)) {
      return [edge];
    }

    const nextHandleId = menuHandleIds[sequentialIndex];
    sequentialIndex += 1;

    if (!nextHandleId) {
      return [];
    }

    return [
      {
        ...edge,
        sourceHandle: nextHandleId,
      },
    ];
  });
};

const remapMenuSequentialEdgesToDefaultHandle = (
  edges: FlowEdge[],
  nodeId: string
): FlowEdge[] =>
  edges.map((edge) => {
    if (
      edge.source !== nodeId ||
      !isSequentialEdge(edge) ||
      !isMenuSourceHandleId(edge.sourceHandle)
    ) {
      return edge;
    }

    return {
      ...edge,
      sourceHandle: SEQUENTIAL_SOURCE_HANDLE_ID,
    };
  });

const getSequentialOutgoingEdgesForNode = (
  edges: FlowEdge[],
  nodeId: string,
  options: { ignoreEdgeId?: string } = {}
): FlowEdge[] =>
  edges.filter(
    (edge) =>
      edge.source === nodeId &&
      edge.id !== options.ignoreEdgeId &&
      isSequentialEdge(edge)
  );

const getFirstAvailableMenuSourceHandleId = (
  edges: FlowEdge[],
  nodeId: string,
  menuConfig: MenuNodeConfig,
  options: { ignoreEdgeId?: string } = {}
): string | null => {
  const usedHandleIds = new Set(
    getSequentialOutgoingEdgesForNode(edges, nodeId, options)
      .map((edge) => edge.sourceHandle)
      .filter((handleId): handleId is string => isMenuSourceHandleId(handleId))
  );

  return (
    buildMenuSourceHandleIds(menuConfig).find(
      (handleId) => !usedHandleIds.has(handleId)
    ) ?? null
  );
};

const isMenuSequentialConnectionAllowed = (
  edges: FlowEdge[],
  nodeId: string,
  menuConfig: MenuNodeConfig,
  sourceHandle: string | null | undefined,
  options: { ignoreEdgeId?: string } = {}
): boolean => {
  if (!isMenuSourceHandleId(sourceHandle)) {
    return false;
  }

  const allowedHandleIds = new Set(buildMenuSourceHandleIds(menuConfig));
  if (!allowedHandleIds.has(sourceHandle)) {
    return false;
  }

  const outgoingSequentialEdges = getSequentialOutgoingEdgesForNode(
    edges,
    nodeId,
    options
  );

  if (outgoingSequentialEdges.length >= menuConfig.max_right_connections) {
    return false;
  }

  if (outgoingSequentialEdges.some((edge) => edge.sourceHandle === sourceHandle)) {
    return false;
  }

  return true;
};

const normalizeMenuNodeConfig = (
  value: unknown,
  fallbackPrimaryTerm: string,
  minimumConnections: number = MENU_NODE_RIGHT_CONNECTIONS_MIN
): MenuNodeConfig => {
  const source =
    value && typeof value === "object" ? (value as Partial<MenuNodeConfig>) : undefined;

  const requestedMax =
    typeof source?.max_right_connections === "number"
      ? source.max_right_connections
      : Array.isArray(source?.terms)
        ? source.terms.length
        : minimumConnections;

  const maxRightConnections = clampMenuRightConnections(requestedMax, minimumConnections);

  const normalizedTerms: MenuNodeTerm[] = [];
  const usedTermIds = new Set<string>();
  const sourceTerms = Array.isArray(source?.terms) ? source.terms : [];

  sourceTerms.forEach((termValue) => {
    if (!termValue || typeof termValue !== "object") {
      return;
    }

    const sourceTerm = termValue as Partial<MenuNodeTerm>;
    const term = typeof sourceTerm.term === "string" ? sourceTerm.term : "";

    const rawTermId = typeof sourceTerm.id === "string" ? sourceTerm.id.trim() : "";
    let nextTermId = rawTermId.length > 0 ? rawTermId : createMenuTermId();

    while (usedTermIds.has(nextTermId)) {
      nextTermId = createMenuTermId();
    }

    usedTermIds.add(nextTermId);

    normalizedTerms.push({
      id: nextTermId,
      term,
    });
  });

  if (normalizedTerms.length === 0) {
    normalizedTerms.push(createMenuNodeTerm(fallbackPrimaryTerm || "Continue"));
  }

  const terms = normalizedTerms.slice(0, maxRightConnections);

  while (terms.length < maxRightConnections) {
    terms.push(createMenuNodeTerm(""));
  }

  return {
    max_right_connections: maxRightConnections,
    terms,
  };
};

const getPrimaryMenuTermValue = (
  menuConfig: MenuNodeConfig,
  fallbackValue: string
): string => menuConfig.terms[0]?.term ?? fallbackValue;

const getSecondaryMenuTermValue = (
  menuConfig: MenuNodeConfig,
  fallbackValue: string
): string => menuConfig.terms[1]?.term ?? fallbackValue;

const applyMenuConfigToNodeData = (
  nodeData: MicrocopyNodeData,
  nextMenuConfig: MenuNodeConfig
): MicrocopyNodeData => ({
  ...nodeData,
  menu_config: nextMenuConfig,
  primary_cta: getPrimaryMenuTermValue(nextMenuConfig, nodeData.primary_cta),
  secondary_cta: getSecondaryMenuTermValue(nextMenuConfig, nodeData.secondary_cta),
});

const collectControlledLanguageTermsFromNode = (
  node: FlowNode
): ControlledLanguageAuditTermEntry[] => {
  if (node.data.node_type === "menu") {
    const menuTerms = node.data.menu_config.terms.map((menuTerm) => ({
      field_type: "menu_term" as const,
      term: menuTerm.term,
    }));

    return menuTerms;
  }

  return CONTROLLED_LANGUAGE_NODE_FIELDS.map((fieldType) => ({
    field_type: fieldType,
    term: node.data[fieldType],
  }));
};

const normalizeControlledLanguageTerm = (value: string): string => value.trim();

const buildControlledLanguageGlossaryKey = (
  fieldType: ControlledLanguageFieldType,
  term: string
): string => `${fieldType}\u241F${term}`;

const parseControlledLanguageGlossaryKey = (
  key: string
): { field_type: ControlledLanguageFieldType; term: string } | null => {
  const separatorIndex = key.indexOf("\u241F");
  if (separatorIndex <= 0) {
    return null;
  }

  const rawFieldType = key.slice(0, separatorIndex);
  const term = key.slice(separatorIndex + 1);
  const fieldType = normalizeControlledLanguageFieldType(rawFieldType);

  if (!fieldType) {
    return null;
  }

  return {
    field_type: fieldType,
    term,
  };
};

const sortControlledLanguageEntries = <
  T extends Pick<ControlledLanguageGlossaryEntry, "field_type" | "term">
>(entries: T[]): T[] =>
  entries
    .slice()
    .sort((a, b) => {
      const fieldOrderDifference =
        CONTROLLED_LANGUAGE_FIELD_ORDER[a.field_type] -
        CONTROLLED_LANGUAGE_FIELD_ORDER[b.field_type];

      if (fieldOrderDifference !== 0) {
        return fieldOrderDifference;
      }

      return a.term.localeCompare(b.term);
    });

const sanitizeControlledLanguageGlossary = (
  value: unknown
): ControlledLanguageGlossaryEntry[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const byKey = new Map<string, ControlledLanguageGlossaryEntry>();

  value.forEach((item) => {
    if (!item || typeof item !== "object") {
      return;
    }

    const source = item as {
      field_type?: unknown;
      term?: unknown;
      include?: unknown;
    };
    const fieldType = normalizeControlledLanguageFieldType(source.field_type);
    if (!fieldType) {
      return;
    }

    const term =
      typeof source.term === "string"
        ? normalizeControlledLanguageTerm(source.term)
        : "";
    if (!term) {
      return;
    }

    const key = buildControlledLanguageGlossaryKey(fieldType, term);
    const existing = byKey.get(key);

    byKey.set(key, {
      field_type: fieldType,
      term,
      include:
        typeof source.include === "boolean"
          ? source.include
          : existing?.include ?? false,
    });
  });

  return sortControlledLanguageEntries(Array.from(byKey.values()));
};

const cloneControlledLanguageGlossary = (
  entries: ControlledLanguageGlossaryEntry[]
): ControlledLanguageGlossaryEntry[] =>
  entries.map((entry) => ({
    field_type: entry.field_type,
    term: entry.term,
    include: entry.include,
  }));

const createEmptyControlledLanguageDraftRow = (): ControlledLanguageDraftRow => ({
  field_type: "menu_term",
  term: "",
  include: true,
});

const createEmptyControlledLanguageTermsByField = (): Record<
  ControlledLanguageFieldType,
  string[]
> => ({
  primary_cta: [],
  secondary_cta: [],
  helper_text: [],
  error_text: [],
  menu_term: [],
});

const buildControlledLanguageTermsByField = (
  glossary: ControlledLanguageGlossaryEntry[]
): Record<ControlledLanguageFieldType, string[]> => {
  const byField = createEmptyControlledLanguageTermsByField();

  sanitizeControlledLanguageGlossary(glossary)
    .filter((entry) => entry.include)
    .forEach((entry) => {
      if (!byField[entry.field_type].includes(entry.term)) {
        byField[entry.field_type].push(entry.term);
      }
    });

  CONTROLLED_LANGUAGE_FIELDS.forEach((fieldType) => {
    byField[fieldType].sort((a, b) => a.localeCompare(b));
  });

  return byField;
};

const buildControlledLanguageAuditRows = (
  nodes: FlowNode[],
  glossary: ControlledLanguageGlossaryEntry[]
): ControlledLanguageAuditRow[] => {
  const rowByKey = new Map<string, ControlledLanguageAuditRow>();

  nodes.forEach((node) => {
    collectControlledLanguageTermsFromNode(node).forEach(({ field_type, term: rawTerm }) => {
      const term = normalizeControlledLanguageTerm(rawTerm);
      if (!term) {
        return;
      }

      const key = buildControlledLanguageGlossaryKey(field_type, term);
      const existing = rowByKey.get(key);

      if (existing) {
        rowByKey.set(key, {
          ...existing,
          occurrences: existing.occurrences + 1,
        });
        return;
      }

      rowByKey.set(key, {
        field_type,
        term,
        include: false,
        occurrences: 1,
      });
    });
  });

  sanitizeControlledLanguageGlossary(glossary).forEach((entry) => {
    const key = buildControlledLanguageGlossaryKey(entry.field_type, entry.term);
    const existing = rowByKey.get(key);

    rowByKey.set(key, {
      field_type: entry.field_type,
      term: entry.term,
      include: entry.include,
      occurrences: existing?.occurrences ?? 0,
    });
  });

  return sortControlledLanguageEntries(Array.from(rowByKey.values()));
};

const getDefaultEdgeStrokeColor = (edgeKind: EdgeKind): string =>
  edgeKind === "parallel" ? PARALLEL_EDGE_STROKE_COLOR : EDGE_STROKE_COLOR;

const inferEdgeKindFromHandles = (
  sourceHandle?: string | null,
  targetHandle?: string | null
): EdgeKind =>
  (typeof sourceHandle === "string" && sourceHandle.startsWith("p-")) ||
  (typeof targetHandle === "string" && targetHandle.startsWith("p-"))
    ? "parallel"
    : "sequential";

const normalizeEdgeData = (
  value: unknown,
  fallbackKind: EdgeKind
): FlowEdgeData => {
  const source =
    value && typeof value === "object" ? (value as Partial<FlowEdgeData>) : undefined;

  const edge_kind = isEdgeKind(source?.edge_kind) ? source.edge_kind : fallbackKind;
  const line_style = isEdgeLineStyle(source?.line_style)
    ? source.line_style
    : "solid";
  const stroke_color =
    typeof source?.stroke_color === "string" && source.stroke_color.trim().length > 0
      ? source.stroke_color
      : getDefaultEdgeStrokeColor(edge_kind);

  return {
    edge_kind,
    stroke_color,
    line_style,
    is_reversed:
      edge_kind === "sequential" && typeof source?.is_reversed === "boolean"
        ? source.is_reversed
        : undefined,
  };
};

const getEdgeDirection = (edgeData: FlowEdgeData): EdgeDirection =>
  edgeData.edge_kind === "sequential" && edgeData.is_reversed ? "reversed" : "forward";

const getEdgeKind = (
  edge: Pick<FlowEdge, "data" | "sourceHandle" | "targetHandle">
): EdgeKind =>
  isEdgeKind(edge.data?.edge_kind)
    ? edge.data.edge_kind
    : inferEdgeKindFromHandles(edge.sourceHandle, edge.targetHandle);

const isSequentialEdge = (
  edge: Pick<FlowEdge, "data" | "sourceHandle" | "targetHandle">
): boolean => getEdgeKind(edge) === "sequential";

const isParallelEdge = (
  edge: Pick<FlowEdge, "data" | "sourceHandle" | "targetHandle">
): boolean => getEdgeKind(edge) === "parallel";

const isEditableEventTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const tagName = target.tagName;
  return (
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT" ||
    target.closest("[contenteditable='true']") !== null
  );
};

const hasNonSelectionNodeChanges = (changes: NodeChange<FlowNode>[]): boolean =>
  changes.some((change) => change.type !== "select");

const hasNonSelectionEdgeChanges = (changes: EdgeChange<FlowEdge>[]): boolean =>
  changes.some((change) => change.type !== "select");

const escapeCsvCell = (value: string): string => {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
};

const buildCsvFromRows = (rows: FlatExportRow[]): string => {
  const header = FLAT_EXPORT_COLUMNS.join(",");
  const lines = rows.map((row) =>
    FLAT_EXPORT_COLUMNS.map((column) => escapeCsvCell(row[column] ?? "")).join(",")
  );

  return [header, ...lines].join("\n");
};

const parseCsvText = (text: string): ParsedTabularPayload => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let index = 0;
  let inQuotes = false;

  while (index < text.length) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          currentCell += '"';
          index += 2;
          continue;
        }

        inQuotes = false;
        index += 1;
        continue;
      }

      currentCell += char;
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      index += 1;
      continue;
    }

    if (char === ",") {
      currentRow.push(currentCell);
      currentCell = "";
      index += 1;
      continue;
    }

    if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") {
        index += 1;
      }

      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      index += 1;
      continue;
    }

    currentCell += char;
    index += 1;
  }

  currentRow.push(currentCell);
  rows.push(currentRow);

  if (rows.length === 0) {
    return { rows: [], headers: [] };
  }

  const [rawHeaders, ...bodyRows] = rows;
  const headers = rawHeaders.map((header, headerIndex) =>
    headerIndex === 0 ? header.replace(/^\uFEFF/, "").trim() : header.trim()
  );

  const parsedRows = bodyRows
    .filter((row) => row.some((cell) => cell.trim().length > 0))
    .map((row) => {
      const record: Record<string, string> = {};
      headers.forEach((header, headerIndex) => {
        if (!header) {
          return;
        }

        record[header] = row[headerIndex] ?? "";
      });

      return record;
    });

  return {
    rows: parsedRows,
    headers,
  };
};

const escapeXmlText = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");

const buildXmlFromRows = (rows: FlatExportRow[]): string => {
  const rowXml = rows
    .map((row) => {
      const cells = FLAT_EXPORT_COLUMNS.map(
        (column) =>
          `    <${column}>${escapeXmlText(row[column] ?? "")}</${column}>`
      ).join("\n");

      return `  <row>\n${cells}\n  </row>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<flowcopyExport formatVersion="1">\n${rowXml}\n</flowcopyExport>`;
};

const parseXmlText = (text: string): ParsedTabularPayload => {
  const parser = new DOMParser();
  const document = parser.parseFromString(text, "application/xml");
  const parserError = document.querySelector("parsererror");

  if (parserError) {
    throw new Error("Invalid XML file.");
  }

  const rowElements = Array.from(document.getElementsByTagName("row"));
  const headers = new Set<string>();

  const rows = rowElements.map((rowElement) => {
    const rowRecord: Record<string, string> = {};

    Array.from(rowElement.children).forEach((cellElement) => {
      const key = cellElement.tagName.trim();
      if (!key) {
        return;
      }

      headers.add(key);
      rowRecord[key] = cellElement.textContent ?? "";
    });

    return rowRecord;
  });

  return {
    rows,
    headers: Array.from(headers),
  };
};

const detectTabularFormat = (fileName: string, text: string): "csv" | "xml" | null => {
  const loweredFileName = fileName.toLowerCase();

  if (loweredFileName.endsWith(".csv")) {
    return "csv";
  }

  if (loweredFileName.endsWith(".xml")) {
    return "xml";
  }

  const trimmed = text.trimStart();
  if (trimmed.startsWith("<")) {
    return "xml";
  }

  if (trimmed.includes(",")) {
    return "csv";
  }

  return null;
};

const normalizeFlatRowKeys = (rawRow: Record<string, string>): Record<string, string> => {
  const normalizedRow: Record<string, string> = {};

  Object.entries(rawRow).forEach(([key, value], index) => {
    const normalizedKey = index === 0 ? key.replace(/^\uFEFF/, "").trim() : key.trim();
    if (!normalizedKey) {
      return;
    }

    normalizedRow[normalizedKey] = value;
  });

  return normalizedRow;
};

const safeJsonParse = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const toNumeric = (value: string | undefined): number | null => {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const buildDownloadFileName = (
  projectId: string,
  extension: "csv" | "xml"
): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${projectId}-${timestamp}.${extension}`;
};

const uniqueTrimmedStrings = (values: string[]): string[] =>
  Array.from(new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)));

const mergeAdminOptionConfigs = (
  base: GlobalOptionConfig,
  incoming: GlobalOptionConfig
): GlobalOptionConfig => ({
  tone: uniqueTrimmedStrings([...base.tone, ...incoming.tone]),
  polarity: uniqueTrimmedStrings([...base.polarity, ...incoming.polarity]),
  reversibility: uniqueTrimmedStrings([...base.reversibility, ...incoming.reversibility]),
  concept: uniqueTrimmedStrings([...base.concept, ...incoming.concept]),
  action_type_name: uniqueTrimmedStrings([
    ...base.action_type_name,
    ...incoming.action_type_name,
  ]),
  action_type_color: uniqueTrimmedStrings([
    ...base.action_type_color,
    ...incoming.action_type_color,
  ]),
  card_style: uniqueTrimmedStrings([...base.card_style, ...incoming.card_style]),
});

const syncAdminOptionsWithNodes = (
  base: GlobalOptionConfig,
  nodes: FlowNode[]
): GlobalOptionConfig => {
  const merged = cloneGlobalOptions(base);

  GLOBAL_OPTION_FIELDS.forEach((field) => {
    const nodeField = GLOBAL_OPTION_TO_NODE_FIELD[field];

    nodes.forEach((node) => {
      const value = node.data[nodeField];
      if (typeof value !== "string") {
        return;
      }

      const next = value.trim();
      if (!next || merged[field].includes(next)) {
        return;
      }

      merged[field].push(next);
    });
  });

  return normalizeGlobalOptionConfig(merged);
};

const createFlatExportRows = ({
  session,
  account,
  project,
  projectSequenceId,
  nodes,
  ordering,
  adminOptions,
  controlledLanguageGlossary,
  edges,
}: {
  session: AppStore["session"];
  account: AccountRecord;
  project: ProjectRecord;
  projectSequenceId: string;
  nodes: FlowNode[];
  ordering: FlowOrderingResult;
  adminOptions: GlobalOptionConfig;
  controlledLanguageGlossary: ControlledLanguageGlossaryEntry[];
  edges: FlowEdge[];
}): FlatExportRow[] => {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  const orderedNodes = ordering.orderedNodeIds
    .map((nodeId) => nodeById.get(nodeId))
    .filter((node): node is FlowNode => Boolean(node));

  const edgesJson = JSON.stringify(sanitizeEdgesForStorage(edges));
  const adminOptionsJson = JSON.stringify(adminOptions);
  const controlledLanguageJson = JSON.stringify(
    sanitizeControlledLanguageGlossary(controlledLanguageGlossary)
  );

  const buildRow = (node: FlowNode | null): FlatExportRow => {
    const sequence = node ? ordering.sequenceByNodeId[node.id] ?? null : null;

    return {
      session_activeAccountId: session.activeAccountId ?? "",
      session_activeProjectId: session.activeProjectId ?? "",
      session_view: session.view,
      session_editorMode: session.editorMode,
      account_id: account.id,
      account_code: account.code,
      project_id: project.id,
      project_name: project.name,
      project_createdAt: project.createdAt,
      project_updatedAt: project.updatedAt,
      project_sequence_id: projectSequenceId,
      node_id: node?.id ?? "",
      node_order_id: sequence !== null ? String(sequence) : "",
      sequence_index: sequence !== null ? String(sequence) : "",
      parallel_group_id:
        node?.data.parallel_group_id ??
        (node ? ordering.parallelGroupByNodeId[node.id] ?? "" : ""),
      position_x: node ? String(node.position.x) : "",
      position_y: node ? String(node.position.y) : "",
      title: node?.data.title ?? "",
      body_text: node?.data.body_text ?? "",
      primary_cta: node?.data.primary_cta ?? "",
      secondary_cta: node?.data.secondary_cta ?? "",
      helper_text: node?.data.helper_text ?? "",
      error_text: node?.data.error_text ?? "",
      tone: node?.data.tone ?? "",
      polarity: node?.data.polarity ?? "",
      reversibility: node?.data.reversibility ?? "",
      concept: node?.data.concept ?? "",
      notes: node?.data.notes ?? "",
      action_type_name: node?.data.action_type_name ?? "",
      action_type_color: node?.data.action_type_color ?? "",
      card_style: node?.data.card_style ?? "",
      node_shape: node?.data.node_shape ?? "",
      node_type: node?.data.node_type ?? "default",
      menu_config_json: node ? JSON.stringify(node.data.menu_config) : "",
      project_admin_options_json: adminOptionsJson,
      project_controlled_language_json: controlledLanguageJson,
      project_edges_json: edgesJson,
    };
  };

  if (orderedNodes.length === 0) {
    return [buildRow(null)];
  }

  return orderedNodes.map((node) => buildRow(node));
};

const createEmptyPendingOptionInputs = (): Record<GlobalOptionField, string> => ({
  tone: "",
  polarity: "",
  reversibility: "",
  concept: "",
  action_type_name: "",
  action_type_color: "",
  card_style: "",
});

const createNodeId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `node-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const createProjectId = (): string =>
  `PRJ-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const createAccountId = (code: string): string => `acct-${code}`;

const isNodeShape = (value: unknown): value is NodeShape =>
  typeof value === "string" && NODE_SHAPE_OPTIONS.includes(value as NodeShape);

const cloneGlobalOptions = (options: GlobalOptionConfig): GlobalOptionConfig => ({
  tone: [...options.tone],
  polarity: [...options.polarity],
  reversibility: [...options.reversibility],
  concept: [...options.concept],
  action_type_name: [...options.action_type_name],
  action_type_color: [...options.action_type_color],
  card_style: [...options.card_style],
});

const cloneFlowNodes = (nodes: FlowNode[]): FlowNode[] =>
  nodes.map((node) => ({
    ...node,
    position: { ...node.position },
    data: { ...node.data },
  }));

const cloneEdges = (edges: FlowEdge[]): FlowEdge[] =>
  edges.map((edge) => ({
    ...edge,
    data: edge.data ? { ...edge.data } : edge.data,
    markerEnd:
      edge.markerEnd && typeof edge.markerEnd === "object"
        ? { ...edge.markerEnd }
        : edge.markerEnd,
    markerStart:
      edge.markerStart && typeof edge.markerStart === "object"
        ? { ...edge.markerStart }
        : edge.markerStart,
    style:
      edge.style && typeof edge.style === "object" ? { ...edge.style } : edge.style,
    labelStyle:
      edge.labelStyle && typeof edge.labelStyle === "object"
        ? { ...edge.labelStyle }
        : edge.labelStyle,
    labelBgStyle:
      edge.labelBgStyle && typeof edge.labelBgStyle === "object"
        ? { ...edge.labelBgStyle }
        : edge.labelBgStyle,
  }));

const ensureArrayOfStrings = (value: unknown, fallback: string[]): string[] => {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  const validItems = value.filter((item): item is string => typeof item === "string");
  return validItems.length > 0 ? validItems : [...fallback];
};

const normalizeGlobalOptionConfig = (value: unknown): GlobalOptionConfig => {
  const source =
    value && typeof value === "object"
      ? (value as Partial<GlobalOptionConfig>)
      : undefined;

  return {
    tone: ensureArrayOfStrings(source?.tone, DEFAULT_GLOBAL_OPTIONS.tone),
    polarity: ensureArrayOfStrings(source?.polarity, DEFAULT_GLOBAL_OPTIONS.polarity),
    reversibility: ensureArrayOfStrings(
      source?.reversibility,
      DEFAULT_GLOBAL_OPTIONS.reversibility
    ),
    concept: ensureArrayOfStrings(source?.concept, DEFAULT_GLOBAL_OPTIONS.concept),
    action_type_name: ensureArrayOfStrings(
      source?.action_type_name,
      DEFAULT_GLOBAL_OPTIONS.action_type_name
    ),
    action_type_color: ensureArrayOfStrings(
      source?.action_type_color,
      DEFAULT_GLOBAL_OPTIONS.action_type_color
    ),
    card_style: ensureArrayOfStrings(source?.card_style, DEFAULT_GLOBAL_OPTIONS.card_style),
  };
};

const sanitizeSerializableFlowNodes = (value: unknown): SerializableFlowNode[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const source = item as Partial<SerializableFlowNode>;
    const rawId = typeof source.id === "string" ? source.id.trim() : "";
    const id = rawId.length > 0 ? rawId : createNodeId();

    const position =
      source.position &&
      typeof source.position === "object" &&
      typeof source.position.x === "number" &&
      typeof source.position.y === "number"
        ? { x: source.position.x, y: source.position.y }
        : { x: 0, y: 0 };

    const data =
      source.data && typeof source.data === "object"
        ? (source.data as Partial<PersistableMicrocopyNodeData>)
        : undefined;

    return [{ id, position, data }];
  });
};

const sanitizeEdgesForStorage = (value: unknown): FlowEdge[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const sourceEdge = item as Partial<FlowEdge>;
    const source =
      typeof sourceEdge.source === "string" ? sourceEdge.source.trim() : "";
    const target =
      typeof sourceEdge.target === "string" ? sourceEdge.target.trim() : "";

    if (!source || !target) {
      return [];
    }

    const fallbackKind = inferEdgeKindFromHandles(
      sourceEdge.sourceHandle,
      sourceEdge.targetHandle
    );

    const markerStart =
      sourceEdge.markerStart && typeof sourceEdge.markerStart === "object"
        ? { ...sourceEdge.markerStart }
        : sourceEdge.markerStart;
    const markerEnd =
      sourceEdge.markerEnd && typeof sourceEdge.markerEnd === "object"
        ? { ...sourceEdge.markerEnd }
        : sourceEdge.markerEnd;

    return [
      {
        ...sourceEdge,
        source,
        target,
        id:
          typeof sourceEdge.id === "string" && sourceEdge.id.trim().length > 0
            ? sourceEdge.id
            : `e-${source}-${target}`,
        data: normalizeEdgeData(sourceEdge.data, fallbackKind),
        markerStart,
        markerEnd,
      } as FlowEdge,
    ];
  });
};

const cleanedOptions = (options: string[]): string[] =>
  options.map((option) => option.trim()).filter((option) => option.length > 0);

const firstOptionOrFallback = (options: string[], fallback: string): string =>
  cleanedOptions(options)[0] ?? fallback;

const buildSelectOptions = (
  options: string[],
  currentValue: string,
  fallbackOptions: string[]
): string[] => {
  const cleaned = cleanedOptions(options);
  const withFallback = cleaned.length > 0 ? cleaned : fallbackOptions;
  const unique = Array.from(new Set(withFallback));

  if (currentValue && !unique.includes(currentValue)) {
    return [currentValue, ...unique];
  }

  return unique;
};

const createDefaultNodeData = (
  globalOptions: GlobalOptionConfig,
  overrides: Partial<PersistableMicrocopyNodeData> = {}
): MicrocopyNodeData => ({
  title: overrides.title ?? "Untitled Node",
  body_text: overrides.body_text ?? "",
  primary_cta: overrides.primary_cta ?? "Continue",
  secondary_cta: overrides.secondary_cta ?? "",
  helper_text: overrides.helper_text ?? "",
  error_text: overrides.error_text ?? "",
  tone: overrides.tone ?? firstOptionOrFallback(globalOptions.tone, "neutral"),
  polarity: overrides.polarity ?? firstOptionOrFallback(globalOptions.polarity, "neutral"),
  reversibility:
    overrides.reversibility ??
    firstOptionOrFallback(globalOptions.reversibility, "reversible"),
  concept: overrides.concept ?? firstOptionOrFallback(globalOptions.concept, ""),
  notes: overrides.notes ?? "",
  action_type_name:
    overrides.action_type_name ??
    firstOptionOrFallback(globalOptions.action_type_name, "Submit Data"),
  action_type_color:
    overrides.action_type_color ??
    firstOptionOrFallback(globalOptions.action_type_color, "#4f46e5"),
  card_style: overrides.card_style ?? firstOptionOrFallback(globalOptions.card_style, "default"),
  node_shape: isNodeShape(overrides.node_shape) ? overrides.node_shape : "rectangle",
  node_type: isNodeType(overrides.node_type) ? overrides.node_type : "default",
  menu_config: normalizeMenuNodeConfig(
    overrides.menu_config,
    overrides.primary_cta ?? "Continue",
    1
  ),
  parallel_group_id:
    typeof overrides.parallel_group_id === "string" &&
    overrides.parallel_group_id.trim().length > 0
      ? overrides.parallel_group_id.trim()
      : null,
  sequence_index: null,
});

const normalizeNode = (
  node: SerializableFlowNode,
  globalOptions: GlobalOptionConfig
): FlowNode => ({
  id: node.id,
  type: "flowcopyNode",
  position: node.position ?? { x: 0, y: 0 },
  data: createDefaultNodeData(globalOptions, node.data ?? {}),
});

const applyEdgeVisuals = (
  edge: FlowEdge,
  options: { selected?: boolean } = {}
): FlowEdge => {
  const edgeKind = getEdgeKind(edge);
  const normalizedData = normalizeEdgeData(edge.data, edgeKind);
  const edgeDirection = getEdgeDirection(normalizedData);
  const dashPattern = EDGE_LINE_STYLE_DASH[normalizedData.line_style ?? "solid"];
  const baseStroke = normalizedData.stroke_color ?? getDefaultEdgeStrokeColor(edgeKind);
  const selected = options.selected ?? false;
  const selectedStroke =
    edgeKind === "parallel"
      ? PARALLEL_SELECTED_STROKE_COLOR
      : SEQUENTIAL_SELECTED_STROKE_COLOR;

  const sequentialArrowMarker = {
    type: MarkerType.ArrowClosed,
    color: selected ? selectedStroke : baseStroke,
    width: 16,
    height: 16,
  };

  const style: React.CSSProperties = {
    ...EDGE_BASE_STYLE,
    ...(edge.style ?? {}),
    stroke: selected ? selectedStroke : baseStroke,
    strokeWidth: selected ? 3.4 : EDGE_BASE_STYLE.strokeWidth,
    strokeDasharray: dashPattern,
    opacity: selected ? 1 : edgeKind === "parallel" ? 0.9 : 1,
  };

  return {
    ...edge,
    data: normalizedData,
    type: edge.type ?? DEFAULT_EDGE_OPTIONS.type,
    animated:
      edgeKind === "parallel"
        ? false
        : typeof edge.animated === "boolean"
          ? edge.animated
          : true,
    markerStart:
      edgeKind === "parallel"
        ? undefined
        : edgeDirection === "reversed"
          ? edge.markerStart ?? sequentialArrowMarker
          : undefined,
    markerEnd:
      edgeKind === "parallel"
        ? undefined
        : edgeDirection === "reversed"
          ? undefined
          : edge.markerEnd ?? sequentialArrowMarker,
    style,
  };
};

const sanitizePersistedNodes = (
  persistedNodes: SerializableFlowNode[],
  globalOptions: GlobalOptionConfig
): FlowNode[] => {
  const usedNodeIds = new Set<string>();

  return persistedNodes.map((node) => {
    const rawId = typeof node.id === "string" ? node.id.trim() : "";
    const baseId = rawId.length > 0 ? rawId : createNodeId();

    let uniqueId = baseId;
    let duplicateCounter = 1;
    while (usedNodeIds.has(uniqueId)) {
      uniqueId = `${baseId}-${duplicateCounter}`;
      duplicateCounter += 1;
    }

    usedNodeIds.add(uniqueId);

    return normalizeNode(
      {
        ...node,
        id: uniqueId,
      },
      globalOptions
    );
  });
};

const sanitizeEdges = (persistedEdges: FlowEdge[], nodes: FlowNode[]): FlowEdge[] => {
  const validNodeIds = new Set(nodes.map((node) => node.id));
  const usedEdgeIds = new Set<string>();

  return persistedEdges.flatMap((edge) => {
    const source = typeof edge.source === "string" ? edge.source : "";
    const target = typeof edge.target === "string" ? edge.target : "";

    if (!source || !target) {
      return [];
    }

    if (!validNodeIds.has(source) || !validNodeIds.has(target)) {
      return [];
    }

    const rawId = typeof edge.id === "string" ? edge.id.trim() : "";
    const baseId = rawId.length > 0 ? rawId : `e-${source}-${target}`;

    let uniqueId = baseId;
    let duplicateCounter = 1;
    while (usedEdgeIds.has(uniqueId)) {
      uniqueId = `${baseId}-${duplicateCounter}`;
      duplicateCounter += 1;
    }

    usedEdgeIds.add(uniqueId);

    const fallbackKind = inferEdgeKindFromHandles(edge.sourceHandle, edge.targetHandle);

    return [
      applyEdgeVisuals({
        ...edge,
        id: uniqueId,
        source,
        target,
        data: normalizeEdgeData(edge.data, fallbackKind),
      }),
    ];
  });
};

const compareNodeOrder = (a: FlowNode, b: FlowNode): number => {
  if (a.position.x !== b.position.x) {
    return a.position.x - b.position.x;
  }

  if (a.position.y !== b.position.y) {
    return a.position.y - b.position.y;
  }

  return a.id.localeCompare(b.id);
};

const buildParallelGroupId = (componentNodeIds: string[]): string =>
  `PG-${componentNodeIds.slice().sort((a, b) => a.localeCompare(b)).join("|")}`;

const computeParallelGroups = (
  nodes: FlowNode[],
  edges: FlowEdge[]
): ParallelGroupInfo => {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const adjacency = new Map<string, Set<string>>();
  const visited = new Set<string>();

  nodes.forEach((node) => {
    adjacency.set(node.id, new Set<string>());
  });

  edges.forEach((edge) => {
    if (!isParallelEdge(edge)) {
      return;
    }

    if (!nodeById.has(edge.source) || !nodeById.has(edge.target)) {
      return;
    }

    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  });

  const sortedNodes = nodes.slice().sort(compareNodeOrder);
  const componentNodeIds: string[][] = [];
  const parallelGroupByNodeId: Partial<Record<string, string>> = {};

  sortedNodes.forEach((node) => {
    if (visited.has(node.id)) {
      return;
    }

    visited.add(node.id);

    const neighbors = adjacency.get(node.id);
    if (!neighbors || neighbors.size === 0) {
      return;
    }

    const component: string[] = [];
    const stack = [node.id];

    while (stack.length > 0) {
      const currentNodeId = stack.pop();
      if (!currentNodeId) {
        continue;
      }

      component.push(currentNodeId);

      const currentNeighbors = Array.from(adjacency.get(currentNodeId) ?? []).sort((a, b) =>
        a.localeCompare(b)
      );

      currentNeighbors.forEach((neighborNodeId) => {
        if (visited.has(neighborNodeId)) {
          return;
        }

        visited.add(neighborNodeId);
        stack.push(neighborNodeId);
      });
    }

    const normalizedComponent = component.sort((a, b) => a.localeCompare(b));
    const groupId = buildParallelGroupId(normalizedComponent);

    componentNodeIds.push(normalizedComponent);
    normalizedComponent.forEach((nodeId) => {
      parallelGroupByNodeId[nodeId] = groupId;
    });
  });

  componentNodeIds.sort((a, b) => {
    const first = a[0] ?? "";
    const second = b[0] ?? "";
    return first.localeCompare(second);
  });

  return {
    parallelGroupByNodeId,
    componentNodeIds,
  };
};

const computeFlowOrdering = (nodes: FlowNode[], edges: FlowEdge[]): FlowOrderingResult => {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const sequentialEdges = edges.filter((edge) => isSequentialEdge(edge));
  const adjacency = new Map<string, Set<string>>();
  const indegree = new Map<string, number>();

  nodes.forEach((node) => {
    adjacency.set(node.id, new Set<string>());
    indegree.set(node.id, 0);
  });

  sequentialEdges.forEach((edge) => {
    if (!nodeById.has(edge.source) || !nodeById.has(edge.target)) {
      return;
    }

    const neighbors = adjacency.get(edge.source);
    if (!neighbors || neighbors.has(edge.target)) {
      return;
    }

    neighbors.add(edge.target);
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
  });

  const available = nodes
    .filter((node) => (indegree.get(node.id) ?? 0) === 0)
    .sort(compareNodeOrder);

  const orderedNodeIds: string[] = [];

  while (available.length > 0) {
    const current = available.shift();
    if (!current) {
      break;
    }

    orderedNodeIds.push(current.id);

    const sortedNeighbors = Array.from(adjacency.get(current.id) ?? [])
      .map((neighborId) => nodeById.get(neighborId))
      .filter((neighbor): neighbor is FlowNode => Boolean(neighbor))
      .sort(compareNodeOrder);

    sortedNeighbors.forEach((neighbor) => {
      const nextIndegree = (indegree.get(neighbor.id) ?? 0) - 1;
      indegree.set(neighbor.id, nextIndegree);

      if (nextIndegree === 0) {
        available.push(neighbor);
        available.sort(compareNodeOrder);
      }
    });
  }

  const hasCycle = orderedNodeIds.length !== nodes.length;

  if (hasCycle) {
    const unresolved = nodes
      .filter((node) => !orderedNodeIds.includes(node.id))
      .sort(compareNodeOrder);

    orderedNodeIds.push(...unresolved.map((node) => node.id));
  }

  const sequenceByNodeId = orderedNodeIds.reduce<Partial<Record<string, number>>>(
    (acc, nodeId, index) => {
      acc[nodeId] = index + 1;
      return acc;
    },
    {}
  );

  const parallelGroupInfo = computeParallelGroups(nodes, edges);
  parallelGroupInfo.componentNodeIds.forEach((component) => {
    const componentIndices = component
      .map((nodeId) => sequenceByNodeId[nodeId])
      .filter((value): value is number => typeof value === "number");

    if (componentIndices.length === 0) {
      return;
    }

    const normalizedIndex = Math.min(...componentIndices);
    component.forEach((nodeId) => {
      sequenceByNodeId[nodeId] = normalizedIndex;
    });
  });

  const orderedNodeIdsBySequence = nodes
    .slice()
    .sort((a, b) => {
      const sequenceA = sequenceByNodeId[a.id] ?? Number.MAX_SAFE_INTEGER;
      const sequenceB = sequenceByNodeId[b.id] ?? Number.MAX_SAFE_INTEGER;

      if (sequenceA !== sequenceB) {
        return sequenceA - sequenceB;
      }

      return compareNodeOrder(a, b);
    })
    .map((node) => node.id);

  return {
    orderedNodeIds: orderedNodeIdsBySequence,
    sequentialOrderedNodeIds: orderedNodeIds,
    sequenceByNodeId,
    parallelGroupByNodeId: parallelGroupInfo.parallelGroupByNodeId,
    hasCycle,
  };
};

const hashToBase36 = (value: string): string => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);
  }

  return (hash >>> 0).toString(36).toUpperCase().padStart(7, "0");
};

const computeProjectSequenceId = (
  orderedNodeIds: string[],
  nodes: FlowNode[],
  edges: FlowEdge[]
): string => {
  const validNodeIds = new Set(nodes.map((node) => node.id));

  const edgeSignature = edges
    .filter(
      (edge) =>
        isSequentialEdge(edge) && validNodeIds.has(edge.source) && validNodeIds.has(edge.target)
    )
    .map((edge) => `${edge.source}->${edge.target}`)
    .sort()
    .join("|");

  const payload = `v1|order:${orderedNodeIds.join(">")}|edges:${edgeSignature}`;
  return `FLOW-${hashToBase36(payload)}`;
};

const getNodeShapeStyle = (
  shape: NodeShape,
  selected: boolean,
  accentColor: string
): React.CSSProperties => {
  const resolvedAccentColor = accentColor?.trim() || "#4f46e5";

  const baseStyle: React.CSSProperties = {
    boxSizing: "border-box",
    width: 260,
    minHeight: 120,
    position: "relative",
    background: "#ffffff",
    border: `2px solid ${resolvedAccentColor}`,
    padding: 10,
    boxShadow: selected
      ? "0 0 0 3px rgba(37, 99, 235, 0.35), 0 3px 10px rgba(0, 0, 0, 0.12)"
      : "0 1px 3px rgba(0,0,0,0.08)",
  };

  switch (shape) {
    case "rounded":
      return {
        ...baseStyle,
        borderRadius: 18,
      };

    case "pill":
      return {
        ...baseStyle,
        width: 380,
        minHeight: 190,
        padding: "18px 28px",
        borderRadius: 999,
      };

    case "diamond":
      return {
        ...baseStyle,
        width: 460,
        minHeight: 340,
        borderRadius: 8,
        border: "none",
        background: "transparent",
        padding: 0,
        boxShadow: selected
          ? "0 0 0 3px rgba(37, 99, 235, 0.35)"
          : "none",
      };

    case "rectangle":
    default:
      return {
        ...baseStyle,
        borderRadius: 8,
      };
  }
};

const getDiamondBorderLayerStyle = (accentColor: string): React.CSSProperties => ({
  position: "absolute",
  inset: 0,
  background: accentColor,
  clipPath: DIAMOND_CLIP_PATH,
  zIndex: 0,
  pointerEvents: "none",
});

const getDiamondSurfaceLayerStyle = (): React.CSSProperties => ({
  position: "absolute",
  inset: 6,
  background: "#ffffff",
  clipPath: DIAMOND_CLIP_PATH,
  zIndex: 1,
  pointerEvents: "none",
});

const getNodeContentStyle = (shape: NodeShape): React.CSSProperties => {
  if (shape !== "diamond") {
    return { display: "block", position: "relative", zIndex: 1 };
  }

  return {
    position: "relative",
    zIndex: 2,
    width: "100%",
    minHeight: "100%",
    boxSizing: "border-box",
    padding: "92px 92px",
  };
};

const serializeNodesForStorage = (
  nodes: FlowNode[],
  parallelGroupByNodeId: Partial<Record<string, string>> = {}
): SerializableFlowNode[] =>
  nodes.map((node) => {
    const persistableData: PersistableMicrocopyNodeData = {
      title: node.data.title,
      body_text: node.data.body_text,
      primary_cta: node.data.primary_cta,
      secondary_cta: node.data.secondary_cta,
      helper_text: node.data.helper_text,
      error_text: node.data.error_text,
      tone: node.data.tone,
      polarity: node.data.polarity,
      reversibility: node.data.reversibility,
      concept: node.data.concept,
      notes: node.data.notes,
      action_type_name: node.data.action_type_name,
      action_type_color: node.data.action_type_color,
      card_style: node.data.card_style,
      node_shape: node.data.node_shape,
      node_type: node.data.node_type,
      menu_config: normalizeMenuNodeConfig(
        node.data.menu_config,
        node.data.primary_cta,
        node.data.node_type === "menu"
          ? node.data.menu_config.max_right_connections
          : 1
      ),
      parallel_group_id:
        parallelGroupByNodeId[node.id] ?? node.data.parallel_group_id ?? null,
    };

    return {
      id: node.id,
      position: node.position,
      data: persistableData,
    };
  });

const createEmptyCanvasState = (): PersistedCanvasState => ({
  nodes: [],
  edges: [],
  adminOptions: cloneGlobalOptions(DEFAULT_GLOBAL_OPTIONS),
  controlledLanguageGlossary: [],
});

const readLegacyCanvasState = (): PersistedCanvasState | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as {
      nodes?: unknown;
      edges?: unknown;
      adminOptions?: unknown;
      controlledLanguageGlossary?: unknown;
    };

    return {
      nodes: sanitizeSerializableFlowNodes(parsed.nodes),
      edges: sanitizeEdgesForStorage(parsed.edges),
      adminOptions: normalizeGlobalOptionConfig(parsed.adminOptions),
      controlledLanguageGlossary: sanitizeControlledLanguageGlossary(
        parsed.controlledLanguageGlossary
      ),
    };
  } catch (error) {
    console.error("Failed to parse legacy canvas state", error);
    return null;
  }
};

const createProjectRecord = (
  name: string,
  canvas: PersistedCanvasState = createEmptyCanvasState()
): ProjectRecord => {
  const now = new Date().toISOString();

  return {
    id: createProjectId(),
    name: name.trim() || "Untitled Project",
    createdAt: now,
    updatedAt: now,
    canvas: {
      nodes: sanitizeSerializableFlowNodes(canvas.nodes),
      edges: sanitizeEdgesForStorage(canvas.edges),
      adminOptions: normalizeGlobalOptionConfig(canvas.adminOptions),
      controlledLanguageGlossary: sanitizeControlledLanguageGlossary(
        canvas.controlledLanguageGlossary
      ),
    },
  };
};

const createEmptyStore = (): AppStore => ({
  version: 1,
  accounts: [],
  session: {
    activeAccountId: null,
    activeProjectId: null,
    view: "account",
    editorMode: "canvas",
  },
});

const sanitizeProjectRecord = (value: unknown): ProjectRecord | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const source = value as Partial<ProjectRecord> & {
    canvas?: Partial<PersistedCanvasState>;
  };

  const now = new Date().toISOString();
  const id =
    typeof source.id === "string" && source.id.trim().length > 0
      ? source.id.trim()
      : createProjectId();

  const name =
    typeof source.name === "string" && source.name.trim().length > 0
      ? source.name.trim()
      : "Untitled Project";

  const createdAt =
    typeof source.createdAt === "string" && source.createdAt.length > 0
      ? source.createdAt
      : now;

  const updatedAt =
    typeof source.updatedAt === "string" && source.updatedAt.length > 0
      ? source.updatedAt
      : createdAt;

  return {
    id,
    name,
    createdAt,
    updatedAt,
    canvas: {
      nodes: sanitizeSerializableFlowNodes(source.canvas?.nodes),
      edges: sanitizeEdgesForStorage(source.canvas?.edges),
      adminOptions: normalizeGlobalOptionConfig(source.canvas?.adminOptions),
      controlledLanguageGlossary: sanitizeControlledLanguageGlossary(
        source.canvas?.controlledLanguageGlossary
      ),
    },
  };
};

const sanitizeAccountRecord = (value: unknown): AccountRecord | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const source = value as Partial<AccountRecord>;

  const code =
    typeof source.code === "string" && /^\d{3}$/.test(source.code)
      ? source.code
      : SINGLE_ACCOUNT_CODE;

  const id =
    typeof source.id === "string" && source.id.trim().length > 0
      ? source.id.trim()
      : createAccountId(code);

  const projects = Array.isArray(source.projects)
    ? source.projects
        .map((project) => sanitizeProjectRecord(project))
        .filter((project): project is ProjectRecord => Boolean(project))
    : [];

  return {
    id,
    code,
    projects,
  };
};

const sanitizeAppStore = (value: unknown): AppStore => {
  const emptyStore = createEmptyStore();

  if (!value || typeof value !== "object") {
    return emptyStore;
  }

  const source = value as Partial<AppStore>;

  const accounts = Array.isArray(source.accounts)
    ? source.accounts
        .map((account) => sanitizeAccountRecord(account))
        .filter((account): account is AccountRecord => Boolean(account))
    : [];

  const sessionSource =
    source.session && typeof source.session === "object" ? source.session : null;

  const requestedAccountId =
    sessionSource && typeof sessionSource.activeAccountId === "string"
      ? sessionSource.activeAccountId
      : null;

  const requestedEditorMode =
    sessionSource &&
    isEditorSurfaceMode(
      (sessionSource as {
        editorMode?: unknown;
      }).editorMode
    )
      ? (sessionSource as { editorMode: EditorSurfaceMode }).editorMode
      : "canvas";

  const fallbackAccountId = accounts.find((account) => account.code === SINGLE_ACCOUNT_CODE)?.id;

  const activeAccountId = accounts.some((account) => account.id === requestedAccountId)
    ? requestedAccountId
    : fallbackAccountId ?? null;

  return {
    version: 1,
    accounts,
    session: {
      activeAccountId,
      activeProjectId: null,
      view: activeAccountId ? "dashboard" : "account",
      editorMode: requestedEditorMode,
    },
  };
};

const migrateLegacyCanvasToStore = (): AppStore | null => {
  const legacyCanvasState = readLegacyCanvasState();
  if (!legacyCanvasState) {
    return null;
  }

  const accountId = createAccountId(SINGLE_ACCOUNT_CODE);
  const migratedProject = createProjectRecord("Migrated Project", legacyCanvasState);

  return {
    version: 1,
    accounts: [
      {
        id: accountId,
        code: SINGLE_ACCOUNT_CODE,
        projects: [migratedProject],
      },
    ],
    session: {
      activeAccountId: accountId,
      activeProjectId: null,
      view: "dashboard",
      editorMode: "canvas",
    },
  };
};

const readAppStore = (): AppStore => {
  if (typeof window === "undefined") {
    return createEmptyStore();
  }

  const rawStore = window.localStorage.getItem(APP_STORAGE_KEY);
  if (rawStore) {
    try {
      const parsed = JSON.parse(rawStore);
      return sanitizeAppStore(parsed);
    } catch (error) {
      console.error("Failed to parse app store", error);
    }
  }

  const migratedStore = migrateLegacyCanvasToStore();
  if (migratedStore) {
    window.localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(migratedStore));
    return migratedStore;
  }

  return createEmptyStore();
};

const formatDateTime = (isoDate: string): string => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.valueOf())) {
    return isoDate;
  }

  return date.toLocaleString();
};

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
  onMenuNodeConfigChange,
}: FlowCopyNodeProps) {
  const { setNodes } = useReactFlow<FlowNode, FlowEdge>();
  const updateNodeInternals = useUpdateNodeInternals();
  const [openMenuGlossaryTermId, setOpenMenuGlossaryTermId] = useState<string | null>(
    null
  );

  const isMenuNode = data.node_type === "menu";
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

  const visibleMenuGlossaryTermId =
    isMenuNode &&
    openMenuGlossaryTermId &&
    menuConfig.terms.some((term) => term.id === openMenuGlossaryTermId)
      ? openMenuGlossaryTermId
      : null;

  useEffect(() => {
    updateNodeInternals(id);
  }, [data.node_type, id, menuConfig.terms.length, updateNodeInternals]);

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
    [isMenuNode, menuConfig, replaceMenuConfig]
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

  return (
    <div style={getNodeShapeStyle(data.node_shape, selected, data.action_type_color)}>
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
          <span style={{ fontSize: 11, color: "#1d4ed8", fontWeight: 600 }}>
            #{data.sequence_index ?? "-"}
          </span>
        </div>

        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, color: "#71717a", marginBottom: 4 }}>Title</div>
          <input
            className="nodrag"
            style={inputStyle}
            value={data.title}
            onChange={(event) => updateField("title", event.target.value)}
          />
        </div>

        {!isMenuNode && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, color: "#71717a", marginBottom: 4 }}>
              Primary CTA
            </div>
            <input
              className="nodrag"
              style={inputStyle}
              value={data.primary_cta}
              onChange={(event) => updateField("primary_cta", event.target.value)}
            />
          </div>
        )}

        {isMenuNode && (
          <div
            style={{
              marginTop: 8,
              border: "1px solid #dbeafe",
              borderRadius: 8,
              padding: 8,
              background: "#f8fbff",
              display: "grid",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8" }}>
              Menu Terms
            </div>

            {menuConfig.terms.map((menuTerm, index) => (
              <div
                key={`menu-term:${menuTerm.id}`}
                style={{
                  border: "1px solid #bfdbfe",
                  borderRadius: 6,
                  padding: 6,
                  display: "grid",
                  gap: 6,
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
                  <span style={{ fontSize: 10, color: "#64748b" }}>
                    Handle {index + 1}
                  </span>
                  <button
                    type="button"
                    className="nodrag"
                    style={{
                      ...buttonStyle,
                      fontSize: 10,
                      padding: "2px 6px",
                      borderColor: "#fca5a5",
                      color: "#b91c1c",
                    }}
                    title="Delete this term"
                    onClick={() => deleteMenuTermById(menuTerm.id)}
                  >
                    X
                  </button>
                </div>

                <div style={{ display: "grid", gap: 4 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 6,
                    }}
                  >
                    <div style={{ fontSize: 10, color: "#334155" }}>Term</div>
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

                  <div style={{ position: "relative", paddingRight: 14 }}>
                    <input
                      className="nodrag"
                      data-menu-term-input="true"
                      style={inputStyle}
                      value={menuTerm.term}
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
                        No included Menu Term glossary terms yet.
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

export default function Page() {
  const [store, setStore] = useState<AppStore>(createEmptyStore);
  const [accountCodeInput, setAccountCodeInput] = useState(SINGLE_ACCOUNT_CODE);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState("");

  const [nodes, setNodes] = useNodesState<FlowNode>([]);
  const [edges, setEdges] = useEdgesState<FlowEdge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [adminOptions, setAdminOptions] =
    useState<GlobalOptionConfig>(DEFAULT_GLOBAL_OPTIONS);
  const [controlledLanguageGlossary, setControlledLanguageGlossary] = useState<
    ControlledLanguageGlossaryEntry[]
  >([]);
  const [isControlledLanguagePanelOpen, setIsControlledLanguagePanelOpen] =
    useState(false);
  const [controlledLanguageDraftRow, setControlledLanguageDraftRow] =
    useState<ControlledLanguageDraftRow>(createEmptyControlledLanguageDraftRow);
  const [openControlledLanguageFieldType, setOpenControlledLanguageFieldType] = useState<
    NodeControlledLanguageFieldType | null
  >(null);
  const [openInspectorMenuGlossaryTermId, setOpenInspectorMenuGlossaryTermId] = useState<
    string | null
  >(null);
  const [pendingOptionInputs, setPendingOptionInputs] = useState<
    Record<GlobalOptionField, string>
  >(createEmptyPendingOptionInputs);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [showNodeIdsOnCanvas, setShowNodeIdsOnCanvas] = useState(false);
  const [undoStack, setUndoStack] = useState<EditorSnapshot[]>([]);
  const [transferFeedback, setTransferFeedback] = useState<ImportFeedback | null>(null);
  const [sidePanelWidth, setSidePanelWidth] = useState<number>(readInitialSidePanelWidth);
  const [isResizingSidePanel, setIsResizingSidePanel] = useState(false);

  const rfRef = useRef<ReactFlowInstance<FlowNode, FlowEdge> | null>(null);
  const importFileInputRef = useRef<HTMLInputElement | null>(null);
  const hasLoadedStoreRef = useRef(false);
  const undoCaptureTimeoutRef = useRef<number | null>(null);
  const captureUndoSnapshotRef = useRef<() => void>(() => undefined);
  const updateMenuNodeConfigByIdRef = useRef<
    (
      nodeId: string,
      updater: (currentConfig: MenuNodeConfig) => MenuNodeConfig
    ) => void
  >(() => undefined);
  const sidePanelResizeStartXRef = useRef(0);
  const sidePanelResizeStartWidthRef = useRef(SIDE_PANEL_MIN_WIDTH);

  const updateStore = useCallback((updater: (prev: AppStore) => AppStore) => {
    setStore((prev) => {
      const next = updater(prev);

      if (typeof window !== "undefined") {
        window.localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(next));
      }

      return next;
    });
  }, []);

  useEffect(() => {
    if (hasLoadedStoreRef.current) {
      return;
    }

    hasLoadedStoreRef.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStore(readAppStore());
  }, []);

  useEffect(
    () => () => {
      if (undoCaptureTimeoutRef.current !== null) {
        window.clearTimeout(undoCaptureTimeoutRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      SIDE_PANEL_WIDTH_STORAGE_KEY,
      String(clampSidePanelWidth(sidePanelWidth))
    );
  }, [sidePanelWidth]);

  useEffect(() => {
    if (!isResizingSidePanel) {
      return;
    }

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };
  }, [isResizingSidePanel]);

  useEffect(
    () => () => {
      setIsResizingSidePanel(false);
    },
    []
  );

  const activeAccount = useMemo(
    () =>
      store.accounts.find((account) => account.id === store.session.activeAccountId) ??
      null,
    [store.accounts, store.session.activeAccountId]
  );

  const activeProject = useMemo(
    () =>
      activeAccount?.projects.find(
        (project) => project.id === store.session.activeProjectId
      ) ?? null,
    [activeAccount, store.session.activeProjectId]
  );

  const loadProjectIntoEditor = useCallback(
    (project: ProjectRecord) => {
      const normalizedAdminOptions = normalizeGlobalOptionConfig(
        project.canvas.adminOptions
      );

      const hydratedNodes = sanitizePersistedNodes(
        project.canvas.nodes,
        normalizedAdminOptions
      );
      const hydratedEdges = sanitizeEdges(project.canvas.edges, hydratedNodes);

      setAdminOptions(normalizedAdminOptions);
      setControlledLanguageGlossary(
        sanitizeControlledLanguageGlossary(project.canvas.controlledLanguageGlossary)
      );
      setControlledLanguageDraftRow(createEmptyControlledLanguageDraftRow());
      setOpenControlledLanguageFieldType(null);
      setNodes(hydratedNodes);
      setEdges(hydratedEdges);
      setSelectedNodeId(hydratedNodes[0]?.id ?? null);
      setSelectedEdgeId(null);
      setUndoStack([]);
      setPendingOptionInputs(createEmptyPendingOptionInputs());
    },
    [setEdges, setNodes]
  );

  const persistCurrentProjectState = useCallback(() => {
    const { view, activeAccountId, activeProjectId } = store.session;

    if (view !== "editor" || !activeAccountId || !activeProjectId) {
      return;
    }

    const parallelGroupByNodeId = computeParallelGroups(nodes, edges).parallelGroupByNodeId;
    const serializedNodes = serializeNodesForStorage(nodes, parallelGroupByNodeId);
    const serializedEdges = cloneEdges(edges);
    const serializedAdminOptions = cloneGlobalOptions(adminOptions);
    const serializedControlledLanguageGlossary = sanitizeControlledLanguageGlossary(
      controlledLanguageGlossary
    );
    const updatedAt = new Date().toISOString();

    updateStore((prev) => {
      const accountIndex = prev.accounts.findIndex(
        (account) => account.id === activeAccountId
      );

      if (accountIndex < 0) {
        return prev;
      }

      const account = prev.accounts[accountIndex];
      const projectIndex = account.projects.findIndex(
        (project) => project.id === activeProjectId
      );

      if (projectIndex < 0) {
        return prev;
      }

      const projects = [...account.projects];
      projects[projectIndex] = {
        ...projects[projectIndex],
        updatedAt,
        canvas: {
          nodes: serializedNodes,
          edges: serializedEdges,
          adminOptions: serializedAdminOptions,
          controlledLanguageGlossary: serializedControlledLanguageGlossary,
        },
      };

      const accounts = [...prev.accounts];
      accounts[accountIndex] = {
        ...account,
        projects,
      };

      return {
        ...prev,
        accounts,
      };
    });
  }, [
    adminOptions,
    controlledLanguageGlossary,
    edges,
    nodes,
    store.session,
    updateStore,
  ]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    persistCurrentProjectState();
  }, [persistCurrentProjectState]);

  const queueUndoSnapshot = useCallback(() => {
    if (store.session.view !== "editor") {
      return;
    }

    if (undoCaptureTimeoutRef.current !== null) {
      return;
    }

    const snapshot: EditorSnapshot = {
      nodes: cloneFlowNodes(nodes),
      edges: cloneEdges(edges),
      adminOptions: cloneGlobalOptions(adminOptions),
      controlledLanguageGlossary: cloneControlledLanguageGlossary(
        controlledLanguageGlossary
      ),
    };

    undoCaptureTimeoutRef.current = window.setTimeout(() => {
      setUndoStack((prev) => [...prev, snapshot].slice(-3));
      undoCaptureTimeoutRef.current = null;
    }, 220);
  }, [adminOptions, controlledLanguageGlossary, edges, nodes, store.session.view]);

  useEffect(() => {
    captureUndoSnapshotRef.current = queueUndoSnapshot;
  }, [queueUndoSnapshot]);

  const handleUndo = useCallback(() => {
    if (undoCaptureTimeoutRef.current !== null) {
      window.clearTimeout(undoCaptureTimeoutRef.current);
      undoCaptureTimeoutRef.current = null;
    }

    setUndoStack((prev) => {
      const previousSnapshot = prev[prev.length - 1];
      if (!previousSnapshot) {
        return prev;
      }

      setNodes(cloneFlowNodes(previousSnapshot.nodes));
      setEdges(cloneEdges(previousSnapshot.edges));
      setAdminOptions(cloneGlobalOptions(previousSnapshot.adminOptions));
      setControlledLanguageGlossary(
        cloneControlledLanguageGlossary(previousSnapshot.controlledLanguageGlossary)
      );

      setSelectedNodeId((currentSelected) => {
        if (
          currentSelected &&
          previousSnapshot.nodes.some((node) => node.id === currentSelected)
        ) {
          return currentSelected;
        }

        return previousSnapshot.nodes[0]?.id ?? null;
      });
      setSelectedEdgeId((currentSelected) =>
        currentSelected &&
        previousSnapshot.edges.some((edge) => edge.id === currentSelected)
          ? currentSelected
          : null
      );

      return prev.slice(0, -1);
    });
  }, [setEdges, setNodes]);

  const menuTermGlossaryTerms = useMemo(
    () => buildControlledLanguageTermsByField(controlledLanguageGlossary).menu_term,
    [controlledLanguageGlossary]
  );

  const handleAccountEntry = useCallback(() => {
    const enteredCode = accountCodeInput.trim();

    if (!/^\d{3}$/.test(enteredCode)) {
      setAccountError("Account code must be exactly 3 digits.");
      return;
    }

    if (enteredCode !== SINGLE_ACCOUNT_CODE) {
      setAccountError("For now, only account code 000 is available.");
      return;
    }

    setAccountError(null);

    updateStore((prev) => {
      const existingAccount = prev.accounts.find(
        (account) => account.code === enteredCode
      );

      const account =
        existingAccount ?? {
          id: createAccountId(enteredCode),
          code: enteredCode,
          projects: [],
        };

      const accounts = existingAccount ? prev.accounts : [...prev.accounts, account];

      return {
        ...prev,
        accounts,
        session: {
          activeAccountId: account.id,
          activeProjectId: null,
          view: "dashboard",
          editorMode: "canvas",
        },
      };
    });
  }, [accountCodeInput, updateStore]);

  const handleSignOut = useCallback(() => {
    updateStore((prev) => ({
      ...prev,
      session: {
        activeAccountId: null,
        activeProjectId: null,
        view: "account",
        editorMode: "canvas",
      },
    }));

    setUndoStack([]);
  }, [updateStore]);

  const createProjectFromDashboard = useCallback(() => {
    if (!activeAccount) {
      return;
    }

    const projectName = newProjectName.trim();
    if (!projectName) {
      return;
    }

    const newProject = createProjectRecord(projectName, createEmptyCanvasState());

    updateStore((prev) => {
      const accountIndex = prev.accounts.findIndex(
        (account) => account.id === activeAccount.id
      );

      if (accountIndex < 0) {
        return prev;
      }

      const accounts = [...prev.accounts];
      const account = accounts[accountIndex];

      accounts[accountIndex] = {
        ...account,
        projects: [...account.projects, newProject],
      };

      return {
        ...prev,
        accounts,
      };
    });

    setNewProjectName("");
  }, [activeAccount, newProjectName, updateStore]);

  const openProject = useCallback(
    (projectId: string) => {
      if (!activeAccount) {
        return;
      }

      const project = activeAccount.projects.find((item) => item.id === projectId);
      if (!project) {
        return;
      }

      loadProjectIntoEditor(project);

      updateStore((prev) => ({
        ...prev,
        session: {
          activeAccountId: activeAccount.id,
          activeProjectId: project.id,
          view: "editor",
          editorMode: prev.session.editorMode,
        },
      }));
    },
    [activeAccount, loadProjectIntoEditor, updateStore]
  );

  const handleBackToDashboard = useCallback(() => {
    persistCurrentProjectState();

    updateStore((prev) => ({
      ...prev,
      session: {
        ...prev.session,
        activeProjectId: null,
        view: "dashboard",
      },
    }));

    setUndoStack([]);
  }, [persistCurrentProjectState, updateStore]);

  const onNodesChange = useCallback(
    (changes: NodeChange<FlowNode>[]) => {
      if (changes.length === 0) {
        return;
      }

      if (hasNonSelectionNodeChanges(changes)) {
        queueUndoSnapshot();
      }
      setNodes((currentNodes) => applyNodeChanges(changes, currentNodes));
    },
    [queueUndoSnapshot, setNodes]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<FlowEdge>[]) => {
      if (changes.length === 0) {
        return;
      }

      if (hasNonSelectionEdgeChanges(changes)) {
        queueUndoSnapshot();
      }
      setEdges((currentEdges) => applyEdgeChanges(changes, currentEdges));
    },
    [queueUndoSnapshot, setEdges]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) {
        return;
      }

      const sourceNode = nodes.find((node) => node.id === params.source);
      const nextEdgeKind = inferEdgeKindFromHandles(
        params.sourceHandle,
        params.targetHandle
      );

      let nextSourceHandle = params.sourceHandle;

      if (sourceNode?.data.node_type === "menu" && nextEdgeKind === "sequential") {
        const menuConfig = normalizeMenuNodeConfig(
          sourceNode.data.menu_config,
          sourceNode.data.primary_cta,
          Math.max(
            MENU_NODE_RIGHT_CONNECTIONS_MIN,
            sourceNode.data.menu_config.max_right_connections
          )
        );

        if (
          !isMenuSequentialConnectionAllowed(
            edges,
            sourceNode.id,
            menuConfig,
            nextSourceHandle
          )
        ) {
          nextSourceHandle = getFirstAvailableMenuSourceHandleId(
            edges,
            sourceNode.id,
            menuConfig
          );
        }

        if (
          !isMenuSequentialConnectionAllowed(
            edges,
            sourceNode.id,
            menuConfig,
            nextSourceHandle
          )
        ) {
          return;
        }
      }

      queueUndoSnapshot();

      const newEdge = applyEdgeVisuals({
        id: `e-${params.source}-${params.target}-${createNodeId().slice(0, 8)}`,
        source: params.source,
        target: params.target,
        sourceHandle: nextSourceHandle,
        targetHandle: params.targetHandle,
        label: "",
      });

      setEdges((eds) => addEdge(newEdge, eds));
    },
    [edges, nodes, queueUndoSnapshot, setEdges]
  );

  const onReconnect = useCallback(
    (oldEdge: FlowEdge, newConnection: Connection) => {
      if (!newConnection.source || !newConnection.target) {
        return;
      }

      const sourceNode = nodes.find((node) => node.id === newConnection.source);
      const nextEdgeKind = inferEdgeKindFromHandles(
        newConnection.sourceHandle,
        newConnection.targetHandle
      );

      let nextSourceHandle = newConnection.sourceHandle;

      if (sourceNode?.data.node_type === "menu" && nextEdgeKind === "sequential") {
        const menuConfig = normalizeMenuNodeConfig(
          sourceNode.data.menu_config,
          sourceNode.data.primary_cta,
          Math.max(
            MENU_NODE_RIGHT_CONNECTIONS_MIN,
            sourceNode.data.menu_config.max_right_connections
          )
        );

        if (
          !isMenuSequentialConnectionAllowed(
            edges,
            sourceNode.id,
            menuConfig,
            nextSourceHandle,
            { ignoreEdgeId: oldEdge.id }
          )
        ) {
          nextSourceHandle = getFirstAvailableMenuSourceHandleId(
            edges,
            sourceNode.id,
            menuConfig,
            { ignoreEdgeId: oldEdge.id }
          );
        }

        if (
          !isMenuSequentialConnectionAllowed(
            edges,
            sourceNode.id,
            menuConfig,
            nextSourceHandle,
            { ignoreEdgeId: oldEdge.id }
          )
        ) {
          return;
        }
      }

      queueUndoSnapshot();

      const nextConnection: Connection = {
        ...newConnection,
        sourceHandle: nextSourceHandle,
      };

      setEdges((currentEdges) =>
        reconnectEdge<FlowEdge>(oldEdge, nextConnection, currentEdges).map((edge) =>
          applyEdgeVisuals(edge)
        )
      );
    },
    [edges, nodes, queueUndoSnapshot, setEdges]
  );

  const onInit = useCallback(
    (instance: ReactFlowInstance<FlowNode, FlowEdge>) => {
    rfRef.current = instance;
    },
    []
  );

  const addNodeAtEvent = useCallback(
    (event: React.MouseEvent) => {
      const rf = rfRef.current;
      if (!rf) return;

      queueUndoSnapshot();

      const position = rf.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const id = createNodeId();

      setNodes((nds) => [
        ...nds,
        normalizeNode({ id, position }, normalizeGlobalOptionConfig(adminOptions)),
      ]);
      setSelectedNodeId(id);
    },
    [adminOptions, queueUndoSnapshot, setNodes]
  );

  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (event.detail === 2) {
        setOpenControlledLanguageFieldType(null);
        setOpenInspectorMenuGlossaryTermId(null);
        addNodeAtEvent(event);
        return;
      }

      setOpenControlledLanguageFieldType(null);
      setOpenInspectorMenuGlossaryTermId(null);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
    },
    [addNodeAtEvent]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: FlowNode) => {
    setOpenControlledLanguageFieldType(null);
    setOpenInspectorMenuGlossaryTermId(null);
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
  }, []);

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: FlowEdge) => {
    setOpenControlledLanguageFieldType(null);
    setOpenInspectorMenuGlossaryTermId(null);
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
  }, []);

  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes, edges: selectedEdges }: OnSelectionChangeParams<FlowNode, FlowEdge>) => {
      const nextSelectedEdgeId = selectedEdges[0]?.id ?? null;
      const nextSelectedNodeId = selectedNodes[0]?.id ?? null;

      setOpenControlledLanguageFieldType(null);
      setOpenInspectorMenuGlossaryTermId(null);
      setSelectedEdgeId(nextSelectedEdgeId);
      setSelectedNodeId(nextSelectedEdgeId ? null : nextSelectedNodeId);
    },
    []
  );

  const handleDeleteSelection = useCallback(() => {
    if (selectedEdgeId) {
      queueUndoSnapshot();
      setEdges((currentEdges) => currentEdges.filter((edge) => edge.id !== selectedEdgeId));
      setSelectedEdgeId(null);
      return;
    }

    if (!selectedNodeId) {
      return;
    }

    queueUndoSnapshot();
    setNodes((currentNodes) => currentNodes.filter((node) => node.id !== selectedNodeId));
    setEdges((currentEdges) =>
      currentEdges.filter(
        (edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId
      )
    );
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, [queueUndoSnapshot, selectedEdgeId, selectedNodeId, setEdges, setNodes]);

  useEffect(() => {
    if (store.session.view !== "editor" || store.session.editorMode !== "canvas") {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Delete" && event.key !== "Backspace") {
        return;
      }

      if (isEditableEventTarget(event.target)) {
        return;
      }

      if (!selectedEdgeId && !selectedNodeId) {
        return;
      }

      event.preventDefault();
      handleDeleteSelection();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    handleDeleteSelection,
    selectedEdgeId,
    selectedNodeId,
    store.session.editorMode,
    store.session.view,
  ]);

  const ordering = useMemo(() => computeFlowOrdering(nodes, edges), [nodes, edges]);

  const projectSequenceId = useMemo(
    () => computeProjectSequenceId(ordering.sequentialOrderedNodeIds, nodes, edges),
    [edges, nodes, ordering.sequentialOrderedNodeIds]
  );

  const nodesWithSequence = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          sequence_index: ordering.sequenceByNodeId[node.id] ?? null,
        },
      })),
    [nodes, ordering.sequenceByNodeId]
  );

  const displayEdges = useMemo(
    () =>
      edges.map((edge) => {
        const edgeKind = getEdgeKind(edge);
        const edgeIsSequential = edgeKind === "sequential";
        const edgeIsSelected = selectedEdgeId === edge.id || Boolean(edge.selected);
        const sourceOrder = ordering.sequenceByNodeId[edge.source];
        const targetOrder = ordering.sequenceByNodeId[edge.target];

        return applyEdgeVisuals({
          ...edge,
          label:
            edgeIsSequential && sourceOrder && targetOrder
              ? `${sourceOrder} → ${targetOrder}`
              : undefined,
          labelStyle: {
            fill:
              edgeKind === "parallel" ? PARALLEL_EDGE_STROKE_COLOR : EDGE_STROKE_COLOR,
            fontWeight: 700,
            fontSize: 11,
          },
          labelBgStyle: {
            fill: edgeKind === "parallel" ? "#f1f5f9" : "#eff6ff",
            fillOpacity: 0.95,
          },
          labelBgPadding: [4, 2],
          labelBgBorderRadius: 4,
        }, { selected: edgeIsSelected });
      }),
    [edges, ordering.sequenceByNodeId, selectedEdgeId]
  );

  const orderedNodes = useMemo(() => {
    const nodeById = new Map(nodes.map((node) => [node.id, node]));

    return ordering.orderedNodeIds
      .map((nodeId) => nodeById.get(nodeId))
      .filter((node): node is FlowNode => Boolean(node));
  }, [nodes, ordering.orderedNodeIds]);

  const effectiveSelectedNodeId =
    selectedNodeId && nodes.some((node) => node.id === selectedNodeId)
      ? selectedNodeId
      : null;

  const effectiveSelectedEdgeId =
    selectedEdgeId && edges.some((edge) => edge.id === selectedEdgeId)
      ? selectedEdgeId
      : null;

  const selectedNode =
    effectiveSelectedNodeId === null
      ? null
      : nodes.find((node) => node.id === effectiveSelectedNodeId) ?? null;

  const selectedEdge =
    effectiveSelectedEdgeId === null
      ? null
      : edges.find((edge) => edge.id === effectiveSelectedEdgeId) ?? null;

  const normalizedSelectedEdgeData =
    selectedEdge === null
      ? null
      : normalizeEdgeData(selectedEdge.data, getEdgeKind(selectedEdge));

  const updateSelectedEdgeData = useCallback(
    (updater: (currentData: FlowEdgeData, edge: FlowEdge) => FlowEdgeData) => {
      if (!selectedEdgeId) {
        return;
      }

      queueUndoSnapshot();

      setEdges((currentEdges) =>
        currentEdges.map((edge) => {
          if (edge.id !== selectedEdgeId) {
            return edge;
          }

          const currentData = normalizeEdgeData(edge.data, getEdgeKind(edge));

          return applyEdgeVisuals({
            ...edge,
            data: updater(currentData, edge),
          });
        })
      );
    },
    [queueUndoSnapshot, selectedEdgeId, setEdges]
  );

  const updateSelectedField = useCallback(
    <K extends EditableMicrocopyField>(
      field: K,
      value: PersistableMicrocopyNodeData[K]
    ) => {
      if (!effectiveSelectedNodeId) return;

      queueUndoSnapshot();

      setNodes((nds) =>
        nds.map((node) =>
          node.id === effectiveSelectedNodeId
            ? { ...node, data: { ...node.data, [field]: value } }
            : node
        )
      );
    },
    [effectiveSelectedNodeId, queueUndoSnapshot, setNodes]
  );

  const updateNodeTypeById = useCallback(
    (nodeId: string, nextType: NodeType) => {
      const targetNode = nodes.find((node) => node.id === nodeId);
      if (!targetNode || targetNode.data.node_type === nextType) {
        return;
      }

      queueUndoSnapshot();

      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          if (node.id !== nodeId) {
            return node;
          }

          if (nextType === "menu") {
            const normalizedMenuConfig = normalizeMenuNodeConfig(
              node.data.menu_config,
              node.data.primary_cta,
              Math.max(
                MENU_NODE_RIGHT_CONNECTIONS_MIN,
                node.data.menu_config.max_right_connections
              )
            );

            const nextMenuConfig: MenuNodeConfig = {
              ...normalizedMenuConfig,
              terms: normalizedMenuConfig.terms.map((menuTerm, termIndex) =>
                termIndex === 0
                  ? {
                      ...menuTerm,
                      term: node.data.primary_cta,
                    }
                  : menuTerm
              ),
            };

            return {
              ...node,
              data: {
                ...node.data,
                node_type: "menu",
                menu_config: nextMenuConfig,
                primary_cta: getPrimaryMenuTermValue(nextMenuConfig, node.data.primary_cta),
                secondary_cta: getSecondaryMenuTermValue(
                  nextMenuConfig,
                  node.data.secondary_cta
                ),
              },
            };
          }

          return {
            ...node,
            data: {
              ...node.data,
              node_type: "default",
              primary_cta: getPrimaryMenuTermValue(
                node.data.menu_config,
                node.data.primary_cta
              ),
              secondary_cta: getSecondaryMenuTermValue(
                node.data.menu_config,
                node.data.secondary_cta
              ),
            },
          };
        })
      );

      setEdges((currentEdges) =>
        nextType === "menu"
          ? assignSequentialEdgesToMenuHandles(
              currentEdges,
              nodeId,
              buildMenuSourceHandleIds(
                normalizeMenuNodeConfig(
                  targetNode.data.menu_config,
                  targetNode.data.primary_cta,
                  Math.max(
                    MENU_NODE_RIGHT_CONNECTIONS_MIN,
                    targetNode.data.menu_config.max_right_connections
                  )
                )
              )
            )
          : remapMenuSequentialEdgesToDefaultHandle(currentEdges, nodeId)
      );

      setOpenControlledLanguageFieldType(null);
      setOpenInspectorMenuGlossaryTermId(null);
    },
    [nodes, queueUndoSnapshot, setEdges, setNodes]
  );

  const updateSelectedNodeType = useCallback(
    (nextType: NodeType) => {
      if (!effectiveSelectedNodeId) {
        return;
      }

      updateNodeTypeById(effectiveSelectedNodeId, nextType);
    },
    [effectiveSelectedNodeId, updateNodeTypeById]
  );

  const updateMenuNodeConfigById = useCallback(
    (
      nodeId: string,
      updater: (currentConfig: MenuNodeConfig) => MenuNodeConfig
    ) => {
      const targetNode = nodes.find((node) => node.id === nodeId);
      if (!targetNode || targetNode.data.node_type !== "menu") {
        return;
      }

      const currentMenuConfig = normalizeMenuNodeConfig(
        targetNode.data.menu_config,
        targetNode.data.primary_cta,
        Math.max(
          MENU_NODE_RIGHT_CONNECTIONS_MIN,
          targetNode.data.menu_config.max_right_connections
        )
      );

      const requestedNextMenuConfig = updater(currentMenuConfig);
      const normalizedNextMenuConfig = normalizeMenuNodeConfig(
        requestedNextMenuConfig,
        targetNode.data.primary_cta,
        Math.max(
          MENU_NODE_RIGHT_CONNECTIONS_MIN,
          requestedNextMenuConfig.max_right_connections
        )
      );

      queueUndoSnapshot();

      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          if (node.id !== nodeId) {
            return node;
          }

          return {
            ...node,
            data: applyMenuConfigToNodeData(node.data, normalizedNextMenuConfig),
          };
        })
      );

      setEdges((currentEdges) =>
        syncSequentialEdgesForMenuNode(currentEdges, nodeId, normalizedNextMenuConfig)
      );

      setOpenInspectorMenuGlossaryTermId((current) =>
        current && normalizedNextMenuConfig.terms.some((term) => term.id === current)
          ? current
          : null
      );
    },
    [nodes, queueUndoSnapshot, setEdges, setNodes]
  );

  const selectedMenuNodeConfig = useMemo(() => {
    if (!selectedNode || selectedNode.data.node_type !== "menu") {
      return null;
    }

    return normalizeMenuNodeConfig(
      selectedNode.data.menu_config,
      selectedNode.data.primary_cta,
      Math.max(
        MENU_NODE_RIGHT_CONNECTIONS_MIN,
        selectedNode.data.menu_config.max_right_connections
      )
    );
  }, [selectedNode]);

  const visibleInspectorMenuGlossaryTermId =
    selectedMenuNodeConfig &&
    openInspectorMenuGlossaryTermId &&
    selectedMenuNodeConfig.terms.some(
      (term) => term.id === openInspectorMenuGlossaryTermId
    )
      ? openInspectorMenuGlossaryTermId
      : null;

  const updateSelectedMenuMaxRightConnections = useCallback(
    (nextValue: number) => {
      if (!effectiveSelectedNodeId || !selectedMenuNodeConfig) {
        return;
      }

      updateMenuNodeConfigById(effectiveSelectedNodeId, (currentConfig) => {
        const nextMax = clampMenuRightConnections(nextValue);
        const nextTerms = currentConfig.terms.slice(0, nextMax);

        while (nextTerms.length < nextMax) {
          nextTerms.push(createMenuNodeTerm(""));
        }

        return {
          max_right_connections: nextMax,
          terms: nextTerms,
        };
      });
    },
    [effectiveSelectedNodeId, selectedMenuNodeConfig, updateMenuNodeConfigById]
  );

  const updateSelectedMenuTermById = useCallback(
    (termId: string, term: string) => {
      if (!effectiveSelectedNodeId || !selectedMenuNodeConfig) {
        return;
      }

      updateMenuNodeConfigById(effectiveSelectedNodeId, (currentConfig) => ({
        ...currentConfig,
        terms: currentConfig.terms.map((menuTerm) =>
          menuTerm.id === termId
            ? {
                ...menuTerm,
                term,
              }
            : menuTerm
        ),
      }));
    },
    [effectiveSelectedNodeId, selectedMenuNodeConfig, updateMenuNodeConfigById]
  );

  const deleteSelectedMenuTermById = useCallback(
    (termId: string) => {
      if (!effectiveSelectedNodeId || !selectedMenuNodeConfig) {
        return;
      }

      const termToDelete = selectedMenuNodeConfig.terms.find(
        (term) => term.id === termId
      );
      if (!termToDelete) {
        return;
      }

      const confirmed = window.confirm(
        `Delete this menu term (${termToDelete.term || "Untitled"})? This will also remove any sequential edge attached to it.`
      );

      if (!confirmed) {
        return;
      }

      updateMenuNodeConfigById(effectiveSelectedNodeId, (currentConfig) => {
        const filteredTerms = currentConfig.terms.filter(
          (term) => term.id !== termId
        );
        const nextMax = clampMenuRightConnections(
          Math.max(filteredTerms.length, MENU_NODE_RIGHT_CONNECTIONS_MIN)
        );

        return {
          max_right_connections: nextMax,
          terms: filteredTerms,
        };
      });

      setOpenInspectorMenuGlossaryTermId((current) =>
        current === termId ? null : current
      );
    },
    [effectiveSelectedNodeId, selectedMenuNodeConfig, updateMenuNodeConfigById]
  );

  const toggleInspectorMenuTermGlossary = useCallback((termId: string) => {
    setOpenInspectorMenuGlossaryTermId((current) =>
      current === termId ? null : termId
    );
  }, []);

  const applyGlossaryTermToInspectorMenuTerm = useCallback(
    (termId: string, glossaryTerm: string) => {
      updateSelectedMenuTermById(termId, glossaryTerm);
      setOpenInspectorMenuGlossaryTermId(null);
    },
    [updateSelectedMenuTermById]
  );

  useEffect(() => {
    updateMenuNodeConfigByIdRef.current = updateMenuNodeConfigById;
  }, [updateMenuNodeConfigById]);

  const nodeTypes = useMemo(
    () => ({
      flowcopyNode: (props: NodeProps<FlowNode>) => (
        <FlowCopyNode
          {...props}
          onBeforeChange={() => captureUndoSnapshotRef.current()}
          menuTermGlossaryTerms={menuTermGlossaryTerms}
          showNodeId={showNodeIdsOnCanvas}
          onMenuNodeConfigChange={(nodeId, updater) =>
            updateMenuNodeConfigByIdRef.current(nodeId, updater)
          }
        />
      ),
    }),
    [menuTermGlossaryTerms, showNodeIdsOnCanvas]
  );

  const updatePendingOptionInput = useCallback(
    (field: GlobalOptionField, value: string) => {
      setPendingOptionInputs((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const addAdminOption = useCallback(
    (field: GlobalOptionField) => {
      const nextValue = pendingOptionInputs[field].trim();
      if (!nextValue) return;

      queueUndoSnapshot();

      setAdminOptions((prev) => {
        if (prev[field].includes(nextValue)) {
          return prev;
        }

        return {
          ...prev,
          [field]: [...prev[field], nextValue],
        };
      });

      setPendingOptionInputs((prev) => ({ ...prev, [field]: "" }));
    },
    [pendingOptionInputs, queueUndoSnapshot]
  );

  const removeAdminOption = useCallback(
    (field: GlobalOptionField, optionValue: string) => {
      queueUndoSnapshot();

      setAdminOptions((prev) => {
        const filtered = prev[field].filter((option) => option !== optionValue);

        if (filtered.length === 0) {
          return prev;
        }

        return {
          ...prev,
          [field]: filtered,
        };
      });
    },
    [queueUndoSnapshot]
  );

  const projectTableRows = useMemo(
    () =>
      orderedNodes.map((node) => ({
        node,
        sequenceIndex: ordering.sequenceByNodeId[node.id] ?? null,
        parallelGroupId: ordering.parallelGroupByNodeId[node.id] ?? null,
      })),
    [orderedNodes, ordering.parallelGroupByNodeId, ordering.sequenceByNodeId]
  );

  const controlledLanguageAuditRows = useMemo(
    () => buildControlledLanguageAuditRows(nodes, controlledLanguageGlossary),
    [nodes, controlledLanguageGlossary]
  );

  const controlledLanguageTermsByField = useMemo(
    () => buildControlledLanguageTermsByField(controlledLanguageGlossary),
    [controlledLanguageGlossary]
  );

  const updateControlledLanguageGlossaryEntries = useCallback(
    (
      updater: (
        current: ControlledLanguageGlossaryEntry[]
      ) => ControlledLanguageGlossaryEntry[]
    ) => {
      queueUndoSnapshot();
      setControlledLanguageGlossary((current) =>
        sanitizeControlledLanguageGlossary(
          updater(cloneControlledLanguageGlossary(current))
        )
      );
    },
    [queueUndoSnapshot]
  );

  const setControlledLanguageRowInclude = useCallback(
    (rowKey: string, include: boolean) => {
      const parsed = parseControlledLanguageGlossaryKey(rowKey);
      if (!parsed) {
        return;
      }

      updateControlledLanguageGlossaryEntries((current) => {
        const byKey = new Map<string, ControlledLanguageGlossaryEntry>(
          sanitizeControlledLanguageGlossary(current).map((entry) => [
            buildControlledLanguageGlossaryKey(entry.field_type, entry.term),
            entry,
          ])
        );

        byKey.set(rowKey, {
          field_type: parsed.field_type,
          term: parsed.term,
          include,
        });

        return Array.from(byKey.values());
      });
    },
    [updateControlledLanguageGlossaryEntries]
  );

  const renameControlledLanguageRowTerm = useCallback(
    (rowKey: string, nextTermRaw: string) => {
      const parsed = parseControlledLanguageGlossaryKey(rowKey);
      if (!parsed) {
        return;
      }

      const nextTerm = normalizeControlledLanguageTerm(nextTermRaw);
      if (!nextTerm || nextTerm === parsed.term) {
        return;
      }

      updateControlledLanguageGlossaryEntries((current) => {
        const byKey = new Map<string, ControlledLanguageGlossaryEntry>(
          sanitizeControlledLanguageGlossary(current).map((entry) => [
            buildControlledLanguageGlossaryKey(entry.field_type, entry.term),
            entry,
          ])
        );

        const existingRowEntry = byKey.get(rowKey);
        byKey.delete(rowKey);

        const nextKey = buildControlledLanguageGlossaryKey(parsed.field_type, nextTerm);
        const existingNextEntry = byKey.get(nextKey);

        byKey.set(nextKey, {
          field_type: parsed.field_type,
          term: nextTerm,
          include: existingRowEntry?.include ?? existingNextEntry?.include ?? false,
        });

        return Array.from(byKey.values());
      });
    },
    [updateControlledLanguageGlossaryEntries]
  );

  const addControlledLanguageDraftTerm = useCallback(() => {
    const nextTerm = normalizeControlledLanguageTerm(controlledLanguageDraftRow.term);
    if (!nextTerm) {
      return;
    }

    const nextFieldType = controlledLanguageDraftRow.field_type;
    const nextInclude = controlledLanguageDraftRow.include;

    updateControlledLanguageGlossaryEntries((current) => {
      const byKey = new Map<string, ControlledLanguageGlossaryEntry>(
        sanitizeControlledLanguageGlossary(current).map((entry) => [
          buildControlledLanguageGlossaryKey(entry.field_type, entry.term),
          entry,
        ])
      );

      const key = buildControlledLanguageGlossaryKey(nextFieldType, nextTerm);
      const existing = byKey.get(key);

      byKey.set(key, {
        field_type: nextFieldType,
        term: nextTerm,
        include: existing?.include ?? nextInclude,
      });

      return Array.from(byKey.values());
    });

    setControlledLanguageDraftRow(createEmptyControlledLanguageDraftRow());
  }, [controlledLanguageDraftRow, updateControlledLanguageGlossaryEntries]);

  const toggleControlledLanguageFieldDropdown = useCallback(
    (fieldType: NodeControlledLanguageFieldType) => {
      setOpenControlledLanguageFieldType((current) =>
        current === fieldType ? null : fieldType
      );
    },
    []
  );

  const applyControlledLanguageTermToField = useCallback(
    (fieldType: NodeControlledLanguageFieldType, term: string) => {
      const normalizedTerm = normalizeControlledLanguageTerm(term);
      if (!normalizedTerm) {
        return;
      }

      updateSelectedField(fieldType, normalizedTerm);
      setOpenControlledLanguageFieldType(null);
    },
    [updateSelectedField]
  );

  const handleEditorModeChange = useCallback(
    (editorMode: EditorSurfaceMode) => {
      updateStore((prev) => ({
        ...prev,
        session: {
          ...prev.session,
          editorMode,
        },
      }));
    },
    [updateStore]
  );

  const updateNodeFieldById = useCallback(
    (nodeId: string, field: EditableMicrocopyField, value: string) => {
      queueUndoSnapshot();

      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          if (node.id !== nodeId) {
            return node;
          }

          if (field === "node_shape") {
            return {
              ...node,
              data: {
                ...node.data,
                node_shape: isNodeShape(value) ? value : node.data.node_shape,
              },
            };
          }

          return {
            ...node,
            data: {
              ...node.data,
              [field]: value,
            },
          };
        })
      );
    },
    [queueUndoSnapshot, setNodes]
  );

  const getTableSelectOptions = useCallback(
    (field: EditableMicrocopyField, node: FlowNode): string[] => {
      switch (field) {
        case "tone":
          return buildSelectOptions(
            adminOptions.tone,
            node.data.tone,
            DEFAULT_GLOBAL_OPTIONS.tone
          );
        case "polarity":
          return buildSelectOptions(
            adminOptions.polarity,
            node.data.polarity,
            DEFAULT_GLOBAL_OPTIONS.polarity
          );
        case "reversibility":
          return buildSelectOptions(
            adminOptions.reversibility,
            node.data.reversibility,
            DEFAULT_GLOBAL_OPTIONS.reversibility
          );
        case "concept":
          return buildSelectOptions(
            adminOptions.concept,
            node.data.concept,
            DEFAULT_GLOBAL_OPTIONS.concept
          );
        case "action_type_name":
          return buildSelectOptions(
            adminOptions.action_type_name,
            node.data.action_type_name,
            DEFAULT_GLOBAL_OPTIONS.action_type_name
          );
        case "action_type_color":
          return buildSelectOptions(
            adminOptions.action_type_color,
            node.data.action_type_color,
            DEFAULT_GLOBAL_OPTIONS.action_type_color
          );
        case "card_style":
          return buildSelectOptions(
            adminOptions.card_style,
            node.data.card_style,
            DEFAULT_GLOBAL_OPTIONS.card_style
          );
        case "node_shape":
          return buildSelectOptions(
            NODE_SHAPE_OPTIONS,
            node.data.node_shape,
            NODE_SHAPE_OPTIONS
          );
        default:
          return [];
      }
    },
    [adminOptions]
  );

  const downloadTextFile = useCallback(
    (projectId: string, extension: "csv" | "xml", payload: string) => {
      const mimeType = extension === "csv" ? "text/csv;charset=utf-8" : "application/xml";
      const blob = new Blob([payload], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = buildDownloadFileName(projectId, extension);
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    },
    []
  );

  const exportProjectData = useCallback(
    (extension: "csv" | "xml") => {
      if (!activeAccount || !activeProject) {
        return;
      }

      const rows = createFlatExportRows({
        session: store.session,
        account: activeAccount,
        project: activeProject,
        projectSequenceId,
        nodes,
        ordering,
        adminOptions,
        controlledLanguageGlossary,
        edges,
      });

      const payload = extension === "csv" ? buildCsvFromRows(rows) : buildXmlFromRows(rows);
      downloadTextFile(activeProject.id, extension, payload);

      setTransferFeedback({
        type: "success",
        message: `Exported ${rows.length} row(s) to ${extension.toUpperCase()}.`,
      });
    },
    [
      activeAccount,
      activeProject,
      adminOptions,
      controlledLanguageGlossary,
      downloadTextFile,
      edges,
      nodes,
      ordering,
      projectSequenceId,
      store.session,
    ]
  );

  const triggerImportPicker = useCallback(() => {
    importFileInputRef.current?.click();
  }, []);

  const importProjectDataFromFile = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.currentTarget.value = "";

      if (!file || !activeAccount || !activeProject) {
        return;
      }

      try {
        const fileText = await file.text();
        const format = detectTabularFormat(file.name, fileText);

        if (!format) {
          setTransferFeedback({
            type: "error",
            message: "Unsupported file. Please import CSV or XML.",
          });
          return;
        }

        const parsed = format === "csv" ? parseCsvText(fileText) : parseXmlText(fileText);

        if (parsed.rows.length === 0) {
          setTransferFeedback({
            type: "info",
            message: "Import file has no data rows.",
          });
          return;
        }

        const normalizedRows = parsed.rows.map(normalizeFlatRowKeys);
        const projectRows = normalizedRows.filter(
          (row) => row.project_id?.trim() === activeProject.id
        );

        if (projectRows.length === 0) {
          setTransferFeedback({
            type: "error",
            message: `No rows matched active project ${activeProject.id}.`,
          });
          return;
        }

        const nodeRecords = projectRows.filter((row) => row.node_id?.trim().length > 0);

        const sortWeight = (row: Record<string, string>, fallbackIndex: number): number => {
          const orderValue = toNumeric(row.node_order_id ?? row.sequence_index);
          return orderValue ?? fallbackIndex + 1;
        };

        const sortedNodeRecords = nodeRecords
          .map((row, index) => ({ row, index }))
          .sort((a, b) => sortWeight(a.row, a.index) - sortWeight(b.row, b.index));

        const importedNodes: SerializableFlowNode[] = sortedNodeRecords.map(({ row }, index) => {
          const rowNodeId = (row.node_id ?? "").trim();
          const nodeId = rowNodeId.length > 0 ? rowNodeId : createNodeId();

          const x = toNumeric(row.position_x);
          const y = toNumeric(row.position_y);
          const importedNodeType = isNodeType(row.node_type) ? row.node_type : "default";
          const importedMenuConfigRaw = safeJsonParse(row.menu_config_json ?? "");

          return {
            id: nodeId,
            position: {
              x: x ?? 120 + index * 220,
              y: y ?? 120,
            },
            data: {
              title: row.title ?? "",
              body_text: row.body_text ?? "",
              primary_cta: row.primary_cta ?? "",
              secondary_cta: row.secondary_cta ?? "",
              helper_text: row.helper_text ?? "",
              error_text: row.error_text ?? "",
              tone: row.tone ?? "",
              polarity: row.polarity ?? "",
              reversibility: row.reversibility ?? "",
              concept: row.concept ?? "",
              notes: row.notes ?? "",
              action_type_name: row.action_type_name ?? "",
              action_type_color: row.action_type_color ?? "",
              card_style: row.card_style ?? "",
              node_shape: isNodeShape(row.node_shape) ? row.node_shape : "rectangle",
              node_type: importedNodeType,
              menu_config: normalizeMenuNodeConfig(
                importedMenuConfigRaw,
                row.primary_cta ?? ""
              ),
            },
          };
        });

        const firstRow = projectRows[0];
        const parsedEdgesRaw = safeJsonParse(firstRow.project_edges_json ?? "");
        const parsedAdminOptionsRaw = safeJsonParse(firstRow.project_admin_options_json ?? "");
        const parsedControlledLanguageRaw = safeJsonParse(
          firstRow.project_controlled_language_json ?? ""
        );

        const nextAdminOptions = syncAdminOptionsWithNodes(
          mergeAdminOptionConfigs(
            normalizeGlobalOptionConfig(parsedAdminOptionsRaw),
            cloneGlobalOptions(DEFAULT_GLOBAL_OPTIONS)
          ),
          sanitizePersistedNodes(importedNodes, normalizeGlobalOptionConfig(parsedAdminOptionsRaw))
        );

        const hydratedNodes = sanitizePersistedNodes(importedNodes, nextAdminOptions);
        const hydratedEdges = sanitizeEdges(sanitizeEdgesForStorage(parsedEdgesRaw), hydratedNodes);

        queueUndoSnapshot();
        setAdminOptions(nextAdminOptions);
        setControlledLanguageGlossary(
          sanitizeControlledLanguageGlossary(parsedControlledLanguageRaw)
        );
        setNodes(hydratedNodes);
        setEdges(hydratedEdges);
        setSelectedNodeId(hydratedNodes[0]?.id ?? null);
        setSelectedEdgeId(null);

        setTransferFeedback({
          type: "success",
          message: `Imported ${hydratedNodes.length} node(s) from ${format.toUpperCase()}.`,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to import file.";
        setTransferFeedback({
          type: "error",
          message,
        });
      }
    },
    [
      activeAccount,
      activeProject,
      queueUndoSnapshot,
      setEdges,
      setNodes,
      setSelectedEdgeId,
      setSelectedNodeId,
    ]
  );

  const stopSidePanelResize = useCallback(() => {
    setIsResizingSidePanel(false);
  }, []);

  const handleSidePanelPointerMove = useCallback((event: PointerEvent) => {
    const deltaX = sidePanelResizeStartXRef.current - event.clientX;
    const nextWidth = clampSidePanelWidth(sidePanelResizeStartWidthRef.current + deltaX);
    setSidePanelWidth(nextWidth);
  }, []);

  const handleSidePanelResizePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();
      sidePanelResizeStartXRef.current = event.clientX;
      sidePanelResizeStartWidthRef.current = sidePanelWidth;
      setIsResizingSidePanel(true);
    },
    [sidePanelWidth]
  );

  useEffect(() => {
    if (!isResizingSidePanel) {
      return;
    }

    const handlePointerUp = () => {
      stopSidePanelResize();
    };

    window.addEventListener("pointermove", handleSidePanelPointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handleSidePanelPointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [handleSidePanelPointerMove, isResizingSidePanel, stopSidePanelResize]);

  if (store.session.view === "account") {
    return (
      <main
        style={{
          width: "100vw",
          height: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f8fafc",
          padding: 16,
        }}
      >
        <section
          style={{
            width: "min(420px, 100%)",
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: 16,
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
          }}
        >
          <h1 style={{ marginTop: 0, marginBottom: 8 }}>FlowCopy Account</h1>
          <p style={{ marginTop: 0, fontSize: 13, color: "#475569" }}>
            Enter your 3-digit code to continue. For now, use <strong>000</strong>.
          </p>

          <label>
            <div style={{ fontSize: 12, marginBottom: 6 }}>Account code</div>
            <input
              style={{ ...inputStyle, fontSize: 16, letterSpacing: 3, textAlign: "center" }}
              maxLength={3}
              value={accountCodeInput}
              onChange={(event) =>
                setAccountCodeInput(event.target.value.replace(/\D/g, "").slice(0, 3))
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleAccountEntry();
                }
              }}
            />
          </label>

          {accountError && (
            <div
              style={{
                marginTop: 10,
                fontSize: 12,
                color: "#b91c1c",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 6,
                padding: "6px 8px",
              }}
            >
              {accountError}
            </div>
          )}

          <button
            type="button"
            onClick={handleAccountEntry}
            style={{
              ...buttonStyle,
              marginTop: 12,
              width: "100%",
              fontWeight: 600,
            }}
          >
            Enter Account
          </button>
        </section>
      </main>
    );
  }

  if (store.session.view === "dashboard") {
    const projects = (activeAccount?.projects ?? [])
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    const dashboardBlockStyle: React.CSSProperties = {
      background: "#fff",
      border: "2px solid #cbd5e1",
      borderRadius: 12,
      boxShadow: "0 8px 20px rgba(15, 23, 42, 0.05)",
    };

    const dashboardButtonStyle: React.CSSProperties = {
      ...buttonStyle,
      border: "1px solid #64748b",
      borderRadius: 8,
      padding: "8px 12px",
      fontSize: 13,
      fontWeight: 700,
      color: "#0f172a",
      background: "#f8fafc",
    };

    const dashboardPrimaryButtonStyle: React.CSSProperties = {
      ...dashboardButtonStyle,
      borderColor: "#1d4ed8",
      color: "#fff",
      background: "#1d4ed8",
      boxShadow: "0 4px 12px rgba(29, 78, 216, 0.28)",
    };

    return (
      <main
        style={{
          width: "100vw",
          minHeight: "100vh",
          background: "#f8fafc",
          padding: "0 16px 22px",
          display: "grid",
          justifyItems: "center",
        }}
      >
        <div
          style={{
            width: "min(1080px, 100%)",
            display: "grid",
            gap: 6,
          }}
        >
          <div
            style={{
              minHeight: 124,
              display: "grid",
              placeItems: "center",
            }}
          >
            <h1
              style={{
                margin: 0,
                textAlign: "center",
                fontSize: 54,
                lineHeight: 1.05,
                fontWeight: 900,
                color: "#0f172a",
              }}
            >
              Project Dashboard
            </h1>
          </div>

          <section
            style={{
              ...dashboardBlockStyle,
              padding: "14px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ display: "grid", gap: 4 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 0.4,
                  textTransform: "uppercase",
                  color: "#64748b",
                }}
              >
                User Account Code
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>
                {activeAccount?.code ?? SINGLE_ACCOUNT_CODE}
              </div>
            </div>

            <button type="button" style={dashboardButtonStyle} onClick={handleSignOut}>
              Back to Account Code
            </button>
          </section>

          <section
            style={{
              ...dashboardBlockStyle,
              padding: "14px 16px",
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 10,
              alignItems: "center",
            }}
          >
            <label style={{ display: "grid", gap: 4 }}>
              <div style={{ fontSize: 12, color: "#334155", fontWeight: 600 }}>
                New project name
              </div>
              <input
                style={inputStyle}
                placeholder="e.g. Checkout Microcopy"
                value={newProjectName}
                onChange={(event) => setNewProjectName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    createProjectFromDashboard();
                  }
                }}
              />
            </label>
            <button
              type="button"
              style={dashboardPrimaryButtonStyle}
              onClick={createProjectFromDashboard}
            >
              Create Project
            </button>
          </section>

          <section style={{ display: "grid", gap: 3 }}>
            <div style={{ display: "grid", justifyItems: "center", gap: 2 }}>
              <h2 style={{ margin: 0, fontSize: 51, fontWeight: 900, color: "#1e293b" }}>
                Projects
              </h2>
              <p style={{ margin: 0, fontSize: 17, color: "#475569", textAlign: "center" }}>
                Click on a project to enter.
              </p>
            </div>

            {projects.length === 0 ? (
              <div
                style={{
                  ...dashboardBlockStyle,
                  borderStyle: "dashed",
                  borderColor: "#94a3b8",
                  padding: "14px 16px",
                  textAlign: "center",
                  color: "#475569",
                  fontSize: 13,
                }}
              >
                No projects yet. Create your first project above.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 10,
                }}
              >
                {projects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => openProject(project.id)}
                    style={{
                      textAlign: "left",
                      border: "2px solid #bfdbfe",
                      borderRadius: 12,
                      padding: "9px 10px",
                      background: "#fff",
                      cursor: "pointer",
                      display: "grid",
                      gap: 3,
                      boxShadow: "0 3px 10px rgba(37, 99, 235, 0.1)",
                      lineHeight: 1.25,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#1e293b",
                        lineHeight: 1.2,
                      }}
                    >
                      {project.name}
                    </div>
                    <div style={{ fontSize: 11, color: "#475569" }}>
                      Nodes: {project.canvas.nodes.length}
                    </div>
                    <div style={{ fontSize: 11, color: "#475569" }}>Project ID: {project.id}</div>
                    <div style={{ fontSize: 10, color: "#94a3b8" }}>
                      Updated: {formatDateTime(project.updatedAt)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    );
  }

  if (!activeAccount || !activeProject) {
    return (
      <main
        style={{
          width: "100vw",
          height: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 16,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p>Project not found. Returning to dashboard…</p>
          <button type="button" style={buttonStyle} onClick={handleBackToDashboard}>
            Back to Dashboard
          </button>
        </div>
      </main>
    );
  }

  if (store.session.editorMode === "table") {
    return (
      <main
        style={{
          width: "100vw",
          height: "100vh",
          display: "grid",
          gridTemplateRows: "auto 1fr",
          background: "#f8fafc",
        }}
      >
        <header
          style={{
            borderBottom: "1px solid #d4d4d8",
            background: "#fff",
            padding: 12,
            display: "grid",
            gap: 8,
          }}
        >
          <div style={{ fontSize: 12, color: "#334155" }}>
            <strong>Project:</strong> {activeProject.name} ({activeProject.id})
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" style={buttonStyle} onClick={handleBackToDashboard}>
              ← Back to Dashboard (saves)
            </button>
            <button
              type="button"
              style={{ ...buttonStyle, background: "#dbeafe", borderColor: "#93c5fd" }}
              onClick={() => handleEditorModeChange("canvas")}
            >
              Canvas View
            </button>
            <button
              type="button"
              style={{ ...buttonStyle, background: "#eff6ff", borderColor: "#93c5fd" }}
              onClick={() => handleEditorModeChange("table")}
            >
              Table View
            </button>
            <button type="button" style={buttonStyle} onClick={() => exportProjectData("csv")}>
              Export CSV
            </button>
            <button type="button" style={buttonStyle} onClick={() => exportProjectData("xml")}>
              Export XML
            </button>
            <button type="button" style={buttonStyle} onClick={triggerImportPicker}>
              Import CSV/XML
            </button>
            <input
              ref={importFileInputRef}
              type="file"
              accept=".csv,.xml,text/csv,application/xml,text/xml"
              style={{ display: "none" }}
              onChange={importProjectDataFromFile}
            />
          </div>

          {transferFeedback && (
            <div
              style={{
                fontSize: 12,
                borderRadius: 6,
                padding: "6px 8px",
                border:
                  transferFeedback.type === "error"
                    ? "1px solid #fecaca"
                    : transferFeedback.type === "success"
                      ? "1px solid #bbf7d0"
                      : "1px solid #bfdbfe",
                background:
                  transferFeedback.type === "error"
                    ? "#fef2f2"
                    : transferFeedback.type === "success"
                      ? "#f0fdf4"
                      : "#eff6ff",
                color:
                  transferFeedback.type === "error"
                    ? "#991b1b"
                    : transferFeedback.type === "success"
                      ? "#14532d"
                      : "#1e3a8a",
              }}
            >
              {transferFeedback.message}
            </div>
          )}
        </header>

        <div style={{ overflow: "auto", padding: 12 }}>
          <table
            style={{
              borderCollapse: "collapse",
              width: "max-content",
              minWidth: "100%",
              background: "#fff",
              border: "1px solid #d4d4d8",
            }}
          >
            <thead>
              <tr>
                <th style={{ border: "1px solid #e4e4e7", padding: 8, fontSize: 12 }}>node_id</th>
                <th style={{ border: "1px solid #e4e4e7", padding: 8, fontSize: 12 }}>
                  sequence_index
                </th>
                <th style={{ border: "1px solid #e4e4e7", padding: 8, fontSize: 12 }}>
                  parallel_group_id
                </th>
                <th style={{ border: "1px solid #e4e4e7", padding: 8, fontSize: 12 }}>position_x</th>
                <th style={{ border: "1px solid #e4e4e7", padding: 8, fontSize: 12 }}>position_y</th>
                {TABLE_EDITABLE_FIELDS.map((field) => (
                  <th
                    key={`table-head:${field}`}
                    style={{ border: "1px solid #e4e4e7", padding: 8, fontSize: 12 }}
                  >
                    {TABLE_FIELD_LABELS[field]}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {projectTableRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5 + TABLE_EDITABLE_FIELDS.length}
                    style={{ border: "1px solid #e4e4e7", padding: 12, fontSize: 12 }}
                  >
                    No nodes in this project yet. Switch to Canvas View to add nodes.
                  </td>
                </tr>
              ) : (
                projectTableRows.map(({ node, sequenceIndex, parallelGroupId }) => (
                  <tr key={`table-row:${node.id}`}>
                    <td style={{ border: "1px solid #e4e4e7", padding: 8, fontSize: 12 }}>
                      <code>{node.id}</code>
                    </td>
                    <td style={{ border: "1px solid #e4e4e7", padding: 8, fontSize: 12 }}>
                      {sequenceIndex ?? ""}
                    </td>
                    <td style={{ border: "1px solid #e4e4e7", padding: 8, fontSize: 12 }}>
                      {parallelGroupId ?? ""}
                    </td>
                    <td style={{ border: "1px solid #e4e4e7", padding: 8, fontSize: 12 }}>
                      {Math.round(node.position.x)}
                    </td>
                    <td style={{ border: "1px solid #e4e4e7", padding: 8, fontSize: 12 }}>
                      {Math.round(node.position.y)}
                    </td>

                    {TABLE_EDITABLE_FIELDS.map((field) => {
                      const baseCellStyle: React.CSSProperties = {
                        border: "1px solid #e4e4e7",
                        padding: 6,
                        minWidth: TABLE_TEXTAREA_FIELDS.has(field) ? 240 : 170,
                        verticalAlign: "top",
                      };

                      if (TABLE_SELECT_FIELDS.has(field)) {
                        return (
                          <td key={`cell:${node.id}:${field}`} style={baseCellStyle}>
                            <select
                              style={inputStyle}
                              value={String(node.data[field] ?? "")}
                              onChange={(event) =>
                                updateNodeFieldById(node.id, field, event.target.value)
                              }
                            >
                              {getTableSelectOptions(field, node).map((option) => (
                                <option key={`${node.id}:${field}:${option}`} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </td>
                        );
                      }

                      if (TABLE_TEXTAREA_FIELDS.has(field)) {
                        return (
                          <td key={`cell:${node.id}:${field}`} style={baseCellStyle}>
                            <textarea
                              style={{ ...inputStyle, minHeight: 70, resize: "vertical" }}
                              value={String(node.data[field] ?? "")}
                              onChange={(event) =>
                                updateNodeFieldById(node.id, field, event.target.value)
                              }
                            />
                          </td>
                        );
                      }

                      return (
                        <td key={`cell:${node.id}:${field}`} style={baseCellStyle}>
                          <input
                            style={inputStyle}
                            value={String(node.data[field] ?? "")}
                            onChange={(event) =>
                              updateNodeFieldById(node.id, field, event.target.value)
                            }
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    );
  }

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "grid",
        gridTemplateColumns: `1fr ${sidePanelWidth}px`,
      }}
    >
      <div style={{ borderRight: "1px solid #e4e4e7" }}>
        <ReactFlow<FlowNode, FlowEdge>
          nodes={nodesWithSequence}
          edges={displayEdges}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
          colorMode="light"
          onInit={onInit}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onReconnect={onReconnect}
          onPaneClick={onPaneClick}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onSelectionChange={onSelectionChange}
          zoomOnDoubleClick={false}
          fitView
          connectionLineStyle={EDGE_BASE_STYLE}
        >
          <Background />
          <MiniMap />
          <Controls />
        </ReactFlow>
      </div>

      <aside
        style={{
          position: "relative",
          padding: 12,
          overflowY: "auto",
          display: "grid",
          gap: 10,
        }}
      >
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize side panel"
          title="Drag to resize panel"
          onPointerDown={handleSidePanelResizePointerDown}
          style={{
            position: "absolute",
            top: 0,
            left: -4,
            width: 8,
            height: "100%",
            cursor: "col-resize",
            zIndex: 20,
            background: isResizingSidePanel ? "#bfdbfe" : "transparent",
          }}
        />
        <section
          style={{
            border: "1px solid #d4d4d8",
            borderRadius: 8,
            padding: 10,
            display: "grid",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" style={buttonStyle} onClick={handleBackToDashboard}>
              ← Back to Dashboard (saves)
            </button>
            <button
              type="button"
              style={{ ...buttonStyle, background: "#eff6ff", borderColor: "#93c5fd" }}
              onClick={() => handleEditorModeChange("canvas")}
            >
              Canvas View
            </button>
            <button
              type="button"
              style={{ ...buttonStyle, background: "#dbeafe", borderColor: "#93c5fd" }}
              onClick={() => handleEditorModeChange("table")}
            >
              Table View
            </button>
            <button type="button" style={buttonStyle} onClick={() => exportProjectData("csv")}>
              Export CSV
            </button>
            <button type="button" style={buttonStyle} onClick={() => exportProjectData("xml")}>
              Export XML
            </button>
            <button type="button" style={buttonStyle} onClick={triggerImportPicker}>
              Import CSV/XML
            </button>
            <button
              type="button"
              style={{
                ...buttonStyle,
                opacity: undoStack.length === 0 ? 0.5 : 1,
                cursor: undoStack.length === 0 ? "not-allowed" : "pointer",
              }}
              onClick={handleUndo}
              disabled={undoStack.length === 0}
            >
              Undo ({undoStack.length}/3)
            </button>
            <input
              ref={importFileInputRef}
              type="file"
              accept=".csv,.xml,text/csv,application/xml,text/xml"
              style={{ display: "none" }}
              onChange={importProjectDataFromFile}
            />
          </div>

          {transferFeedback && (
            <div
              style={{
                fontSize: 12,
                borderRadius: 6,
                padding: "6px 8px",
                border:
                  transferFeedback.type === "error"
                    ? "1px solid #fecaca"
                    : transferFeedback.type === "success"
                      ? "1px solid #bbf7d0"
                      : "1px solid #bfdbfe",
                background:
                  transferFeedback.type === "error"
                    ? "#fef2f2"
                    : transferFeedback.type === "success"
                      ? "#f0fdf4"
                      : "#eff6ff",
                color:
                  transferFeedback.type === "error"
                    ? "#991b1b"
                    : transferFeedback.type === "success"
                      ? "#14532d"
                      : "#1e3a8a",
              }}
            >
              {transferFeedback.message}
            </div>
          )}

          <div style={{ fontSize: 12, color: "#334155" }}>
            <strong>Project Name:</strong> {activeProject.name}
            <br />
            <strong>Project ID:</strong> {activeProject.id}
            <br />
            <strong>Last Saved:</strong> {formatDateTime(activeProject.updatedAt)}
          </div>
        </section>

        <section
          style={{
            border: "1px solid #dbeafe",
            borderRadius: 8,
            background: "#f8fbff",
            padding: 10,
          }}
        >
          <div style={{ fontSize: 12, color: "#1e3a8a", fontWeight: 700 }}>
            Project Sequence ID
          </div>
          <code
            style={{
              display: "block",
              marginTop: 6,
              fontSize: 12,
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: 6,
              padding: "6px 8px",
              color: "#1e3a8a",
              wordBreak: "break-all",
            }}
          >
            {projectSequenceId}
          </code>

          <div style={{ fontSize: 11, color: "#334155", marginTop: 8 }}>
            Order rule: topological flow, tie-break left → right by x-position.
          </div>

          {ordering.hasCycle && (
            <div
              style={{
                marginTop: 8,
                fontSize: 11,
                color: "#92400e",
                background: "#fff7ed",
                border: "1px solid #fed7aa",
                borderRadius: 6,
                padding: "6px 8px",
              }}
            >
              Cycle detected. Remaining nodes are appended by left-to-right fallback.
            </div>
          )}

          <ol style={{ marginTop: 10, marginBottom: 0, paddingLeft: 18, fontSize: 12 }}>
            {orderedNodes.map((node) => (
              <li key={`order:${node.id}`} style={{ marginBottom: 4 }}>
                <strong>#{ordering.sequenceByNodeId[node.id]}</strong>{" "}
                {node.data.title || "Untitled"}
                <div style={{ color: "#64748b", fontSize: 11 }}>id: {node.id}</div>
              </li>
            ))}
          </ol>
        </section>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2 style={{ margin: 0 }}>Node Data Panel</h2>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              style={{
                ...buttonStyle,
                background: isControlledLanguagePanelOpen ? "#dbeafe" : "#fff",
                borderColor: isControlledLanguagePanelOpen ? "#93c5fd" : "#d4d4d8",
              }}
              onClick={() =>
                setIsControlledLanguagePanelOpen((open) => !open)
              }
            >
              {isControlledLanguagePanelOpen ? "Hide" : "Show"} Controlled Language
            </button>
            <button
              type="button"
              style={buttonStyle}
              onClick={() => setIsAdminPanelOpen((open) => !open)}
            >
              {isAdminPanelOpen ? "Hide" : "Show"} Admin
            </button>
          </div>
        </div>

        <p style={{ marginTop: 0, marginBottom: 0, fontSize: 12, color: "#52525b" }}>
          Click a node to edit structured fields. Double-click empty canvas to add a
          node. All changes autosave. Use each field’s “Glossary” button to open a
          term picker.
        </p>

        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            color: "#334155",
          }}
        >
          <input
            type="checkbox"
            checked={showNodeIdsOnCanvas}
            onChange={(event) => setShowNodeIdsOnCanvas(event.target.checked)}
          />
          Show node IDs on nodes
        </label>

        {selectedNode?.data.node_type === "menu" && (
          <p style={{ marginTop: 0, marginBottom: 0, fontSize: 12, color: "#1e3a8a" }}>
            Menu node mode: edit Right side connections and menu Handle terms below. These
            terms use the Menu Term glossary.
          </p>
        )}

        {isControlledLanguagePanelOpen && (
          <section
            style={{
              border: "1px solid #bfdbfe",
              borderRadius: 8,
              padding: 10,
              display: "grid",
              gap: 8,
              background: "#f8fbff",
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
              <h3 style={{ margin: 0, fontSize: 14, color: "#1e3a8a" }}>
                Controlled Language
              </h3>
              <span style={{ fontSize: 11, color: "#1e3a8a", fontWeight: 700 }}>
                {controlledLanguageAuditRows.length} term row(s)
              </span>
            </div>

            <p style={{ margin: 0, fontSize: 11, color: "#475569" }}>
              Audit terms by field type. Mark <strong>Include</strong> to expose a
              term in glossary dropdowns beside editable text fields.
            </p>

            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  borderCollapse: "collapse",
                  width: "100%",
                  minWidth: 560,
                  border: "1px solid #dbeafe",
                  background: "#fff",
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        border: "1px solid #dbeafe",
                        padding: 6,
                        fontSize: 11,
                        textAlign: "left",
                        background: "#eff6ff",
                      }}
                    >
                      Field Type
                    </th>
                    <th
                      style={{
                        border: "1px solid #dbeafe",
                        padding: 6,
                        fontSize: 11,
                        textAlign: "left",
                        background: "#eff6ff",
                      }}
                    >
                      Glossary Term
                    </th>
                    <th
                      style={{
                        border: "1px solid #dbeafe",
                        padding: 6,
                        fontSize: 11,
                        textAlign: "left",
                        background: "#eff6ff",
                        width: 110,
                      }}
                    >
                      Occurrences
                    </th>
                    <th
                      style={{
                        border: "1px solid #dbeafe",
                        padding: 6,
                        fontSize: 11,
                        textAlign: "center",
                        background: "#eff6ff",
                        width: 110,
                      }}
                    >
                      Include
                    </th>
                  </tr>
                </thead>

                <tbody>
                  <tr style={{ background: "#f8fafc" }}>
                    <td style={{ border: "1px solid #dbeafe", padding: 6 }}>
                      <select
                        style={{ ...inputStyle, fontSize: 11 }}
                        value={controlledLanguageDraftRow.field_type}
                        onChange={(event) => {
                          const nextFieldType = event.target.value;
                          if (!isControlledLanguageFieldType(nextFieldType)) {
                            return;
                          }

                          setControlledLanguageDraftRow((current) => ({
                            ...current,
                            field_type: nextFieldType,
                          }));
                        }}
                      >
                        {CONTROLLED_LANGUAGE_FIELDS.map((fieldTypeOption) => (
                          <option
                            key={`controlled-language-draft-field-option:${fieldTypeOption}`}
                            value={fieldTypeOption}
                          >
                            {CONTROLLED_LANGUAGE_FIELD_LABELS[fieldTypeOption]}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td style={{ border: "1px solid #dbeafe", padding: 6 }}>
                      <input
                        style={{ ...inputStyle, fontSize: 11 }}
                        placeholder="Add glossary term"
                        value={controlledLanguageDraftRow.term}
                        onChange={(event) =>
                          setControlledLanguageDraftRow((current) => ({
                            ...current,
                            term: event.target.value,
                          }))
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            addControlledLanguageDraftTerm();
                          }
                        }}
                      />
                    </td>

                    <td
                      style={{
                        border: "1px solid #dbeafe",
                        padding: 6,
                        fontSize: 11,
                        color: "#64748b",
                      }}
                    >
                      <strong style={{ color: "#0f172a" }}>0</strong>
                      <div style={{ marginTop: 2 }}>Not Used</div>
                    </td>

                    <td
                      style={{
                        border: "1px solid #dbeafe",
                        padding: 6,
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={controlledLanguageDraftRow.include}
                          onChange={(event) =>
                            setControlledLanguageDraftRow((current) => ({
                              ...current,
                              include: event.target.checked,
                            }))
                          }
                        />
                        <button
                          type="button"
                          style={{ ...buttonStyle, fontSize: 11, padding: "4px 8px" }}
                          onClick={addControlledLanguageDraftTerm}
                        >
                          Add
                        </button>
                      </div>
                    </td>
                  </tr>

                  {controlledLanguageAuditRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        style={{
                          border: "1px solid #dbeafe",
                          padding: 8,
                          fontSize: 11,
                          color: "#64748b",
                        }}
                      >
                        No terms found in Primary CTA / Secondary CTA / Helper Text /
                        Error Text / Menu Term yet.
                      </td>
                    </tr>
                  ) : (
                    controlledLanguageAuditRows.map((row) => {
                      const rowKey = buildControlledLanguageGlossaryKey(
                        row.field_type,
                        row.term
                      );

                      return (
                        <tr key={`controlled-language-row:${rowKey}`}>
                          <td style={{ border: "1px solid #e2e8f0", padding: 6 }}>
                            <input
                              style={{
                                ...inputStyle,
                                fontSize: 11,
                                background: "#f8fafc",
                                color: "#334155",
                                cursor: "not-allowed",
                              }}
                              value={CONTROLLED_LANGUAGE_FIELD_LABELS[row.field_type]}
                              readOnly
                              aria-label="Field Type"
                            >
                            </input>
                          </td>

                          <td style={{ border: "1px solid #e2e8f0", padding: 6 }}>
                            <input
                              style={{ ...inputStyle, fontSize: 11 }}
                              defaultValue={row.term}
                              onBlur={(event) =>
                                renameControlledLanguageRowTerm(
                                  rowKey,
                                  event.target.value
                                )
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  event.currentTarget.blur();
                                }
                              }}
                            />
                          </td>

                          <td
                            style={{
                              border: "1px solid #e2e8f0",
                              padding: 6,
                              fontSize: 11,
                              color: "#0f172a",
                            }}
                          >
                            <strong>{row.occurrences}</strong>
                            {row.occurrences === 0 && (
                              <div style={{ marginTop: 2, color: "#64748b" }}>
                                Not Used
                              </div>
                            )}
                          </td>

                          <td
                            style={{
                              border: "1px solid #e2e8f0",
                              padding: 6,
                              textAlign: "center",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={row.include}
                              onChange={(event) =>
                                setControlledLanguageRowInclude(
                                  rowKey,
                                  event.target.checked
                                )
                              }
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {isAdminPanelOpen && (
          <section
            style={{
              border: "1px solid #d4d4d8",
              borderRadius: 8,
              padding: 10,
              display: "grid",
              gap: 10,
            }}
          >
            <h3 style={{ margin: 0, fontSize: 14 }}>Global Attribute Admin</h3>

            {GLOBAL_OPTION_FIELDS.map((field) => (
              <div
                key={field}
                style={{
                  borderTop: "1px solid #f1f5f9",
                  paddingTop: 10,
                  display: "grid",
                  gap: 6,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600 }}>
                  {GLOBAL_OPTION_LABELS[field]}
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {adminOptions[field].map((option) => (
                    <span
                      key={`${field}:${option}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 11,
                        border: "1px solid #d4d4d8",
                        borderRadius: 999,
                        padding: "3px 8px",
                        background: "#fff",
                      }}
                    >
                      {field === "action_type_color" && (
                        <span
                          aria-hidden
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 999,
                            background: option,
                            border: "1px solid #a1a1aa",
                          }}
                        />
                      )}
                      {option}
                      <button
                        type="button"
                        onClick={() => removeAdminOption(field, option)}
                        style={{
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          fontSize: 11,
                          color: "#71717a",
                          padding: 0,
                        }}
                        title="Remove option"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6 }}>
                  <input
                    style={inputStyle}
                    placeholder={`Add ${GLOBAL_OPTION_LABELS[field]} option`}
                    value={pendingOptionInputs[field]}
                    onChange={(event) =>
                      updatePendingOptionInput(field, event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addAdminOption(field);
                      }
                    }}
                  />
                  <button
                    type="button"
                    style={buttonStyle}
                    onClick={() => addAdminOption(field)}
                  >
                    Add
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}

        {selectedEdge && normalizedSelectedEdgeData ? (
          <section
            style={{
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              padding: 10,
              display: "grid",
              gap: 8,
              background: "#f8fafc",
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
              <h3 style={{ margin: 0, fontSize: 14 }}>Edge Inspector</h3>
              <button type="button" style={buttonStyle} onClick={handleDeleteSelection}>
                Delete Edge
              </button>
            </div>

            <div style={{ fontSize: 12, color: "#334155" }}>
              <strong>edge_id:</strong> {selectedEdge.id}
              <br />
              <strong>source → target:</strong> {selectedEdge.source} → {selectedEdge.target}
            </div>

            <label>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Kind</div>
              <input
                style={inputStyle}
                value={normalizedSelectedEdgeData.edge_kind}
                readOnly
              />
            </label>

            <label>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Color</div>
              <input
                style={inputStyle}
                type="color"
                value={normalizedSelectedEdgeData.stroke_color ?? "#1d4ed8"}
                onChange={(event) => {
                  const nextColor = event.target.value;
                  updateSelectedEdgeData((currentData) => ({
                    ...currentData,
                    stroke_color: nextColor,
                  }));
                }}
              />
            </label>

            <label>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Line Style</div>
              <select
                style={inputStyle}
                value={normalizedSelectedEdgeData.line_style ?? "solid"}
                onChange={(event) => {
                  const nextStyle =
                    (event.target.value as EdgeLineStyle) ?? "solid";
                  updateSelectedEdgeData((currentData) => ({
                    ...currentData,
                    line_style: nextStyle,
                  }));
                }}
              >
                {EDGE_LINE_STYLE_OPTIONS.map((option) => (
                  <option key={`edge-line-style:${option}`} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            {normalizedSelectedEdgeData.edge_kind === "sequential" && (
              <label>
                <div style={{ fontSize: 12, marginBottom: 4 }}>Direction</div>
                <select
                  style={inputStyle}
                  value={
                    normalizedSelectedEdgeData.is_reversed ? "reversed" : "forward"
                  }
                  onChange={(event) => {
                    const nextDirection =
                      (event.target.value as EdgeDirection) ?? "forward";
                    updateSelectedEdgeData((currentData) => ({
                      ...currentData,
                      is_reversed: nextDirection === "reversed",
                    }));
                  }}
                >
                  <option value="forward">forward</option>
                  <option value="reversed">reversed</option>
                </select>
              </label>
            )}

            <p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>
              Tip: press Delete / Backspace to remove this edge.
            </p>
          </section>
        ) : !selectedNode ? (
          <p style={{ fontSize: 13, color: "#71717a" }}>
            No selection. Click a node or edge on the canvas.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: 12, color: "#52525b" }}>
              <strong>node_id:</strong> {selectedNode.id}
              <br />
              <strong>sequence:</strong> {ordering.sequenceByNodeId[selectedNode.id] ?? "-"}
              <br />
              <strong>x_position:</strong> {Math.round(selectedNode.position.x)}
              <br />
              <strong>y_position:</strong> {Math.round(selectedNode.position.y)}
            </div>

            <label>
              <div style={{ fontSize: 12, marginBottom: 4 }}>node_type</div>
              <select
                style={inputStyle}
                value={selectedNode.data.node_type}
                onChange={(event) => {
                  const nextType = event.target.value;
                  if (!isNodeType(nextType)) {
                    return;
                  }

                  updateSelectedNodeType(nextType);
                }}
              >
                {NODE_TYPE_OPTIONS.map((nodeTypeOption) => (
                  <option key={`inspector-node-type:${nodeTypeOption}`} value={nodeTypeOption}>
                    {nodeTypeOption}
                  </option>
                ))}
              </select>
            </label>

            {selectedNode.data.node_type === "menu" ? (
              <>
                <label>
                  <div style={{ fontSize: 12, marginBottom: 4 }}>title</div>
                  <input
                    style={inputStyle}
                    value={selectedNode.data.title}
                    onChange={(event) => updateSelectedField("title", event.target.value)}
                  />
                </label>

                <label>
                  <div style={{ fontSize: 12, marginBottom: 4 }}>Right side connections</div>
                  <input
                    style={inputStyle}
                    type="number"
                    min={MENU_NODE_RIGHT_CONNECTIONS_MIN}
                    max={MENU_NODE_RIGHT_CONNECTIONS_MAX}
                    value={selectedMenuNodeConfig?.max_right_connections ?? MENU_NODE_RIGHT_CONNECTIONS_MIN}
                    onChange={(event) =>
                      updateSelectedMenuMaxRightConnections(Number(event.target.value))
                    }
                  />
                </label>

                <div
                  style={{
                    border: "1px solid #dbeafe",
                    borderRadius: 8,
                    padding: 8,
                    background: "#f8fbff",
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8" }}>
                    Menu Terms
                  </div>

                  {(selectedMenuNodeConfig?.terms ?? []).map((menuTerm, index) => {
                    const isGlossaryOpen =
                      visibleInspectorMenuGlossaryTermId === menuTerm.id;

                    return (
                      <div
                        key={`inspector-menu-term:${menuTerm.id}`}
                        style={{
                          border: "1px solid #bfdbfe",
                          borderRadius: 6,
                          padding: 6,
                          display: "grid",
                          gap: 6,
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
                          <span style={{ fontSize: 10, color: "#64748b" }}>
                            Handle {index + 1}
                          </span>
                          <button
                            type="button"
                            style={{
                              ...buttonStyle,
                              fontSize: 10,
                              padding: "2px 6px",
                              borderColor: "#fca5a5",
                              color: "#b91c1c",
                            }}
                            title="Delete this term"
                            onClick={() => deleteSelectedMenuTermById(menuTerm.id)}
                          >
                            X
                          </button>
                        </div>

                        <div style={{ display: "grid", gap: 4 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 6,
                            }}
                          >
                            <div style={{ fontSize: 10, color: "#334155" }}>Term</div>
                            <button
                              type="button"
                              style={{
                                ...buttonStyle,
                                fontSize: 10,
                                padding: "2px 6px",
                                background: isGlossaryOpen ? "#dbeafe" : "#fff",
                                borderColor: isGlossaryOpen ? "#93c5fd" : "#d4d4d8",
                              }}
                              onClick={() => toggleInspectorMenuTermGlossary(menuTerm.id)}
                            >
                              Glossary ▾
                            </button>
                          </div>

                          <input
                            style={inputStyle}
                            value={menuTerm.term}
                            onChange={(event) =>
                              updateSelectedMenuTermById(menuTerm.id, event.target.value)
                            }
                          />
                        </div>

                        {isGlossaryOpen && (
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
                                No included Menu Term glossary terms yet.
                              </div>
                            ) : (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {menuTermGlossaryTerms.map((glossaryTerm) => (
                                  <button
                                    key={`inspector-menu-glossary:${menuTerm.id}:${glossaryTerm}`}
                                    type="button"
                                    style={{
                                      ...buttonStyle,
                                      fontSize: 10,
                                      padding: "2px 6px",
                                    }}
                                    onClick={() =>
                                      applyGlossaryTermToInspectorMenuTerm(
                                        menuTerm.id,
                                        glossaryTerm
                                      )
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
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <label>
                  <div style={{ fontSize: 12, marginBottom: 4 }}>node_shape</div>
                  <select
                    style={inputStyle}
                    value={selectedNode.data.node_shape}
                    onChange={(event) =>
                      updateSelectedField("node_shape", event.target.value as NodeShape)
                    }
                  >
                    {NODE_SHAPE_OPTIONS.map((shape) => (
                      <option key={`shape:${shape}`} value={shape}>
                        {shape}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <div style={{ fontSize: 12, marginBottom: 4 }}>title</div>
                  <input
                    style={inputStyle}
                    value={selectedNode.data.title}
                    onChange={(event) => updateSelectedField("title", event.target.value)}
                  />
                </label>

                <label>
                  <div style={{ fontSize: 12, marginBottom: 4 }}>body_text</div>
                  <textarea
                    style={{ ...inputStyle, minHeight: 68, resize: "vertical" }}
                    value={selectedNode.data.body_text}
                    onChange={(event) => updateSelectedField("body_text", event.target.value)}
                  />
                </label>

                <div>
                  <div style={{ fontSize: 12, marginBottom: 4, color: "#334155" }}>
                    body_text preview (markdown)
                  </div>
                  <div
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 6,
                      background: "#f8fafc",
                      padding: 8,
                    }}
                  >
                    <BodyTextPreview value={selectedNode.data.body_text} />
                  </div>
                </div>

                {CONTROLLED_LANGUAGE_NODE_FIELDS.map((fieldType) => {
                  const isDropdownOpen = openControlledLanguageFieldType === fieldType;
                  const includedTerms = controlledLanguageTermsByField[fieldType];

                  return (
                    <label key={`controlled-language-field:${fieldType}`}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                          marginBottom: 4,
                        }}
                      >
                        <div style={{ fontSize: 12 }}>{fieldType}</div>
                        <button
                          type="button"
                          style={{
                            ...buttonStyle,
                            fontSize: 10,
                            padding: "2px 6px",
                            background: isDropdownOpen ? "#dbeafe" : "#fff",
                            borderColor: isDropdownOpen ? "#93c5fd" : "#d4d4d8",
                          }}
                          title="Click to toggle glossary dropdown"
                          onClick={() => toggleControlledLanguageFieldDropdown(fieldType)}
                        >
                          Glossary ▾
                        </button>
                      </div>

                      <input
                        style={inputStyle}
                        value={selectedNode.data[fieldType]}
                        onChange={(event) =>
                          updateSelectedField(fieldType, event.target.value)
                        }
                      />

                      {isDropdownOpen && (
                        <div
                          style={{
                            marginTop: 6,
                            border: "1px solid #dbeafe",
                            borderRadius: 6,
                            background: "#f8fbff",
                            padding: 6,
                          }}
                        >
                          {includedTerms.length === 0 ? (
                            <div style={{ fontSize: 11, color: "#64748b" }}>
                              No included glossary terms for this field type yet.
                            </div>
                          ) : (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {includedTerms.map((term) => (
                                <button
                                  key={`controlled-language-option:${fieldType}:${term}`}
                                  type="button"
                                  style={{
                                    ...buttonStyle,
                                    padding: "3px 8px",
                                    fontSize: 11,
                                    background: "#fff",
                                  }}
                                  onClick={() =>
                                    applyControlledLanguageTermToField(fieldType, term)
                                  }
                                >
                                  {term}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </label>
                  );
                })}
              </>
            )}

            <label>
              <div style={{ fontSize: 12, marginBottom: 4 }}>tone</div>
              <select
                style={inputStyle}
                value={selectedNode.data.tone}
                onChange={(event) => updateSelectedField("tone", event.target.value)}
              >
                {buildSelectOptions(
                  adminOptions.tone,
                  selectedNode.data.tone,
                  DEFAULT_GLOBAL_OPTIONS.tone
                ).map((option) => (
                  <option key={`tone:${option}`} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <div style={{ fontSize: 12, marginBottom: 4 }}>polarity</div>
              <select
                style={inputStyle}
                value={selectedNode.data.polarity}
                onChange={(event) => updateSelectedField("polarity", event.target.value)}
              >
                {buildSelectOptions(
                  adminOptions.polarity,
                  selectedNode.data.polarity,
                  DEFAULT_GLOBAL_OPTIONS.polarity
                ).map((option) => (
                  <option key={`polarity:${option}`} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <div style={{ fontSize: 12, marginBottom: 4 }}>reversibility</div>
              <select
                style={inputStyle}
                value={selectedNode.data.reversibility}
                onChange={(event) =>
                  updateSelectedField("reversibility", event.target.value)
                }
              >
                {buildSelectOptions(
                  adminOptions.reversibility,
                  selectedNode.data.reversibility,
                  DEFAULT_GLOBAL_OPTIONS.reversibility
                ).map((option) => (
                  <option key={`reversibility:${option}`} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <div style={{ fontSize: 12, marginBottom: 4 }}>concept</div>
              <select
                style={inputStyle}
                value={selectedNode.data.concept}
                onChange={(event) => updateSelectedField("concept", event.target.value)}
              >
                {buildSelectOptions(
                  adminOptions.concept,
                  selectedNode.data.concept,
                  DEFAULT_GLOBAL_OPTIONS.concept
                ).map((option) => (
                  <option key={`concept:${option}`} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <div style={{ fontSize: 12, marginBottom: 4 }}>notes</div>
              <textarea
                style={{ ...inputStyle, minHeight: 76, resize: "vertical" }}
                value={selectedNode.data.notes}
                onChange={(event) => updateSelectedField("notes", event.target.value)}
              />
            </label>

            <hr style={{ border: 0, borderTop: "1px solid #e4e4e7" }} />

            <label>
              <div style={{ fontSize: 12, marginBottom: 4 }}>action_type_name</div>
              <select
                style={inputStyle}
                value={selectedNode.data.action_type_name}
                onChange={(event) =>
                  updateSelectedField("action_type_name", event.target.value)
                }
              >
                {buildSelectOptions(
                  adminOptions.action_type_name,
                  selectedNode.data.action_type_name,
                  DEFAULT_GLOBAL_OPTIONS.action_type_name
                ).map((option) => (
                  <option key={`action_type_name:${option}`} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <div style={{ fontSize: 12, marginBottom: 4 }}>action_type_color</div>
              <select
                style={inputStyle}
                value={selectedNode.data.action_type_color}
                onChange={(event) =>
                  updateSelectedField("action_type_color", event.target.value)
                }
              >
                {buildSelectOptions(
                  adminOptions.action_type_color,
                  selectedNode.data.action_type_color,
                  DEFAULT_GLOBAL_OPTIONS.action_type_color
                ).map((option) => (
                  <option key={`action_type_color:${option}`} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <div style={{ marginTop: 6, fontSize: 11, color: "#52525b" }}>
                Preview:
                <span
                  aria-hidden
                  style={{
                    display: "inline-block",
                    marginLeft: 6,
                    width: 12,
                    height: 12,
                    borderRadius: 999,
                    background: selectedNode.data.action_type_color,
                    border: "1px solid #a1a1aa",
                    verticalAlign: "middle",
                  }}
                />
              </div>
            </label>

            <label>
              <div style={{ fontSize: 12, marginBottom: 4 }}>card_style</div>
              <select
                style={inputStyle}
                value={selectedNode.data.card_style}
                onChange={(event) => updateSelectedField("card_style", event.target.value)}
              >
                {buildSelectOptions(
                  adminOptions.card_style,
                  selectedNode.data.card_style,
                  DEFAULT_GLOBAL_OPTIONS.card_style
                ).map((option) => (
                  <option key={`card_style:${option}`} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </aside>
    </div>
  );
}
