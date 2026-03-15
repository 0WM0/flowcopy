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
  MiniMap,
  useEdgesState,
  useNodesState,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type NodeProps,
  type ReactFlowInstance,
  type OnSelectionChangeParams,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";
import type {
  NodeShape,
  EdgeKind,
  EdgeLineStyle,
  FrameShade,
  NodeType,
  NodeControlledLanguageFieldType,
  ControlledLanguageFieldType,
  MenuNodeTerm,
  MenuNodeConfig,
  FrameNodeConfig,
  EdgeDirection,
  FlowEdgeData,
  MicrocopyNodeData,
  PersistableMicrocopyNodeData,
  EditableMicrocopyField,
  GlobalOptionConfig,
  GlobalOptionField,
  FlowNode,
  FlowEdge,
  SerializableFlowNode,
  PersistedCanvasState,
  ControlledLanguageGlossaryEntry,
  ControlledLanguageAuditTermEntry,
  ControlledLanguageAuditRow,
  ControlledLanguageDraftRow,
  TermRegistryEntry,
  FlowOrderingResult,
  ParallelGroupInfo,
  AppView,
  EditorSurfaceMode,
  ProjectRecord,
  AccountRecord,
  AppStore,
  FlatExportRow,
  ParsedTabularPayload,
  UiJourneyConversationEntry,
  UiJourneyConversationField,
  UiJourneyConversationConnectionMeta,
  UiJourneySnapshotPreset,
  UiJourneyConversationExportFormat,
  ProjectTransferFormat,
  DownloadTextExtension,
  FullProjectExportEnvelope,
} from "./types";
import {
  FLAT_EXPORT_COLUMNS,
  APP_STORAGE_KEY,
  LEGACY_STORAGE_KEY,
  SINGLE_ACCOUNT_CODE,
  FULL_PROJECT_EXPORT_FORMAT,
  FULL_PROJECT_EXPORT_SCHEMA_VERSION,
  NODE_SHAPE_OPTIONS,
  NODE_TYPE_OPTIONS,
  NODE_TYPE_LABELS,
  FRAME_SHADE_OPTIONS,
  FRAME_SHADE_LABELS,
  FRAME_SHADE_STYLES,
  MENU_NODE_RIGHT_CONNECTIONS_MIN,
  MENU_NODE_RIGHT_CONNECTIONS_MAX,
  MENU_SOURCE_HANDLE_PREFIX,
  MENU_NODE_MINIMUM_TERM_ERROR_MESSAGE,
  FRAME_NODE_MIN_WIDTH,
  FRAME_NODE_MIN_HEIGHT,
  FRAME_NODE_PADDING,
  RIBBON_NODE_MIN_COLUMNS,
  EDGE_STROKE_COLOR,
  PARALLEL_EDGE_STROKE_COLOR,
  EDGE_LINE_STYLE_OPTIONS,
  EDGE_LINE_STYLE_DASH,
  EDGE_BASE_STYLE,
  DEFAULT_EDGE_OPTIONS,
  SEQUENTIAL_SOURCE_HANDLE_ID,
  SEQUENTIAL_TARGET_HANDLE_ID,
  PARALLEL_SOURCE_HANDLE_ID,
  PARALLEL_TARGET_HANDLE_ID,
  PARALLEL_ALT_SOURCE_HANDLE_ID,
  PARALLEL_ALT_TARGET_HANDLE_ID,
  SEQUENTIAL_SELECTED_STROKE_COLOR,
  PARALLEL_SELECTED_STROKE_COLOR,
  UI_JOURNEY_HIGHLIGHT_STROKE_COLOR,
  UI_JOURNEY_RECALLED_STROKE_COLOR,
  DIAMOND_CLIP_PATH,
  GLOBAL_OPTION_FIELDS,
  GLOBAL_OPTION_LABELS,
  DEFAULT_GLOBAL_OPTIONS,
  CONTROLLED_LANGUAGE_FIELDS,
  CONTROLLED_LANGUAGE_NODE_FIELDS,
  CONTROLLED_LANGUAGE_FIELD_LABELS,
  CONTROLLED_LANGUAGE_FIELD_ORDER,
  CONTROLLED_LANGUAGE_MAX_VISIBLE_ROWS,
  CONTROLLED_LANGUAGE_ROW_HEIGHT_PX,
  CONTROLLED_LANGUAGE_TABLE_HEADER_HEIGHT_PX,
  CONTROLLED_LANGUAGE_TABLE_MAX_HEIGHT_PX,
  UI_JOURNEY_CONVERSATION_EXPORT_FORMATS,
  UI_JOURNEY_CONVERSATION_EXPORT_FORMAT_LABELS,
  DOWNLOAD_TEXT_MIME_BY_EXTENSION,
  TABLE_TEXTAREA_FIELDS,
  TABLE_SELECT_FIELDS,
  TABLE_FIELD_LABELS,
  TABLE_EDITABLE_FIELDS,
  GLOBAL_OPTION_TO_NODE_FIELD,
  SIDE_PANEL_MIN_WIDTH,
  SIDE_PANEL_MAX_WIDTH,
  SIDE_PANEL_WIDTH_STORAGE_KEY,
  inputStyle,
  buttonStyle,
  getToggleButtonStyle,
  inspectorFieldLabelStyle,
} from "./constants";

import { FlowCopyNode, BodyTextPreview } from "./components/FlowCopyNode";


import {
  computeFlowOrdering,
  computeParallelGroups,
  compareNodeOrder,
  computeProjectSequenceId,
} from "./lib/flow-ordering";

import {
  buildUiJourneyConversationEntries,
  buildUiJourneySnapshotCapture,
  cloneUiJourneyConversationEntries,
  sanitizeUiJourneySnapshotPresets,
  cloneUiJourneySnapshotPresets,
  createUiJourneySnapshotPresetId,
} from "./lib/ui-journey";

import {
  buildCsvFromRows,
  buildXmlFromRows,
  createFlatExportRows,
  buildUiJourneyConversationPlainText,
  buildUiJourneyConversationMarkdown,
  buildUiJourneyConversationHtml,
  buildUiJourneyConversationRtf,
  buildUiJourneyConversationCsv,
  buildUiJourneyConversationXml,
  buildUiJourneyConversationJson,
  buildUiJourneyConversationHtmlExport,
  buildUiJourneyConversationRtfExport,
  buildDownloadFileName,
  escapeCsvCell,
} from "./lib/export";

import {
  parseCsvText,
  parseXmlText,
  detectProjectTransferFormat,
  normalizeFlatRowKeys,
  selectFlatImportRowsForProject,
  parseProjectRecordFromJsonText,
  toNumeric,
  safeJsonParse,
} from "./lib/import";

import {
  sanitizeControlledLanguageGlossary,
  cloneControlledLanguageGlossary,
  createEmptyControlledLanguageDraftRow,
  buildControlledLanguageTermsByField,
  buildMenuTermSelectorTerms,
  buildControlledLanguageAuditRows,
  buildControlledLanguageNodeIdsByGlossaryKey,
  normalizeControlledLanguageTerm,
  buildControlledLanguageGlossaryKey,
  parseControlledLanguageGlossaryKey,
  isControlledLanguageFieldType,
  normalizeControlledLanguageFieldType,
  isNodeControlledLanguageFieldType,
  collectControlledLanguageTermsFromNode,
  replaceTermInNodeTextFields,
} from "./lib/controlled-language";

import {
  createNodeId,
  normalizeNode,
  sanitizePersistedNodes,
  serializeNodesForStorage,
  cloneFlowNodes,
  getNodeVisualSize,
  computeNodesBoundingRect,
  normalizeFrameNodeConfig,
  normalizeMenuNodeConfig,
  normalizeRibbonNodeConfig,
  createRibbonNodeCell,
  pruneFrameNodeMembership,
  applyFrameMovementToMemberNodes,
  constrainNodesToFrameMembershipBounds,
  clampFrameDimension,
  clampMenuRightConnections,
  createMenuNodeTerm,
  buildMenuSourceHandleId,
  buildMenuSourceHandleIds,
  isNodeShape,
  isNodeType,
  getPrimaryMenuTermValue,
  getSecondaryMenuTermValue,
  applyMenuConfigToNodeData,
  resolveNodeHighlightColor,
  getNodeShapeStyle,
  getDiamondBorderLayerStyle,
  getDiamondSurfaceLayerStyle,
  getNodeContentStyle,
  createDefaultNodeData,
  getFallbackNodeSize,
} from "./lib/node-utils";

import {
  normalizeEdgeData,
  applyEdgeVisuals,
  sanitizeEdges,
  sanitizeEdgesForStorage,
  cloneEdges,
  inferEdgeKindFromHandles,
  getEdgeKind,
  isSequentialEdge,
  syncSequentialEdgesForMenuNode,
  syncSequentialEdgesForRibbonNode,
  assignSequentialEdgesToMenuHandles,
  remapMenuSequentialEdgesToDefaultHandle,
  hasNonSelectionNodeChanges,
  hasNonSelectionEdgeChanges,
  isEditableEventTarget,
  isEdgeKind,
  getEdgeDirection,
  getFirstAvailableMenuSourceHandleId,
  isMenuSequentialConnectionAllowed,
} from "./lib/edge-utils";

import {
  readAppStore,
  createEmptyStore,
  createEmptyCanvasState,
  createAccountId,
  sanitizeProjectRecord,
  sanitizeAccountRecord,
  sanitizeAppStore,
  migrateLegacyCanvasToStore,
  cloneGlobalOptions,
  normalizeGlobalOptionConfig,
  buildSelectOptions,
  createEmptyPendingOptionInputs,
  uniqueTrimmedStrings,
  mergeAdminOptionConfigs,
  syncAdminOptionsWithNodes,
  formatDateTime,
  clampSidePanelWidth,
  readInitialSidePanelWidth,
  isEditorSurfaceMode,
  ensureArrayOfStrings,
} from "./lib/store";
import {
  listProjects,
  getProject,
  createProject as createProjectInDb,
  updateProject,
  deleteProject,
  type ProjectListItem as DbProjectListItem,
  type ProjectRecord as DbProjectRecord,
} from "./lib/db";
import { useAutoSave } from "./hooks/useAutoSave";


type ImportFeedback = {
  type: "success" | "error" | "info";
  message: string;
};

type CanvasClipboardSnapshot = {
  nodes: FlowNode[];
  edges: FlowEdge[];
};

type FeedbackType = "user_interface" | "tool_functionality" | "other";
type FeedbackSubmitStatus = "idle" | "submitting" | "success" | "error";

type HelpShortcutDefinition = {
  keys: string;
  description: string;
};

const FEEDBACK_TYPE_OPTIONS: Array<{ value: FeedbackType; label: string }> = [
  { value: "user_interface", label: "User Interface" },
  { value: "tool_functionality", label: "Tool functionality" },
  { value: "other", label: "Other" },
];

const FEEDBACK_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FEEDBACK_MAX_MESSAGE_LENGTH = 5000;

const HELP_CANVAS_SHORTCUTS: HelpShortcutDefinition[] = [
  {
    keys: "Tab",
    description: "Add a Default node at the pointer position in Canvas mode.",
  },
  {
    keys: "Shift + Tab",
    description: "Add a Menu node at the pointer position in Canvas mode.",
  },
  {
    keys: "Shift + R",
    description: "Add a Ribbon node at the pointer position in Canvas mode.",
  },
  {
    keys: "Shift + F",
    description:
      "Frame selected non-frame nodes (requires at least two selected nodes).",
  },
  {
    keys: "Ctrl/Cmd + C",
    description:
      "Copy selected nodes in Canvas mode to clipboard (selected frames include their member nodes).",
  },
  {
    keys: "Ctrl/Cmd + V",
    description:
      "Paste copied nodes as non-destructive duplicates (new IDs, internal edges preserved, offset placement).",
  },
  {
    keys: "Delete / Backspace",
    description: "Delete selected node(s) or selected edge.",
  },
  {
    keys: "Escape",
    description: "Close the currently open modal window.",
  },
];

const HELP_CONTEXT_SHORTCUTS: HelpShortcutDefinition[] = [
  {
    keys: "Enter (New project name)",
    description: "Create the project from the create-project input.",
  },
  {
    keys: "Enter (Snapshot name)",
    description: "Save the UI Journey snapshot using the typed name.",
  },
  {
    keys: "Enter (Global option input)",
    description: "Add the typed option in Global Attribute Admin.",
  },
  {
    keys: "Enter (Controlled Language draft term)",
    description: "Add a new glossary term row.",
  },
  {
    keys: "Enter (Controlled Language row term)",
    description: "Commit rename edits for an existing glossary term.",
  },
  {
    keys: "Enter (Menu right connections)",
    description: "Commit and normalize menu right-connections value.",
  },
  {
    keys: "Enter / Space (Frame title chip)",
    description: "Start frame-title editing.",
  },
  {
    keys: "Enter (Frame title input)",
    description: "Commit frame title (blur input).",
  },
  {
    keys: "Escape (Frame title input)",
    description: "Exit frame-title editing.",
  },
  {
    keys: "Enter / Space (Ribbon cell)",
    description: "Open Ribbon cell editor popup.",
  },
  {
    keys: "Escape (Ribbon cell popup)",
    description: "Close Ribbon cell editor popup.",
  },
];

const TABLE_SHOEHORNING_DISABLED_FIELDS = new Set<EditableMicrocopyField>([
  "body_text",
  "primary_cta",
  "secondary_cta",
  "helper_text",
  "error_text",
]);

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

type MenuTermRegistryField = `menu_term:[${string}]`;
type RibbonCellRegistryFieldName = "label" | "key_command" | "tool_tip";
type RibbonCellRegistryField =
  | `ribbon_cell:[${string}]:label`
  | `ribbon_cell:[${string}]:key_command`
  | `ribbon_cell:[${string}]:tool_tip`;
type DynamicRegistryTrackedField =
  | RegistryTrackedField
  | MenuTermRegistryField
  | RibbonCellRegistryField;

const isRegistryTrackedField = (field: string): field is RegistryTrackedField =>
  REGISTRY_TRACKED_FIELDS.includes(field as RegistryTrackedField);

const buildMenuTermRegistryField = (menuTermId: string): MenuTermRegistryField =>
  `menu_term:[${menuTermId}]`;

const buildRibbonCellRegistryField = (
  cellId: string,
  fieldName: RibbonCellRegistryFieldName
): RibbonCellRegistryField => `ribbon_cell:[${cellId}]:${fieldName}`;

const getRegistryTermTypeFromField = (field: DynamicRegistryTrackedField): string => {
  if (field.startsWith("menu_term:[")) {
    return "menu_term";
  }

  if (field.startsWith("ribbon_cell:[")) {
    if (field.endsWith(":label")) {
      return "cell_label";
    }

    if (field.endsWith(":key_command")) {
      return "key_command";
    }

    if (field.endsWith(":tool_tip")) {
      return "tool_tip";
    }
  }

  return field;
};

const TERM_REGISTRY_TERM_TYPE_LABELS: Record<string, string> = {
  title: "Title",
  body_text: "Body Text",
  primary_cta: "Primary CTA",
  secondary_cta: "Secondary CTA",
  helper_text: "Helper Text",
  error_text: "Error Text",
  notes: "Notes",
  menu_term: "Menu Term",
  key_command: "Key Command",
  tool_tip: "Tool Tip",
  cell_label: "Cell Label",
};

const TERM_REGISTRY_TERM_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Untyped" },
  { value: "title", label: "Title" },
  { value: "body_text", label: "Body Text" },
  { value: "primary_cta", label: "Primary CTA" },
  { value: "secondary_cta", label: "Secondary CTA" },
  { value: "helper_text", label: "Helper Text" },
  { value: "error_text", label: "Error Text" },
  { value: "notes", label: "Notes" },
  { value: "menu_term", label: "Menu Term" },
  { value: "key_command", label: "Key Command" },
  { value: "tool_tip", label: "Tool Tip" },
  { value: "cell_label", label: "Cell Label" },
];

const getTermRegistryTermTypeLabel = (termType: string | null): string => {
  if (!termType) {
    return "Untyped";
  }

  return TERM_REGISTRY_TERM_TYPE_LABELS[termType] ?? termType;
};

const createEmptyProjectData = (): Record<string, unknown> =>
  createEmptyCanvasState() as unknown as Record<string, unknown>;

const mapDbProjectToAppProject = (project: DbProjectRecord): ProjectRecord => {
  const sanitizedProject = sanitizeProjectRecord({
    id: project.id,
    name: project.title,
    createdAt: project.created_at,
    updatedAt: project.updated_at,
    canvas: project.data,
  });

  return (
    sanitizedProject ?? {
      id: project.id,
      name: project.title || "Untitled Project",
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      canvas: createEmptyCanvasState(),
    }
  );
};

const mapDbProjectToDashboardProject = (
  project: DbProjectRecord
): DbProjectListItem => {
  const nodes = (project.data as { nodes?: unknown } | null | undefined)?.nodes;

  return {
    id: project.id,
    title: project.title || "Untitled Project",
    created_at: project.created_at,
    updated_at: project.updated_at,
    node_count: Array.isArray(nodes) ? nodes.length : 0,
  };
};

const sortDashboardProjects = (
  projects: DbProjectListItem[]
): DbProjectListItem[] =>
  projects.slice().sort((a, b) => b.updated_at.localeCompare(a.updated_at));



type EditorSnapshot = {
  nodes: FlowNode[];
  edges: FlowEdge[];
  adminOptions: GlobalOptionConfig;
  controlledLanguageGlossary: ControlledLanguageGlossaryEntry[];
  termRegistry: TermRegistryEntry[];
  uiJourneySnapshotPresets: UiJourneySnapshotPreset[];
  uiJourneyConversationSnapshot: UiJourneyConversationEntry[];
  isUiJourneyConversationOpen: boolean;
  selectedUiJourneySnapshotPresetId: string | null;
  recalledUiJourneyNodeIds: string[];
  recalledUiJourneyEdgeIds: string[];
  uiJourneySnapshotDraftName: string;
};





























































































































































































































































































