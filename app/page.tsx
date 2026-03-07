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
  buildDownloadFileName,
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
  normalizeControlledLanguageTerm,
  buildControlledLanguageGlossaryKey,
  parseControlledLanguageGlossaryKey,
  isControlledLanguageFieldType,
  normalizeControlledLanguageFieldType,
  isNodeControlledLanguageFieldType,
  collectControlledLanguageTermsFromNode,
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
  createProjectRecord,
  createProjectId,
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


type ImportFeedback = {
  type: "success" | "error" | "info";
  message: string;
};

const TABLE_SHOEHORNING_DISABLED_FIELDS = new Set<EditableMicrocopyField>([
  "body_text",
  "primary_cta",
  "secondary_cta",
  "helper_text",
  "error_text",
]);



type EditorSnapshot = {
  nodes: FlowNode[];
  edges: FlowEdge[];
  adminOptions: GlobalOptionConfig;
  controlledLanguageGlossary: ControlledLanguageGlossaryEntry[];
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
  const [accountCodeInput, setAccountCodeInput] = useState(SINGLE_ACCOUNT_CODE);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState("");

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
  const [sidePanelWidth, setSidePanelWidth] = useState<number>(readInitialSidePanelWidth);
  const [isResizingSidePanel, setIsResizingSidePanel] = useState(false);

  const rfRef = useRef<ReactFlowInstance<FlowNode, FlowEdge> | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const lastCanvasPointerClientPositionRef = useRef<{ x: number; y: number } | null>(
    null
  );
  const isCanvasPointerInsideRef = useRef(false);
  const isCanvasPointerDownRef = useRef(false);
  const importFileInputRef = useRef<HTMLInputElement | null>(null);
  const hasLoadedStoreRef = useRef(false);
  const undoCaptureTimeoutRef = useRef<number | null>(null);
  const menuTermDeleteErrorTimeoutRef = useRef<number | null>(null);
  const captureUndoSnapshotRef = useRef<() => void>(() => undefined);
  const createFrameFromSelectionRef = useRef<() => void>(() => undefined);
  const updateMenuNodeConfigByIdRef = useRef<
    (
      nodeId: string,
      updater: (currentConfig: MenuNodeConfig) => MenuNodeConfig
    ) => void
  >(() => undefined);
  const menuTermGlossaryTermsRef = useRef<string[]>([]);
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
      const hydratedEdges = sanitizeEdges(project.canvas.edges, hydratedNodes);

      setAdminOptions(normalizedAdminOptions);
      setControlledLanguageGlossary(
        sanitizeControlledLanguageGlossary(project.canvas.controlledLanguageGlossary)
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
    uiJourneyConversationSnapshot,
    uiJourneySnapshotDraftName,
    uiJourneySnapshotPresets,
  ]);

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
  }, [setEdges, setNodes]);

  const menuTermGlossaryTerms = useMemo(
    () => buildMenuTermSelectorTerms(nodes, controlledLanguageGlossary),
    [controlledLanguageGlossary, nodes]
  );

  useEffect(() => {
    menuTermGlossaryTermsRef.current = menuTermGlossaryTerms;
  }, [menuTermGlossaryTerms]);

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
      nodeType: "default" | "menu" = "default"
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
      nodeType: "default" | "menu" = "default"
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
    [addNodeAtEvent, clearMenuTermDeleteError]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: FlowNode) => {
      clearMenuTermDeleteError();
      setOpenControlledLanguageFieldType(null);
      setOpenInspectorMenuGlossaryTermId(null);
      setOpenInspectorRibbonCellGlossary(null);
      setSelectedNodeId(node.id);
      setSelectedEdgeId(null);
    },
    [clearMenuTermDeleteError]
  );

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: FlowEdge) => {
      clearMenuTermDeleteError();
      setOpenControlledLanguageFieldType(null);
      setOpenInspectorMenuGlossaryTermId(null);
      setOpenInspectorRibbonCellGlossary(null);
      setSelectedEdgeId(edge.id);
      setSelectedNodeId(null);
      setSelectedNodeIds([]);
    },
    [clearMenuTermDeleteError]
  );

  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes, edges: selectedEdges }: OnSelectionChangeParams<FlowNode, FlowEdge>) => {
      clearMenuTermDeleteError();

      const nextSelectedEdgeId = selectedEdges[0]?.id ?? null;
      const nextSelectedNodeIds = selectedNodes.map((selectedNode) => selectedNode.id);
      const nextSelectedNodeId = selectedNodes[0]?.id ?? null;

      setOpenControlledLanguageFieldType(null);
      setOpenInspectorMenuGlossaryTermId(null);
      setOpenInspectorRibbonCellGlossary(null);
      setSelectedEdgeId(nextSelectedEdgeId);
      setSelectedNodeId(nextSelectedEdgeId ? null : nextSelectedNodeId);
      setSelectedNodeIds(nextSelectedEdgeId ? [] : nextSelectedNodeIds);
    },
    [clearMenuTermDeleteError]
  );

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

        event.preventDefault();
        createFrameFromSelectionRef.current();
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
    getCanvasFallbackClientPosition,
    handleDeleteSelection,
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

  const selectedNonFrameNodesForFrameCreation = useMemo(() => {
    if (selectedEdgeId) {
      return [];
    }

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
  }, [nodes, selectedEdgeId, selectedNodeId, selectedNodeIds]);

  const canCreateFrameFromSelection =
    selectedNonFrameNodesForFrameCreation.length >= 2;

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
      if (!targetNode || targetNode.data.node_type === nextType) {
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

  const createFrameFromSelection = useCallback(() => {
    if (selectedNonFrameNodesForFrameCreation.length < 2) {
      return;
    }

    const bounds = computeNodesBoundingRect(selectedNonFrameNodesForFrameCreation);
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
    const memberNodeIds = selectedNonFrameNodesForFrameCreation.map((node) => node.id);

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
  }, [
    adminOptions,
    queueUndoSnapshot,
    selectedNonFrameNodesForFrameCreation,
    setNodes,
  ]);

  useEffect(() => {
    updateMenuNodeConfigByIdRef.current = updateMenuNodeConfigById;
  }, [updateMenuNodeConfigById]);

  useEffect(() => {
    createFrameFromSelectionRef.current = createFrameFromSelection;
  }, [createFrameFromSelection]);

  const nodeTypes = useMemo(
    () => ({
      flowcopyNode: (props: NodeProps<FlowNode>) => (
        <FlowCopyNode
          {...props}
          onBeforeChange={() => captureUndoSnapshotRef.current()}
          menuTermGlossaryTerms={menuTermGlossaryTermsRef.current}
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
    (projectId: string, extension: DownloadTextExtension, payload: string) => {
      const mimeType = DOWNLOAD_TEXT_MIME_BY_EXTENSION[extension];
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

  const exportUiJourneyConversation = useCallback(
    (format: UiJourneyConversationExportFormat) => {
      if (!activeProject) {
        return;
      }

      const generatedAtLabel = new Date().toLocaleString();

      const payload =
        format === "txt"
          ? buildUiJourneyConversationPlainText(
              uiJourneyConversationSnapshot,
              generatedAtLabel
            )
          : format === "md"
            ? buildUiJourneyConversationMarkdown(
                uiJourneyConversationSnapshot,
                generatedAtLabel
              )
            : format === "html"
              ? buildUiJourneyConversationHtml(
                  uiJourneyConversationSnapshot,
                  generatedAtLabel
                )
              : buildUiJourneyConversationRtf(
                  uiJourneyConversationSnapshot,
                  generatedAtLabel
                );

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
            fontSize: 43,
            lineHeight: 1,
            fontWeight: 900,
            letterSpacing: 0.3,
            color: "#0f172a",
            fontFamily:
              '"Avenir Next", "Segoe UI", "Inter", "Helvetica Neue", Arial, sans-serif',
            pointerEvents: "none",
            zIndex: 1,
          }}
        >
          FlowCopy
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

            <button type="button" style={dashboardButtonStyle} onClick={handleSignOut}>
              Back to Account Code
            </button>
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
              onChange={(event) => setNewProjectName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  createProjectFromDashboard();
                }
              }}
            />
            <button
              type="button"
              style={dashboardPrimaryButtonStyle}
              onClick={createProjectFromDashboard}
            >
              Create Project
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
                setIsControlledLanguagePanelOpen((open) => !open)
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
          <strong> Shift+F</strong> frames selected nodes. All changes autosave. Use
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
            onClick={createFrameFromSelection}
          >
            Frame selected nodes ({selectedNonFrameNodesForFrameCreation.length})
          </button>
        )}

        {selectedNode?.data.node_type === "menu" && (
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
              <span style={{ fontSize: 11, color: "#1e3a8a", fontWeight: 700 }}>
                {controlledLanguageAuditRows.length} term row(s)
              </span>
            </div>

            <p style={{ margin: 0, fontSize: 11, color: "#475569" }}>
              Audit terms by field type. Mark <strong>Include</strong> to expose a
              term in glossary dropdowns beside editable text fields.
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
        ) : !selectedNode ? (
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

            <label>
              <div style={inspectorFieldLabelStyle}>Node type</div>
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
                    {NODE_TYPE_LABELS[nodeTypeOption]}
                  </option>
                ))}
              </select>
            </label>

            {selectedNode.data.node_type === "menu" ? (
              <>
                <label>
                  <div style={inspectorFieldLabelStyle}>Title</div>
                  <input
                    style={inputStyle}
                    value={selectedNode.data.title}
                    placeholder="Add title"
                    onChange={(event) => updateSelectedField("title", event.target.value)}
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
                {uiJourneyConversationSnapshot.map((entry) => {
                  const heading = `${entry.sequence ?? "-"} - ${entry.title || "Untitled"}`;
                  const isFrameEntry = entry.nodeType === "frame";
                  const isCenteredHeaderEntry =
                    entry.nodeType === "frame" || entry.nodeType === "ribbon";
                  const isOrphanEntry = entry.connectionMeta.isOrphan;
                  const headingColor = isOrphanEntry ? "#dc2626" : "#64748b";
                  const contentColor = isOrphanEntry ? "#7f1d1d" : "#334155";
                  const labelColor = isOrphanEntry ? "#b91c1c" : "#64748b";

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

                        {entry.fields.length > 0 ? (
                          entry.fields.map((field) => (
                            <div
                              key={`${entry.nodeId}:${field.label}`}
                              style={{
                                fontSize: 15,
                                color: "#0f172a",
                                textAlign: "center",
                              }}
                            >
                              <strong>{field.label}:</strong> {field.value}
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

                        {entry.notes && (
                          <div style={{ marginTop: 4 }}>
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: labelColor,
                              }}
                            >
                              Notes
                            </div>
                            <div
                              style={{
                                fontSize: 14,
                                color: contentColor,
                                textAlign: "center",
                              }}
                            >
                              {entry.notes}
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
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr 1fr",
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

                          {entry.fields.length > 0 ? (
                            entry.fields.map((field) => (
                              <div
                                key={`${entry.nodeId}:${field.label}`}
                                style={{
                                  fontSize: 14,
                                  textAlign: "left",
                                }}
                              >
                                <strong
                                  style={{
                                    fontSize: 14,
                                    fontWeight: 700,
                                  }}
                                >
                                  {field.label}:
                                </strong>{" "}
                                <span
                                  style={{
                                    fontSize: 14,
                                    fontWeight: 400,
                                    color: "#0f172a",
                                  }}
                                >
                                  {field.value}
                                </span>
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

                        <div style={{ display: "grid", alignContent: "start", gap: 2 }}>
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: labelColor,
                              marginBottom: 2,
                              textAlign: "left",
                            }}
                          >
                            Body Text
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: contentColor,
                              textAlign: "left",
                              whiteSpace: "pre-wrap",
                              minHeight: 16,
                            }}
                          >
                            {entry.bodyText}
                          </div>
                        </div>

                        <div style={{ display: "grid", alignContent: "start", gap: 2 }}>
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: labelColor,
                              marginBottom: 2,
                              textAlign: "left",
                            }}
                          >
                            Notes
                          </div>
                          <div
                          style={{
                            fontSize: 12,
                            color: contentColor,
                            textAlign: "left",
                            whiteSpace: "pre-wrap",
                            minHeight: 16,
                          }}
                        >
                          {entry.notes}
                        </div>
                        </div>
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}






























































































































