"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  type Connection,
  type DefaultEdgeOptions,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeProps,
  type ReactFlowInstance,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

type NodeShape = "rectangle" | "rounded" | "pill" | "diamond";

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
  sequence_index: number | null;
};

type PersistableMicrocopyNodeData = Omit<MicrocopyNodeData, "sequence_index">;
type EditableMicrocopyField = keyof PersistableMicrocopyNodeData;

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

type SerializableFlowNode = {
  id: string;
  position?: FlowNode["position"];
  data?: Partial<PersistableMicrocopyNodeData>;
};

type PersistedCanvasState = {
  nodes: SerializableFlowNode[];
  edges: Edge[];
  adminOptions: GlobalOptionConfig;
};

type FlowOrderingResult = {
  orderedNodeIds: string[];
  sequenceByNodeId: Partial<Record<string, number>>;
  hasCycle: boolean;
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
  "project_admin_options_json",
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
  edges: Edge[];
  adminOptions: GlobalOptionConfig;
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

const EDGE_STROKE_COLOR = "#1d4ed8";

const EDGE_BASE_STYLE: React.CSSProperties = {
  stroke: EDGE_STROKE_COLOR,
  strokeWidth: 2.6,
};

const DIAMOND_CLIP_PATH = "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)";

const DEFAULT_EDGE_OPTIONS: DefaultEdgeOptions = {
  type: "smoothstep",
  animated: true,
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: EDGE_STROKE_COLOR,
    width: 20,
    height: 20,
  },
  style: EDGE_BASE_STYLE,
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
  edges,
}: {
  session: AppStore["session"];
  account: AccountRecord;
  project: ProjectRecord;
  projectSequenceId: string;
  nodes: FlowNode[];
  ordering: FlowOrderingResult;
  adminOptions: GlobalOptionConfig;
  edges: Edge[];
}): FlatExportRow[] => {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  const orderedNodes = ordering.orderedNodeIds
    .map((nodeId) => nodeById.get(nodeId))
    .filter((node): node is FlowNode => Boolean(node));

  const edgesJson = JSON.stringify(sanitizeEdgesForStorage(edges));
  const adminOptionsJson = JSON.stringify(adminOptions);

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
      project_admin_options_json: adminOptionsJson,
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

const cloneEdges = (edges: Edge[]): Edge[] =>
  edges.map((edge) => ({
    ...edge,
    markerEnd:
      edge.markerEnd && typeof edge.markerEnd === "object"
        ? { ...edge.markerEnd }
        : edge.markerEnd,
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

const sanitizeEdgesForStorage = (value: unknown): Edge[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Edge => Boolean(item && typeof item === "object"))
    .map((edge) => ({ ...edge }));
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

const applyEdgeVisuals = (edge: Edge): Edge => ({
  ...edge,
  type: edge.type ?? DEFAULT_EDGE_OPTIONS.type,
  animated: edge.animated ?? DEFAULT_EDGE_OPTIONS.animated,
  markerEnd: edge.markerEnd ?? DEFAULT_EDGE_OPTIONS.markerEnd,
  style: {
    ...EDGE_BASE_STYLE,
    ...(edge.style ?? {}),
  },
});

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

const sanitizeEdges = (persistedEdges: Edge[], nodes: FlowNode[]): Edge[] => {
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

    return [
      applyEdgeVisuals({
        ...edge,
        id: uniqueId,
        source,
        target,
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

const computeFlowOrdering = (nodes: FlowNode[], edges: Edge[]): FlowOrderingResult => {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const adjacency = new Map<string, Set<string>>();
  const indegree = new Map<string, number>();

  nodes.forEach((node) => {
    adjacency.set(node.id, new Set<string>());
    indegree.set(node.id, 0);
  });

  edges.forEach((edge) => {
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

  return {
    orderedNodeIds,
    sequenceByNodeId,
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
  edges: Edge[]
): string => {
  const validNodeIds = new Set(nodes.map((node) => node.id));

  const edgeSignature = edges
    .filter((edge) => validNodeIds.has(edge.source) && validNodeIds.has(edge.target))
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

const serializeNodesForStorage = (nodes: FlowNode[]): SerializableFlowNode[] =>
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
    };

    return {
      nodes: sanitizeSerializableFlowNodes(parsed.nodes),
      edges: sanitizeEdgesForStorage(parsed.edges),
      adminOptions: normalizeGlobalOptionConfig(parsed.adminOptions),
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

type FlowCopyNodeProps = NodeProps<FlowNode> & {
  onBeforeChange: () => void;
};

function FlowCopyNode({ id, data, selected, onBeforeChange }: FlowCopyNodeProps) {
  const { setNodes } = useReactFlow<FlowNode, Edge>();

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

  return (
    <div style={getNodeShapeStyle(data.node_shape, selected, data.action_type_color)}>
      <Handle type="target" position={Position.Left} />

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

        <div style={{ marginTop: 8, fontSize: 10, color: "#71717a" }}>id: {id}</div>
      </div>

      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export default function Page() {
  const [store, setStore] = useState<AppStore>(createEmptyStore);
  const [accountCodeInput, setAccountCodeInput] = useState(SINGLE_ACCOUNT_CODE);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState("");

  const [nodes, setNodes] = useNodesState<FlowNode>([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [adminOptions, setAdminOptions] =
    useState<GlobalOptionConfig>(DEFAULT_GLOBAL_OPTIONS);
  const [pendingOptionInputs, setPendingOptionInputs] = useState<
    Record<GlobalOptionField, string>
  >(createEmptyPendingOptionInputs);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [undoStack, setUndoStack] = useState<EditorSnapshot[]>([]);
  const [transferFeedback, setTransferFeedback] = useState<ImportFeedback | null>(null);

  const rfRef = useRef<ReactFlowInstance<FlowNode, Edge> | null>(null);
  const importFileInputRef = useRef<HTMLInputElement | null>(null);
  const hasLoadedStoreRef = useRef(false);
  const undoCaptureTimeoutRef = useRef<number | null>(null);
  const captureUndoSnapshotRef = useRef<() => void>(() => undefined);

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
      setNodes(hydratedNodes);
      setEdges(hydratedEdges);
      setSelectedNodeId(hydratedNodes[0]?.id ?? null);
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

    const serializedNodes = serializeNodesForStorage(nodes);
    const serializedEdges = cloneEdges(edges);
    const serializedAdminOptions = cloneGlobalOptions(adminOptions);
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
  }, [adminOptions, edges, nodes, store.session, updateStore]);

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
    };

    undoCaptureTimeoutRef.current = window.setTimeout(() => {
      setUndoStack((prev) => [...prev, snapshot].slice(-3));
      undoCaptureTimeoutRef.current = null;
    }, 220);
  }, [adminOptions, edges, nodes, store.session.view]);

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

      setSelectedNodeId((currentSelected) => {
        if (
          currentSelected &&
          previousSnapshot.nodes.some((node) => node.id === currentSelected)
        ) {
          return currentSelected;
        }

        return previousSnapshot.nodes[0]?.id ?? null;
      });

      return prev.slice(0, -1);
    });
  }, [setEdges, setNodes]);

  const nodeTypes = useMemo(
    () => ({
      flowcopyNode: (props: NodeProps<FlowNode>) => (
        <FlowCopyNode
          {...props}
          onBeforeChange={() => captureUndoSnapshotRef.current()}
        />
      ),
    }),
    []
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

      queueUndoSnapshot();
      setNodes((currentNodes) => applyNodeChanges(changes, currentNodes));
    },
    [queueUndoSnapshot, setNodes]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => {
      if (changes.length === 0) {
        return;
      }

      queueUndoSnapshot();
      setEdges((currentEdges) => applyEdgeChanges(changes, currentEdges));
    },
    [queueUndoSnapshot, setEdges]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) {
        return;
      }

      queueUndoSnapshot();

      const newEdge = applyEdgeVisuals({
        id: `e-${params.source}-${params.target}-${createNodeId().slice(0, 8)}`,
        source: params.source,
        target: params.target,
        sourceHandle: params.sourceHandle,
        targetHandle: params.targetHandle,
        label: "",
      });

      setEdges((eds) => addEdge(newEdge, eds));
    },
    [queueUndoSnapshot, setEdges]
  );

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      queueUndoSnapshot();
      setEdges((currentEdges) =>
        reconnectEdge(oldEdge, newConnection, currentEdges).map(applyEdgeVisuals)
      );
    },
    [queueUndoSnapshot, setEdges]
  );

  const onInit = useCallback((instance: ReactFlowInstance<FlowNode, Edge>) => {
    rfRef.current = instance;
  }, []);

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
        addNodeAtEvent(event);
        return;
      }

      setSelectedNodeId(null);
    },
    [addNodeAtEvent]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: FlowNode) => {
    setSelectedNodeId(node.id);
  }, []);

  const ordering = useMemo(() => computeFlowOrdering(nodes, edges), [nodes, edges]);

  const projectSequenceId = useMemo(
    () => computeProjectSequenceId(ordering.orderedNodeIds, nodes, edges),
    [edges, nodes, ordering.orderedNodeIds]
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
        const sourceOrder = ordering.sequenceByNodeId[edge.source];
        const targetOrder = ordering.sequenceByNodeId[edge.target];

        return applyEdgeVisuals({
          ...edge,
          label:
            sourceOrder && targetOrder ? `${sourceOrder} → ${targetOrder}` : edge.label,
          labelStyle: {
            fill: EDGE_STROKE_COLOR,
            fontWeight: 700,
            fontSize: 11,
          },
          labelBgStyle: {
            fill: "#eff6ff",
            fillOpacity: 0.95,
          },
          labelBgPadding: [4, 2],
          labelBgBorderRadius: 4,
        });
      }),
    [edges, ordering.sequenceByNodeId]
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
      : nodes[0]?.id ?? null;

  const selectedNode =
    effectiveSelectedNodeId === null
      ? null
      : nodes.find((node) => node.id === effectiveSelectedNodeId) ?? null;

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
      })),
    [orderedNodes, ordering.sequenceByNodeId]
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
            },
          };
        });

        const firstRow = projectRows[0];
        const parsedEdgesRaw = safeJsonParse(firstRow.project_edges_json ?? "");
        const parsedAdminOptionsRaw = safeJsonParse(firstRow.project_admin_options_json ?? "");

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
        setNodes(hydratedNodes);
        setEdges(hydratedEdges);
        setSelectedNodeId(hydratedNodes[0]?.id ?? null);

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
      setSelectedNodeId,
    ]
  );

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

    return (
      <main
        style={{
          width: "100vw",
          minHeight: "100vh",
          background: "#f8fafc",
          padding: 16,
          display: "grid",
          gap: 12,
        }}
      >
        <header
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            padding: 12,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 20 }}>Project Dashboard</h1>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
              Account code: <strong>{activeAccount?.code ?? SINGLE_ACCOUNT_CODE}</strong>
            </p>
          </div>

          <button type="button" style={buttonStyle} onClick={handleSignOut}>
            Back to Account Code
          </button>
        </header>

        <section
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            padding: 12,
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 8,
            alignItems: "end",
          }}
        >
          <label>
            <div style={{ fontSize: 12, marginBottom: 4 }}>New project name</div>
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
          <button type="button" style={buttonStyle} onClick={createProjectFromDashboard}>
            Create Project
          </button>
        </section>

        {projects.length === 0 ? (
          <section
            style={{
              border: "1px dashed #cbd5e1",
              borderRadius: 10,
              padding: 24,
              textAlign: "center",
              color: "#64748b",
              background: "#fff",
            }}
          >
            No projects yet. Create your first project above.
          </section>
        ) : (
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
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
                  border: "1px solid #dbeafe",
                  borderRadius: 10,
                  padding: 12,
                  background: "#fff",
                  cursor: "pointer",
                  display: "grid",
                  gap: 6,
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>
                  {project.name}
                </div>
                <div style={{ fontSize: 12, color: "#475569" }}>
                  Nodes: {project.canvas.nodes.length}
                </div>
                <div style={{ fontSize: 12, color: "#475569" }}>Project ID: {project.id}</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>
                  Updated: {formatDateTime(project.updatedAt)}
                </div>
              </button>
            ))}
          </section>
        )}
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
                  node_order_id
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
                    colSpan={4 + TABLE_EDITABLE_FIELDS.length}
                    style={{ border: "1px solid #e4e4e7", padding: 12, fontSize: 12 }}
                  >
                    No nodes in this project yet. Switch to Canvas View to add nodes.
                  </td>
                </tr>
              ) : (
                projectTableRows.map(({ node, sequenceIndex }) => (
                  <tr key={`table-row:${node.id}`}>
                    <td style={{ border: "1px solid #e4e4e7", padding: 8, fontSize: 12 }}>
                      <code>{node.id}</code>
                    </td>
                    <td style={{ border: "1px solid #e4e4e7", padding: 8, fontSize: 12 }}>
                      {sequenceIndex ?? ""}
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
        gridTemplateColumns: "1fr 420px",
      }}
    >
      <div style={{ borderRight: "1px solid #e4e4e7" }}>
        <ReactFlow<FlowNode, Edge>
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
          zoomOnDoubleClick={false}
          fitView
          connectionLineStyle={EDGE_BASE_STYLE}
        >
          <Background />
          <MiniMap />
          <Controls />
        </ReactFlow>
      </div>

      <aside style={{ padding: 12, overflowY: "auto", display: "grid", gap: 10 }}>
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
          <button
            type="button"
            style={buttonStyle}
            onClick={() => setIsAdminPanelOpen((open) => !open)}
          >
            {isAdminPanelOpen ? "Hide" : "Show"} Admin
          </button>
        </div>

        <p style={{ marginTop: 0, marginBottom: 0, fontSize: 12, color: "#52525b" }}>
          Click a node to edit structured fields. Double-click empty canvas to add a
          node. All changes autosave.
        </p>

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

        {!selectedNode ? (
          <p style={{ fontSize: 13, color: "#71717a" }}>
            No node selected. Click any node on the canvas.
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

            <label>
              <div style={{ fontSize: 12, marginBottom: 4 }}>primary_cta</div>
              <input
                style={inputStyle}
                value={selectedNode.data.primary_cta}
                onChange={(event) =>
                  updateSelectedField("primary_cta", event.target.value)
                }
              />
            </label>

            <label>
              <div style={{ fontSize: 12, marginBottom: 4 }}>secondary_cta</div>
              <input
                style={inputStyle}
                value={selectedNode.data.secondary_cta}
                onChange={(event) =>
                  updateSelectedField("secondary_cta", event.target.value)
                }
              />
            </label>

            <label>
              <div style={{ fontSize: 12, marginBottom: 4 }}>helper_text</div>
              <input
                style={inputStyle}
                value={selectedNode.data.helper_text}
                onChange={(event) =>
                  updateSelectedField("helper_text", event.target.value)
                }
              />
            </label>

            <label>
              <div style={{ fontSize: 12, marginBottom: 4 }}>error_text</div>
              <input
                style={inputStyle}
                value={selectedNode.data.error_text}
                onChange={(event) =>
                  updateSelectedField("error_text", event.target.value)
                }
              />
            </label>

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