export default function Page() {
  const [store, setStore] = useState<AppStore>(createEmptyStore);
  const [newProjectName, setNewProjectName] = useState("");
  const [dashboardActionError, setDashboardActionError] = useState<string | null>(null);
  const [dashboardActionProjectId, setDashboardActionProjectId] = useState<string | null>(null);
  const [dashboardProjects, setDashboardProjects] = useState<DbProjectListItem[]>([]);
  const [isDashboardProjectsLoading, setIsDashboardProjectsLoading] = useState(false);

  const [nodes, setNodes] = useNodesState<FlowNode>([]);
  const [edges, setEdges] = useEdgesState<FlowEdge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [adminOptions, setAdminOptions] =
    useState<GlobalOptionConfig>(DEFAULT_GLOBAL_OPTIONS);
  const [controlledLanguageGlossary, setControlledLanguageGlossary] = useState<
    ControlledLanguageGlossaryEntry[]
  >([]);
  const [termRegistry, setTermRegistry] = useState<TermRegistryEntry[]>([]);
  const [glossaryHighlightedNodeIds, setGlossaryHighlightedNodeIds] = useState<string[]>(
    []
  );
  const [activeGlossaryHighlightKey, setActiveGlossaryHighlightKey] = useState<
    string | null
  >(null);
  const [isControlledLanguagePanelOpen, setIsControlledLanguagePanelOpen] =
    useState(false);
  const [clpActiveView, setClpActiveView] = useState<"audit" | "registry">("audit");
  const [registrySearchQuery, setRegistrySearchQuery] = useState<string>("");
  const [registryFilterStatus, setRegistryFilterStatus] = useState<
    "all" | "assigned" | "unassigned"
  >("all");
  const [registryFilterType, setRegistryFilterType] = useState<string>("all");
  const [registryDraftValue, setRegistryDraftValue] = useState("");
  const [registryDraftTermType, setRegistryDraftTermType] = useState<string>("");
  const [activeRegistryHighlightEntryId, setActiveRegistryHighlightEntryId] = useState<
    string | null
  >(null);
  const [controlledLanguageDraftRow, setControlledLanguageDraftRow] =
    useState<ControlledLanguageDraftRow>(createEmptyControlledLanguageDraftRow);
  const [openControlledLanguageFieldType, setOpenControlledLanguageFieldType] = useState<
    NodeControlledLanguageFieldType | null
  >(null);
  const [openInspectorMenuGlossaryTermId, setOpenInspectorMenuGlossaryTermId] = useState<
    string | null
  >(null);
  const [openInspectorRibbonCellGlossary, setOpenInspectorRibbonCellGlossary] = useState<{
    cellId: string;
    field: "label" | "key_command";
  } | null>(null);
  const [menuTermDeleteError, setMenuTermDeleteError] = useState<string | null>(null);
  const [pendingOptionInputs, setPendingOptionInputs] = useState<
    Record<GlobalOptionField, string>
  >(createEmptyPendingOptionInputs);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isProjectSequencePanelOpen, setIsProjectSequencePanelOpen] = useState(false);
  const [isUiJourneyConversationOpen, setIsUiJourneyConversationOpen] = useState(false);
  const [uiJourneyConversationSnapshot, setUiJourneyConversationSnapshot] = useState<
    UiJourneyConversationEntry[]
  >([]);
  const [uiJourneySnapshotPresets, setUiJourneySnapshotPresets] = useState<
    UiJourneySnapshotPreset[]
  >([]);
  const [selectedUiJourneySnapshotPresetId, setSelectedUiJourneySnapshotPresetId] = useState<
    string | null
  >(null);
  const [recalledUiJourneyNodeIds, setRecalledUiJourneyNodeIds] = useState<string[]>([]);
  const [recalledUiJourneyEdgeIds, setRecalledUiJourneyEdgeIds] = useState<string[]>([]);
  const [uiJourneySnapshotDraftName, setUiJourneySnapshotDraftName] = useState("");
  const [isUiJourneySnapshotsPanelOpen, setIsUiJourneySnapshotsPanelOpen] = useState(true);
  const [showNodeIdsOnCanvas, setShowNodeIdsOnCanvas] = useState(false);
  const [showDefaultNodeTitleOnCanvas, setShowDefaultNodeTitleOnCanvas] =
    useState(false);
  const [undoStack, setUndoStack] = useState<EditorSnapshot[]>([]);
  const [transferFeedback, setTransferFeedback] = useState<ImportFeedback | null>(null);
  const [autoSaveChangeCounter, setAutoSaveChangeCounter] = useState(0);
  const [sidePanelWidth, setSidePanelWidth] = useState<number>(readInitialSidePanelWidth);
  const [isResizingSidePanel, setIsResizingSidePanel] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("user_interface");
  const [feedbackEmail, setFeedbackEmail] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackSubmitStatus, setFeedbackSubmitStatus] =
    useState<FeedbackSubmitStatus>("idle");
  const [feedbackSubmitMessage, setFeedbackSubmitMessage] = useState<string | null>(
    null
  );

  const rfRef = useRef<ReactFlowInstance<FlowNode, FlowEdge> | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const lastCanvasPointerClientPositionRef = useRef<{ x: number; y: number } | null>(
    null
  );
  const isCanvasPointerInsideRef = useRef(false);
  const isCanvasPointerDownRef = useRef(false);
  const importFileInputRef = useRef<HTMLInputElement | null>(null);
  const controlledLanguageJsonImportInputRef = useRef<HTMLInputElement | null>(null);
  const controlledLanguageCsvImportInputRef = useRef<HTMLInputElement | null>(null);
  const hasLoadedStoreRef = useRef(false);
  const undoCaptureTimeoutRef = useRef<number | null>(null);
  const menuTermDeleteErrorTimeoutRef = useRef<number | null>(null);
  const captureUndoSnapshotRef = useRef<() => void>(() => undefined);
  const createFrameFromSelectionRef = useRef<
    (selectedNodesForFrameCreation?: FlowNode[]) => void
  >(() => undefined);
  const updateMenuNodeConfigByIdRef = useRef<
    (
      nodeId: string,
      updater: (currentConfig: MenuNodeConfig) => MenuNodeConfig
    ) => void
  >(() => undefined);
  const menuTermGlossaryTermsRef = useRef<string[]>([]);
  const sidePanelResizeStartXRef = useRef(0);
  const sidePanelResizeStartWidthRef = useRef(SIDE_PANEL_MIN_WIDTH);
  const canvasClipboardRef = useRef<CanvasClipboardSnapshot | null>(null);
  const pasteInvocationCountRef = useRef(0);

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
    setStore(readAppStore());
  }, []);

  useEffect(
    () => () => {
      if (undoCaptureTimeoutRef.current !== null) {
        window.clearTimeout(undoCaptureTimeoutRef.current);
      }

      if (menuTermDeleteErrorTimeoutRef.current !== null) {
        window.clearTimeout(menuTermDeleteErrorTimeoutRef.current);
      }
    },
    []
  );

  useEffect(() => {
    const handlePointerUp = () => {
      isCanvasPointerDownRef.current = false;
    };

    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, []);

  const clearMenuTermDeleteError = useCallback(() => {
    if (menuTermDeleteErrorTimeoutRef.current !== null) {
      window.clearTimeout(menuTermDeleteErrorTimeoutRef.current);
      menuTermDeleteErrorTimeoutRef.current = null;
    }
    setMenuTermDeleteError(null);
  }, []);

  const clearGlossaryHighlights = useCallback(() => {
    setGlossaryHighlightedNodeIds([]);
    setActiveGlossaryHighlightKey(null);
    setActiveRegistryHighlightEntryId(null);
  }, []);

  const showMenuTermDeleteBlockedMessage = useCallback(() => {
    clearMenuTermDeleteError();
    setMenuTermDeleteError(MENU_NODE_MINIMUM_TERM_ERROR_MESSAGE);

    menuTermDeleteErrorTimeoutRef.current = window.setTimeout(() => {
      setMenuTermDeleteError(null);
      menuTermDeleteErrorTimeoutRef.current = null;
    }, 3200);
  }, [clearMenuTermDeleteError]);

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

  const autoSaveProjectData = useMemo<Record<string, unknown>>(() => {
    if (
      store.session.view !== "editor" ||
      !store.session.activeAccountId ||
      !store.session.activeProjectId
    ) {
      return createEmptyProjectData();
    }

    const nodesWithPrunedFrameMembership = pruneFrameNodeMembership(nodes);
    const parallelGroupByNodeId = computeParallelGroups(
      nodesWithPrunedFrameMembership,
      edges
    ).parallelGroupByNodeId;

    return {
      nodes: serializeNodesForStorage(
        nodesWithPrunedFrameMembership,
        parallelGroupByNodeId
      ),
      edges: cloneEdges(edges),
      adminOptions: cloneGlobalOptions(adminOptions),
      controlledLanguageGlossary:
        sanitizeControlledLanguageGlossary(controlledLanguageGlossary),
      termRegistry: [...termRegistry],
      uiJourneySnapshotPresets: cloneUiJourneySnapshotPresets(
        sanitizeUiJourneySnapshotPresets(uiJourneySnapshotPresets)
      ),
    };
  }, [
    adminOptions,
    controlledLanguageGlossary,
    edges,
    nodes,
    store.session.activeAccountId,
    store.session.activeProjectId,
    store.session.view,
    termRegistry,
    uiJourneySnapshotPresets,
  ]);

  const autoSaveProjectId =
    store.session.view === "editor" && store.session.activeProjectId
      ? store.session.activeProjectId
      : null;

  const { saveNow: saveProjectNow } = useAutoSave(
    autoSaveProjectId,
    autoSaveProjectData,
    autoSaveChangeCounter
  );

  const markProjectDirty = useCallback(() => {
    setAutoSaveChangeCounter((currentCounter) => currentCounter + 1);
  }, []);

  const loadProjectIntoEditor = useCallback(
    (project: ProjectRecord) => {
      const normalizedAdminOptions = normalizeGlobalOptionConfig(
        project.canvas.adminOptions
      );
      const normalizedUiJourneySnapshotPresets = sanitizeUiJourneySnapshotPresets(
        project.canvas.uiJourneySnapshotPresets
      );

      const hydratedNodes = sanitizePersistedNodes(
        project.canvas.nodes,
        normalizedAdminOptions
      );
      const prunedHydratedNodes = pruneFrameNodeMembership(hydratedNodes);
      const hydratedEdges = sanitizeEdges(project.canvas.edges, prunedHydratedNodes);

      setAdminOptions(normalizedAdminOptions);
      setControlledLanguageGlossary(
        sanitizeControlledLanguageGlossary(project.canvas.controlledLanguageGlossary)
      );
      setTermRegistry(
        Array.isArray(project.canvas.termRegistry) ? project.canvas.termRegistry : []
      );
      setControlledLanguageDraftRow(createEmptyControlledLanguageDraftRow());
      setOpenControlledLanguageFieldType(null);
      setOpenInspectorMenuGlossaryTermId(null);
      setOpenInspectorRibbonCellGlossary(null);
      setNodes(prunedHydratedNodes);
      setEdges(hydratedEdges);
      setUiJourneySnapshotPresets(normalizedUiJourneySnapshotPresets);
      setSelectedUiJourneySnapshotPresetId(null);
      setRecalledUiJourneyNodeIds([]);
      setRecalledUiJourneyEdgeIds([]);
      setUiJourneySnapshotDraftName("");
      setUiJourneyConversationSnapshot([]);
      setIsUiJourneyConversationOpen(false);
      setSelectedNodeId(prunedHydratedNodes[0]?.id ?? null);
      setSelectedNodeIds(prunedHydratedNodes[0]?.id ? [prunedHydratedNodes[0].id] : []);
      setSelectedEdgeId(null);
      setUndoStack([]);
      setIsProjectSequencePanelOpen(false);
      canvasClipboardRef.current = null;
      pasteInvocationCountRef.current = 0;
      clearMenuTermDeleteError();
      setPendingOptionInputs(createEmptyPendingOptionInputs());
    },
    [clearMenuTermDeleteError, setEdges, setNodes]
  );

  const persistCurrentProjectState = useCallback(() => {
    const { view, activeAccountId, activeProjectId } = store.session;

    if (view !== "editor" || !activeAccountId || !activeProjectId) {
      return;
    }

    const nodesWithPrunedFrameMembership = pruneFrameNodeMembership(nodes);
    const parallelGroupByNodeId = computeParallelGroups(
      nodesWithPrunedFrameMembership,
      edges
    ).parallelGroupByNodeId;
    const serializedNodes = serializeNodesForStorage(
      nodesWithPrunedFrameMembership,
      parallelGroupByNodeId
    );
    const serializedEdges = cloneEdges(edges);
    const serializedAdminOptions = cloneGlobalOptions(adminOptions);
    const serializedControlledLanguageGlossary = sanitizeControlledLanguageGlossary(
      controlledLanguageGlossary
    );
    const serializedTermRegistry = [...termRegistry];
    const serializedUiJourneySnapshotPresets = cloneUiJourneySnapshotPresets(
      sanitizeUiJourneySnapshotPresets(uiJourneySnapshotPresets)
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
          termRegistry: serializedTermRegistry,
          uiJourneySnapshotPresets: serializedUiJourneySnapshotPresets,
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
    termRegistry,
    uiJourneySnapshotPresets,
    updateStore,
  ]);

  useEffect(() => {
    persistCurrentProjectState();
  }, [persistCurrentProjectState]);

  const queueUndoSnapshot = useCallback(() => {
    if (store.session.view !== "editor") {
      return;
    }

    markProjectDirty();

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
      termRegistry: [...termRegistry],
      uiJourneySnapshotPresets: cloneUiJourneySnapshotPresets(uiJourneySnapshotPresets),
      uiJourneyConversationSnapshot: cloneUiJourneyConversationEntries(
        uiJourneyConversationSnapshot
      ),
      isUiJourneyConversationOpen,
      selectedUiJourneySnapshotPresetId,
      recalledUiJourneyNodeIds: [...recalledUiJourneyNodeIds],
      recalledUiJourneyEdgeIds: [...recalledUiJourneyEdgeIds],
      uiJourneySnapshotDraftName,
    };

    undoCaptureTimeoutRef.current = window.setTimeout(() => {
      setUndoStack((prev) => [...prev, snapshot].slice(-3));
      undoCaptureTimeoutRef.current = null;
    }, 220);
  }, [
    adminOptions,
    controlledLanguageGlossary,
    edges,
    isUiJourneyConversationOpen,
    nodes,
    recalledUiJourneyEdgeIds,
    recalledUiJourneyNodeIds,
    selectedUiJourneySnapshotPresetId,
    store.session.view,
    termRegistry,
    uiJourneyConversationSnapshot,
    uiJourneySnapshotDraftName,
    uiJourneySnapshotPresets,
    markProjectDirty,
  ]);

  useEffect(() => {
    captureUndoSnapshotRef.current = queueUndoSnapshot;
  }, [queueUndoSnapshot]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) {
      return;
    }

    if (undoCaptureTimeoutRef.current !== null) {
      window.clearTimeout(undoCaptureTimeoutRef.current);
      undoCaptureTimeoutRef.current = null;
    }

    markProjectDirty();

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
      setTermRegistry([...previousSnapshot.termRegistry]);
      setUiJourneySnapshotPresets(
        cloneUiJourneySnapshotPresets(previousSnapshot.uiJourneySnapshotPresets)
      );
      setUiJourneyConversationSnapshot(
        cloneUiJourneyConversationEntries(previousSnapshot.uiJourneyConversationSnapshot)
      );
      setIsUiJourneyConversationOpen(previousSnapshot.isUiJourneyConversationOpen);
      setSelectedUiJourneySnapshotPresetId(
        previousSnapshot.selectedUiJourneySnapshotPresetId
      );
      setRecalledUiJourneyNodeIds([...previousSnapshot.recalledUiJourneyNodeIds]);
      setRecalledUiJourneyEdgeIds([...previousSnapshot.recalledUiJourneyEdgeIds]);
      setUiJourneySnapshotDraftName(previousSnapshot.uiJourneySnapshotDraftName);

      setSelectedNodeId((currentSelected) => {
        if (
          currentSelected &&
          previousSnapshot.nodes.some((node) => node.id === currentSelected)
        ) {
          return currentSelected;
        }

        return previousSnapshot.nodes[0]?.id ?? null;
      });
      setSelectedNodeIds((currentSelectedIds) => {
        const validSelectedIds = currentSelectedIds.filter((selectedId) =>
          previousSnapshot.nodes.some((node) => node.id === selectedId)
        );

        if (validSelectedIds.length > 0) {
          return validSelectedIds;
        }

        const fallbackSelectedNodeId = previousSnapshot.nodes[0]?.id;
        return fallbackSelectedNodeId ? [fallbackSelectedNodeId] : [];
      });
      setSelectedEdgeId((currentSelected) =>
        currentSelected &&
        previousSnapshot.edges.some((edge) => edge.id === currentSelected)
          ? currentSelected
          : null
      );

      return prev.slice(0, -1);
    });
  }, [markProjectDirty, setEdges, setNodes, undoStack.length]);

  const menuTermGlossaryTerms = useMemo(
    () => buildMenuTermSelectorTerms(nodes, controlledLanguageGlossary),
    [controlledLanguageGlossary, nodes]
  );

  useEffect(() => {
    menuTermGlossaryTermsRef.current = menuTermGlossaryTerms;
  }, [menuTermGlossaryTerms]);

  const bootstrapDefaultAccountSession = useCallback(() => {
    updateStore((prev) => {
      if (prev.session.view !== "account") {
        return prev;
      }

      const existingAccount = prev.accounts.find(
        (account) => account.code === SINGLE_ACCOUNT_CODE
      );

      const account =
        existingAccount ?? {
          id: createAccountId(SINGLE_ACCOUNT_CODE),
          code: SINGLE_ACCOUNT_CODE,
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
          editorMode: prev.session.editorMode,
        },
      };
    });
  }, [updateStore]);

  useEffect(() => {
    if (store.session.view !== "account") {
      return;
    }

    bootstrapDefaultAccountSession();
  }, [bootstrapDefaultAccountSession, store.session.view]);

  const loadDashboardProjects = useCallback(async () => {
    setIsDashboardProjectsLoading(true);
    setDashboardActionError(null);

    try {
      const projects = await listProjects();
      setDashboardProjects(sortDashboardProjects(projects));
    } catch (error) {
      console.error("[Dashboard] Failed to load projects", error);
      setDashboardActionError("Could not load projects. Please refresh.");
    } finally {
      setIsDashboardProjectsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (store.session.view !== "dashboard") {
      return;
    }

    void loadDashboardProjects();
  }, [loadDashboardProjects, store.session.view]);

  const createProjectFromDashboard = useCallback(async () => {
    const projectName = newProjectName.trim();
    if (!projectName) {
      return;
    }

    setDashboardActionError(null);
    setDashboardActionProjectId("creating-project");

    try {
      const createdProject = await createProjectInDb(projectName, createEmptyProjectData());
      const dashboardProject = mapDbProjectToDashboardProject(createdProject);

      setDashboardProjects((currentProjects) =>
        sortDashboardProjects([...currentProjects, dashboardProject])
      );
      setNewProjectName("");
    } catch (error) {
      console.error("[Dashboard] Failed to create project", error);
      setDashboardActionError("Could not create project. Please try again.");
    } finally {
      setDashboardActionProjectId(null);
    }
  }, [newProjectName]);

  const renameProjectFromDashboard = useCallback(
    async (projectId: string) => {
      const project = dashboardProjects.find((item) => item.id === projectId);
      if (!project) {
        return;
      }

      const renamedProjectName = window.prompt("Rename project", project.title);
      if (renamedProjectName === null) {
        return;
      }

      const nextProjectName = renamedProjectName.trim();
      if (!nextProjectName || nextProjectName === project.title) {
        return;
      }

      setDashboardActionError(null);
      setDashboardActionProjectId(project.id);

      try {
        await updateProject(project.id, { title: nextProjectName });

        const updatedAt = new Date().toISOString();

        setDashboardProjects((currentProjects) =>
          sortDashboardProjects(
            currentProjects.map((item) =>
              item.id === project.id
                ? {
                    ...item,
                    title: nextProjectName,
                    updated_at: updatedAt,
                  }
                : item
            )
          )
        );
      } catch (error) {
        console.error("[Dashboard] Failed to rename project", error);
        setDashboardActionError("Could not rename project. Please try again.");
      } finally {
        setDashboardActionProjectId(null);
      }
    },
    [dashboardProjects]
  );

  const deleteProjectFromDashboard = useCallback(
    async (projectId: string) => {
      const project = dashboardProjects.find((item) => item.id === projectId);
      if (!project) {
        return;
      }

      const shouldDeleteProject = window.confirm(
        `Delete \"${project.title}\"? This action cannot be undone.`
      );
      if (!shouldDeleteProject) {
        return;
      }

      setDashboardActionError(null);
      setDashboardActionProjectId(project.id);

      try {
        await deleteProject(project.id);

        setDashboardProjects((currentProjects) =>
          currentProjects.filter((item) => item.id !== project.id)
        );
      } catch (error) {
        console.error("[Dashboard] Failed to delete project", error);
        setDashboardActionError("Could not delete project. Please try again.");
      } finally {
        setDashboardActionProjectId(null);
      }
    },
    [dashboardProjects]
  );

  const openProject = useCallback(
    async (projectId: string) => {
      setDashboardActionError(null);
      setDashboardActionProjectId(projectId);

      try {
        const projectFromDb = await getProject(projectId);

        if (!projectFromDb) {
          setDashboardActionError("Project not found.");
          return;
        }

        const project = mapDbProjectToAppProject(projectFromDb);
        const accountId = activeAccount?.id ?? createAccountId(SINGLE_ACCOUNT_CODE);
        const accountCode = activeAccount?.code ?? SINGLE_ACCOUNT_CODE;

        loadProjectIntoEditor(project);

        updateStore((prev) => {
          const accountIndex = prev.accounts.findIndex(
            (account) => account.id === accountId
          );
          const accounts = [...prev.accounts];

          if (accountIndex >= 0) {
            const account = accounts[accountIndex];
            const projects = [...account.projects];
            const projectIndex = projects.findIndex((item) => item.id === project.id);

            if (projectIndex >= 0) {
              projects[projectIndex] = project;
            } else {
              projects.push(project);
            }

            accounts[accountIndex] = {
              ...account,
              projects,
            };
          } else {
            accounts.push({
              id: accountId,
              code: accountCode,
              projects: [project],
            });
          }

          return {
            ...prev,
            accounts,
            session: {
              ...prev.session,
              activeAccountId: accountId,
              activeProjectId: project.id,
              view: "editor",
            },
          };
        });
      } catch (error) {
        console.error("[Dashboard] Failed to open project", error);
        setDashboardActionError("Could not open project. Please try again.");
      } finally {
        setDashboardActionProjectId(null);
      }
    },
    [activeAccount, loadProjectIntoEditor, updateStore]
  );

  const handleBackToDashboard = useCallback(() => {
    persistCurrentProjectState();
    void saveProjectNow();

    updateStore((prev) => ({
      ...prev,
      session: {
        ...prev.session,
        activeProjectId: null,
        view: "dashboard",
      },
    }));

    setUndoStack([]);
  }, [persistCurrentProjectState, saveProjectNow, updateStore]);

  const onNodesChange = useCallback(
    (changes: NodeChange<FlowNode>[]) => {
      if (changes.length === 0) {
        return;
      }

      if (hasNonSelectionNodeChanges(changes)) {
        queueUndoSnapshot();
      }

      setNodes((currentNodes) => {
        const changedNodes = applyNodeChanges(changes, currentNodes);
        const movedNodes = applyFrameMovementToMemberNodes(currentNodes, changedNodes);
        const constrainedNodes = constrainNodesToFrameMembershipBounds(movedNodes);
        return pruneFrameNodeMembership(constrainedNodes);
      });
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

  const getCanvasFallbackClientPosition = useCallback(() => {
    const canvasElement = canvasContainerRef.current;
    if (canvasElement) {
      const bounds = canvasElement.getBoundingClientRect();

      return {
        x: bounds.left + bounds.width / 2,
        y: bounds.top + bounds.height / 2,
      };
    }

    return {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };
  }, []);

  const addNodeAtClientPosition = useCallback(
    (
      clientPosition: { x: number; y: number },
      nodeType: "default" | "menu" | "ribbon" = "default"
    ) => {
      const rf = rfRef.current;
      if (!rf) {
        return;
      }

      queueUndoSnapshot();

      const position = rf.screenToFlowPosition(clientPosition);
      const id = createNodeId();

      const nodeToCreate: SerializableFlowNode =
        nodeType === "menu"
          ? {
              id,
              position,
              data: {
                node_type: "menu",
                primary_cta: "Continue",
              },
            }
          : nodeType === "ribbon"
            ? {
                id,
                position,
                data: {
                  node_type: "ribbon",
                  ribbon_config: normalizeRibbonNodeConfig(null),
                },
              }
          : {
              id,
              position,
            };

      setNodes((nds) => [
        ...nds,
        normalizeNode(nodeToCreate, normalizeGlobalOptionConfig(adminOptions)),
      ]);
      setSelectedNodeId(id);
      setSelectedNodeIds([id]);
      setSelectedEdgeId(null);
    },
    [adminOptions, queueUndoSnapshot, setNodes]
  );

  const addNodeAtEvent = useCallback(
    (
      event: React.MouseEvent,
      nodeType: "default" | "menu" | "ribbon" = "default"
    ) => {
      addNodeAtClientPosition(
        {
          x: event.clientX,
          y: event.clientY,
        },
        nodeType
      );
    },
    [addNodeAtClientPosition]
  );

  const handleCanvasPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      isCanvasPointerInsideRef.current = true;
      lastCanvasPointerClientPositionRef.current = {
        x: event.clientX,
        y: event.clientY,
      };
    },
    []
  );

  const handleCanvasPointerEnter = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      isCanvasPointerInsideRef.current = true;
      lastCanvasPointerClientPositionRef.current = {
        x: event.clientX,
        y: event.clientY,
      };
    },
    []
  );

  const handleCanvasPointerLeave = useCallback(() => {
    isCanvasPointerInsideRef.current = false;
    isCanvasPointerDownRef.current = false;
  }, []);

  const handleCanvasPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) {
        return;
      }

      isCanvasPointerInsideRef.current = true;
      isCanvasPointerDownRef.current = true;
      lastCanvasPointerClientPositionRef.current = {
        x: event.clientX,
        y: event.clientY,
      };
    },
    []
  );

  const handleCanvasPointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) {
        return;
      }

      isCanvasPointerDownRef.current = false;
      isCanvasPointerInsideRef.current = true;
      lastCanvasPointerClientPositionRef.current = {
        x: event.clientX,
        y: event.clientY,
      };
    },
    []
  );

  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      clearMenuTermDeleteError();
      clearGlossaryHighlights();

      if (event.detail === 2) {
        setOpenControlledLanguageFieldType(null);
        setOpenInspectorMenuGlossaryTermId(null);
        setOpenInspectorRibbonCellGlossary(null);
        addNodeAtEvent(event);
        return;
      }

      setOpenControlledLanguageFieldType(null);
      setOpenInspectorMenuGlossaryTermId(null);
      setOpenInspectorRibbonCellGlossary(null);
      setSelectedNodeId(null);
      setSelectedNodeIds([]);
      setSelectedEdgeId(null);
    },
    [addNodeAtEvent, clearGlossaryHighlights, clearMenuTermDeleteError]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: FlowNode) => {
      clearMenuTermDeleteError();
      clearGlossaryHighlights();
      setOpenControlledLanguageFieldType(null);
      setOpenInspectorMenuGlossaryTermId(null);
      setOpenInspectorRibbonCellGlossary(null);
      setSelectedNodeId(node.id);
      setSelectedEdgeId(null);
    },
    [clearGlossaryHighlights, clearMenuTermDeleteError]
  );

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: FlowEdge) => {
      clearMenuTermDeleteError();
      clearGlossaryHighlights();
      setOpenControlledLanguageFieldType(null);
      setOpenInspectorMenuGlossaryTermId(null);
      setOpenInspectorRibbonCellGlossary(null);
      setSelectedEdgeId(edge.id);
      setSelectedNodeId(null);
      setSelectedNodeIds([]);
    },
    [clearGlossaryHighlights, clearMenuTermDeleteError]
  );

  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes, edges: selectedEdges }: OnSelectionChangeParams<FlowNode, FlowEdge>) => {
      clearMenuTermDeleteError();

      const hasSelectedNodes = selectedNodes.length > 0;
      const nextSelectedEdgeId = selectedEdges[0]?.id ?? null;
      const nextSelectedNodeIds = selectedNodes.map((selectedNode) => selectedNode.id);
      const nextSelectedNodeId = selectedNodes[0]?.id ?? null;

      setOpenControlledLanguageFieldType(null);
      setOpenInspectorMenuGlossaryTermId(null);
      setOpenInspectorRibbonCellGlossary(null);
      setSelectedEdgeId(hasSelectedNodes ? null : nextSelectedEdgeId);
      setSelectedNodeId(nextSelectedNodeId);
      setSelectedNodeIds(nextSelectedNodeIds);
    },
    [clearMenuTermDeleteError]
  );

  const copySelectedCanvasNodes = useCallback((): boolean => {
    const directSelectedNodeIds =
      selectedNodeIds.length > 0
        ? selectedNodeIds
        : selectedNodeId
          ? [selectedNodeId]
          : [];

    if (directSelectedNodeIds.length === 0) {
      return false;
    }

    const nodeById = new Map(nodes.map((node) => [node.id, node] as const));
    const expandedNodeIdSet = new Set(directSelectedNodeIds);

    directSelectedNodeIds.forEach((nodeId) => {
      const selectedNodeForCopy = nodeById.get(nodeId);

      if (!selectedNodeForCopy || selectedNodeForCopy.data.node_type !== "frame") {
        return;
      }

      const selectedFrameConfig = normalizeFrameNodeConfig(
        selectedNodeForCopy.data.frame_config
      );

      selectedFrameConfig.member_node_ids.forEach((memberNodeId) => {
        expandedNodeIdSet.add(memberNodeId);
      });
    });

    const copiedNodes = nodes.filter((node) => expandedNodeIdSet.has(node.id));
    if (copiedNodes.length === 0) {
      return false;
    }

    const copiedNodeIdSet = new Set(copiedNodes.map((node) => node.id));
    const copiedInternalEdges = edges.filter(
      (edge) => copiedNodeIdSet.has(edge.source) && copiedNodeIdSet.has(edge.target)
    );

    canvasClipboardRef.current = {
      nodes: cloneFlowNodes(copiedNodes),
      edges: cloneEdges(copiedInternalEdges),
    };
    pasteInvocationCountRef.current = 0;

    setTransferFeedback({
      type: "info",
      message:
        copiedInternalEdges.length > 0
          ? `Copied ${copiedNodes.length} node(s) and ${copiedInternalEdges.length} internal edge(s).`
          : `Copied ${copiedNodes.length} node(s).`,
    });

    return true;
  }, [edges, nodes, selectedNodeId, selectedNodeIds]);

  const pasteCopiedCanvasNodes = useCallback((): boolean => {
    const clipboardSnapshot = canvasClipboardRef.current;

    if (!clipboardSnapshot || clipboardSnapshot.nodes.length === 0) {
      return false;
    }

    queueUndoSnapshot();

    const nextPasteInvocationCount = pasteInvocationCountRef.current + 1;
    pasteInvocationCountRef.current = nextPasteInvocationCount;
    const pasteOffset = 44 * nextPasteInvocationCount;

    const nodeIdMap = new Map<string, string>();

    const pastedNodes = clipboardSnapshot.nodes.map((sourceNode) => {
      const nextNodeId = createNodeId();
      nodeIdMap.set(sourceNode.id, nextNodeId);

      return {
        ...sourceNode,
        id: nextNodeId,
        selected: false,
        position: {
          x: sourceNode.position.x + pasteOffset,
          y: sourceNode.position.y + pasteOffset,
        },
        data: {
          ...sourceNode.data,
          sequence_index: null,
          parallel_group_id: null,
          ui_journey_highlighted: false,
          ui_journey_recalled: false,
        },
      };
    });

    const remappedPastedNodes = pastedNodes.map((pastedNode) => {
      if (pastedNode.data.node_type !== "frame") {
        return pastedNode;
      }

      const pastedFrameConfig = normalizeFrameNodeConfig(pastedNode.data.frame_config);

      return {
        ...pastedNode,
        data: {
          ...pastedNode.data,
          frame_config: {
            ...pastedFrameConfig,
            member_node_ids: pastedFrameConfig.member_node_ids.flatMap((memberNodeId) => {
              const nextMemberNodeId = nodeIdMap.get(memberNodeId);
              return nextMemberNodeId ? [nextMemberNodeId] : [];
            }),
          },
        },
      };
    });

    const pastedEdges = clipboardSnapshot.edges.flatMap((sourceEdge) => {
      const mappedSourceNodeId = nodeIdMap.get(sourceEdge.source);
      const mappedTargetNodeId = nodeIdMap.get(sourceEdge.target);

      if (!mappedSourceNodeId || !mappedTargetNodeId) {
        return [];
      }

      return [
        applyEdgeVisuals({
          ...sourceEdge,
          id: `e-${mappedSourceNodeId}-${mappedTargetNodeId}-${createNodeId().slice(0, 8)}`,
          source: mappedSourceNodeId,
          target: mappedTargetNodeId,
          selected: false,
        }),
      ];
    });

    const remappedPastedNodeIds = remappedPastedNodes.map((node) => node.id);

    setNodes((currentNodes) =>
      pruneFrameNodeMembership([...currentNodes, ...remappedPastedNodes])
    );
    setEdges((currentEdges) => [...currentEdges, ...pastedEdges]);
    setSelectedNodeId(remappedPastedNodeIds[0] ?? null);
    setSelectedNodeIds(remappedPastedNodeIds);
    setSelectedEdgeId(null);
    setOpenControlledLanguageFieldType(null);
    setOpenInspectorMenuGlossaryTermId(null);
    setOpenInspectorRibbonCellGlossary(null);
    clearMenuTermDeleteError();

    setTermRegistry((currentRegistry) => {
      let nextRegistry = currentRegistry;
      let hasChanges = false;
      const now = new Date().toISOString();

      remappedPastedNodes.forEach((pastedNode) => {
        REGISTRY_TRACKED_FIELDS.forEach((field) => {
          const fieldValue = (pastedNode.data as Record<string, unknown>)[field];

          if (typeof fieldValue !== "string" || fieldValue.trim() === "") {
            return;
          }

          const existingIndex = nextRegistry.findIndex(
            (entry) =>
              entry.assignedNodeId === pastedNode.id && entry.assignedField === field
          );

          if (existingIndex !== -1) {
            if (!hasChanges) {
              nextRegistry = [...nextRegistry];
              hasChanges = true;
            }

            nextRegistry[existingIndex] = {
              ...nextRegistry[existingIndex],
              value: fieldValue,
              updatedAt: now,
            };

            return;
          }

          const newEntry: TermRegistryEntry = {
            id: crypto.randomUUID(),
            value: fieldValue,
            friendlyId: null,
            friendlyIdLocked: false,
            termType: field,
            assignedNodeId: pastedNode.id,
            assignedField: field,
            deduplicationSuffix: null,
            createdAt: now,
            updatedAt: now,
          };

          if (!hasChanges) {
            nextRegistry = [...nextRegistry];
            hasChanges = true;
          }

          nextRegistry.push(newEntry);
        });
      });

      return hasChanges ? nextRegistry : currentRegistry;
    });

    setTransferFeedback({
      type: "success",
      message:
        pastedEdges.length > 0
          ? `Pasted ${remappedPastedNodes.length} node(s) and ${pastedEdges.length} edge(s).`
          : `Pasted ${remappedPastedNodes.length} node(s).`,
    });

    return true;
  }, [
    clearMenuTermDeleteError,
    queueUndoSnapshot,
    setEdges,
    setNodes,
    setTermRegistry,
  ]);

  const handleDeleteSelection = useCallback(() => {
    if (selectedEdgeId) {
      queueUndoSnapshot();
      setEdges((currentEdges) => currentEdges.filter((edge) => edge.id !== selectedEdgeId));
      setSelectedEdgeId(null);
      return;
    }

    const selectedNodeIdsToDelete =
      selectedNodeIds.length > 0
        ? selectedNodeIds
        : selectedNodeId
          ? [selectedNodeId]
          : [];

    if (selectedNodeIdsToDelete.length === 0) {
      return;
    }

    const selectedNodeIdsToDeleteSet = new Set(selectedNodeIdsToDelete);

    queueUndoSnapshot();
    setNodes((currentNodes) =>
      pruneFrameNodeMembership(
        currentNodes.filter((node) => !selectedNodeIdsToDeleteSet.has(node.id))
      )
    );
    setEdges((currentEdges) =>
      currentEdges.filter(
        (edge) =>
          !selectedNodeIdsToDeleteSet.has(edge.source) &&
          !selectedNodeIdsToDeleteSet.has(edge.target)
      )
    );
    setTermRegistry((currentRegistry) => {
      const now = new Date().toISOString();
      let hasUpdatedEntry = false;

      const nextRegistry = currentRegistry.map((entry) => {
        const assignedNodeId = entry.assignedNodeId;

        if (!assignedNodeId || !selectedNodeIdsToDeleteSet.has(assignedNodeId)) {
          return entry;
        }

        hasUpdatedEntry = true;

        return {
          ...entry,
          assignedNodeId: null,
          assignedField: null,
          updatedAt: now,
        };
      });

      return hasUpdatedEntry ? nextRegistry : currentRegistry;
    });
    setSelectedNodeId(null);
    setSelectedNodeIds([]);
    setSelectedEdgeId(null);
  }, [
    queueUndoSnapshot,
    selectedEdgeId,
    selectedNodeId,
    selectedNodeIds,
    setEdges,
    setNodes,
    setTermRegistry,
  ]);

  useEffect(() => {
    if (store.session.view !== "editor" || store.session.editorMode !== "canvas") {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const targetElement =
        event.target instanceof HTMLElement ? event.target : null;
      const canvasElement = canvasContainerRef.current;

      const isTargetInsideCanvas =
        Boolean(targetElement) && Boolean(canvasElement?.contains(targetElement));

      const isBodyTarget =
        targetElement === null ||
        targetElement === document.body ||
        targetElement === document.documentElement;

      const isCopyShortcut =
        (event.ctrlKey || event.metaKey) &&
        !event.shiftKey &&
        !event.altKey &&
        event.key.toLowerCase() === "c";

      if (isCopyShortcut) {
        if (isEditableEventTarget(event.target)) {
          return;
        }

        if (!isTargetInsideCanvas && !isBodyTarget) {
          return;
        }

        if (copySelectedCanvasNodes()) {
          event.preventDefault();
        }

        return;
      }

      const isPasteShortcut =
        (event.ctrlKey || event.metaKey) &&
        !event.shiftKey &&
        !event.altKey &&
        event.key.toLowerCase() === "v";

      if (isPasteShortcut) {
        if (isEditableEventTarget(event.target)) {
          return;
        }

        if (!isTargetInsideCanvas && !isBodyTarget) {
          return;
        }

        if (pasteCopiedCanvasNodes()) {
          event.preventDefault();
        }

        return;
      }

      if (event.key === "Tab") {
        if (isEditableEventTarget(event.target)) {
          return;
        }

        if (!isTargetInsideCanvas && !isBodyTarget) {
          return;
        }

        if (isCanvasPointerDownRef.current) {
          return;
        }

        if (!isTargetInsideCanvas && !isCanvasPointerInsideRef.current) {
          return;
        }

        event.preventDefault();

        const clientPosition =
          lastCanvasPointerClientPositionRef.current ??
          getCanvasFallbackClientPosition();

        addNodeAtClientPosition(
          clientPosition,
          event.shiftKey ? "menu" : "default"
        );
        return;
      }

      if (
        event.key.toLowerCase() === "r" &&
        event.shiftKey &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        if (isEditableEventTarget(event.target)) {
          return;
        }

        if (!isTargetInsideCanvas && !isBodyTarget) {
          return;
        }

        if (isCanvasPointerDownRef.current) {
          return;
        }

        if (!isTargetInsideCanvas && !isCanvasPointerInsideRef.current) {
          return;
        }

        event.preventDefault();

        const clientPosition =
          lastCanvasPointerClientPositionRef.current ??
          getCanvasFallbackClientPosition();

        addNodeAtClientPosition(clientPosition, "ribbon");
        return;
      }

      if (
        event.key.toLowerCase() === "f" &&
        event.shiftKey &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        if (isEditableEventTarget(event.target)) {
          return;
        }

        if (!isTargetInsideCanvas && !isBodyTarget) {
          return;
        }

        if (isCanvasPointerDownRef.current) {
          return;
        }

        const selectedNodeIdsForFrameCreation =
          selectedNodeIds.length > 0
            ? selectedNodeIds
            : selectedNodeId
              ? [selectedNodeId]
              : [];

        const selectedNodeIdsForFrameCreationSet = new Set(selectedNodeIdsForFrameCreation);
        const selectedNonFrameNodesForFrameCreation = nodes.filter(
          (node) =>
            selectedNodeIdsForFrameCreationSet.has(node.id) &&
            node.data.node_type !== "frame"
        );

        event.preventDefault();
        createFrameFromSelectionRef.current(selectedNonFrameNodesForFrameCreation);
        return;
      }

      if (event.key !== "Delete" && event.key !== "Backspace") {
        return;
      }

      if (isEditableEventTarget(event.target)) {
        return;
      }

      if (!selectedEdgeId && !selectedNodeId && selectedNodeIds.length === 0) {
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
    addNodeAtClientPosition,
    copySelectedCanvasNodes,
    getCanvasFallbackClientPosition,
    handleDeleteSelection,
    nodes,
    pasteCopiedCanvasNodes,
    selectedEdgeId,
    selectedNodeId,
    selectedNodeIds,
    store.session.editorMode,
    store.session.view,
  ]);

  const ordering = useMemo(() => computeFlowOrdering(nodes, edges), [nodes, edges]);

  const projectSequenceId = useMemo(
    () => computeProjectSequenceId(ordering.sequentialOrderedNodeIds, nodes, edges),
    [edges, nodes, ordering.sequentialOrderedNodeIds]
  );

  const selectedNodeIdsForUiJourneyConversation = useMemo(() => {
    if (selectedEdgeId) {
      return [];
    }

    const canonicalSelectedIds =
      selectedNodeIds.length > 0
        ? selectedNodeIds
        : selectedNodeId
          ? [selectedNodeId]
          : [];

    return Array.from(new Set(canonicalSelectedIds));
  }, [selectedEdgeId, selectedNodeId, selectedNodeIds]);

  const uiJourneySnapshotCapture = useMemo(
    () =>
      buildUiJourneySnapshotCapture({
        nodes,
        edges,
        ordering,
        selectedNodeIds: selectedNodeIdsForUiJourneyConversation,
      }),
    [edges, nodes, ordering, selectedNodeIdsForUiJourneyConversation]
  );

  const canOpenUiJourneyConversation =
    uiJourneySnapshotCapture.nodeIds.length > 0;

  const canSaveUiJourneySnapshotPreset =
    uiJourneySnapshotCapture.nodeIds.length > 0;

  const uiJourneyHighlightedNodeIdSet = useMemo(
    () => new Set(uiJourneySnapshotCapture.nodeIds),
    [uiJourneySnapshotCapture.nodeIds]
  );

  const recalledUiJourneyNodeIdSet = useMemo(
    () => new Set(recalledUiJourneyNodeIds),
    [recalledUiJourneyNodeIds]
  );

  const recalledUiJourneyEdgeIdSet = useMemo(
    () => new Set(recalledUiJourneyEdgeIds),
    [recalledUiJourneyEdgeIds]
  );

  const nodesWithSequence = useMemo(
    () =>
      nodes.map((node) => {
        const nodeId = node.id;

        return {
          ...node,
          data: {
            ...node.data,
            sequence_index: ordering.sequenceByNodeId[nodeId] ?? null,
            ui_journey_highlighted: uiJourneyHighlightedNodeIdSet.has(nodeId),
            ui_journey_recalled: recalledUiJourneyNodeIdSet.has(nodeId),
          },
        };
      }),
    [
      nodes,
      ordering.sequenceByNodeId,
      recalledUiJourneyNodeIdSet,
      uiJourneyHighlightedNodeIdSet,
    ]
  );

  const displayEdges = useMemo(
    () =>
      edges.map((edge) => {
        const edgeKind = getEdgeKind(edge);
        const edgeIsSequential = edgeKind === "sequential";
        const edgeIsSelected = selectedEdgeId === edge.id || Boolean(edge.selected);
        const sourceOrder = ordering.sequenceByNodeId[edge.source];
        const targetOrder = ordering.sequenceByNodeId[edge.target];
        const edgeIsUiJourneyHighlighted =
          !edgeIsSelected &&
          uiJourneyHighlightedNodeIdSet.has(edge.source) &&
          uiJourneyHighlightedNodeIdSet.has(edge.target);
        const edgeIsUiJourneyRecalled =
          !edgeIsSelected &&
          (recalledUiJourneyEdgeIdSet.has(edge.id) ||
            (recalledUiJourneyNodeIdSet.has(edge.source) &&
              recalledUiJourneyNodeIdSet.has(edge.target)));

        return applyEdgeVisuals(
          {
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
          },
          {
            selected: edgeIsSelected,
            highlightStrokeColor: edgeIsUiJourneyRecalled
              ? UI_JOURNEY_RECALLED_STROKE_COLOR
              : edgeIsUiJourneyHighlighted
                ? UI_JOURNEY_HIGHLIGHT_STROKE_COLOR
                : null,
          }
        );
      }),
    [
      edges,
      ordering.sequenceByNodeId,
      recalledUiJourneyEdgeIdSet,
      recalledUiJourneyNodeIdSet,
      selectedEdgeId,
      uiJourneyHighlightedNodeIdSet,
    ]
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

  const selectedNodeIsDefaultInspectorNode =
    selectedNode !== null &&
    selectedNode.data.node_type !== "ribbon" &&
    selectedNode.data.node_type !== "menu" &&
    selectedNode.data.node_type !== "frame";

  const selectedInspectorNodeIds = useMemo(() => {
    const selectedIds =
      selectedNodeIds.length > 0
        ? selectedNodeIds
        : selectedNodeId
          ? [selectedNodeId]
          : [];

    return Array.from(new Set(selectedIds));
  }, [selectedNodeId, selectedNodeIds]);

  const hasSelectedNodes = selectedInspectorNodeIds.length > 0;
  const hasExactlyOneSelectedNode = selectedInspectorNodeIds.length === 1;
  const hasMultipleSelectedNodes = selectedInspectorNodeIds.length > 1;

  const selectedNonFrameNodesForFrameCreation = useMemo(() => {
    const selectedIds =
      selectedNodeIds.length > 0
        ? selectedNodeIds
        : selectedNodeId
          ? [selectedNodeId]
          : [];

    if (selectedIds.length === 0) {
      return [];
    }

    const selectedIdSet = new Set(selectedIds);
    return nodes.filter(
      (node) => selectedIdSet.has(node.id) && node.data.node_type !== "frame"
    );
  }, [nodes, selectedNodeId, selectedNodeIds]);

  const canCreateFrameFromSelection =
    selectedNonFrameNodesForFrameCreation.length >= 2;

  const trimmedFeedbackEmail = feedbackEmail.trim();
  const trimmedFeedbackMessage = feedbackMessage.trim();
  const isFeedbackEmailValid =
    trimmedFeedbackEmail.length === 0 ||
    !trimmedFeedbackEmail.includes("@") ||
    FEEDBACK_EMAIL_REGEX.test(trimmedFeedbackEmail);
  const isFeedbackMessageValid =
    trimmedFeedbackMessage.length > 0 &&
    trimmedFeedbackMessage.length <= FEEDBACK_MAX_MESSAGE_LENGTH;
  const canSubmitFeedback =
    feedbackSubmitStatus !== "submitting" &&
    isFeedbackEmailValid &&
    isFeedbackMessageValid;

  const openHelpModal = useCallback(() => {
    setIsHelpModalOpen(true);
  }, []);

  const closeHelpModal = useCallback(() => {
    setIsHelpModalOpen(false);
  }, []);

  const openFeedbackModal = useCallback(() => {
    setFeedbackSubmitStatus("idle");
    setFeedbackSubmitMessage(null);
    setIsFeedbackModalOpen(true);
  }, []);

  const closeFeedbackModal = useCallback(() => {
    if (feedbackSubmitStatus === "submitting") {
      return;
    }

    setIsFeedbackModalOpen(false);
  }, [feedbackSubmitStatus]);

  const handleFeedbackSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (trimmedFeedbackMessage.length === 0) {
        setFeedbackSubmitStatus("error");
        setFeedbackSubmitMessage("Please add your feedback before sending.");
        return;
      }

      if (trimmedFeedbackMessage.length > FEEDBACK_MAX_MESSAGE_LENGTH) {
        setFeedbackSubmitStatus("error");
        setFeedbackSubmitMessage(
          `Feedback must be ${FEEDBACK_MAX_MESSAGE_LENGTH} characters or less.`
        );
        return;
      }

      if (
        trimmedFeedbackEmail.length > 0 &&
        trimmedFeedbackEmail.includes("@") &&
        !FEEDBACK_EMAIL_REGEX.test(trimmedFeedbackEmail)
      ) {
        setFeedbackSubmitStatus("error");
        setFeedbackSubmitMessage(
          "If you include an email, please enter a valid email address."
        );
        return;
      }

      setFeedbackSubmitStatus("submitting");
      setFeedbackSubmitMessage(null);

      try {
        const response = await fetch("/api/feedback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            feedbackType,
            email: trimmedFeedbackEmail || null,
            message: trimmedFeedbackMessage,
            context: {
              accountId: activeAccount?.id ?? null,
              accountCode: activeAccount?.code ?? null,
              projectId: activeProject?.id ?? null,
              projectName: activeProject?.name ?? null,
            },
          }),
        });

        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        if (!response.ok) {
          throw new Error(payload?.error ?? "Unable to send feedback right now.");
        }

        setFeedbackSubmitStatus("success");
        setFeedbackSubmitMessage("Thanks! Your feedback has been sent.");
        setFeedbackType("user_interface");
        setFeedbackEmail("");
        setFeedbackMessage("");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to send feedback right now.";
        setFeedbackSubmitStatus("error");
        setFeedbackSubmitMessage(message);
      }
    },
    [
      activeAccount?.code,
      activeAccount?.id,
      activeProject?.id,
      activeProject?.name,
      feedbackType,
      trimmedFeedbackEmail,
      trimmedFeedbackMessage,
    ]
  );

  const openUiJourneyConversation = useCallback(() => {
    const entries = buildUiJourneyConversationEntries({
      nodes,
      edges,
      ordering,
      selectedNodeIds: selectedNodeIdsForUiJourneyConversation,
    });

    setUiJourneyConversationSnapshot(entries);
    setIsUiJourneyConversationOpen(true);
  }, [edges, nodes, ordering, selectedNodeIdsForUiJourneyConversation]);

  const closeUiJourneyConversation = useCallback(() => {
    setIsUiJourneyConversationOpen(false);
  }, []);

  const saveUiJourneySnapshotPreset = useCallback(() => {
    if (!canSaveUiJourneySnapshotPreset) {
      return;
    }

    const now = new Date().toISOString();
    const trimmedSnapshotName = uiJourneySnapshotDraftName.trim();
    const nextSnapshotName =
      trimmedSnapshotName.length > 0
        ? trimmedSnapshotName
        : `Snapshot ${uiJourneySnapshotPresets.length + 1}`;
    const snapshotConversation = cloneUiJourneyConversationEntries(
      uiJourneySnapshotCapture.conversation
    );

    const nextPreset: UiJourneySnapshotPreset = {
      id: createUiJourneySnapshotPresetId(),
      name: nextSnapshotName,
      createdAt: now,
      updatedAt: now,
      nodeIds: [...uiJourneySnapshotCapture.nodeIds],
      edgeIds: [...uiJourneySnapshotCapture.edgeIds],
      conversation: snapshotConversation,
    };

    queueUndoSnapshot();

    setUiJourneySnapshotPresets((currentPresets) => [...currentPresets, nextPreset]);
    setSelectedUiJourneySnapshotPresetId(nextPreset.id);
    setRecalledUiJourneyNodeIds([...nextPreset.nodeIds]);
    setRecalledUiJourneyEdgeIds([...nextPreset.edgeIds]);
    setUiJourneyConversationSnapshot(
      cloneUiJourneyConversationEntries(nextPreset.conversation)
    );
    setIsUiJourneyConversationOpen(true);
    setUiJourneySnapshotDraftName("");
  }, [
    canSaveUiJourneySnapshotPreset,
    queueUndoSnapshot,
    uiJourneySnapshotCapture,
    uiJourneySnapshotDraftName,
    uiJourneySnapshotPresets.length,
  ]);

  const recallUiJourneySnapshotPreset = useCallback(
    (presetId: string) => {
      const matchingPreset = uiJourneySnapshotPresets.find(
        (preset) => preset.id === presetId
      );

      if (!matchingPreset) {
        return;
      }

      queueUndoSnapshot();

      setSelectedUiJourneySnapshotPresetId(matchingPreset.id);
      setRecalledUiJourneyNodeIds([...matchingPreset.nodeIds]);
      setRecalledUiJourneyEdgeIds([...matchingPreset.edgeIds]);
      setUiJourneyConversationSnapshot(
        cloneUiJourneyConversationEntries(matchingPreset.conversation)
      );
      setIsUiJourneyConversationOpen(true);
    },
    [queueUndoSnapshot, uiJourneySnapshotPresets]
  );

  const deleteUiJourneySnapshotPreset = useCallback(
    (presetId: string) => {
      const matchingPreset = uiJourneySnapshotPresets.find(
        (preset) => preset.id === presetId
      );

      if (!matchingPreset) {
        return;
      }

      const confirmed = window.confirm(
        `Delete snapshot "${matchingPreset.name}"?`
      );

      if (!confirmed) {
        return;
      }

      queueUndoSnapshot();

      setUiJourneySnapshotPresets((currentPresets) =>
        currentPresets.filter((preset) => preset.id !== presetId)
      );

      if (selectedUiJourneySnapshotPresetId === presetId) {
        setSelectedUiJourneySnapshotPresetId(null);
        setRecalledUiJourneyNodeIds([]);
        setRecalledUiJourneyEdgeIds([]);
      }
    },
    [queueUndoSnapshot, selectedUiJourneySnapshotPresetId, uiJourneySnapshotPresets]
  );

  const clearRecalledUiJourneySnapshot = useCallback(() => {
    if (
      !selectedUiJourneySnapshotPresetId &&
      recalledUiJourneyNodeIds.length === 0 &&
      recalledUiJourneyEdgeIds.length === 0
    ) {
      return;
    }

    queueUndoSnapshot();

    setSelectedUiJourneySnapshotPresetId(null);
    setRecalledUiJourneyNodeIds([]);
    setRecalledUiJourneyEdgeIds([]);
  }, [
    queueUndoSnapshot,
    recalledUiJourneyEdgeIds.length,
    recalledUiJourneyNodeIds.length,
    selectedUiJourneySnapshotPresetId,
  ]);

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

  const syncFieldToRegistry = useCallback(
    (nodeId: string, field: DynamicRegistryTrackedField, value: string) => {
      setTermRegistry((currentRegistry) => {
        const now = new Date().toISOString();
        const matchingEntries = currentRegistry.filter(
          (entry) => entry.assignedNodeId === nodeId && entry.assignedField === field
        );
        const existingEntry = matchingEntries[0] ?? null;
        const duplicateEntries = matchingEntries.slice(1);

        let hasChanges = false;
        let nextRegistry = currentRegistry;

        const ensureMutableRegistry = () => {
          if (hasChanges) {
            return;
          }

          nextRegistry = [...currentRegistry];
          hasChanges = true;
        };

        if (duplicateEntries.length > 0) {
          ensureMutableRegistry();
          const duplicateEntryIdSet = new Set(duplicateEntries.map((entry) => entry.id));
          nextRegistry = nextRegistry.filter((entry) => !duplicateEntryIdSet.has(entry.id));
        }

        if (value.trim() === "") {
          if (!existingEntry) {
            return hasChanges ? nextRegistry : currentRegistry;
          }

          ensureMutableRegistry();

          const existingIndex = nextRegistry.findIndex(
            (entry) => entry.id === existingEntry.id
          );

          if (existingIndex !== -1) {
            nextRegistry.splice(existingIndex, 1);
          }

          return nextRegistry;
        }

        if (!existingEntry) {
          const newEntry: TermRegistryEntry = {
            id: crypto.randomUUID(),
            value,
            friendlyId: null,
            friendlyIdLocked: false,
            termType: getRegistryTermTypeFromField(field),
            assignedNodeId: nodeId,
            assignedField: field,
            deduplicationSuffix: null,
            createdAt: now,
            updatedAt: now,
          };

          ensureMutableRegistry();
          nextRegistry.push(newEntry);
          return nextRegistry;
        }

        if (existingEntry.value === value) {
          return hasChanges ? nextRegistry : currentRegistry;
        }

        ensureMutableRegistry();

        const existingIndex = nextRegistry.findIndex(
          (entry) => entry.id === existingEntry.id
        );

        if (existingIndex === -1) {
          return nextRegistry;
        }

        nextRegistry[existingIndex] = {
          ...nextRegistry[existingIndex],
          value,
          updatedAt: now,
        };

        return nextRegistry;
      });
    },
    [setTermRegistry]
  );

  const syncSelectedRegistryFieldOnBlur = useCallback(
    (field: RegistryTrackedField, value: string) => {
      if (!effectiveSelectedNodeId) {
        return;
      }

      const selectedNodeForRegistry = nodes.find(
        (node) => node.id === effectiveSelectedNodeId
      );
      if (selectedNodeForRegistry?.data.node_type === "frame") {
        return;
      }

      syncFieldToRegistry(effectiveSelectedNodeId, field, value);
    },
    [effectiveSelectedNodeId, nodes, syncFieldToRegistry]
  );

  const commitSelectedRegistryField = useCallback(
    (field: RegistryTrackedField, value: string) => {
      syncSelectedRegistryFieldOnBlur(field, value);
    },
    [syncSelectedRegistryFieldOnBlur]
  );

  const commitSelectedMenuTermRegistryField = useCallback(
    (menuTermId: string, value: string) => {
      if (!effectiveSelectedNodeId || selectedNode?.data.node_type !== "menu") {
        return;
      }

      syncFieldToRegistry(
        effectiveSelectedNodeId,
        buildMenuTermRegistryField(menuTermId),
        value
      );
    },
    [effectiveSelectedNodeId, selectedNode, syncFieldToRegistry]
  );

  const commitSelectedRibbonCellRegistryField = useCallback(
    (cellId: string, fieldName: RibbonCellRegistryFieldName, value: string) => {
      if (!effectiveSelectedNodeId || selectedNode?.data.node_type !== "ribbon") {
        return;
      }

      syncFieldToRegistry(
        effectiveSelectedNodeId,
        buildRibbonCellRegistryField(cellId, fieldName),
        value
      );
    },
    [effectiveSelectedNodeId, selectedNode, syncFieldToRegistry]
  );

  const commitRegistryFriendlyId = useCallback(
    (entryId: string, nextFriendlyIdRaw: string): boolean => {
      const targetEntry = termRegistry.find((entry) => entry.id === entryId);
      if (!targetEntry) {
        return false;
      }

      const nextFriendlyIdValue = nextFriendlyIdRaw.trim();
      const nextFriendlyId =
        nextFriendlyIdValue.length > 0 ? nextFriendlyIdValue : null;

      if (targetEntry.friendlyId === nextFriendlyId) {
        return true;
      }

      if (nextFriendlyId) {
        const duplicateEntry = termRegistry.find(
          (entry) => entry.id !== entryId && entry.friendlyId === nextFriendlyId
        );

        if (duplicateEntry) {
          const allowDuplicate = window.confirm(
            `The ID ${nextFriendlyId} is already used by another term. Use it anyway?`
          );

          if (!allowDuplicate) {
            return false;
          }
        }
      }

      queueUndoSnapshot();

      const now = new Date().toISOString();
      setTermRegistry((currentRegistry) =>
        currentRegistry.map((entry) =>
          entry.id === entryId
            ? {
                ...entry,
                friendlyId: nextFriendlyId,
                updatedAt: now,
              }
            : entry
        )
      );

      return true;
    },
    [queueUndoSnapshot, setTermRegistry, termRegistry]
  );

  const toggleRegistryEntryFriendlyIdLock = useCallback(
    (entryId: string) => {
      const targetEntry = termRegistry.find((entry) => entry.id === entryId);
      if (!targetEntry) {
        return;
      }

      queueUndoSnapshot();

      const now = new Date().toISOString();
      setTermRegistry((currentRegistry) =>
        currentRegistry.map((entry) =>
          entry.id === entryId
            ? {
                ...entry,
                friendlyIdLocked: !entry.friendlyIdLocked,
                updatedAt: now,
              }
            : entry
        )
      );
    },
    [queueUndoSnapshot, setTermRegistry, termRegistry]
  );

  const updateRegistryEntryTermType = useCallback(
    (entryId: string, nextTermTypeValue: string) => {
      const targetEntry = termRegistry.find((entry) => entry.id === entryId);
      if (!targetEntry) {
        return;
      }

      const normalizedTermType = nextTermTypeValue.trim();
      const nextTermType = normalizedTermType.length > 0 ? normalizedTermType : null;

      if (targetEntry.termType === nextTermType) {
        return;
      }

      queueUndoSnapshot();

      const now = new Date().toISOString();
      setTermRegistry((currentRegistry) =>
        currentRegistry.map((entry) =>
          entry.id === entryId
            ? {
                ...entry,
                termType: nextTermType,
                updatedAt: now,
              }
            : entry
        )
      );
    },
    [queueUndoSnapshot, setTermRegistry, termRegistry]
  );

  const removeRegistryEntry = useCallback(
    (entryId: string) => {
      const targetEntry = termRegistry.find((entry) => entry.id === entryId);
      if (!targetEntry) {
        return;
      }

      const shouldRemove = window.confirm(
        "Remove this term from the registry? The text in the node field will be kept but will no longer be tracked."
      );

      if (!shouldRemove) {
        return;
      }

      queueUndoSnapshot();
      setTermRegistry((currentRegistry) =>
        currentRegistry.filter((entry) => entry.id !== entryId)
      );
    },
    [queueUndoSnapshot, setTermRegistry, termRegistry]
  );

  const addRegistryEntry = useCallback(() => {
    const nextValue = registryDraftValue.trim();
    if (!nextValue) {
      return;
    }

    const normalizedTermType = registryDraftTermType.trim();
    const nextTermType = normalizedTermType.length > 0 ? normalizedTermType : null;

    queueUndoSnapshot();

    const now = new Date().toISOString();

    setTermRegistry((currentRegistry) => [
      ...currentRegistry,
      {
        id: crypto.randomUUID(),
        value: nextValue,
        friendlyId: null,
        friendlyIdLocked: false,
        termType: nextTermType,
        assignedNodeId: null,
        assignedField: null,
        deduplicationSuffix: null,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    setRegistryDraftValue("");
    setRegistryDraftTermType("");
  }, [queueUndoSnapshot, registryDraftTermType, registryDraftValue, setTermRegistry]);

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

  const updateSelectedDisplayTermField = useCallback(
    (nextField: NodeControlledLanguageFieldType) => {
      if (!effectiveSelectedNodeId) {
        return;
      }

      queueUndoSnapshot();

      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === effectiveSelectedNodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  display_term_field: nextField,
                },
              }
            : node
        )
      );
    },
    [effectiveSelectedNodeId, queueUndoSnapshot, setNodes]
  );

  const updateNodeTypeById = useCallback(
    (nodeId: string, nextType: NodeType) => {
      const targetNode = nodes.find((node) => node.id === nodeId);
      if (!targetNode) {
        return;
      }

      if (
        targetNode.data.node_type !== "default" &&
        targetNode.data.node_type !== nextType
      ) {
        return;
      }

      if (targetNode.data.node_type === nextType) {
        return;
      }

      queueUndoSnapshot();

      setNodes((currentNodes) =>
        pruneFrameNodeMembership(currentNodes.map((node) => {
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

          if (nextType === "frame") {
            const normalizedFrameConfig = normalizeFrameNodeConfig(node.data.frame_config);

            return {
              ...node,
              data: {
                ...node.data,
                node_type: "frame",
                primary_cta: getPrimaryMenuTermValue(
                  node.data.menu_config,
                  node.data.primary_cta
                ),
                secondary_cta: getSecondaryMenuTermValue(
                  node.data.menu_config,
                  node.data.secondary_cta
                ),
                frame_config: {
                  ...normalizedFrameConfig,
                  member_node_ids: normalizedFrameConfig.member_node_ids.filter(
                    (memberNodeId) => memberNodeId !== node.id
                  ),
                },
              },
            };
          }

          if (nextType === "ribbon") {
            return {
              ...node,
              data: {
                ...node.data,
                node_type: "ribbon",
                primary_cta: getPrimaryMenuTermValue(
                  node.data.menu_config,
                  node.data.primary_cta
                ),
                secondary_cta: getSecondaryMenuTermValue(
                  node.data.menu_config,
                  node.data.secondary_cta
                ),
                ribbon_config: normalizeRibbonNodeConfig(node.data.ribbon_config),
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
        }))
      );

      setEdges((currentEdges) => {
        if (nextType === "menu") {
          return assignSequentialEdgesToMenuHandles(
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
          );
        }

        return remapMenuSequentialEdgesToDefaultHandle(currentEdges, nodeId);
      });

      if (nextType !== "menu") {
        clearMenuTermDeleteError();
      }

      setOpenControlledLanguageFieldType(null);
      setOpenInspectorMenuGlossaryTermId(null);
      setOpenInspectorRibbonCellGlossary(null);
    },
    [clearMenuTermDeleteError, nodes, queueUndoSnapshot, setEdges, setNodes]
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

      const removedMenuTermIds = currentMenuConfig.terms
        .map((menuTerm) => menuTerm.id)
        .filter(
          (menuTermId) =>
            !normalizedNextMenuConfig.terms.some((menuTerm) => menuTerm.id === menuTermId)
        );

      if (removedMenuTermIds.length > 0) {
        const removedMenuTermFieldSet = new Set(
          removedMenuTermIds.map((menuTermId) => buildMenuTermRegistryField(menuTermId))
        );

        setTermRegistry((currentRegistry) => {
          const now = new Date().toISOString();
          let hasChanges = false;

          const nextRegistry = currentRegistry.map((entry) => {
            if (
              entry.assignedNodeId !== nodeId ||
              entry.assignedField === null ||
              !removedMenuTermFieldSet.has(entry.assignedField as MenuTermRegistryField)
            ) {
              return entry;
            }

            hasChanges = true;

            return {
              ...entry,
              assignedNodeId: null,
              assignedField: null,
              updatedAt: now,
            };
          });

          return hasChanges ? nextRegistry : currentRegistry;
        });
      }

      setOpenInspectorMenuGlossaryTermId((current) =>
        current && normalizedNextMenuConfig.terms.some((term) => term.id === current)
          ? current
          : null
      );
    },
    [nodes, queueUndoSnapshot, setEdges, setNodes, setTermRegistry]
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

  const selectedFrameNodeConfig = useMemo(() => {
    if (!selectedNode || selectedNode.data.node_type !== "frame") {
      return null;
    }

    return normalizeFrameNodeConfig(selectedNode.data.frame_config);
  }, [selectedNode]);

  const selectedRibbonNodeConfig = useMemo(() => {
    if (!selectedNode || selectedNode.data.node_type !== "ribbon") {
      return null;
    }

    return normalizeRibbonNodeConfig(selectedNode.data.ribbon_config);
  }, [selectedNode]);

  const visibleInspectorMenuGlossaryTermId =
    selectedMenuNodeConfig &&
    openInspectorMenuGlossaryTermId &&
    selectedMenuNodeConfig.terms.some(
      (term) => term.id === openInspectorMenuGlossaryTermId
    )
      ? openInspectorMenuGlossaryTermId
      : null;

  const visibleInspectorRibbonCellGlossary =
    selectedRibbonNodeConfig &&
    openInspectorRibbonCellGlossary &&
    selectedRibbonNodeConfig.cells.some(
      (cell) => cell.id === openInspectorRibbonCellGlossary.cellId
    )
      ? openInspectorRibbonCellGlossary
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

  const updateSelectedFrameShade = useCallback(
    (nextShade: FrameShade) => {
      if (!effectiveSelectedNodeId) {
        return;
      }

      queueUndoSnapshot();

      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          if (node.id !== effectiveSelectedNodeId || node.data.node_type !== "frame") {
            return node;
          }

          const currentFrameConfig = normalizeFrameNodeConfig(node.data.frame_config);

          if (currentFrameConfig.shade === nextShade) {
            return node;
          }

          return {
            ...node,
            data: {
              ...node.data,
              frame_config: {
                ...currentFrameConfig,
                shade: nextShade,
              },
            },
          };
        })
      );
    },
    [effectiveSelectedNodeId, queueUndoSnapshot, setNodes]
  );

  const updateRibbonColumns = useCallback(
    (delta: number) => {
      if (!effectiveSelectedNodeId || (delta !== 1 && delta !== -1)) {
        return;
      }

      const targetNode = nodes.find((node) => node.id === effectiveSelectedNodeId);
      if (!targetNode || targetNode.data.node_type !== "ribbon") {
        return;
      }

      const currentRibbonConfig = normalizeRibbonNodeConfig(targetNode.data.ribbon_config);
      const nextColumns = Math.max(
        RIBBON_NODE_MIN_COLUMNS,
        currentRibbonConfig.columns + delta
      );

      if (nextColumns === currentRibbonConfig.columns) {
        return;
      }

      let nextCells = [...currentRibbonConfig.cells];

      if (nextColumns > currentRibbonConfig.columns) {
        for (let row = 0; row < currentRibbonConfig.rows; row += 1) {
          for (
            let column = currentRibbonConfig.columns;
            column < nextColumns;
            column += 1
          ) {
            nextCells.push(createRibbonNodeCell(row, column));
          }
        }
      } else {
        nextCells = nextCells.filter((cell) => cell.column < nextColumns);
      }

      const nextRibbonConfig = normalizeRibbonNodeConfig({
        ...currentRibbonConfig,
        columns: nextColumns,
        cells: nextCells,
      });

      queueUndoSnapshot();

      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === targetNode.id
            ? {
                ...node,
                data: {
                  ...node.data,
                  ribbon_config: nextRibbonConfig,
                },
              }
            : node
        )
      );

      setEdges((currentEdges) =>
        syncSequentialEdgesForRibbonNode(targetNode.id, nextRibbonConfig, currentEdges)
      );

      setOpenInspectorRibbonCellGlossary((current) =>
        current && nextRibbonConfig.cells.some((cell) => cell.id === current.cellId)
          ? current
          : null
      );
    },
    [effectiveSelectedNodeId, nodes, queueUndoSnapshot, setEdges, setNodes]
  );

  const updateRibbonCellField = useCallback(
    (
      cellId: string,
      fieldName: "label" | "key_command" | "tool_tip",
      value: string
    ) => {
      if (!effectiveSelectedNodeId || !selectedNode || selectedNode.data.node_type !== "ribbon") {
        return;
      }

      const targetNode = nodes.find((node) => node.id === effectiveSelectedNodeId);
      if (!targetNode || targetNode.data.node_type !== "ribbon") {
        return;
      }

      const currentRibbonConfig = normalizeRibbonNodeConfig(selectedNode.data.ribbon_config);
      if (!currentRibbonConfig.cells.some((cell) => cell.id === cellId)) {
        return;
      }

      const nextRibbonConfig = normalizeRibbonNodeConfig({
        ...currentRibbonConfig,
        cells: currentRibbonConfig.cells.map((cell) =>
          cell.id === cellId
            ? {
                ...cell,
                [fieldName]: value,
              }
            : cell
        ),
      });

      queueUndoSnapshot();

      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === targetNode.id
            ? {
                ...node,
                data: {
                  ...node.data,
                  ribbon_config: nextRibbonConfig,
                },
              }
            : node
        )
      );
    },
    [effectiveSelectedNodeId, nodes, queueUndoSnapshot, selectedNode, setNodes]
  );

  const commitSelectedMenuRightConnectionsInput = useCallback((rawValue: string) => {
    const sanitizedValue = rawValue.replace(/[^\d]/g, "");
    const parsedValue = Number.parseInt(sanitizedValue, 10);
    const nextValue = clampMenuRightConnections(
      Number.isFinite(parsedValue)
        ? parsedValue
        : MENU_NODE_RIGHT_CONNECTIONS_MIN
    );

    if (!selectedMenuNodeConfig) {
      return String(nextValue);
    }

    if (nextValue !== selectedMenuNodeConfig.max_right_connections) {
      updateSelectedMenuMaxRightConnections(nextValue);
    }

    return String(nextValue);
  }, [selectedMenuNodeConfig, updateSelectedMenuMaxRightConnections]);

  const addSelectedMenuTerm = useCallback(() => {
    if (!effectiveSelectedNodeId || !selectedMenuNodeConfig) {
      return;
    }

    updateMenuNodeConfigById(effectiveSelectedNodeId, (currentConfig) => ({
      max_right_connections: clampMenuRightConnections(
        currentConfig.max_right_connections + 1
      ),
      terms: [...currentConfig.terms, createMenuNodeTerm("")],
    }));
  }, [effectiveSelectedNodeId, selectedMenuNodeConfig, updateMenuNodeConfigById]);

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

      if (selectedMenuNodeConfig.terms.length <= MENU_NODE_RIGHT_CONNECTIONS_MIN) {
        showMenuTermDeleteBlockedMessage();
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
    [
      effectiveSelectedNodeId,
      selectedMenuNodeConfig,
      showMenuTermDeleteBlockedMessage,
      updateMenuNodeConfigById,
    ]
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

  const toggleInspectorRibbonCellGlossary = useCallback(
    (cellId: string, field: "label" | "key_command") => {
      setOpenInspectorRibbonCellGlossary((current) =>
        current && current.cellId === cellId && current.field === field
          ? null
          : { cellId, field }
      );
    },
    []
  );

  const applyGlossaryTermToInspectorRibbonCell = useCallback(
    (cellId: string, field: "label" | "key_command", glossaryTerm: string) => {
      updateRibbonCellField(cellId, field, glossaryTerm);
      setOpenInspectorRibbonCellGlossary(null);
    },
    [updateRibbonCellField]
  );

  const createFrameFromSelection = useCallback(
    (selectedNodesForFrameCreation: FlowNode[] = selectedNonFrameNodesForFrameCreation) => {
    if (selectedNodesForFrameCreation.length < 2) {
      return;
    }

    const bounds = computeNodesBoundingRect(selectedNodesForFrameCreation);
    if (!bounds) {
      return;
    }

    const frameId = createNodeId();
    const framePosition = {
      x: bounds.left - FRAME_NODE_PADDING,
      y: bounds.top - FRAME_NODE_PADDING,
    };
    const frameWidth = clampFrameDimension(
      bounds.width + FRAME_NODE_PADDING * 2,
      FRAME_NODE_MIN_WIDTH
    );
    const frameHeight = clampFrameDimension(
      bounds.height + FRAME_NODE_PADDING * 2,
      FRAME_NODE_MIN_HEIGHT
    );
    const memberNodeIds = selectedNodesForFrameCreation.map((node) => node.id);

    queueUndoSnapshot();

    setNodes((currentNodes) => {
      const nextFrameNode = normalizeNode(
        {
          id: frameId,
          position: framePosition,
          data: {
            node_type: "frame",
            title: "",
            frame_config: {
              shade: "medium",
              member_node_ids: memberNodeIds,
              width: frameWidth,
              height: frameHeight,
            },
          },
        },
        normalizeGlobalOptionConfig(adminOptions)
      );

      return pruneFrameNodeMembership([nextFrameNode, ...currentNodes]);
    });

    setOpenControlledLanguageFieldType(null);
    setOpenInspectorMenuGlossaryTermId(null);
    setOpenInspectorRibbonCellGlossary(null);
    setSelectedEdgeId(null);
    setSelectedNodeId(frameId);
    setSelectedNodeIds([frameId]);
    },
    [adminOptions, queueUndoSnapshot, selectedNonFrameNodesForFrameCreation, setNodes]
  );

  useEffect(() => {
    updateMenuNodeConfigByIdRef.current = updateMenuNodeConfigById;
  }, [updateMenuNodeConfigById]);

  useEffect(() => {
    createFrameFromSelectionRef.current = createFrameFromSelection;
  }, [createFrameFromSelection]);

  const glossaryHighlightedNodeIdSet = useMemo(
    () => new Set(glossaryHighlightedNodeIds),
    [glossaryHighlightedNodeIds]
  );

  const nodeTypes = useMemo(
    () => ({
      flowcopyNode: (props: NodeProps<FlowNode>) => (
        <FlowCopyNode
          {...props}
          onBeforeChange={() => captureUndoSnapshotRef.current()}
          onCommitRegistryField={syncFieldToRegistry}
          menuTermGlossaryTerms={menuTermGlossaryTermsRef.current}
          glossaryHighlightedNodeIds={glossaryHighlightedNodeIdSet}
          showNodeId={showNodeIdsOnCanvas}
          showDefaultNodeTitleOnCanvas={showDefaultNodeTitleOnCanvas}
          onMenuTermDeleteBlocked={showMenuTermDeleteBlockedMessage}
          onMenuNodeConfigChange={(nodeId, updater) =>
            updateMenuNodeConfigByIdRef.current(nodeId, updater)
          }
        />
      ),
    }),
    [
      glossaryHighlightedNodeIdSet,
      showDefaultNodeTitleOnCanvas,
      showNodeIdsOnCanvas,
      showMenuTermDeleteBlockedMessage,
    ]
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

  const maxMenuTermColumnCount = useMemo(
    () =>
      projectTableRows.reduce((maxCount, { node }) => {
        if (node.data.node_type !== "menu") {
          return maxCount;
        }

        const normalizedMenuConfig = normalizeMenuNodeConfig(
          node.data.menu_config,
          node.data.primary_cta,
          Math.max(
            MENU_NODE_RIGHT_CONNECTIONS_MIN,
            node.data.menu_config.max_right_connections
          )
        );

        return Math.max(maxCount, normalizedMenuConfig.terms.length);
      }, 0),
    [projectTableRows]
  );

  const menuTermColumnIndexes = useMemo(
    () => Array.from({ length: maxMenuTermColumnCount }, (_, menuTermIndex) => menuTermIndex),
    [maxMenuTermColumnCount]
  );

  const maxRibbonCellColumnCount = useMemo(
    () =>
      projectTableRows.reduce((maxCount, { node }) => {
        if (node.data.node_type !== "ribbon") {
          return maxCount;
        }

        const normalizedRibbonConfig = normalizeRibbonNodeConfig(node.data.ribbon_config);
        return Math.max(maxCount, normalizedRibbonConfig.cells.length);
      }, 0),
    [projectTableRows]
  );

  const ribbonCellColumnIndexes = useMemo(
    () =>
      Array.from(
        { length: maxRibbonCellColumnCount },
        (_, ribbonCellIndex) => ribbonCellIndex
      ),
    [maxRibbonCellColumnCount]
  );

  const controlledLanguageAuditRows = useMemo(
    () => buildControlledLanguageAuditRows(nodes, controlledLanguageGlossary),
    [nodes, controlledLanguageGlossary]
  );

  const filteredRegistryEntries = useMemo(() => {
    let entries = [...termRegistry];

    if (registryFilterStatus === "assigned") {
      entries = entries.filter((entry) => entry.assignedNodeId !== null);
    } else if (registryFilterStatus === "unassigned") {
      entries = entries.filter((entry) => entry.assignedNodeId === null);
    }

    if (registryFilterType !== "all") {
      entries = entries.filter((entry) => entry.termType === registryFilterType);
    }

    if (registrySearchQuery.trim()) {
      const query = registrySearchQuery.trim().toLowerCase();
      entries = entries.filter(
        (entry) =>
          entry.value.toLowerCase().includes(query) ||
          (entry.friendlyId && entry.friendlyId.toLowerCase().includes(query))
      );
    }

    entries.sort((a, b) => {
      const aAssigned = a.assignedNodeId !== null ? 1 : 0;
      const bAssigned = b.assignedNodeId !== null ? 1 : 0;

      if (aAssigned !== bAssigned) {
        return aAssigned - bAssigned;
      }

      return a.value.localeCompare(b.value);
    });

    return entries;
  }, [termRegistry, registryFilterStatus, registryFilterType, registrySearchQuery]);

  const controlledLanguageNodeIdsByGlossaryKey = useMemo(
    () => buildControlledLanguageNodeIdsByGlossaryKey(nodes),
    [nodes]
  );

  useEffect(() => {
    if (!activeGlossaryHighlightKey) {
      return;
    }

    setGlossaryHighlightedNodeIds(
      controlledLanguageNodeIdsByGlossaryKey.get(activeGlossaryHighlightKey) ?? []
    );
  }, [activeGlossaryHighlightKey, controlledLanguageNodeIdsByGlossaryKey]);

  useEffect(() => {
    if (!activeRegistryHighlightEntryId) {
      return;
    }

    const activeEntry = termRegistry.find(
      (entry) => entry.id === activeRegistryHighlightEntryId
    );

    if (!activeEntry?.assignedNodeId) {
      setActiveRegistryHighlightEntryId(null);
      setGlossaryHighlightedNodeIds([]);
      return;
    }

    const assignedNodeId = activeEntry.assignedNodeId;

    setGlossaryHighlightedNodeIds((currentIds) =>
      currentIds.length === 1 && currentIds[0] === assignedNodeId
        ? currentIds
        : [assignedNodeId]
    );
  }, [activeRegistryHighlightEntryId, termRegistry]);

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

  const handleControlledLanguageOccurrencesClick = useCallback(
    (row: ControlledLanguageAuditRow, rowKey: string) => {
      if (row.occurrences === 0) {
        return;
      }

      if (activeGlossaryHighlightKey === rowKey) {
        clearGlossaryHighlights();
        return;
      }

      setActiveRegistryHighlightEntryId(null);
      setActiveGlossaryHighlightKey(rowKey);
      setGlossaryHighlightedNodeIds(controlledLanguageNodeIdsByGlossaryKey.get(rowKey) ?? []);
    },
    [
      activeGlossaryHighlightKey,
      clearGlossaryHighlights,
      controlledLanguageNodeIdsByGlossaryKey,
    ]
  );

  const handleRegistryEntryHighlightClick = useCallback(
    (entry: TermRegistryEntry) => {
      if (!entry.assignedNodeId) {
        return;
      }

      if (activeRegistryHighlightEntryId === entry.id) {
        clearGlossaryHighlights();
        return;
      }

      setActiveGlossaryHighlightKey(null);
      setActiveRegistryHighlightEntryId(entry.id);
      setGlossaryHighlightedNodeIds([entry.assignedNodeId]);
    },
    [activeRegistryHighlightEntryId, clearGlossaryHighlights]
  );

  const handleControlledLanguageReplaceAll = useCallback(
    (row: ControlledLanguageAuditRow, rowKey: string) => {
      if (activeGlossaryHighlightKey !== rowKey) {
        return;
      }

      const highlightedIds = controlledLanguageNodeIdsByGlossaryKey.get(rowKey) ?? [];
      if (highlightedIds.length === 0) {
        return;
      }

      const replacementRaw = window.prompt(
        `Replace all occurrences of "${row.term}" in highlighted nodes with:`
      );

      if (replacementRaw === null) {
        return;
      }

      const replacement = replacementRaw;
      const highlightedIdSet = new Set(highlightedIds);
      let hasAnyChange = false;
      const nextNodes = nodes.map((node) => {
        if (!highlightedIdSet.has(node.id)) {
          return node;
        }

        const replaced = replaceTermInNodeTextFields(node, row.term, replacement);
        if (replaced.changed) {
          hasAnyChange = true;
        }

        return replaced.node;
      });

      if (hasAnyChange) {
        queueUndoSnapshot();
        setNodes(nextNodes);
      }

      clearGlossaryHighlights();
    },
    [
      activeGlossaryHighlightKey,
      clearGlossaryHighlights,
      controlledLanguageNodeIdsByGlossaryKey,
      nodes,
      queueUndoSnapshot,
      setNodes,
    ]
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
    (
      projectId: string,
      extension: DownloadTextExtension,
      payload: string,
      explicitFileName?: string
    ) => {
      const mimeType = DOWNLOAD_TEXT_MIME_BY_EXTENSION[extension];
      const blob = new Blob([payload], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download =
        explicitFileName ?? buildDownloadFileName(projectId, extension);
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    },
    []
  );

  const importControlledLanguageGlossaryTerms = useCallback(
    (entries: Array<{ fieldType: unknown; term: unknown }>): number => {
      const existingGlossaryEntries = sanitizeControlledLanguageGlossary(
        controlledLanguageGlossary
      );
      const glossaryKeySet = new Set(
        existingGlossaryEntries.map((entry) =>
          buildControlledLanguageGlossaryKey(entry.field_type, entry.term)
        )
      );
      const nextGlossaryEntries = [...existingGlossaryEntries];
      let importedCount = 0;

      entries.forEach((entry) => {
        const fieldType = normalizeControlledLanguageFieldType(entry.fieldType);
        const term =
          typeof entry.term === "string"
            ? normalizeControlledLanguageTerm(entry.term)
            : "";

        if (!fieldType || !term) {
          return;
        }

        const key = buildControlledLanguageGlossaryKey(fieldType, term);
        if (glossaryKeySet.has(key)) {
          return;
        }

        glossaryKeySet.add(key);
        nextGlossaryEntries.push({
          field_type: fieldType,
          term,
          include: true,
        });
        importedCount += 1;
      });

      if (importedCount > 0) {
        updateControlledLanguageGlossaryEntries(() => nextGlossaryEntries);
      }

      return importedCount;
    },
    [controlledLanguageGlossary, updateControlledLanguageGlossaryEntries]
  );

  const exportControlledLanguageGlossary = useCallback(
    (format: "json" | "csv") => {
      if (!activeProject) {
        return;
      }

      const glossaryEntries = controlledLanguageAuditRows.map((row) => ({
        fieldType: row.field_type,
        term: row.term,
        include: row.include,
      }));

      const projectName = activeProject.name.trim() || activeProject.id;

      if (format === "json") {
        const payload = JSON.stringify(glossaryEntries, null, 2);

        downloadTextFile(
          activeProject.id,
          "json",
          payload,
          `${projectName}-glossary.json`
        );
        return;
      }

      const header = ["Field Type", "Term", "Include"].join(",");
      const rows = glossaryEntries.map((entry) =>
        [
          escapeCsvCell(entry.fieldType),
          escapeCsvCell(entry.term),
          escapeCsvCell(String(entry.include)),
        ].join(",")
      );
      const payload = [header, ...rows].join("\n");

      downloadTextFile(
        activeProject.id,
        "csv",
        payload,
        `${projectName}-glossary.csv`
      );
    },
    [activeProject, controlledLanguageAuditRows, downloadTextFile]
  );

  const triggerControlledLanguageJsonImportPicker = useCallback(() => {
    controlledLanguageJsonImportInputRef.current?.click();
  }, []);

  const triggerControlledLanguageCsvImportPicker = useCallback(() => {
    controlledLanguageCsvImportInputRef.current?.click();
  }, []);

  const importControlledLanguageGlossaryFromJsonFile = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.currentTarget.value = "";

      if (!file || !activeProject) {
        return;
      }

      try {
        const fileText = await file.text();
        const parsed = safeJsonParse(fileText);

        if (!Array.isArray(parsed)) {
          throw new Error("Invalid glossary JSON. Expected an array of entries.");
        }

        const importedCount = importControlledLanguageGlossaryTerms(
          parsed.map((item) => {
            if (!item || typeof item !== "object") {
              return { fieldType: null, term: null };
            }

            const source = item as {
              fieldType?: unknown;
              term?: unknown;
            };

            return {
              fieldType: source.fieldType,
              term: source.term,
            };
          })
        );

        setTransferFeedback({
          type: importedCount > 0 ? "success" : "info",
          message:
            importedCount > 0
              ? `Imported ${importedCount} glossary terms.`
              : "No new terms to import.",
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to import glossary JSON.";
        setTransferFeedback({
          type: "error",
          message,
        });
      }
    },
    [activeProject, importControlledLanguageGlossaryTerms]
  );

  const importControlledLanguageGlossaryFromCsvFile = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.currentTarget.value = "";

      if (!file || !activeProject) {
        return;
      }

      try {
        const fileText = await file.text();
        const parsed = parseCsvText(fileText);

        const headerMap = new Map(
          parsed.headers.map((header) => [header.trim().toLowerCase(), header])
        );
        const fieldTypeHeader = headerMap.get("field type");
        const termHeader = headerMap.get("term");

        if (!fieldTypeHeader || !termHeader) {
          throw new Error('CSV must include "Field Type" and "Term" columns.');
        }

        const importedCount = importControlledLanguageGlossaryTerms(
          parsed.rows.map((row) => ({
            fieldType: row[fieldTypeHeader],
            term: row[termHeader],
          }))
        );

        setTransferFeedback({
          type: importedCount > 0 ? "success" : "info",
          message:
            importedCount > 0
              ? `Imported ${importedCount} glossary terms.`
              : "No new terms to import.",
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to import glossary CSV.";
        setTransferFeedback({
          type: "error",
          message,
        });
      }
    },
    [activeProject, importControlledLanguageGlossaryTerms]
  );

  const exportUiJourneyConversation = useCallback(
    (format: UiJourneyConversationExportFormat) => {
      if (!activeProject) {
        return;
      }

      const generatedAtLabel = new Date().toLocaleString();

      const payload = (() => {
        switch (format) {
          case "txt":
            return buildUiJourneyConversationPlainText(
              uiJourneyConversationSnapshot,
              generatedAtLabel
            );
          case "md":
            return buildUiJourneyConversationMarkdown(
              uiJourneyConversationSnapshot,
              generatedAtLabel
            );
          case "html":
            return buildUiJourneyConversationHtmlExport(
              uiJourneyConversationSnapshot,
              generatedAtLabel
            );
          case "rtf":
            return buildUiJourneyConversationRtfExport(
              uiJourneyConversationSnapshot,
              generatedAtLabel
            );
          case "csv":
            return buildUiJourneyConversationCsv(
              uiJourneyConversationSnapshot,
              generatedAtLabel
            );
          case "xml":
            return buildUiJourneyConversationXml(
              uiJourneyConversationSnapshot,
              generatedAtLabel
            );
          case "json":
            return buildUiJourneyConversationJson(
              uiJourneyConversationSnapshot,
              generatedAtLabel
            );
          default: {
            const exhaustiveFormat: never = format;
            throw new Error(`Unsupported conversation export format: ${String(exhaustiveFormat)}`);
          }
        }
      })();

      downloadTextFile(activeProject.id, format, payload);

      setTransferFeedback({
        type: "success",
        message: `Exported UI Journey Conversation as ${UI_JOURNEY_CONVERSATION_EXPORT_FORMAT_LABELS[format]}.`,
      });
    },
    [activeProject, downloadTextFile, uiJourneyConversationSnapshot]
  );

  const exportProjectData = useCallback(
    (extension: ProjectTransferFormat) => {
      if (!activeAccount || !activeProject) {
        return;
      }

      if (extension === "json") {
        const nodesWithPrunedFrameMembership = pruneFrameNodeMembership(nodes);
        const parallelGroupByNodeId = computeParallelGroups(
          nodesWithPrunedFrameMembership,
          edges
        ).parallelGroupByNodeId;

        const projectForExport = sanitizeProjectRecord({
          ...activeProject,
          updatedAt: new Date().toISOString(),
          canvas: {
            nodes: serializeNodesForStorage(
              nodesWithPrunedFrameMembership,
              parallelGroupByNodeId
            ),
            edges: cloneEdges(edges),
            adminOptions: cloneGlobalOptions(adminOptions),
            controlledLanguageGlossary: sanitizeControlledLanguageGlossary(
              controlledLanguageGlossary
            ),
            termRegistry: [...termRegistry],
            uiJourneySnapshotPresets: cloneUiJourneySnapshotPresets(
              sanitizeUiJourneySnapshotPresets(uiJourneySnapshotPresets)
            ),
          },
        });

        if (!projectForExport) {
          setTransferFeedback({
            type: "error",
            message: "Unable to build project JSON export.",
          });
          return;
        }

        const envelope: FullProjectExportEnvelope = {
          format: FULL_PROJECT_EXPORT_FORMAT,
          schemaVersion: FULL_PROJECT_EXPORT_SCHEMA_VERSION,
          exportedAt: new Date().toISOString(),
          source: {
            appStoreVersion: store.version,
            accountId: activeAccount.id,
            accountCode: activeAccount.code,
            projectId: activeProject.id,
          },
          payload: {
            project: projectForExport,
          },
        };

        downloadTextFile(activeProject.id, "json", JSON.stringify(envelope, null, 2));

        setTransferFeedback({
          type: "success",
          message: `Exported project ${activeProject.id} as JSON full schema.`,
        });
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
        termRegistry,
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
      store.version,
      termRegistry,
      uiJourneySnapshotPresets,
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
        const format = detectProjectTransferFormat(file.name, fileText);

        if (!format) {
          setTransferFeedback({
            type: "error",
            message: "Unsupported file. Please import CSV, XML, or JSON.",
          });
          return;
        }

        let importedProject: ProjectRecord | null = null;
        let importedNodeCount = 0;

        if (format === "json") {
          importedProject = parseProjectRecordFromJsonText(fileText);
          importedNodeCount = importedProject.canvas.nodes.length;
        } else {
          const parsed = format === "csv" ? parseCsvText(fileText) : parseXmlText(fileText);

          if (parsed.rows.length === 0) {
            setTransferFeedback({
              type: "info",
              message: "Import file has no data rows.",
            });
            return;
          }

          const normalizedRows = parsed.rows.map(normalizeFlatRowKeys);
          const { projectId: importedProjectId, projectRows } = selectFlatImportRowsForProject({
            rows: normalizedRows,
            preferredProjectId: activeProject.id,
          });

          if (projectRows.length === 0) {
            setTransferFeedback({
              type: "info",
              message: "Import file has no project rows.",
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

          const importedNodes: SerializableFlowNode[] = sortedNodeRecords.map(
            ({ row }, index) => {
              const rowNodeId = (row.node_id ?? "").trim();
              const nodeId = rowNodeId.length > 0 ? rowNodeId : createNodeId();

              const x = toNumeric(row.position_x);
              const y = toNumeric(row.position_y);
              const importedNodeType = isNodeType(row.node_type) ? row.node_type : "default";
              const importedMenuConfigRaw = safeJsonParse(row.menu_config_json ?? "");
              const importedFrameConfigRaw = safeJsonParse(row.frame_config_json ?? "");
              const importedRibbonConfigRaw = (() => {
                const rawRibbonCellsJson = row.ribbon_cells_json ?? "";
                if (rawRibbonCellsJson.trim().length === 0) {
                  return null;
                }

                try {
                  const parsedRibbonCells = JSON.parse(rawRibbonCellsJson);

                  if (!Array.isArray(parsedRibbonCells)) {
                    return null;
                  }

                  const inferredRows = parsedRibbonCells.reduce((maxRows, cellValue) => {
                    if (!cellValue || typeof cellValue !== "object") {
                      return maxRows;
                    }

                    const sourceCell = cellValue as { row?: unknown };
                    if (
                      typeof sourceCell.row !== "number" ||
                      !Number.isFinite(sourceCell.row)
                    ) {
                      return maxRows;
                    }

                    return Math.max(maxRows, Math.round(sourceCell.row) + 1);
                  }, 1);

                  const inferredColumns = parsedRibbonCells.reduce(
                    (maxColumns, cellValue) => {
                      if (!cellValue || typeof cellValue !== "object") {
                        return maxColumns;
                      }

                      const sourceCell = cellValue as { column?: unknown };
                      if (
                        typeof sourceCell.column !== "number" ||
                        !Number.isFinite(sourceCell.column)
                      ) {
                        return maxColumns;
                      }

                      return Math.max(maxColumns, Math.round(sourceCell.column) + 1);
                    },
                    RIBBON_NODE_MIN_COLUMNS
                  );

                  return {
                    rows: inferredRows,
                    columns: inferredColumns,
                    cells: parsedRibbonCells,
                  };
                } catch {
                  return null;
                }
              })();

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
                  display_term_field: isNodeControlledLanguageFieldType(
                    row.display_term_field
                  )
                    ? row.display_term_field
                    : "primary_cta",
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
                  frame_config: normalizeFrameNodeConfig(importedFrameConfigRaw),
                  ribbon_config:
                    importedNodeType === "ribbon" && importedRibbonConfigRaw
                      ? normalizeRibbonNodeConfig(importedRibbonConfigRaw)
                      : null,
                },
              };
            }
          );

          const firstRow = projectRows[0];
          const parsedEdgesRaw = safeJsonParse(firstRow.project_edges_json ?? "");
          const parsedAdminOptionsRaw = safeJsonParse(
            firstRow.project_admin_options_json ?? ""
          );
          const parsedControlledLanguageRaw = safeJsonParse(
            firstRow.project_controlled_language_json ?? ""
          );
          const parsedTermRegistryRaw = safeJsonParse(
            firstRow.project_term_registry_json ?? ""
          );

          const nextAdminOptions = syncAdminOptionsWithNodes(
            mergeAdminOptionConfigs(
              normalizeGlobalOptionConfig(parsedAdminOptionsRaw),
              cloneGlobalOptions(DEFAULT_GLOBAL_OPTIONS)
            ),
            sanitizePersistedNodes(
              importedNodes,
              normalizeGlobalOptionConfig(parsedAdminOptionsRaw)
            )
          );

          const hydratedNodes = pruneFrameNodeMembership(
            sanitizePersistedNodes(importedNodes, nextAdminOptions)
          );
          const hydratedEdges = sanitizeEdges(
            sanitizeEdgesForStorage(parsedEdgesRaw),
            hydratedNodes
          );
          const parallelGroupByNodeId = computeParallelGroups(
            hydratedNodes,
            hydratedEdges
          ).parallelGroupByNodeId;

          const importedGlossary = sanitizeControlledLanguageGlossary(
            parsedControlledLanguageRaw
          );
          const importedTermRegistry = Array.isArray(parsedTermRegistryRaw)
            ? parsedTermRegistryRaw
            : [];
          const fallbackProjectName =
            importedProjectId === activeProject.id
              ? activeProject.name
              : `Imported ${importedProjectId}`;
          const createdAtFallback = new Date().toISOString();

          importedNodeCount = hydratedNodes.length;
          importedProject = sanitizeProjectRecord({
            id: importedProjectId,
            name: (firstRow.project_name ?? "").trim() || fallbackProjectName,
            createdAt: (firstRow.project_createdAt ?? "").trim() || createdAtFallback,
            updatedAt: (firstRow.project_updatedAt ?? "").trim() || createdAtFallback,
            canvas: {
              nodes: serializeNodesForStorage(hydratedNodes, parallelGroupByNodeId),
              edges: cloneEdges(hydratedEdges),
              adminOptions: cloneGlobalOptions(nextAdminOptions),
              controlledLanguageGlossary: importedGlossary,
              termRegistry: importedTermRegistry,
              uiJourneySnapshotPresets: [],
            },
          });
        }

        if (!importedProject) {
          throw new Error("Import file did not produce a valid project.");
        }

        const existingProject = activeAccount.projects.find(
          (project) => project.id === importedProject.id
        );
        const now = new Date().toISOString();
        const normalizedImportedProject =
          sanitizeProjectRecord({
            ...importedProject,
            createdAt: existingProject?.createdAt ?? importedProject.createdAt,
            updatedAt: now,
          }) ?? importedProject;

        if (activeProject.id === normalizedImportedProject.id) {
          queueUndoSnapshot();
        }

        loadProjectIntoEditor(normalizedImportedProject);

        updateStore((prev) => {
          const accountIndex = prev.accounts.findIndex(
            (account) => account.id === activeAccount.id
          );

          if (accountIndex < 0) {
            return prev;
          }

          const accounts = [...prev.accounts];
          const account = accounts[accountIndex];
          const projects = [...account.projects];
          const projectIndex = projects.findIndex(
            (project) => project.id === normalizedImportedProject.id
          );

          if (projectIndex >= 0) {
            projects[projectIndex] = normalizedImportedProject;
          } else {
            projects.push(normalizedImportedProject);
          }

          accounts[accountIndex] = {
            ...account,
            projects,
          };

          return {
            ...prev,
            accounts,
            session: {
              ...prev.session,
              activeAccountId: activeAccount.id,
              activeProjectId: normalizedImportedProject.id,
              view: "editor",
            },
          };
        });

        setTransferFeedback({
          type: "success",
          message: `${existingProject ? "Updated" : "Imported"} project ${
            normalizedImportedProject.id
          } with ${importedNodeCount} node(s) from ${format.toUpperCase()}.`,
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
      loadProjectIntoEditor,
      queueUndoSnapshot,
      updateStore,
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

  useEffect(() => {
    if (!isUiJourneyConversationOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsUiJourneyConversationOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isUiJourneyConversationOpen]);

  useEffect(() => {
    if (!isFeedbackModalOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeFeedbackModal();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [closeFeedbackModal, isFeedbackModalOpen]);

  useEffect(() => {
    if (!isHelpModalOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeHelpModal();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [closeHelpModal, isHelpModalOpen]);

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
        <p style={{ margin: 0, fontSize: 14, color: "#475569" }}>
          Preparing your dashboard…
        </p>
      </main>
    );
  }

  if (store.session.view === "dashboard") {
    const projects = dashboardProjects;
    const isCreatingProject = dashboardActionProjectId === "creating-project";
    const dashboardProjectsSpacing = 8;

    const dashboardBlockStyle: React.CSSProperties = {
      background: "#fff",
      border: "2px solid #cbd5e1",
      borderRadius: 12,
      boxShadow: "0 8px 20px rgba(15, 23, 42, 0.05)",
    };

    const dashboardButtonStyle: React.CSSProperties = {
      ...buttonStyle,
      padding: "2px 8px",
      minHeight: 24,
      lineHeight: 1,
      border: "1px solid #64748b",
      borderRadius: 8,
      fontSize: 11,
      fontWeight: 700,
      color: "#0f172a",
      background: "#f8fafc",
    };

    const dashboardCompactInputStyle: React.CSSProperties = {
      ...inputStyle,
      fontSize: 11,
      lineHeight: 1,
      padding: "2px 8px",
      minHeight: 24,
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
          padding: "0 16px 12px",
          position: "relative",
          display: "grid",
          justifyItems: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 26,
            pointerEvents: "none",
            zIndex: 1,
          }}
        >
          <img
            src="/termpath-logo.png"
            alt="Termpath"
            style={{
              width: 360,
              height: "auto",
              display: "block",
            }}
          />
        </div>

        <div
          style={{
            width: "min(1080px, 100%)",
            display: "grid",
            gap: 5,
          }}
        >
          <div
            style={{
              minHeight: 42,
              display: "grid",
              placeItems: "center",
            }}
          >
            <h1
              style={{
                margin: 0,
                textAlign: "center",
                fontSize: 46,
                lineHeight: 1.02,
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
              border: "2px solid #dc2626",
              padding: "0 3px",
              display: "grid",
              gridTemplateColumns: "1fr auto",
              alignItems: "center",
              gap: 3,
            }}
          >
            <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <div
                style={{
                  fontSize: 10,
                  lineHeight: 1,
                  fontWeight: 700,
                  letterSpacing: 0.4,
                  textTransform: "uppercase",
                  color: "#64748b",
                }}
              >
                User Account Code
              </div>
              <div
                style={{
                  fontSize: 12,
                  lineHeight: 1,
                  fontWeight: 700,
                  color: "#1e293b",
                }}
              >
                {activeAccount?.code ?? SINGLE_ACCOUNT_CODE}
              </div>
            </div>

            <form action="/auth/signout" method="post" style={{ margin: 0 }}>
              <button type="submit" style={dashboardButtonStyle}>
                Sign out
              </button>
            </form>
          </section>

          <section
            style={{
              ...dashboardBlockStyle,
              border: "2px solid #dc2626",
              padding: "0 3px",
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              gap: 3,
              alignItems: "center",
            }}
          >
            <div style={{ fontSize: 11, lineHeight: 1, color: "#334155", fontWeight: 600 }}>
              New project name
            </div>
            <input
              style={dashboardCompactInputStyle}
              placeholder="e.g. Checkout Microcopy"
              value={newProjectName}
              disabled={isCreatingProject}
              onChange={(event) => setNewProjectName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void createProjectFromDashboard();
                }
              }}
            />
            <button
              type="button"
              style={dashboardPrimaryButtonStyle}
              onClick={() => void createProjectFromDashboard()}
              disabled={isCreatingProject}
            >
              {isCreatingProject ? "Creating..." : "Create Project"}
            </button>
          </section>

          <section
            style={{
              display: "grid",
              gap: dashboardProjectsSpacing,
              marginTop: dashboardProjectsSpacing,
            }}
          >
            <div style={{ display: "grid", justifyItems: "center", gap: 1 }}>
              <h2 style={{ margin: 0, fontSize: 46, fontWeight: 900, color: "#1e293b" }}>
                Projects
              </h2>
              <p style={{ margin: 0, fontSize: 16, color: "#475569", textAlign: "center" }}>
                Open, rename, or delete your projects.
              </p>
            </div>

            {dashboardActionError && (
              <div
                style={{
                  ...dashboardBlockStyle,
                  borderColor: "#fecaca",
                  background: "#fef2f2",
                  color: "#991b1b",
                  fontSize: 12,
                  padding: "8px 10px",
                }}
              >
                {dashboardActionError}
              </div>
            )}

            {isDashboardProjectsLoading ? (
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
                Loading projects...
              </div>
            ) : projects.length === 0 ? (
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
                {projects.map((project) => {
                  const isProjectActionPending = dashboardActionProjectId === project.id;

                  return (
                    <div
                      key={project.id}
                      style={{
                        textAlign: "left",
                        border: "2px solid #bfdbfe",
                        borderRadius: 12,
                        padding: "9px 10px",
                        background: "#fff",
                        display: "grid",
                        gap: 8,
                        boxShadow: "0 3px 10px rgba(37, 99, 235, 0.1)",
                        lineHeight: 1.25,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => openProject(project.id)}
                        disabled={isProjectActionPending}
                        style={{
                          textAlign: "left",
                          border: "none",
                          padding: 0,
                          background: "transparent",
                          cursor: isProjectActionPending ? "default" : "pointer",
                          display: "grid",
                          gap: 3,
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
                          {project.title}
                        </div>
                        <div style={{ fontSize: 11, color: "#475569" }}>
                          Nodes: {project.node_count}
                        </div>
                        <div style={{ fontSize: 11, color: "#475569" }}>Project ID: {project.id}</div>
                        <div style={{ fontSize: 10, color: "#94a3b8" }}>
                          Updated: {formatDateTime(project.updated_at)}
                        </div>
                      </button>

                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                        <button
                          type="button"
                          style={dashboardButtonStyle}
                          onClick={() => void renameProjectFromDashboard(project.id)}
                          disabled={isProjectActionPending}
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          style={{
                            ...dashboardButtonStyle,
                            borderColor: "#fecaca",
                            color: "#991b1b",
                            background: "#fef2f2",
                          }}
                          onClick={() => void deleteProjectFromDashboard(project.id)}
                          disabled={isProjectActionPending}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
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
              style={getToggleButtonStyle(false)}
              onClick={() => handleEditorModeChange("canvas")}
            >
              Canvas View
            </button>
            <button
              type="button"
              style={getToggleButtonStyle(true)}
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
            <button type="button" style={buttonStyle} onClick={() => exportProjectData("json")}>
              Export JSON
            </button>
            <button type="button" style={buttonStyle} onClick={triggerImportPicker}>
              Import CSV/XML/JSON
            </button>
            <input
              ref={importFileInputRef}
              type="file"
              accept=".csv,.xml,.json,text/csv,application/xml,text/xml,application/json,text/json"
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
                  Node Type
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
                <th style={{ border: "1px solid #e4e4e7", padding: 8, fontSize: 12 }}>
                  Ribbon Cells
                </th>
                {menuTermColumnIndexes.map((menuTermIndex) => (
                  <th
                    key={`table-menu-term-head:${menuTermIndex}`}
                    style={{ border: "1px solid #e4e4e7", padding: 8, fontSize: 12 }}
                  >
                    {`Menu Term ${menuTermIndex + 1}`}
                  </th>
                ))}
                {ribbonCellColumnIndexes.map((ribbonCellIndex) => (
                  <React.Fragment key={`table-ribbon-cell-head:${ribbonCellIndex}`}>
                    <th style={{ border: "1px solid #e4e4e7", padding: 8, fontSize: 12 }}>
                      {`Ribbon Label ${ribbonCellIndex + 1}`}
                    </th>
                    <th style={{ border: "1px solid #e4e4e7", padding: 8, fontSize: 12 }}>
                      {`Ribbon Key Command ${ribbonCellIndex + 1}`}
                    </th>
                    <th style={{ border: "1px solid #e4e4e7", padding: 8, fontSize: 12 }}>
                      {`Ribbon Tool Tip ${ribbonCellIndex + 1}`}
                    </th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>

            <tbody>
              {projectTableRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={
                      7 +
                      TABLE_EDITABLE_FIELDS.length +
                      menuTermColumnIndexes.length +
                      ribbonCellColumnIndexes.length * 3
                    }
                    style={{ border: "1px solid #e4e4e7", padding: 12, fontSize: 12 }}
                  >
                    No nodes in this project yet. Switch to Canvas View to add nodes.
                  </td>
                </tr>
              ) : (
                projectTableRows.map(({ node, sequenceIndex, parallelGroupId }) => {
                  const menuTermValues =
                    node.data.node_type === "menu"
                      ? normalizeMenuNodeConfig(
                          node.data.menu_config,
                          node.data.primary_cta,
                          Math.max(
                            MENU_NODE_RIGHT_CONNECTIONS_MIN,
                            node.data.menu_config.max_right_connections
                          )
                        ).terms.map((menuTerm) => menuTerm.term)
                      : [];

                  const normalizedRibbonConfig =
                    node.data.node_type === "ribbon"
                      ? normalizeRibbonNodeConfig(node.data.ribbon_config)
                      : null;

                  const ribbonCellValues = normalizedRibbonConfig
                    ? normalizedRibbonConfig.cells.map((cell) => ({
                        label: cell.label,
                        keyCommand: cell.key_command,
                        toolTip: cell.tool_tip,
                      }))
                    : [];

                  const ribbonCellSummary =
                    normalizedRibbonConfig
                      ? (() => {
                          if (normalizedRibbonConfig.cells.length === 0) {
                            return "0 cells";
                          }

                          const ribbonCellSummaryValues = normalizedRibbonConfig.cells.map((cell) => {
                            const label = cell.label.trim();
                            if (label.length > 0) {
                              return label;
                            }

                            const keyCommand = cell.key_command.trim();
                            return keyCommand.length > 0 ? keyCommand : "—";
                          });

                          return `${normalizedRibbonConfig.cells.length} cells: ${ribbonCellSummaryValues.join(", ")}`;
                        })()
                      : "";

                  const shouldDisableShoehornedFields =
                    node.data.node_type === "menu" ||
                    node.data.node_type === "ribbon" ||
                    node.data.node_type === "frame";

                  return (
                    <tr key={`table-row:${node.id}`}>
                      <td style={{ border: "1px solid #e4e4e7", padding: 8, fontSize: 12 }}>
                        <code>{node.id}</code>
                      </td>
                      <td style={{ border: "1px solid #e4e4e7", padding: 8, fontSize: 12 }}>
                        {sequenceIndex ?? ""}
                      </td>
                      <td style={{ border: "1px solid #e4e4e7", padding: 8, fontSize: 12 }}>
                        {node.data.node_type}
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

                        const shouldRenderEmptyCell =
                          shouldDisableShoehornedFields &&
                          TABLE_SHOEHORNING_DISABLED_FIELDS.has(field);

                        if (shouldRenderEmptyCell) {
                          return <td key={`cell:${node.id}:${field}`} style={baseCellStyle}></td>;
                        }

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

                      <td
                        style={{
                          border: "1px solid #e4e4e7",
                          padding: 8,
                          fontSize: 12,
                          minWidth: 220,
                        }}
                      >
                        {ribbonCellSummary}
                      </td>

                      {menuTermColumnIndexes.map((menuTermIndex) => (
                        <td
                          key={`menu-term-cell:${node.id}:${menuTermIndex}`}
                          style={{
                            border: "1px solid #e4e4e7",
                            padding: 8,
                            fontSize: 12,
                            minWidth: 170,
                          }}
                        >
                          {menuTermValues[menuTermIndex] ?? ""}
                        </td>
                      ))}

                      {ribbonCellColumnIndexes.map((ribbonCellIndex) => {
                        const ribbonCell = ribbonCellValues[ribbonCellIndex];

                        return (
                          <React.Fragment
                            key={`ribbon-cell-column-group:${node.id}:${ribbonCellIndex}`}
                          >
                            <td
                              style={{
                                border: "1px solid #e4e4e7",
                                padding: 8,
                                fontSize: 12,
                                minWidth: 170,
                              }}
                            >
                              {ribbonCell?.label ?? ""}
                            </td>
                            <td
                              style={{
                                border: "1px solid #e4e4e7",
                                padding: 8,
                                fontSize: 12,
                                minWidth: 170,
                              }}
                            >
                              {ribbonCell?.keyCommand ?? ""}
                            </td>
                            <td
                              style={{
                                border: "1px solid #e4e4e7",
                                padding: 8,
                                fontSize: 12,
                                minWidth: 220,
                              }}
                            >
                              {ribbonCell?.toolTip ?? ""}
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  );
                })
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
      <div
        ref={canvasContainerRef}
        onPointerMove={handleCanvasPointerMove}
        onPointerEnter={handleCanvasPointerEnter}
        onPointerLeave={handleCanvasPointerLeave}
        onPointerDown={handleCanvasPointerDown}
        onPointerUp={handleCanvasPointerUp}
        style={{ borderRight: "1px solid #e4e4e7" }}
      >
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
          alignContent: "start",
          gridAutoRows: "min-content",
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
              style={getToggleButtonStyle(true)}
              onClick={() => handleEditorModeChange("canvas")}
            >
              Canvas View
            </button>
            <button
              type="button"
              style={getToggleButtonStyle(false)}
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
            <button type="button" style={buttonStyle} onClick={() => exportProjectData("json")}>
              Export JSON
            </button>
            <button type="button" style={buttonStyle} onClick={triggerImportPicker}>
              Import CSV/XML/JSON
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
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              style={{
                ...buttonStyle,
                borderColor: "#a855f7",
                background: "#faf5ff",
                color: "#6b21a8",
                fontWeight: 700,
              }}
              onClick={openFeedbackModal}
            >
              Send Feedback
            </button>
            <button
              type="button"
              style={{
                ...buttonStyle,
                borderColor: "#dc2626",
                background: "#fef2f2",
                color: "#991b1b",
                fontWeight: 700,
              }}
              onClick={openHelpModal}
            >
              Get Help
            </button>
            <input
              ref={importFileInputRef}
              type="file"
              accept=".csv,.xml,.json,text/csv,application/xml,text/xml,application/json,text/json"
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 12, color: "#1e3a8a", fontWeight: 700 }}>
              Project Sequence ID
            </div>
            <button
              type="button"
              style={{
                ...buttonStyle,
                fontSize: 11,
                padding: "2px 8px",
                borderColor: "#93c5fd",
                color: "#1e3a8a",
                background: "#eff6ff",
              }}
              onClick={() =>
                setIsProjectSequencePanelOpen((isOpen) => !isOpen)
              }
            >
              {isProjectSequencePanelOpen ? "Hide" : "Show"}
            </button>
          </div>

          {isProjectSequencePanelOpen && (
            <>
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
                Order rule: topological flow; ties sort by x → y → id. Parallel-linked
                nodes share the same sequence number and the first id in the order
                list.
              </div>

              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12,
                  color: "#334155",
                  marginTop: 8,
                }}
              >
                <input
                  type="checkbox"
                  checked={showNodeIdsOnCanvas}
                  onChange={(event) => setShowNodeIdsOnCanvas(event.target.checked)}
                />
                Show node IDs on nodes
              </label>

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

              <ol
                style={{
                  marginTop: 10,
                  marginBottom: 0,
                  paddingLeft: 18,
                  fontSize: 12,
                }}
              >
                {orderedNodes.map((node) => (
                  <li key={`order:${node.id}`} style={{ marginBottom: 4 }}>
                    <strong>#{ordering.sequenceByNodeId[node.id]}</strong>{" "}
                    {node.data.title || "Untitled"}
                    <div style={{ color: "#64748b", fontSize: 11 }}>id: {node.id}</div>
                  </li>
                ))}
              </ol>
            </>
          )}
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
              style={getToggleButtonStyle(isControlledLanguagePanelOpen)}
              onClick={() =>
                setIsControlledLanguagePanelOpen((open) => {
                  if (open) {
                    setRegistrySearchQuery("");
                    setRegistryFilterStatus("all");
                    setRegistryFilterType("all");
                  }

                  return !open;
                })
              }
            >
              {isControlledLanguagePanelOpen ? "Hide" : "Show"} Controlled Language
            </button>
            <button
              type="button"
              style={getToggleButtonStyle(isAdminPanelOpen)}
              onClick={() => setIsAdminPanelOpen((open) => !open)}
            >
              {isAdminPanelOpen ? "Hide" : "Show"} Admin
            </button>
          </div>
        </div>

        <p style={{ marginTop: 0, marginBottom: 0, fontSize: 12, color: "#52525b" }}>
          Click a node to edit structured fields. Double-click empty canvas to add a
          default node. Keyboard shortcuts: <strong>Tab</strong> adds Default, and
          <strong> Shift+Tab</strong> adds Menu at the pointer position.
          <strong> Shift+R</strong> adds Ribbon at the pointer position.
          <strong> Shift+F</strong> frames selected nodes. <strong>Ctrl/Cmd+C</strong>
          copies selected nodes (including frame members), and
          <strong> Ctrl/Cmd+V</strong> pastes non-destructive duplicates. All changes autosave. Use
          each field’s “Glossary” button to open a term picker.
        </p>

        <section
          style={{
            border: "1px solid #cbd5e1",
            borderRadius: 8,
            padding: 10,
            display: "grid",
            gap: 10,
            background: "#ffffff",
          }}
        >

        <button
          type="button"
          style={{
            ...buttonStyle,
            borderColor: "#93c5fd",
            background: "#eff6ff",
            color: "#1e3a8a",
            fontWeight: 700,
            opacity: canOpenUiJourneyConversation ? 1 : 0.5,
            cursor: canOpenUiJourneyConversation ? "pointer" : "not-allowed",
          }}
          onClick={openUiJourneyConversation}
          disabled={!canOpenUiJourneyConversation}
          title={
            canOpenUiJourneyConversation
              ? "Build conversation from selected nodes"
              : "Select at least one node or frame"
          }
        >
          UI Journey Conversation
        </button>

        <section
          style={{
            border: "1px solid #c7d2fe",
            borderRadius: 8,
            padding: 8,
            display: "grid",
            gap: 8,
            background: "#f8faff",
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
            <div style={{ fontSize: 12, color: "#3730a3", fontWeight: 700 }}>
              Journey Snapshots
            </div>
            <button
              type="button"
              style={{
                ...buttonStyle,
                fontSize: 11,
                padding: "2px 8px",
                borderColor: "#a5b4fc",
                color: "#3730a3",
                background: "#eef2ff",
              }}
              onClick={() =>
                setIsUiJourneySnapshotsPanelOpen((isOpen) => !isOpen)
              }
            >
              {isUiJourneySnapshotsPanelOpen ? "Hide" : "Show"}
            </button>
          </div>

          {isUiJourneySnapshotsPanelOpen && (
            <>
              <p style={{ margin: 0, fontSize: 11, color: "#4c1d95" }}>
                Save the currently selected node path and conversation so you can
                quickly recall and review the same journey later.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 6,
                }}
              >
                <input
                  style={inputStyle}
                  value={uiJourneySnapshotDraftName}
                  placeholder={`Snapshot ${uiJourneySnapshotPresets.length + 1}`}
                  onChange={(event) =>
                    setUiJourneySnapshotDraftName(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      saveUiJourneySnapshotPreset();
                    }
                  }}
                />
                <button
                  type="button"
                  style={{
                    ...buttonStyle,
                    borderColor: "#818cf8",
                    background: "#eef2ff",
                    color: "#3730a3",
                    fontWeight: 700,
                    opacity: canSaveUiJourneySnapshotPreset ? 1 : 0.5,
                    cursor: canSaveUiJourneySnapshotPreset
                      ? "pointer"
                      : "not-allowed",
                  }}
                  onClick={saveUiJourneySnapshotPreset}
                  disabled={!canSaveUiJourneySnapshotPreset}
                  title={
                    canSaveUiJourneySnapshotPreset
                      ? "Save selected path as snapshot"
                      : "Select at least one node or frame first"
                  }
                >
                  Save
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  flexWrap: "wrap",
                  fontSize: 11,
                  color: "#4338ca",
                }}
              >
                <span>
                  Selected path: {uiJourneySnapshotCapture.nodeIds.length} node(s),{" "}
                  {uiJourneySnapshotCapture.edgeIds.length} edge(s),{" "}
                  {uiJourneySnapshotCapture.conversation.length} conversation row(s)
                </span>
                <button
                  type="button"
                  style={{
                    ...buttonStyle,
                    fontSize: 11,
                    padding: "2px 8px",
                    borderColor: "#cbd5e1",
                    color: "#475569",
                    background: "#fff",
                    opacity:
                      selectedUiJourneySnapshotPresetId ||
                      recalledUiJourneyNodeIds.length > 0 ||
                      recalledUiJourneyEdgeIds.length > 0
                        ? 1
                        : 0.5,
                    cursor:
                      selectedUiJourneySnapshotPresetId ||
                      recalledUiJourneyNodeIds.length > 0 ||
                      recalledUiJourneyEdgeIds.length > 0
                        ? "pointer"
                        : "not-allowed",
                  }}
                  onClick={clearRecalledUiJourneySnapshot}
                  disabled={
                    !selectedUiJourneySnapshotPresetId &&
                    recalledUiJourneyNodeIds.length === 0 &&
                    recalledUiJourneyEdgeIds.length === 0
                  }
                >
                  Clear recalled path
                </button>
              </div>

              {uiJourneySnapshotPresets.length === 0 ? (
                <p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>
                  No snapshots yet. Select a path and save one.
                </p>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gap: 6,
                    maxHeight: 230,
                    overflowY: "auto",
                  }}
                >
                  {uiJourneySnapshotPresets.map((preset) => {
                    const isSelected =
                      selectedUiJourneySnapshotPresetId === preset.id;

                    return (
                      <div
                        key={`ui-journey-snapshot:${preset.id}`}
                        style={{
                          border: `1px solid ${isSelected ? "#818cf8" : "#cbd5e1"}`,
                          borderRadius: 8,
                          background: isSelected ? "#eef2ff" : "#fff",
                          padding: 8,
                          display: "grid",
                          gap: 6,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            gap: 8,
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: "#312e81",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={preset.name}
                            >
                              {preset.name}
                            </div>
                            <div style={{ fontSize: 10, color: "#4338ca", marginTop: 2 }}>
                              {preset.nodeIds.length} node(s) • {preset.edgeIds.length} edge(s)
                            </div>
                            <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>
                              Updated {formatDateTime(preset.updatedAt)}
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              type="button"
                              style={{
                                ...buttonStyle,
                                fontSize: 10,
                                padding: "2px 8px",
                                borderColor: "#818cf8",
                                color: "#3730a3",
                                background: "#eef2ff",
                                fontWeight: 700,
                              }}
                              onClick={() => recallUiJourneySnapshotPreset(preset.id)}
                            >
                              Recall
                            </button>
                            <button
                              type="button"
                              style={{
                                ...buttonStyle,
                                fontSize: 10,
                                padding: "2px 8px",
                                borderColor: "#fca5a5",
                                color: "#b91c1c",
                                background: "#fff",
                                fontWeight: 700,
                              }}
                              onClick={() => deleteUiJourneySnapshotPreset(preset.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </section>

        {canCreateFrameFromSelection && (
          <button
            type="button"
            style={{
              ...buttonStyle,
              borderColor: "#94a3b8",
              background: "#f8fafc",
              fontWeight: 700,
            }}
            onClick={() => createFrameFromSelection()}
          >
            Frame selected nodes ({selectedNonFrameNodesForFrameCreation.length})
          </button>
        )}

        {hasExactlyOneSelectedNode && selectedNode?.data.node_type === "menu" && (
          <>
            <p style={{ marginTop: 0, marginBottom: 0, fontSize: 12, color: "#1e3a8a" }}>
              Menu node mode: edit Menu Terms below. These
              terms use the Menu Term glossary.
            </p>

            {menuTermDeleteError && (
              <p
                style={{
                  marginTop: 0,
                  marginBottom: 0,
                  fontSize: 11,
                  color: "#b91c1c",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: 6,
                  padding: "6px 8px",
                }}
              >
                {menuTermDeleteError}
              </p>
            )}
          </>
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

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  flexWrap: "wrap",
                  justifyContent: "flex-end",
                }}
              >
                <span style={{ fontSize: 11, color: "#1e3a8a", fontWeight: 700 }}>
                  {controlledLanguageAuditRows.length} term row(s)
                </span>
                <button
                  type="button"
                  style={{ ...buttonStyle, fontSize: 11, padding: "2px 8px" }}
                  onClick={() => exportControlledLanguageGlossary("json")}
                >
                  Export JSON
                </button>
                <button
                  type="button"
                  style={{ ...buttonStyle, fontSize: 11, padding: "2px 8px" }}
                  onClick={() => exportControlledLanguageGlossary("csv")}
                >
                  Export CSV
                </button>
                <button
                  type="button"
                  style={{ ...buttonStyle, fontSize: 11, padding: "2px 8px" }}
                  onClick={triggerControlledLanguageJsonImportPicker}
                >
                  Import JSON
                </button>
                <button
                  type="button"
                  style={{ ...buttonStyle, fontSize: 11, padding: "2px 8px" }}
                  onClick={triggerControlledLanguageCsvImportPicker}
                >
                  Import CSV
                </button>
                <input
                  ref={controlledLanguageJsonImportInputRef}
                  type="file"
                  accept=".json,application/json,text/json"
                  style={{ display: "none" }}
                  onChange={importControlledLanguageGlossaryFromJsonFile}
                />
                <input
                  ref={controlledLanguageCsvImportInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  style={{ display: "none" }}
                  onChange={importControlledLanguageGlossaryFromCsvFile}
                />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 0,
                borderRadius: 6,
                overflow: "hidden",
                border: "1px solid #bfdbfe",
              }}
            >
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: "6px 12px",
                  fontSize: 11,
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  background: clpActiveView === "audit" ? "#1e3a8a" : "#eff6ff",
                  color: clpActiveView === "audit" ? "#fff" : "#1e3a8a",
                }}
                onClick={() => setClpActiveView("audit")}
              >
                Term Audit
              </button>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: "6px 12px",
                  fontSize: 11,
                  fontWeight: 700,
                  border: "none",
                  borderLeft: "1px solid #bfdbfe",
                  cursor: "pointer",
                  background: clpActiveView === "registry" ? "#1e3a8a" : "#eff6ff",
                  color: clpActiveView === "registry" ? "#fff" : "#1e3a8a",
                }}
                onClick={() => setClpActiveView("registry")}
              >
                Term Registry
              </button>
            </div>

            {clpActiveView === "audit" && (
              <>
                <p style={{ margin: 0, fontSize: 11, color: "#475569" }}>
                  Audit terms by field type and see where each term is used.
                </p>

                <div
                  style={{
                    overflowX: "auto",
                    overflowY: "auto",
                    maxHeight: CONTROLLED_LANGUAGE_TABLE_MAX_HEIGHT_PX,
                  }}
                >
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
                  </tr>
                </thead>

                <tbody>
                  {controlledLanguageAuditRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
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
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                flexWrap: "wrap",
                              }}
                            >
                              <button
                                type="button"
                                style={{
                                  ...buttonStyle,
                                  fontSize: 11,
                                  padding: "2px 8px",
                                  borderColor:
                                    activeGlossaryHighlightKey === rowKey ? "#f59e0b" : "#d4d4d8",
                                  background:
                                    activeGlossaryHighlightKey === rowKey ? "#fef3c7" : "#fff",
                                  color:
                                    activeGlossaryHighlightKey === rowKey ? "#92400e" : "#0f172a",
                                  fontWeight: 700,
                                  cursor: row.occurrences === 0 ? "not-allowed" : "pointer",
                                  opacity: row.occurrences === 0 ? 0.55 : 1,
                                }}
                                disabled={row.occurrences === 0}
                                onClick={() =>
                                  handleControlledLanguageOccurrencesClick(row, rowKey)
                                }
                                title={
                                  row.occurrences === 0
                                    ? "No nodes contain this term"
                                    : activeGlossaryHighlightKey === rowKey
                                      ? "Click to clear highlighted nodes"
                                      : "Highlight nodes containing this term"
                                }
                              >
                                {row.occurrences}
                              </button>

                              {activeGlossaryHighlightKey === rowKey && row.occurrences > 0 && (
                                <button
                                  type="button"
                                  style={{
                                    ...buttonStyle,
                                    fontSize: 10,
                                    padding: "2px 6px",
                                    borderColor: "#f59e0b",
                                    background: "#fff7ed",
                                    color: "#9a3412",
                                    fontWeight: 700,
                                  }}
                                  onClick={() =>
                                    handleControlledLanguageReplaceAll(row, rowKey)
                                  }
                                  title="Replace this term across all highlighted nodes"
                                >
                                  Replace All
                                </button>
                              )}
                            </div>
                            {row.occurrences === 0 && (
                              <div style={{ marginTop: 2, color: "#64748b" }}>
                                Not Used
                              </div>
                            )}
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
                  </table>
                </div>
              </>
            )}

            {clpActiveView === "registry" && (
              <div style={{ display: "grid", gap: 8 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 8px",
                    background: "#eff6ff",
                    borderRadius: 6,
                    fontSize: 11,
                    color: "#1e3a8a",
                    fontWeight: 700,
                  }}
                >
                  <span>
                    {termRegistry.filter((entry) => entry.assignedNodeId !== null).length} of{" "}
                    {termRegistry.length} terms assigned
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <input
                    style={{
                      flex: 1,
                      minWidth: 120,
                      padding: "4px 8px",
                      fontSize: 11,
                      border: "1px solid #d4d4d8",
                      borderRadius: 4,
                    }}
                    placeholder="Search terms or IDs..."
                    value={registrySearchQuery}
                    onChange={(event) => setRegistrySearchQuery(event.target.value)}
                  />
                  <select
                    style={{
                      padding: "4px 8px",
                      fontSize: 11,
                      border: "1px solid #d4d4d8",
                      borderRadius: 4,
                    }}
                    value={registryFilterStatus}
                    onChange={(event) =>
                      setRegistryFilterStatus(
                        event.target.value as "all" | "assigned" | "unassigned"
                      )
                    }
                  >
                    <option value="all">All</option>
                    <option value="assigned">Assigned</option>
                    <option value="unassigned">Unassigned</option>
                  </select>
                  <select
                    style={{
                      padding: "4px 8px",
                      fontSize: 11,
                      border: "1px solid #d4d4d8",
                      borderRadius: 4,
                    }}
                    value={registryFilterType}
                    onChange={(event) => setRegistryFilterType(event.target.value)}
                  >
                    <option value="all">All Types</option>
                    <option value="title">Title</option>
                    <option value="body_text">Body Text</option>
                    <option value="primary_cta">Primary CTA</option>
                    <option value="secondary_cta">Secondary CTA</option>
                    <option value="helper_text">Helper Text</option>
                    <option value="error_text">Error Text</option>
                    <option value="notes">Notes</option>
                    <option value="menu_term">Menu Term</option>
                    <option value="key_command">Key Command</option>
                    <option value="tool_tip">Tool Tip</option>
                    <option value="cell_label">Cell Label</option>
                  </select>
                </div>

                <div
                  style={{
                    maxHeight: 400,
                    overflowY: "auto",
                    display: "grid",
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto auto",
                      gap: 6,
                      alignItems: "center",
                      padding: "6px 8px",
                      border: "1px solid #bfdbfe",
                      borderRadius: 6,
                      background: "#f8fbff",
                    }}
                  >
                    <input
                      style={{
                        width: "100%",
                        minWidth: 0,
                        padding: "4px 8px",
                        fontSize: 11,
                        border: "1px solid #d4d4d8",
                        borderRadius: 4,
                      }}
                      placeholder="Add term value"
                      value={registryDraftValue}
                      onChange={(event) => setRegistryDraftValue(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") {
                          return;
                        }

                        event.preventDefault();
                        addRegistryEntry();
                      }}
                    />

                    <select
                      style={{
                        padding: "4px 8px",
                        fontSize: 11,
                        border: "1px solid #d4d4d8",
                        borderRadius: 4,
                        background: "#fff",
                      }}
                      value={registryDraftTermType}
                      onChange={(event) => setRegistryDraftTermType(event.target.value)}
                    >
                      {TERM_REGISTRY_TERM_TYPE_OPTIONS.map((termTypeOption) => (
                        <option
                          key={`registry-draft-term-type-option:${
                            termTypeOption.value || "untyped"
                          }`}
                          value={termTypeOption.value}
                        >
                          {termTypeOption.label}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      style={{
                        ...buttonStyle,
                        fontSize: 11,
                        padding: "4px 10px",
                        fontWeight: 700,
                      }}
                      onClick={addRegistryEntry}
                      disabled={registryDraftValue.trim().length === 0}
                    >
                      Add
                    </button>
                  </div>

                  {filteredRegistryEntries.length === 0 ? (
                    <div
                      style={{
                        padding: 12,
                        fontSize: 11,
                        color: "#64748b",
                        textAlign: "center",
                      }}
                    >
                      {termRegistry.length === 0
                        ? "No terms in registry yet. Terms will appear here as you fill in node fields."
                        : "No terms match the current filters."}
                    </div>
                  ) : (
                    filteredRegistryEntries.map((entry) => {
                      const isRegistryEntryHighlightActive =
                        activeRegistryHighlightEntryId === entry.id &&
                        entry.assignedNodeId !== null;

                      return (
                      <div
                        key={`registry-entry:${entry.id}`}
                        onClick={(event) => {
                          if (!entry.assignedNodeId) {
                            return;
                          }

                          const target = event.target as HTMLElement | null;
                          if (target?.closest("button, input, select, textarea, a")) {
                            return;
                          }

                          handleRegistryEntryHighlightClick(entry);
                        }}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr auto",
                          gap: 6,
                          padding: "6px 8px",
                          border: isRegistryEntryHighlightActive
                            ? "1px solid #f59e0b"
                            : "1px solid #e2e8f0",
                          borderRadius: 6,
                          background: isRegistryEntryHighlightActive
                            ? "#fef3c7"
                            : entry.assignedNodeId
                              ? "#fff"
                              : "#fffbeb",
                          boxShadow: isRegistryEntryHighlightActive
                            ? "0 0 0 1px rgba(245, 158, 11, 0.18) inset"
                            : "none",
                          fontSize: 11,
                          cursor: entry.assignedNodeId ? "pointer" : "default",
                        }}
                      >
                        <div style={{ minWidth: 0, display: "grid", gap: 4 }}>
                          <div
                            style={{
                              fontWeight: 700,
                              color: "#0f172a",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={entry.value}
                          >
                            {entry.value || "(empty)"}
                          </div>

                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr auto",
                              gap: 4,
                              alignItems: "center",
                            }}
                          >
                            <input
                              key={`registry-friendly-id:${entry.id}:${entry.friendlyId ?? ""}:${
                                entry.friendlyIdLocked ? "locked" : "unlocked"
                              }`}
                              style={{
                                width: "100%",
                                minWidth: 0,
                                padding: "2px 6px",
                                fontSize: 10,
                                fontFamily: "monospace",
                                border: "1px solid #d4d4d8",
                                borderRadius: 4,
                                background: entry.friendlyIdLocked ? "#f8fafc" : "#fff",
                                color: entry.friendlyIdLocked ? "#64748b" : "#334155",
                              }}
                              defaultValue={entry.friendlyId ?? ""}
                              placeholder="Add ID..."
                              readOnly={entry.friendlyIdLocked}
                              onBlur={(event) => {
                                const didSave = commitRegistryFriendlyId(
                                  entry.id,
                                  event.currentTarget.value
                                );

                                if (!didSave) {
                                  event.currentTarget.value = entry.friendlyId ?? "";
                                  return;
                                }

                                event.currentTarget.value = event.currentTarget.value.trim();
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
                              style={{
                                ...buttonStyle,
                                width: 22,
                                minWidth: 22,
                                height: 22,
                                padding: 0,
                                fontSize: 12,
                                lineHeight: 1,
                                borderRadius: 4,
                              }}
                              title={entry.friendlyIdLocked
                                ? "Unlock friendly ID"
                                : "Lock friendly ID"}
                              aria-label={entry.friendlyIdLocked
                                ? "Unlock friendly ID"
                                : "Lock friendly ID"}
                              onClick={() => toggleRegistryEntryFriendlyIdLock(entry.id)}
                            >
                              {entry.friendlyIdLocked ? "🔒" : "🔓"}
                            </button>
                          </div>

                          {entry.assignedNodeId === null ? (
                            <select
                              style={{
                                width: "fit-content",
                                maxWidth: "100%",
                                padding: "2px 6px",
                                fontSize: 10,
                                border: "1px solid #d4d4d8",
                                borderRadius: 4,
                                background: "#fff",
                                color: entry.termType ? "#1e3a8a" : "#64748b",
                              }}
                              value={entry.termType ?? ""}
                              onChange={(event) =>
                                updateRegistryEntryTermType(entry.id, event.target.value)
                              }
                            >
                              {TERM_REGISTRY_TERM_TYPE_OPTIONS.map((termTypeOption) => (
                                <option
                                  key={`registry-term-type-option:${
                                    termTypeOption.value || "untyped"
                                  }`}
                                  value={termTypeOption.value}
                                >
                                  {termTypeOption.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div
                              style={{
                                width: "fit-content",
                                maxWidth: "100%",
                                padding: "2px 6px",
                                fontSize: 10,
                                border: "1px solid #e2e8f0",
                                borderRadius: 4,
                                background: "#f8fafc",
                                color: entry.termType ? "#1e3a8a" : "#64748b",
                                fontWeight: 600,
                              }}
                            >
                              {getTermRegistryTermTypeLabel(entry.termType)}
                            </div>
                          )}
                        </div>

                        <div
                          style={{
                            display: "grid",
                            justifyItems: "end",
                            alignContent: "space-between",
                            gap: 6,
                          }}
                        >
                          {isRegistryEntryHighlightActive && (
                            <div
                              style={{
                                fontSize: 10,
                                color: "#92400e",
                                fontWeight: 700,
                                border: "1px solid #f59e0b",
                                borderRadius: 999,
                                padding: "1px 6px",
                                background: "#fff7ed",
                                whiteSpace: "nowrap",
                              }}
                            >
                              Highlighted
                            </div>
                          )}

                          {entry.assignedNodeId === null && (
                            <button
                              type="button"
                              style={{
                                ...buttonStyle,
                                width: 20,
                                minWidth: 20,
                                height: 20,
                                padding: 0,
                                lineHeight: 1,
                                fontSize: 13,
                                borderRadius: 999,
                                borderColor: "#fecaca",
                                color: "#b91c1c",
                                background: "#fff",
                              }}
                              title="Remove term from registry"
                              aria-label="Remove term from registry"
                              onClick={() => removeRegistryEntry(entry.id)}
                            >
                              ×
                            </button>
                          )}

                          <div
                            style={{
                              fontSize: 10,
                              color: entry.assignedNodeId ? "#047857" : "#b45309",
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {entry.assignedNodeId ? "Assigned" : "Unassigned"}
                          </div>
                        </div>
                      </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
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

        {selectedEdge && normalizedSelectedEdgeData && !hasSelectedNodes ? (
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
              <strong>Edge ID:</strong> {selectedEdge.id}
              <br />
              <strong>Source → Target:</strong> {selectedEdge.source} → {selectedEdge.target}
            </div>

            <label>
              <div style={inspectorFieldLabelStyle}>Kind</div>
              <input
                style={inputStyle}
                value={
                  normalizedSelectedEdgeData.edge_kind === "sequential"
                    ? "Sequential"
                    : "Parallel"
                }
                readOnly
              />
            </label>

            <label>
              <div style={inspectorFieldLabelStyle}>Color</div>
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
              <div style={inspectorFieldLabelStyle}>Line style</div>
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
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </option>
                ))}
              </select>
            </label>

            {normalizedSelectedEdgeData.edge_kind === "sequential" && (
              <label>
                <div style={inspectorFieldLabelStyle}>Direction</div>
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
                  <option value="forward">Forward</option>
                  <option value="reversed">Reversed</option>
                </select>
              </label>
            )}

            <p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>
              Tip: press Delete / Backspace to remove this edge.
            </p>
          </section>
        ) : hasMultipleSelectedNodes ? (
          <p style={{ fontSize: 13, color: "#71717a" }}>
            Multiple nodes selected. Select a single node to edit its data.
          </p>
        ) : !hasExactlyOneSelectedNode || !selectedNode ? (
          <p style={{ fontSize: 13, color: "#71717a" }}>
            No selection. Click a node or edge on the canvas.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: 12, color: "#52525b" }}>
              <strong>Node ID:</strong> {selectedNode.id}
              <br />
              <strong>Sequence:</strong> {ordering.sequenceByNodeId[selectedNode.id] ?? "-"}
              <br />
              <strong>X position:</strong> {Math.round(selectedNode.position.x)}
              <br />
              <strong>Y position:</strong> {Math.round(selectedNode.position.y)}
            </div>

            <div>
              <div style={inspectorFieldLabelStyle}>Node type</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {NODE_TYPE_OPTIONS.map((nodeTypeOption) => {
                  const isActive = selectedNode.data.node_type === nodeTypeOption;
                  const isEnabled =
                    selectedNode.data.node_type === "default" || isActive;

                  return (
                    <button
                      key={`inspector-node-type:${nodeTypeOption}`}
                      type="button"
                      style={{
                        ...buttonStyle,
                        fontSize: 11,
                        padding: "4px 8px",
                        borderColor: isActive ? "#1d4ed8" : "#d4d4d8",
                        background: isActive ? "#dbeafe" : isEnabled ? "#fff" : "#f4f4f5",
                        color: isActive ? "#1e3a8a" : isEnabled ? "#334155" : "#a1a1aa",
                        fontWeight: isActive ? 700 : 600,
                        cursor: isEnabled ? "pointer" : "not-allowed",
                        opacity: isEnabled ? 1 : 0.7,
                      }}
                      disabled={!isEnabled}
                      aria-pressed={isActive}
                      onClick={() => {
                        if (!isEnabled || !isNodeType(nodeTypeOption)) {
                          return;
                        }

                        updateSelectedNodeType(nodeTypeOption);
                      }}
                    >
                      {NODE_TYPE_LABELS[nodeTypeOption]}
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedNode.data.node_type === "menu" ? (
              <>
                <label>
                  <div style={inspectorFieldLabelStyle}>Title</div>
                  <input
                    style={inputStyle}
                    value={selectedNode.data.title}
                    placeholder="Add title"
                    onChange={(event) => updateSelectedField("title", event.target.value)}
                    onBlur={(event) =>
                      commitSelectedRegistryField("title", event.target.value)
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
                  <div style={inspectorFieldLabelStyle}>Menu Terms</div>
                  <input
                    key={`menu-right-connections:${selectedNode.id}:${
                      selectedMenuNodeConfig?.max_right_connections ??
                      MENU_NODE_RIGHT_CONNECTIONS_MIN
                    }`}
                    style={inputStyle}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    defaultValue={
                      selectedMenuNodeConfig?.max_right_connections ??
                      MENU_NODE_RIGHT_CONNECTIONS_MIN
                    }
                    onInput={(event) => {
                      const nextValue = event.currentTarget.value.replace(/[^\d]/g, "");
                      if (nextValue === event.currentTarget.value) {
                        return;
                      }

                      event.currentTarget.value = nextValue;
                    }}
                    onBlur={(event) => {
                      event.currentTarget.value = commitSelectedMenuRightConnectionsInput(
                        event.currentTarget.value
                      );
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") {
                        return;
                      }

                      event.preventDefault();
                      event.currentTarget.value = commitSelectedMenuRightConnectionsInput(
                        event.currentTarget.value
                      );
                    }}
                  />
                </label>

                <div
                  style={{
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
                        opacity:
                          (selectedMenuNodeConfig?.max_right_connections ??
                            MENU_NODE_RIGHT_CONNECTIONS_MAX) >=
                          MENU_NODE_RIGHT_CONNECTIONS_MAX
                            ? 0.45
                            : 1,
                        cursor:
                          (selectedMenuNodeConfig?.max_right_connections ??
                            MENU_NODE_RIGHT_CONNECTIONS_MAX) >=
                          MENU_NODE_RIGHT_CONNECTIONS_MAX
                            ? "not-allowed"
                            : "pointer",
                      }}
                      title="Add menu term"
                      aria-label="Add menu term"
                      onClick={addSelectedMenuTerm}
                      disabled={
                        (selectedMenuNodeConfig?.max_right_connections ??
                          MENU_NODE_RIGHT_CONNECTIONS_MAX) >=
                        MENU_NODE_RIGHT_CONNECTIONS_MAX
                      }
                    >
                      +
                    </button>
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

                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <button
                            type="button"
                            style={{
                              ...buttonStyle,
                              fontSize: 10,
                              padding: "2px 6px",
                              borderColor: "#fca5a5",
                              color: "#b91c1c",
                              flexShrink: 0,
                            }}
                            title="Delete this term"
                            onClick={() => deleteSelectedMenuTermById(menuTerm.id)}
                          >
                            X
                          </button>

                          <input
                            style={inputStyle}
                            value={menuTerm.term}
                            placeholder="Add term"
                            onChange={(event) =>
                              updateSelectedMenuTermById(menuTerm.id, event.target.value)
                            }
                            onBlur={(event) =>
                              commitSelectedMenuTermRegistryField(
                                menuTerm.id,
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
                        No Menu Term options yet. Add one in a Menu node or include one in Controlled Language.
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
            ) : selectedNode.data.node_type === "frame" ? (
              <>
                <label>
                  <div style={inspectorFieldLabelStyle}>Title</div>
                  <input
                    style={inputStyle}
                    value={selectedNode.data.title}
                    placeholder="Add title"
                    onChange={(event) => updateSelectedField("title", event.target.value)}
                    onBlur={(event) =>
                      commitSelectedRegistryField("title", event.target.value)
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

                <div
                  style={{
                    border: "1px solid #cbd5e1",
                    borderRadius: 8,
                    padding: 8,
                    background: "#f8fafc",
                    display: "grid",
                    gap: 6,
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#334155" }}>
                    Frame style
                  </div>

                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {FRAME_SHADE_OPTIONS.map((frameShadeOption) => {
                      const isActive =
                        (selectedFrameNodeConfig?.shade ?? "medium") === frameShadeOption;

                      return (
                        <button
                          key={`frame-shade:${frameShadeOption}`}
                          type="button"
                          style={{
                            ...buttonStyle,
                            fontSize: 11,
                            padding: "4px 8px",
                            borderColor: isActive ? "#64748b" : "#cbd5e1",
                            background: isActive ? "#e2e8f0" : "#f8fafc",
                            color: isActive ? "#0f172a" : "#334155",
                            fontWeight: isActive ? 700 : 600,
                          }}
                          onClick={() => updateSelectedFrameShade(frameShadeOption)}
                        >
                          {FRAME_SHADE_LABELS[frameShadeOption]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label>
                  <div style={inspectorFieldLabelStyle}>Concept</div>
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
                      <option key={`frame-concept:${option}`} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <div style={inspectorFieldLabelStyle}>Notes</div>
                  <textarea
                    style={{ ...inputStyle, minHeight: 76, resize: "vertical" }}
                    value={selectedNode.data.notes}
                    onChange={(event) => updateSelectedField("notes", event.target.value)}
                    onBlur={(event) =>
                      commitSelectedRegistryField("notes", event.target.value)
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
              </>
            ) : (
              <>
                {selectedNode.data.node_type !== "ribbon" && (
                  <label>
                    <div style={inspectorFieldLabelStyle}>Node shape</div>
                    <select
                      style={inputStyle}
                      value={selectedNode.data.node_shape}
                      onChange={(event) =>
                        updateSelectedField("node_shape", event.target.value as NodeShape)
                      }
                    >
                      {NODE_SHAPE_OPTIONS.map((shape) => (
                        <option key={`shape:${shape}`} value={shape}>
                          {shape.charAt(0).toUpperCase() + shape.slice(1)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      marginBottom: 4,
                    }}
                  >
                    <div style={{ ...inspectorFieldLabelStyle, marginBottom: 0 }}>Title</div>
                    {selectedNode.data.node_type !== "ribbon" && (
                      <label
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 11,
                          color: "#334155",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={showDefaultNodeTitleOnCanvas}
                          onChange={(event) =>
                            setShowDefaultNodeTitleOnCanvas(event.target.checked)
                          }
                        />
                        Show
                      </label>
                    )}
                  </div>
                  <input
                    style={inputStyle}
                    value={selectedNode.data.title}
                    onChange={(event) => updateSelectedField("title", event.target.value)}
                    onBlur={(event) =>
                      commitSelectedRegistryField("title", event.target.value)
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

                {selectedNode.data.node_type === "ribbon" && selectedRibbonNodeConfig && (
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
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1e40af" }}>
                      Ribbon Cells
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <div style={{ fontSize: 12, color: "#334155", fontWeight: 600 }}>
                        Columns: {selectedRibbonNodeConfig.columns}
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          style={{
                            ...buttonStyle,
                            width: 24,
                            height: 24,
                            minWidth: 24,
                            padding: 0,
                            fontWeight: 700,
                            lineHeight: 1,
                          }}
                          onClick={() => updateRibbonColumns(1)}
                          aria-label="Add ribbon column"
                          title="Add ribbon column"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          style={{
                            ...buttonStyle,
                            width: 24,
                            height: 24,
                            minWidth: 24,
                            padding: 0,
                            fontWeight: 700,
                            lineHeight: 1,
                            opacity:
                              selectedRibbonNodeConfig.columns <= RIBBON_NODE_MIN_COLUMNS
                                ? 0.45
                                : 1,
                            cursor:
                              selectedRibbonNodeConfig.columns <= RIBBON_NODE_MIN_COLUMNS
                                ? "not-allowed"
                                : "pointer",
                          }}
                          onClick={() => updateRibbonColumns(-1)}
                          disabled={selectedRibbonNodeConfig.columns <= RIBBON_NODE_MIN_COLUMNS}
                          aria-label="Remove ribbon column"
                          title="Remove ribbon column"
                        >
                          -
                        </button>
                      </div>
                    </div>

                    <div style={{ marginTop: 2 }}>
                      {[...selectedRibbonNodeConfig.cells]
                        .sort((cellA, cellB) =>
                          cellA.column === cellB.column
                            ? cellA.row - cellB.row
                            : cellA.column - cellB.column
                        )
                        .map((cell) => (
                          <div
                            key={`inspector-ribbon-cell:${cell.id}`}
                            style={{
                              border: "1px solid #e2e8f0",
                              borderRadius: 6,
                              padding: "6px 8px",
                              marginBottom: 6,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: "#64748b",
                                marginBottom: 6,
                              }}
                            >
                              Cell {cell.column + 1}
                            </div>

                            <div style={{ display: "grid", gap: 6 }}>
                              <div>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 8,
                                    marginBottom: 4,
                                  }}
                                >
                                  <div style={{ fontSize: 11, color: "#334155", fontWeight: 700 }}>
                                    Label
                                  </div>
                                  <button
                                    type="button"
                                    style={{
                                      ...buttonStyle,
                                      fontSize: 10,
                                      padding: "2px 6px",
                                      background:
                                        visibleInspectorRibbonCellGlossary?.cellId === cell.id &&
                                        visibleInspectorRibbonCellGlossary.field === "label"
                                          ? "#dbeafe"
                                          : "#fff",
                                      borderColor:
                                        visibleInspectorRibbonCellGlossary?.cellId === cell.id &&
                                        visibleInspectorRibbonCellGlossary.field === "label"
                                          ? "#93c5fd"
                                          : "#d4d4d8",
                                    }}
                                    onClick={() =>
                                      toggleInspectorRibbonCellGlossary(cell.id, "label")
                                    }
                                  >
                                    Glossary ▾
                                  </button>
                                </div>

                                <input
                                  style={{ ...inputStyle, fontSize: 11 }}
                                  value={cell.label}
                                  placeholder="Label"
                                  onChange={(event) =>
                                    updateRibbonCellField(cell.id, "label", event.target.value)
                                  }
                                  onBlur={(event) =>
                                    commitSelectedRibbonCellRegistryField(
                                      cell.id,
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

                                {visibleInspectorRibbonCellGlossary?.cellId === cell.id &&
                                  visibleInspectorRibbonCellGlossary.field === "label" && (
                                    <div
                                      style={{
                                        marginTop: 6,
                                        border: "1px solid #dbeafe",
                                        borderRadius: 6,
                                        background: "#f8fbff",
                                        padding: 6,
                                      }}
                                    >
                                      {controlledLanguageTermsByField.cell_label.length === 0 ? (
                                        <div style={{ fontSize: 10, color: "#64748b" }}>
                                          No included glossary terms for Cell Label yet.
                                        </div>
                                      ) : (
                                        <div
                                          style={{
                                            display: "flex",
                                            flexWrap: "wrap",
                                            gap: 6,
                                          }}
                                        >
                                          {controlledLanguageTermsByField.cell_label.map(
                                            (glossaryTerm) => (
                                              <button
                                                key={`inspector-ribbon-cell-label-glossary:${cell.id}:${glossaryTerm}`}
                                                type="button"
                                                style={{
                                                  ...buttonStyle,
                                                  fontSize: 10,
                                                  padding: "2px 6px",
                                                }}
                                                onClick={() =>
                                                  applyGlossaryTermToInspectorRibbonCell(
                                                    cell.id,
                                                    "label",
                                                    glossaryTerm
                                                  )
                                                }
                                              >
                                                {glossaryTerm}
                                              </button>
                                            )
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                              </div>

                              <div>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 8,
                                    marginBottom: 4,
                                  }}
                                >
                                  <div style={{ fontSize: 11, color: "#334155", fontWeight: 700 }}>
                                    Key Command
                                  </div>
                                  <button
                                    type="button"
                                    style={{
                                      ...buttonStyle,
                                      fontSize: 10,
                                      padding: "2px 6px",
                                      background:
                                        visibleInspectorRibbonCellGlossary?.cellId === cell.id &&
                                        visibleInspectorRibbonCellGlossary.field === "key_command"
                                          ? "#dbeafe"
                                          : "#fff",
                                      borderColor:
                                        visibleInspectorRibbonCellGlossary?.cellId === cell.id &&
                                        visibleInspectorRibbonCellGlossary.field === "key_command"
                                          ? "#93c5fd"
                                          : "#d4d4d8",
                                    }}
                                    onClick={() =>
                                      toggleInspectorRibbonCellGlossary(
                                        cell.id,
                                        "key_command"
                                      )
                                    }
                                  >
                                    Glossary ▾
                                  </button>
                                </div>

                                <input
                                  style={{
                                    ...inputStyle,
                                    fontSize: 11,
                                    fontFamily: "monospace",
                                  }}
                                  value={cell.key_command}
                                  placeholder="Key Command"
                                  maxLength={24}
                                  onChange={(event) =>
                                    updateRibbonCellField(
                                      cell.id,
                                      "key_command",
                                      event.target.value
                                    )
                                  }
                                  onBlur={(event) =>
                                    commitSelectedRibbonCellRegistryField(
                                      cell.id,
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

                                {visibleInspectorRibbonCellGlossary?.cellId === cell.id &&
                                  visibleInspectorRibbonCellGlossary.field ===
                                    "key_command" && (
                                    <div
                                      style={{
                                        marginTop: 6,
                                        border: "1px solid #dbeafe",
                                        borderRadius: 6,
                                        background: "#f8fbff",
                                        padding: 6,
                                      }}
                                    >
                                      {controlledLanguageTermsByField.key_command.length === 0 ? (
                                        <div style={{ fontSize: 10, color: "#64748b" }}>
                                          No included glossary terms for Key Command yet.
                                        </div>
                                      ) : (
                                        <div
                                          style={{
                                            display: "flex",
                                            flexWrap: "wrap",
                                            gap: 6,
                                          }}
                                        >
                                          {controlledLanguageTermsByField.key_command.map(
                                            (glossaryTerm) => (
                                              <button
                                                key={`inspector-ribbon-key-command-glossary:${cell.id}:${glossaryTerm}`}
                                                type="button"
                                                style={{
                                                  ...buttonStyle,
                                                  fontSize: 10,
                                                  padding: "2px 6px",
                                                }}
                                                onClick={() =>
                                                  applyGlossaryTermToInspectorRibbonCell(
                                                    cell.id,
                                                    "key_command",
                                                    glossaryTerm
                                                  )
                                                }
                                              >
                                                {glossaryTerm}
                                              </button>
                                            )
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                              </div>

                              <div>
                                <div
                                  style={{
                                    fontSize: 11,
                                    color: "#334155",
                                    fontWeight: 700,
                                    marginBottom: 4,
                                  }}
                                >
                                  Tool Tip
                                </div>
                                <textarea
                                  style={{ ...inputStyle, fontSize: 11 }}
                                  value={cell.tool_tip}
                                  placeholder="Tool Tip"
                                  rows={2}
                                  onChange={(event) =>
                                    updateRibbonCellField(cell.id, "tool_tip", event.target.value)
                                  }
                                  onBlur={(event) =>
                                    commitSelectedRibbonCellRegistryField(
                                      cell.id,
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
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {selectedNodeIsDefaultInspectorNode && (
                    <>
                      <div
                        style={{
                          border: "1px solid #dbeafe",
                          borderRadius: 8,
                          padding: 8,
                          background: "#f8fbff",
                          display: "grid",
                          gap: 6,
                        }}
                      >
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8" }}>
                          Displayed term in node
                        </div>

                        {CONTROLLED_LANGUAGE_NODE_FIELDS.map((fieldType) => (
                          <label
                            key={`display-term-field:${fieldType}`}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              fontSize: 12,
                              color: "#334155",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={selectedNode.data.display_term_field === fieldType}
                              onChange={(event) => {
                                if (!event.target.checked) {
                                  return;
                                }

                                updateSelectedDisplayTermField(fieldType);
                              }}
                            />
                            {CONTROLLED_LANGUAGE_FIELD_LABELS[fieldType]}
                          </label>
                        ))}
                      </div>

                      <label>
                        <div style={inspectorFieldLabelStyle}>Body text</div>
                        <textarea
                          style={{ ...inputStyle, minHeight: 68, resize: "vertical" }}
                          value={selectedNode.data.body_text}
                          onChange={(event) =>
                            updateSelectedField("body_text", event.target.value)
                          }
                          onBlur={(event) =>
                            commitSelectedRegistryField("body_text", event.target.value)
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

                      <div>
                        <div style={{ fontSize: 12, marginBottom: 4, color: "#334155" }}>
                          Body text preview (markdown)
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
                              <div style={inspectorFieldLabelStyle}>
                                {CONTROLLED_LANGUAGE_FIELD_LABELS[fieldType]}
                              </div>
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
                              onBlur={(event) =>
                                commitSelectedRegistryField(fieldType, event.target.value)
                              }
                              onKeyDown={(event) => {
                                if (event.key !== "Enter") {
                                  return;
                                }

                                event.preventDefault();
                                event.currentTarget.blur();
                              }}
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
              </>
            )}

            {selectedNode.data.node_type !== "frame" && (
              <>
                <label>
                  <div style={inspectorFieldLabelStyle}>Tone</div>
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
                  <div style={inspectorFieldLabelStyle}>Polarity</div>
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
                  <div style={inspectorFieldLabelStyle}>Reversibility</div>
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
                  <div style={inspectorFieldLabelStyle}>Concept</div>
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
                  <div style={inspectorFieldLabelStyle}>Notes</div>
                  <textarea
                    style={{ ...inputStyle, minHeight: 76, resize: "vertical" }}
                    value={selectedNode.data.notes}
                    onChange={(event) => updateSelectedField("notes", event.target.value)}
                    onBlur={(event) =>
                      commitSelectedRegistryField("notes", event.target.value)
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

                <hr style={{ border: 0, borderTop: "1px solid #e4e4e7" }} />

                <label>
                  <div style={inspectorFieldLabelStyle}>Action type name</div>
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
                  <div style={inspectorFieldLabelStyle}>Action type color</div>
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
                  <div style={inspectorFieldLabelStyle}>Card style</div>
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
              </>
            )}
          </div>
        )}
        </section>
      </aside>

      {isHelpModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="help-modal-title"
          onClick={closeHelpModal}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2090,
            background: "rgba(15, 23, 42, 0.58)",
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(960px, 97vw)",
              maxHeight: "90vh",
              overflowY: "auto",
              border: "1px solid #cbd5e1",
              borderRadius: 12,
              background: "#ffffff",
              boxShadow: "0 22px 45px rgba(15, 23, 42, 0.24)",
              padding: 14,
              display: "grid",
              gap: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <h3 id="help-modal-title" style={{ margin: 0, fontSize: 18, color: "#0f172a" }}>
                Termpath Help &amp; Key Commands
              </h3>

              <button
                type="button"
                style={{
                  ...buttonStyle,
                  borderColor: "#94a3b8",
                  color: "#0f172a",
                  fontWeight: 700,
                }}
                onClick={closeHelpModal}
              >
                Close
              </button>
            </div>

            <p style={{ margin: 0, fontSize: 12, color: "#475569" }}>
              This guide covers core workflows, keyboard shortcuts, and where to find
              each feature in the editor.
            </p>

            <section
              style={{
                border: "1px solid #dbeafe",
                borderRadius: 8,
                background: "#f8fbff",
                padding: 10,
              }}
            >
              <h4 style={{ marginTop: 0, marginBottom: 8, fontSize: 14, color: "#1e3a8a" }}>
                Global keyboard shortcuts (Canvas mode)
              </h4>
              <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6, fontSize: 12 }}>
                {HELP_CANVAS_SHORTCUTS.map((shortcut) => (
                  <li key={`help-canvas-shortcut:${shortcut.keys}`}>
                    <strong>{shortcut.keys}</strong> — {shortcut.description}
                  </li>
                ))}
              </ul>
              <p style={{ marginTop: 8, marginBottom: 0, fontSize: 11, color: "#475569" }}>
                Note: these shortcuts are ignored while typing in inputs, textareas, or select fields.
              </p>
            </section>

            <section
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                background: "#f8fafc",
                padding: 10,
              }}
            >
              <h4 style={{ marginTop: 0, marginBottom: 8, fontSize: 14, color: "#1e293b" }}>
                Context-specific key behavior
              </h4>
              <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6, fontSize: 12 }}>
                {HELP_CONTEXT_SHORTCUTS.map((shortcut) => (
                  <li key={`help-context-shortcut:${shortcut.keys}`}>
                    <strong>{shortcut.keys}</strong> — {shortcut.description}
                  </li>
                ))}
              </ul>
            </section>

            <section
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                background: "#ffffff",
                padding: 10,
              }}
            >
              <h4 style={{ marginTop: 0, marginBottom: 8, fontSize: 14, color: "#1e293b" }}>
                Core workflows
              </h4>
              <ol style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6, fontSize: 12 }}>
                <li>
                  <strong>Create nodes:</strong> double-click empty canvas to add Default, or use Tab / Shift+Tab / Shift+R.
                </li>
                <li>
                  <strong>Copy &amp; paste nodes:</strong> select node(s), press Ctrl/Cmd+C, then Ctrl/Cmd+V to paste safe duplicates with new IDs (frame copies include member nodes).
                </li>
                <li>
                  <strong>Connect nodes:</strong> drag from source handles to target handles to create edges.
                </li>
                <li>
                  <strong>Edit node data:</strong> select exactly one node, then use the Node Data Panel on the right (multi-select must be narrowed first).
                </li>
                <li>
                  <strong>Frame a flow area:</strong> select 2+ non-frame nodes, then use Shift+F or “Frame selected nodes”.
                </li>
                <li>
                  <strong>Edit edges:</strong> click an edge to open Edge Inspector and adjust color/style/direction.
                </li>
                <li>
                  <strong>Glossary occurrence highlight:</strong> in Controlled Language, click a term’s instance count to highlight all matching nodes on canvas; click again, choose another term, or click canvas to clear.
                </li>
                <li>
                  <strong>Undo recent changes:</strong> use Undo in the top actions bar (up to 3 snapshots).
                </li>
              </ol>
            </section>

            <section
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                background: "#ffffff",
                padding: 10,
              }}
            >
              <h4 style={{ marginTop: 0, marginBottom: 8, fontSize: 14, color: "#1e293b" }}>
                Panels and tools (where to do what)
              </h4>
              <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6, fontSize: 12 }}>
                <li>
                  <strong>Top actions:</strong> Back, Canvas/Table view toggle, Export CSV/XML/JSON, Import, Undo, Send Feedback, Get Help.
                </li>
                <li>
                  <strong>Project Sequence ID panel:</strong> sequence preview, ordered node list, and node-id visibility toggle.
                </li>
                <li>
                  <strong>Node Data Panel:</strong> edit node-type fields (Default / Menu / Ribbon / Frame).
                </li>
                <li>
                  <strong>Controlled Language panel:</strong> manage glossary terms, include/exclude options, import/export glossary, and click occurrence counts to highlight matching canvas nodes.
                </li>
                <li>
                  <strong>Global Attribute Admin:</strong> manage option lists for Tone, Polarity, Reversibility, Concept, Action Type, and Card Style.
                </li>
                <li>
                  <strong>UI Journey Conversation + Snapshots:</strong> build/export conversation text and save/recall journey snapshots.
                </li>
                <li>
                  <strong>Feedback modal:</strong> submit Product/UI/tool feedback to the Supabase feedback endpoint.
                </li>
              </ul>
            </section>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                type="button"
                style={{
                  ...buttonStyle,
                  borderColor: "#dc2626",
                  background: "#fef2f2",
                  color: "#991b1b",
                  fontWeight: 700,
                }}
                onClick={closeHelpModal}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {isFeedbackModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-modal-title"
          onClick={closeFeedbackModal}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2100,
            background: "rgba(15, 23, 42, 0.56)",
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(640px, 96vw)",
              maxHeight: "90vh",
              overflowY: "auto",
              border: "1px solid #cbd5e1",
              borderRadius: 12,
              background: "#ffffff",
              boxShadow: "0 22px 45px rgba(15, 23, 42, 0.24)",
              padding: 14,
              display: "grid",
              gap: 12,
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
              <h3 id="feedback-modal-title" style={{ margin: 0, fontSize: 18, color: "#0f172a" }}>
                Send Feedback
              </h3>

              <button
                type="button"
                style={{
                  ...buttonStyle,
                  borderColor: "#94a3b8",
                  color: "#0f172a",
                  fontWeight: 700,
                  opacity: feedbackSubmitStatus === "submitting" ? 0.5 : 1,
                  cursor: feedbackSubmitStatus === "submitting" ? "not-allowed" : "pointer",
                }}
                onClick={closeFeedbackModal}
                disabled={feedbackSubmitStatus === "submitting"}
              >
                Close
              </button>
            </div>

            <p style={{ margin: 0, fontSize: 12, color: "#475569" }}>
              Share product feedback directly into your Supabase feedback inbox.
            </p>

            <form onSubmit={handleFeedbackSubmit} style={{ display: "grid", gap: 10 }}>
              <label>
                <div style={inspectorFieldLabelStyle}>Feedback type</div>
                <select
                  style={inputStyle}
                  value={feedbackType}
                  onChange={(event) => setFeedbackType(event.target.value as FeedbackType)}
                  disabled={feedbackSubmitStatus === "submitting"}
                >
                  {FEEDBACK_TYPE_OPTIONS.map((option) => (
                    <option key={`feedback-type:${option.value}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <div style={inspectorFieldLabelStyle}>Name or email (optional)</div>
                <input
                  style={inputStyle}
                  type="text"
                  value={feedbackEmail}
                  onChange={(event) => setFeedbackEmail(event.target.value)}
                  placeholder="Jane Doe or you@example.com"
                  disabled={feedbackSubmitStatus === "submitting"}
                />
              </label>

              <label>
                <div style={inspectorFieldLabelStyle}>Feedback</div>
                <textarea
                  style={{ ...inputStyle, minHeight: 160, resize: "vertical" }}
                  value={feedbackMessage}
                  onChange={(event) => setFeedbackMessage(event.target.value)}
                  maxLength={FEEDBACK_MAX_MESSAGE_LENGTH}
                  placeholder="What should we improve?"
                  disabled={feedbackSubmitStatus === "submitting"}
                />
              </label>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  flexWrap: "wrap",
                  fontSize: 11,
                  color: isFeedbackEmailValid ? "#64748b" : "#b91c1c",
                }}
              >
                <span>
                  {isFeedbackEmailValid
                    ? "Name or email is optional."
                    : "If you include an email, please use a valid format."}
                </span>
                <span>
                  {trimmedFeedbackMessage.length}/{FEEDBACK_MAX_MESSAGE_LENGTH}
                </span>
              </div>

              {feedbackSubmitMessage && (
                <div
                  style={{
                    fontSize: 12,
                    borderRadius: 6,
                    padding: "6px 8px",
                    border:
                      feedbackSubmitStatus === "error"
                        ? "1px solid #fecaca"
                        : feedbackSubmitStatus === "success"
                          ? "1px solid #bbf7d0"
                          : "1px solid #bfdbfe",
                    background:
                      feedbackSubmitStatus === "error"
                        ? "#fef2f2"
                        : feedbackSubmitStatus === "success"
                          ? "#f0fdf4"
                          : "#eff6ff",
                    color:
                      feedbackSubmitStatus === "error"
                        ? "#991b1b"
                        : feedbackSubmitStatus === "success"
                          ? "#14532d"
                          : "#1e3a8a",
                  }}
                >
                  {feedbackSubmitMessage}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button
                  type="button"
                  style={{
                    ...buttonStyle,
                    borderColor: "#94a3b8",
                    color: "#0f172a",
                    fontWeight: 700,
                    opacity: feedbackSubmitStatus === "submitting" ? 0.5 : 1,
                    cursor: feedbackSubmitStatus === "submitting" ? "not-allowed" : "pointer",
                  }}
                  onClick={closeFeedbackModal}
                  disabled={feedbackSubmitStatus === "submitting"}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    ...buttonStyle,
                    borderColor: "#a855f7",
                    background: "#faf5ff",
                    color: "#6b21a8",
                    fontWeight: 700,
                    opacity: canSubmitFeedback ? 1 : 0.55,
                    cursor: canSubmitFeedback ? "pointer" : "not-allowed",
                  }}
                  disabled={!canSubmitFeedback}
                >
                  {feedbackSubmitStatus === "submitting" ? "Sending..." : "Send feedback"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isUiJourneyConversationOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="UI Journey Conversation"
          onClick={closeUiJourneyConversation}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2000,
            background: "rgba(15, 23, 42, 0.5)",
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(860px, 96vw)",
              maxHeight: "90vh",
              overflowY: "auto",
              border: "1px solid #cbd5e1",
              borderRadius: 12,
              background: "#ffffff",
              boxShadow: "0 22px 45px rgba(15, 23, 42, 0.22)",
              padding: 14,
              display: "grid",
              gap: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 18, color: "#0f172a" }}>
                UI Journey Conversation
              </h3>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  flexWrap: "wrap",
                  gap: 6,
                }}
              >
                {UI_JOURNEY_CONVERSATION_EXPORT_FORMATS.map((format) => (
                  <button
                    key={`ui-journey-conversation-export:${format}`}
                    type="button"
                    style={{
                      ...buttonStyle,
                      borderColor: "#bfdbfe",
                      background: "#eff6ff",
                      color: "#1e3a8a",
                      fontWeight: 700,
                    }}
                    onClick={() => exportUiJourneyConversation(format)}
                  >
                    Export {UI_JOURNEY_CONVERSATION_EXPORT_FORMAT_LABELS[format]}
                  </button>
                ))}

                <button
                  type="button"
                  style={{
                    ...buttonStyle,
                    borderColor: "#94a3b8",
                    color: "#0f172a",
                    fontWeight: 700,
                  }}
                  onClick={closeUiJourneyConversation}
                >
                  Close
                </button>
              </div>
            </div>

            {uiJourneyConversationSnapshot.length === 0 ? (
              <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
                No nodes found in the current selection.
              </p>
            ) : (
              <div style={{ display: "grid", gap: 10, maxHeight: 480, overflowY: "auto" }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "#64748b",
                    opacity: 0.75,
                    letterSpacing: 0.6,
                    textTransform: "uppercase",
                    textAlign: "center",
                  }}
                >
                  Sequence Start
                </div>

                {uiJourneyConversationSnapshot.map((entry, entryIndex) => {
                  const stepCounterLabel = `${entryIndex + 1} of ${uiJourneyConversationSnapshot.length}`;
                  const heading = `${entry.sequence ?? "-"} - ${entry.title || "Untitled"}`;
                  const isFrameEntry = entry.nodeType === "frame";
                  const isCenteredHeaderEntry =
                    entry.nodeType === "frame" || entry.nodeType === "ribbon";
                  const isOrphanEntry = entry.connectionMeta.isOrphan;
                  const headingColor = isOrphanEntry ? "#dc2626" : "#64748b";
                  const contentColor = isOrphanEntry ? "#7f1d1d" : "#0f172a";
                  const labelColor = isOrphanEntry ? "#b91c1c" : "#64748b";
                  const conversationFieldLabelStyle: React.CSSProperties = {
                    fontSize: 10,
                    fontWeight: 600,
                    color: labelColor,
                    opacity: isOrphanEntry ? 0.82 : 0.68,
                    textTransform: "uppercase",
                    letterSpacing: 0.7,
                    lineHeight: 1.3,
                  };
                  const conversationFieldValueStyle: React.CSSProperties = {
                    fontSize: 15,
                    fontWeight: 500,
                    color: contentColor,
                    lineHeight: 1.45,
                  };
                  const hasNonEmptyConversationValue = (
                    value: string | null | undefined
                  ): value is string =>
                    typeof value === "string" && value.trim().length > 0;
                  const visibleFields = entry.fields.filter((field) =>
                    hasNonEmptyConversationValue(field.value)
                  );
                  const hasBodyText = hasNonEmptyConversationValue(entry.bodyText);
                  const hasNotes = hasNonEmptyConversationValue(entry.notes);
                  const trimmedBodyText = hasBodyText ? entry.bodyText.trim() : "";
                  const trimmedNotes = hasNotes ? entry.notes.trim() : "";
                  const detailColumnCount =
                    1 + (hasBodyText ? 1 : 0) + (hasNotes ? 1 : 0);

                  if (isCenteredHeaderEntry) {
                    return (
                      <section
                        key={`ui-journey-conversation:${entry.entryId}`}
                        style={{
                          border: isOrphanEntry ? "1px solid #fecaca" : "1px solid #dbeafe",
                          borderRadius: 10,
                          background: isOrphanEntry ? "#fef2f2" : "#f8fafc",
                          padding: "10px 12px",
                          textAlign: "center",
                          display: "grid",
                          gap: 4,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            color: labelColor,
                            opacity: 0.72,
                            textAlign: "center",
                          }}
                        >
                          {stepCounterLabel}
                        </div>

                        <div style={{ display: "inline-flex", justifyContent: "center" }}>
                          <span
                            style={{
                              fontWeight: 600,
                              fontSize: 12,
                              color: headingColor,
                            }}
                          >
                            {heading}
                          </span>
                          {isOrphanEntry && (
                            <span
                              style={{
                                marginLeft: 6,
                                fontSize: 9,
                                fontWeight: 700,
                                color: "#b91c1c",
                                border: "1px solid #fecaca",
                                borderRadius: 999,
                                background: "#fee2e2",
                                padding: "1px 6px",
                                lineHeight: 1.35,
                              }}
                            >
                              (Orphaned)
                            </span>
                          )}
                        </div>

                        {visibleFields.length > 0 ? (
                          visibleFields.map((field) => (
                            <div
                              key={`${entry.nodeId}:${field.label}`}
                              style={{
                                display: "grid",
                                gap: 2,
                                justifyItems: "center",
                                textAlign: "center",
                              }}
                            >
                              <div style={conversationFieldLabelStyle}>{field.label}</div>
                              <div
                                style={{
                                  ...conversationFieldValueStyle,
                                  textAlign: "center",
                                }}
                              >
                                {field.value.trim()}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div
                            style={{
                              fontSize: 14,
                              color: isOrphanEntry ? "#b91c1c" : "#94a3b8",
                              textAlign: "center",
                              fontStyle: "italic",
                            }}
                          >
                            No copy fields provided.
                          </div>
                        )}

                        {hasNotes && (
                          <div style={{ marginTop: 4, display: "grid", gap: 2, justifyItems: "center" }}>
                            <div
                              style={conversationFieldLabelStyle}
                            >
                              Notes
                            </div>
                            <div
                              style={{
                                ...conversationFieldValueStyle,
                                textAlign: "center",
                              }}
                            >
                              {trimmedNotes}
                            </div>
                          </div>
                        )}
                      </section>
                    );
                  }

                  return (
                    <section
                      key={`ui-journey-conversation:${entry.entryId}`}
                      style={{
                        border: isOrphanEntry ? "1px solid #fecaca" : "1px solid #dbeafe",
                        borderRadius: 10,
                        background: isOrphanEntry
                          ? "#fef2f2"
                          : isCenteredHeaderEntry
                            ? "#f8fafc"
                            : "#ffffff",
                        padding: "10px 12px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          color: labelColor,
                          opacity: 0.72,
                          textAlign: "right",
                        }}
                      >
                        {stepCounterLabel}
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: `repeat(${detailColumnCount}, minmax(0, 1fr))`,
                          gap: 12,
                        }}
                      >
                        <div style={{ display: "grid", gap: 4 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "flex-start",
                              flexWrap: "wrap",
                              gap: 6,
                              textAlign: "left",
                            }}
                          >
                            <span
                              style={{
                                fontWeight: 600,
                                fontSize: 11,
                                color: headingColor,
                              }}
                            >
                              {heading}
                            </span>
                            {isOrphanEntry && (
                              <span
                                style={{
                                  fontSize: 9,
                                  fontWeight: 700,
                                  color: "#b91c1c",
                                  border: "1px solid #fecaca",
                                  borderRadius: 999,
                                  background: "#fee2e2",
                                  padding: "1px 6px",
                                  lineHeight: 1.35,
                                }}
                              >
                                (Orphaned)
                              </span>
                            )}
                          </div>

                          {visibleFields.length > 0 ? (
                            visibleFields.map((field) => (
                              <div
                                key={`${entry.nodeId}:${field.label}`}
                                style={{
                                  display: "grid",
                                  gap: 2,
                                  textAlign: "left",
                                }}
                              >
                                <div
                                  style={{
                                    ...conversationFieldLabelStyle,
                                    textAlign: "left",
                                  }}
                                >
                                  {field.label}
                                </div>
                                <div
                                  style={{
                                    ...conversationFieldValueStyle,
                                    textAlign: "left",
                                  }}
                                >
                                  {field.value.trim()}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div
                              style={{
                                fontSize: 12,
                                color: isOrphanEntry ? "#b91c1c" : "#94a3b8",
                                textAlign: "left",
                                fontStyle: "italic",
                              }}
                            >
                              No copy fields provided.
                            </div>
                          )}
                        </div>

                        {hasBodyText && (
                          <div style={{ display: "grid", alignContent: "start", gap: 2 }}>
                            <div
                              style={{
                                ...conversationFieldLabelStyle,
                                marginBottom: 4,
                                textAlign: "left",
                              }}
                            >
                              Body Text
                            </div>
                            <div
                              style={{
                                ...conversationFieldValueStyle,
                                fontSize: 14,
                                textAlign: "left",
                                whiteSpace: "pre-wrap",
                                minHeight: 16,
                              }}
                            >
                              {trimmedBodyText}
                            </div>
                          </div>
                        )}

                        {hasNotes && (
                          <div style={{ display: "grid", alignContent: "start", gap: 2 }}>
                            <div
                              style={{
                                ...conversationFieldLabelStyle,
                                marginBottom: 4,
                                textAlign: "left",
                              }}
                            >
                              Notes
                            </div>
                            <div
                              style={{
                                ...conversationFieldValueStyle,
                                fontSize: 14,
                                textAlign: "left",
                                whiteSpace: "pre-wrap",
                                minHeight: 16,
                              }}
                            >
                              {trimmedNotes}
                            </div>
                          </div>
                        )}
                      </div>
                    </section>
                  );
                })}

                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "#64748b",
                    opacity: 0.75,
                    letterSpacing: 0.6,
                    textTransform: "uppercase",
                    textAlign: "center",
                  }}
                >
                  Sequence End
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
