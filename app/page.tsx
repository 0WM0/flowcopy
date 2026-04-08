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
  type OnNodeDrag,
  type NodeProps,
  type ReactFlowInstance,
  type OnSelectionChangeParams,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";
import type {
  NodeShape,
  NodeContentConfig,
  EdgeKind,
  EdgeLineStyle,
  FrameShade,
  NodeType,
  NodeControlledLanguageFieldType,
  ControlledLanguageFieldType,
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
  VMN_GROUPS_MIN,
  VMN_GROUPS_MAX,
  VMN_SOURCE_HANDLE_PREFIX,
  VMN_MINIMUM_TERM_ERROR_MESSAGE,
  FRAME_NODE_MIN_WIDTH,
  FRAME_NODE_MIN_HEIGHT,
  FRAME_NODE_PADDING,
  HMN_MIN_COLUMNS,
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
  DEFAULT_NODE_DISPLAY_FIELDS,
  CONTROLLED_LANGUAGE_FIELD_LABELS,
  CONTROLLED_LANGUAGE_FIELD_ORDER,
  CONTROLLED_LANGUAGE_MAX_VISIBLE_ROWS,
  CONTROLLED_LANGUAGE_ROW_HEIGHT_PX,
  CONTROLLED_LANGUAGE_TABLE_HEADER_HEIGHT_PX,
  CONTROLLED_LANGUAGE_TABLE_MAX_HEIGHT_PX,
  TERM_REGISTRY_TERM_TYPE_LABELS,
  TERM_REGISTRY_TERM_TYPE_OPTIONS,
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
import { HelpModal } from "./components/HelpModal";


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
  normalizeConversationSlotTermTypeLabel,
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
  normalizeNodeContentConfig,
  createContentGroupId,
  createContentSlotId,
  pruneFrameNodeMembership,
  applyFrameMovementToMemberNodes,
  constrainNodesToFrameMembershipBounds,
  clampFrameDimension,
  buildMenuSourceHandleId,
  buildContentConfigSourceHandleIds,
  isNodeShape,
  isNodeType,
  resolveNodeHighlightColor,
  getNodeShapeStyle,
  getDiamondBorderLayerStyle,
  getDiamondSurfaceLayerStyle,
  getNodeContentStyle,
  createDefaultNodeData,
  getFallbackNodeSize,
  migrateDefaultToContentConfig,
} from "./lib/node-utils";

const clampMenuRightConnections = (value: number): number => {
  if (!Number.isFinite(value)) {
    return VMN_GROUPS_MIN;
  }

  return Math.min(
    VMN_GROUPS_MAX,
    Math.max(VMN_GROUPS_MIN, Math.round(value))
  );
};

import {
  normalizeEdgeData,
  applyEdgeVisuals,
  sanitizeEdges,
  sanitizeEdgesForStorage,
  cloneEdges,
  inferEdgeKindFromHandles,
  getEdgeKind,
  isSequentialEdge,
  syncSequentialEdgesForContentConfig,
  assignSequentialEdgesToGroupHandles,
  remapGroupEdgesToDefaultHandle,
  hasNonSelectionNodeChanges,
  hasNonSelectionEdgeChanges,
  isEditableEventTarget,
  isEdgeKind,
  getEdgeDirection,
  getFirstAvailableContentConfigSourceHandleId,
  isContentConfigConnectionAllowed,
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
import { createClient } from "@/lib/supabase/client";
import { useUiStore } from "./lib/ui-store";


type ImportFeedback = {
  type: "success" | "error" | "info";
  message: string;
};

type TransferModalContext = "clp" | "conversation" | "project";
type TransferModalMode = "export" | "import";
type TransferModalState = {
  mode: TransferModalMode;
  context: TransferModalContext;
};

type TransferExportFormat = "csv" | "json";

type ClpExportFieldKey =
  | "frame"
  | "title"
  | "termValue"
  | "referenceKey"
  | "nodeType"
  | "sequenceNumber"
  | "assignmentStatus";

type ClpImportColumnMapping = {
  termValue: string | null;
  referenceKey: string | null;
  nodeType: string | null;
  sequenceNumber: string | null;
  assignmentStatus: string | null;
};

type ClpImportMode = "add" | "replace";

type ClpImportSubmission = {
  rows: Array<Record<string, unknown>>;
  columnMapping: ClpImportColumnMapping;
  importMode: ClpImportMode;
};

const TRANSFER_MODAL_CONTEXT_LABELS: Record<TransferModalContext, string> = {
  clp: "Term Registry",
  conversation: "Conversation",
  project: "Project",
};

const CLP_EXPORT_FIELD_OPTIONS: Array<{ key: ClpExportFieldKey; label: string }> = [
  { key: "frame", label: "Frame" },
  { key: "title", label: "Title" },
  { key: "termValue", label: "Term value" },
  { key: "referenceKey", label: "Reference key" },
  { key: "nodeType", label: "Node type" },
  { key: "sequenceNumber", label: "Sequence number" },
  { key: "assignmentStatus", label: "Assignment status" },
];

const CLP_IMPORT_FIELD_OPTIONS: Array<{
  key: keyof ClpImportColumnMapping;
  label: string;
  required: boolean;
}> = [
  { key: "termValue", label: "Term Value", required: true },
  { key: "referenceKey", label: "Reference Key", required: false },
  { key: "nodeType", label: "Node Type", required: false },
  { key: "sequenceNumber", label: "Sequence Number", required: false },
  { key: "assignmentStatus", label: "Assignment Status", required: false },
];

const createDefaultClpExportFieldSelection = (): Record<ClpExportFieldKey, boolean> => ({
  frame: true,
  title: true,
  termValue: true,
  referenceKey: true,
  nodeType: true,
  sequenceNumber: true,
  assignmentStatus: true,
});

const createEmptyClpImportColumnMapping = (): ClpImportColumnMapping => ({
  termValue: null,
  referenceKey: null,
  nodeType: null,
  sequenceNumber: null,
  assignmentStatus: null,
});

const createDefaultClpImportColumnMapping = (
  columnHeaders: string[]
): ClpImportColumnMapping => {
  const nextMapping = createEmptyClpImportColumnMapping();

  CLP_IMPORT_FIELD_OPTIONS.forEach((fieldOption) => {
    const matchingHeader = columnHeaders.find(
      (columnHeader) =>
        columnHeader.trim().toLowerCase() === fieldOption.label.toLowerCase()
    );

    if (matchingHeader) {
      nextMapping[fieldOption.key] = matchingHeader;
    }
  });

  return nextMapping;
};

const formatClpImportPreviewValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "—";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const TRANSFER_PAIR_BUTTON_STYLE: React.CSSProperties = {
  ...buttonStyle,
  fontSize: 11,
  lineHeight: 1,
  padding: "2px 8px",
  minHeight: 24,
};

type TransferModalProps = {
  state: TransferModalState | null;
  exportFormat: TransferExportFormat;
  clpExportFieldSelection: Record<ClpExportFieldKey, boolean>;
  onExportFormatChange: (nextFormat: TransferExportFormat) => void;
  onClpExportFieldSelectionChange: (field: ClpExportFieldKey, checked: boolean) => void;
  onClose: () => void;
  onExport: () => void;
  onClpImport: (payload: ClpImportSubmission) => void;
};

const TransferModal = ({
  state,
  exportFormat,
  clpExportFieldSelection,
  onExportFormatChange,
  onClpExportFieldSelectionChange,
  onClose,
  onExport,
  onClpImport,
}: TransferModalProps) => {
  const [clpImportFileName, setClpImportFileName] = useState<string | null>(null);
  const [clpImportRows, setClpImportRows] = useState<Array<Record<string, unknown>>>([]);
  const [clpImportColumnHeaders, setClpImportColumnHeaders] = useState<string[]>([]);
  const [clpImportColumnMapping, setClpImportColumnMapping] =
    useState<ClpImportColumnMapping>(createEmptyClpImportColumnMapping);
  const [clpImportError, setClpImportError] = useState<string | null>(null);
  const [clpImportMode, setClpImportMode] = useState<ClpImportMode>("add");

  useEffect(() => {
    if (!state || state.mode !== "import" || state.context !== "clp") {
      setClpImportFileName(null);
      setClpImportRows([]);
      setClpImportColumnHeaders([]);
      setClpImportColumnMapping(createEmptyClpImportColumnMapping());
      setClpImportError(null);
      setClpImportMode("add");
    }
  }, [state]);

  const clpImportPreviewRows = useMemo(() => clpImportRows.slice(0, 3), [clpImportRows]);
  const isClpTermValueMapped = clpImportColumnMapping.termValue !== null;

  const handleClpImportFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.currentTarget.value = "";

      if (!file) {
        return;
      }

      try {
        const fileText = await file.text();
        const fileExtension = file.name.split(".").pop()?.toLowerCase();

        if (fileExtension === "csv") {
          const parsedCsv = parseCsvText(fileText);
          const normalizedHeaders = parsedCsv.headers
            .map((header) => header.trim())
            .filter((header) => header.length > 0);

          if (normalizedHeaders.length === 0) {
            throw new Error("CSV file must include a header row.");
          }

          const normalizedRows = parsedCsv.rows.map((row) => {
            const normalizedRow: Record<string, unknown> = {};

            parsedCsv.headers.forEach((header) => {
              const normalizedHeader = header.trim();
              if (normalizedHeader.length === 0) {
                return;
              }

              normalizedRow[normalizedHeader] = row[header];
            });

            return normalizedRow;
          });

          setClpImportFileName(file.name);
          setClpImportColumnHeaders(normalizedHeaders);
          setClpImportRows(normalizedRows);
          setClpImportColumnMapping(createDefaultClpImportColumnMapping(normalizedHeaders));
          setClpImportError(null);
          return;
        }

        if (fileExtension === "json") {
          const parsedJson = safeJsonParse(fileText);

          if (!Array.isArray(parsedJson)) {
            throw new Error("JSON file must contain an array of objects.");
          }

          const firstItem = parsedJson[0];

          if (!firstItem || typeof firstItem !== "object" || Array.isArray(firstItem)) {
            throw new Error("JSON file must contain at least one object entry.");
          }

          const jsonColumnHeaders = Object.keys(firstItem as Record<string, unknown>);

          if (jsonColumnHeaders.length === 0) {
            throw new Error("JSON objects must contain at least one key.");
          }

          const normalizedRows = parsedJson.map((item) => {
            if (!item || typeof item !== "object" || Array.isArray(item)) {
              return {};
            }

            return item as Record<string, unknown>;
          });

          setClpImportFileName(file.name);
          setClpImportColumnHeaders(jsonColumnHeaders);
          setClpImportRows(normalizedRows);
          setClpImportColumnMapping(createDefaultClpImportColumnMapping(jsonColumnHeaders));
          setClpImportError(null);
          return;
        }

        throw new Error("Unsupported file type. Please upload a .csv or .json file.");
      } catch (error) {
        setClpImportFileName(null);
        setClpImportRows([]);
        setClpImportColumnHeaders([]);
        setClpImportColumnMapping(createEmptyClpImportColumnMapping());
        setClpImportError(
          error instanceof Error ? error.message : "Failed to parse import file."
        );
      }
    },
    []
  );

  const handleClpImportMappingChange = useCallback(
    (field: ClpExportFieldKey, nextColumnHeader: string) => {
      setClpImportColumnMapping((currentMapping) => ({
        ...currentMapping,
        [field]: nextColumnHeader.length > 0 ? nextColumnHeader : null,
      }));
    },
    []
  );

  const handleClearClpImportFile = useCallback(() => {
    setClpImportFileName(null);
    setClpImportRows([]);
    setClpImportColumnHeaders([]);
    setClpImportColumnMapping(createEmptyClpImportColumnMapping());
    setClpImportError(null);
  }, []);

  const canSubmitClpImport =
    isClpTermValueMapped && clpImportRows.length > 0 && clpImportError === null;

  const handleClpImportSubmit = useCallback(() => {
    if (!canSubmitClpImport) {
      return;
    }

    onClpImport({
      rows: clpImportRows,
      columnMapping: clpImportColumnMapping,
      importMode: clpImportMode,
    });
  }, [
    canSubmitClpImport,
    clpImportColumnMapping,
    clpImportMode,
    clpImportRows,
    onClpImport,
  ]);

  if (!state) {
    return null;
  }

  const isExportMode = state.mode === "export";
  const contextLabel = TRANSFER_MODAL_CONTEXT_LABELS[state.context];
  const modalTitle = `${isExportMode ? "Export" : "Import"} ${contextLabel}`;
  const formatInputName = `transfer-format:${state.mode}:${state.context}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={modalTitle}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2150,
        background: "rgba(15, 23, 42, 0.56)",
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(560px, 94vw)",
          maxHeight: "88vh",
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
          <h3 style={{ margin: 0, fontSize: 18, color: "#0f172a" }}>{modalTitle}</h3>
          <button type="button" style={TRANSFER_PAIR_BUTTON_STYLE} onClick={onClose}>
            Close
          </button>
        </div>

        {isExportMode ? (
          <>
            <section
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                background: "#f8fafc",
                padding: 10,
                display: "grid",
                gap: 8,
              }}
            >
              <div style={{ fontSize: 12, color: "#334155", fontWeight: 700 }}>Format</div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    color: "#334155",
                  }}
                >
                  <input
                    type="radio"
                    name={formatInputName}
                    value="csv"
                    checked={exportFormat === "csv"}
                    onChange={() => onExportFormatChange("csv")}
                  />
                  CSV
                </label>

                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    color: "#334155",
                  }}
                >
                  <input
                    type="radio"
                    name={formatInputName}
                    value="json"
                    checked={exportFormat === "json"}
                    onChange={() => onExportFormatChange("json")}
                  />
                  JSON
                </label>
              </div>
            </section>

            {state.context === "clp" && (
              <section
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  background: "#ffffff",
                  padding: 10,
                  display: "grid",
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 12, color: "#334155", fontWeight: 700 }}>Fields</div>

                {CLP_EXPORT_FIELD_OPTIONS.map((fieldOption) => (
                  <label
                    key={`clp-export-field:${fieldOption.key}`}
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
                      checked={clpExportFieldSelection[fieldOption.key]}
                      onChange={(event) =>
                        onClpExportFieldSelectionChange(fieldOption.key, event.target.checked)
                      }
                    />
                    {fieldOption.label}
                  </label>
                ))}
              </section>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" style={TRANSFER_PAIR_BUTTON_STYLE} onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                style={{
                  ...TRANSFER_PAIR_BUTTON_STYLE,
                  borderColor: "#1d4ed8",
                  background: "#1d4ed8",
                  color: "#fff",
                  fontWeight: 700,
                }}
                onClick={onExport}
              >
                Export
              </button>
            </div>
          </>
        ) : state.context === "clp" ? (
          <>
            <section
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                background: "#f8fafc",
                padding: 10,
                display: "grid",
                gap: 8,
              }}
            >
              <div style={{ fontSize: 12, color: "#334155", fontWeight: 700 }}>Upload file</div>
              {clpImportFileName ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    border: "1px solid #cbd5e1",
                    borderRadius: 6,
                    background: "#ffffff",
                    padding: "6px 8px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "#0f172a",
                      minWidth: 0,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={`${clpImportFileName} — ${clpImportRows.length} ${
                      clpImportRows.length === 1 ? "row" : "rows"
                    }`}
                  >
                    <strong>{clpImportFileName}</strong> — {clpImportRows.length} {clpImportRows.length === 1 ? "row" : "rows"}
                  </div>

                  <button
                    type="button"
                    style={{
                      ...buttonStyle,
                      fontSize: 10,
                      lineHeight: 1,
                      padding: "2px 8px",
                      minHeight: 22,
                      borderColor: "#cbd5e1",
                      color: "#334155",
                      background: "#f8fafc",
                      flexShrink: 0,
                    }}
                    onClick={handleClearClpImportFile}
                  >
                    Change file
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 12, color: "#475569" }}>
                    Accepted formats: <strong>.csv</strong> or <strong>.json</strong>
                  </div>
                  <input
                    type="file"
                    accept=".csv,.json,text/csv,application/json,text/json"
                    onChange={handleClpImportFileUpload}
                    style={{ ...inputStyle, padding: 6 }}
                  />
                </>
              )}

              {clpImportError && (
                <div
                  style={{
                    fontSize: 11,
                    color: "#991b1b",
                    border: "1px solid #fecaca",
                    borderRadius: 6,
                    background: "#fef2f2",
                    padding: "6px 8px",
                  }}
                >
                  {clpImportError}
                </div>
              )}
            </section>

            <section
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                background: "#ffffff",
                padding: 10,
                display: "grid",
                gap: 8,
              }}
            >
              <div style={{ fontSize: 12, color: "#334155", fontWeight: 700 }}>
                Column mapping
              </div>

              {CLP_IMPORT_FIELD_OPTIONS.map((fieldOption) => {
                const selectedColumnHeader = clpImportColumnMapping[fieldOption.key] ?? "";

                return (
                  <label
                    key={`clp-import-column-mapping:${fieldOption.key}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1.1fr",
                      alignItems: "center",
                      gap: 10,
                      fontSize: 12,
                      color: "#334155",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: fieldOption.required ? 700 : 500,
                        color: fieldOption.required ? "#991b1b" : "#334155",
                      }}
                    >
                      {fieldOption.label}
                      {fieldOption.required && (
                        <span style={{ marginLeft: 6, fontSize: 10 }}>(required)</span>
                      )}
                    </span>

                    <select
                      style={inputStyle}
                      value={selectedColumnHeader}
                      disabled={clpImportColumnHeaders.length === 0}
                      onChange={(event) =>
                        handleClpImportMappingChange(fieldOption.key, event.target.value)
                      }
                    >
                      <option value="">— None —</option>
                      {clpImportColumnHeaders.map((columnHeader, index) => (
                        <option
                          key={`clp-import-column-option:${index}:${columnHeader}`}
                          value={columnHeader}
                        >
                          {columnHeader}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              })}
            </section>

            <section
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                background: "#ffffff",
                padding: 10,
                display: "grid",
                gap: 8,
              }}
            >
              <div style={{ fontSize: 12, color: "#334155", fontWeight: 700 }}>Preview</div>

              {clpImportPreviewRows.length === 0 ? (
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  Upload a file to preview the first 3 entries.
                </div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {clpImportPreviewRows.map((previewRow, rowIndex) => (
                    <div
                      key={`clp-import-preview-row:${rowIndex}`}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 6,
                        padding: "8px 10px",
                        background: "#f8fafc",
                        display: "grid",
                        gap: 4,
                      }}
                    >
                      <div style={{ fontSize: 11, color: "#475569", fontWeight: 700 }}>
                        Entry {rowIndex + 1}
                      </div>

                      {CLP_IMPORT_FIELD_OPTIONS.map((fieldOption) => {
                        const mappedColumnHeader = clpImportColumnMapping[fieldOption.key];
                        const mappedValue = mappedColumnHeader
                          ? previewRow[mappedColumnHeader]
                          : null;

                        return (
                          <div
                            key={`clp-import-preview-field:${rowIndex}:${fieldOption.key}`}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "150px 1fr",
                              gap: 8,
                              fontSize: 12,
                            }}
                          >
                            <span style={{ color: "#334155", fontWeight: 600 }}>
                              {fieldOption.label}
                            </span>
                            <span style={{ color: "#0f172a" }}>
                              {mappedColumnHeader
                                ? formatClpImportPreviewValue(mappedValue)
                                : "—"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                background: "#ffffff",
                padding: 10,
                display: "grid",
                gap: 8,
              }}
            >
              <div style={{ fontSize: 12, color: "#334155", fontWeight: 700 }}>
                Import mode
              </div>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    color: "#334155",
                  }}
                >
                  <input
                    type="radio"
                    name="clp-import-mode"
                    value="add"
                    checked={clpImportMode === "add"}
                    onChange={() => setClpImportMode("add")}
                  />
                  Add to existing
                </label>

                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    color: "#334155",
                  }}
                >
                  <input
                    type="radio"
                    name="clp-import-mode"
                    value="replace"
                    checked={clpImportMode === "replace"}
                    onChange={() => setClpImportMode("replace")}
                  />
                  Replace all
                </label>
              </div>

              {clpImportMode === "replace" && (
                <div
                  style={{
                    fontSize: 11,
                    color: "#991b1b",
                    border: "1px solid #fecaca",
                    borderRadius: 6,
                    background: "#fef2f2",
                    padding: "6px 8px",
                  }}
                >
                  This will remove all existing registry entries and disconnect any terms
                  currently assigned to canvas nodes.
                </div>
              )}
            </section>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" style={TRANSFER_PAIR_BUTTON_STYLE} onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                disabled={!canSubmitClpImport}
                style={{
                  ...TRANSFER_PAIR_BUTTON_STYLE,
                  borderColor: canSubmitClpImport ? "#1d4ed8" : "#cbd5e1",
                  background: canSubmitClpImport ? "#1d4ed8" : "#e2e8f0",
                  color: canSubmitClpImport ? "#fff" : "#64748b",
                  fontWeight: 700,
                  cursor: canSubmitClpImport ? "pointer" : "not-allowed",
                }}
                onClick={handleClpImportSubmit}
              >
                Import
              </button>
            </div>
          </>
        ) : (
          <>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "#475569",
                border: "1px dashed #cbd5e1",
                borderRadius: 8,
                background: "#f8fafc",
                padding: "10px 12px",
              }}
            >
              Column mapping coming soon
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="button" style={TRANSFER_PAIR_BUTTON_STYLE} onClick={onClose}>
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
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
    description: "Add a Card at the pointer position in Canvas mode.",
  },
  {
    keys: "Shift + Tab",
    description: "Add a Vertical Card at the pointer position in Canvas mode.",
  },
  {
    keys: "Shift + R",
    description: "Add a Horizontal Card at the pointer position in Canvas mode.",
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
    keys: "Enter (Inspector text fields)",
    description: "Commit the current field value (input blurs and value syncs).",
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
    keys: "Enter (Term Registry add term)",
    description: "Add a new term from the Term Registry draft value input.",
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
    keys: "Enter / Space (Vertical Card cell)",
    description: "Open Vertical Card cell editor popup.",
  },
  {
    keys: "Escape (Vertical Card cell popup)",
    description: "Close Vertical Card cell editor popup.",
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

type SlotRegistryField = `slot:[${string}]`;
type MenuTermRegistryField = `menu_term:[${string}]`;
type RibbonCellRegistryFieldName = "label" | "key_command" | "tool_tip";
type RibbonCellRegistryField =
  | `ribbon_cell:[${string}]:label`
  | `ribbon_cell:[${string}]:key_command`
  | `ribbon_cell:[${string}]:tool_tip`;
type DynamicRegistryTrackedField =
  | RegistryTrackedField
  | SlotRegistryField
  | MenuTermRegistryField
  | RibbonCellRegistryField;

const TERM_REGISTRY_DRAG_DATA_KEY = "application/x-flowcopy-term-registry-entry";

type TermRegistryDragPayload = {
  entryId: string;
  termValue: string;
  referenceKey: string | null;
  nodeType: NodeType | null;
};

type PendingRibbonRegistryTerm = {
  entryId: string;
  termValue: string;
  referenceKey: string | null;
};

type TermRegistryDragPreview = {
  termValue: string;
  clientX: number;
  clientY: number;
};

const parseTermRegistryDragPayload = (
  dataTransfer: DataTransfer | null
): TermRegistryDragPayload | null => {
  if (!dataTransfer) {
    return null;
  }

  const payloadRaw = dataTransfer.getData(TERM_REGISTRY_DRAG_DATA_KEY);
  if (!payloadRaw) {
    return null;
  }

  try {
    const parsedPayload = JSON.parse(payloadRaw) as Partial<TermRegistryDragPayload>;

    if (
      typeof parsedPayload.entryId !== "string" ||
      typeof parsedPayload.termValue !== "string"
    ) {
      return null;
    }

    const referenceKey =
      typeof parsedPayload.referenceKey === "string"
        ? parsedPayload.referenceKey
        : null;

    const nodeType =
      typeof parsedPayload.nodeType === "string" && isNodeType(parsedPayload.nodeType)
        ? parsedPayload.nodeType
        : null;

    return {
      entryId: parsedPayload.entryId,
      termValue: parsedPayload.termValue,
      referenceKey,
      nodeType,
    };
  } catch {
    return null;
  }
};

const isRegistryTrackedField = (field: string): field is RegistryTrackedField =>
  REGISTRY_TRACKED_FIELDS.includes(field as RegistryTrackedField);

const buildMenuTermRegistryField = (menuTermId: string): MenuTermRegistryField =>
  `menu_term:[${menuTermId}]`;

const buildContentSlotRegistryField = (slotId: string): SlotRegistryField =>
  `slot:[${slotId}]`;

const buildRibbonCellRegistryField = (
  cellId: string,
  fieldName: RibbonCellRegistryFieldName
): RibbonCellRegistryField => `ribbon_cell:[${cellId}]:${fieldName}`;

const parseSlotRegistryField = (field: DynamicRegistryTrackedField): string | null => {
  const match = /^slot:\[(.+)\]$/.exec(field);
  return match ? match[1] : null;
};

const resolveAssignedSlotIdForRegistryAssignment = (
  field: DynamicRegistryTrackedField,
  node: FlowNode | null,
  termTypeOverride?: string | null
): string | null => {
  const explicitSlotId = parseSlotRegistryField(field);
  if (explicitSlotId) {
    return explicitSlotId;
  }

  const explicitMenuTermIdMatch = /^menu_term:\[(.+)\]$/.exec(field);
  if (explicitMenuTermIdMatch) {
    return explicitMenuTermIdMatch[1];
  }

  const explicitRibbonCellIdMatch = /^ribbon_cell:\[(.+)\]:(label|key_command|tool_tip)$/.exec(
    field
  );
  if (explicitRibbonCellIdMatch) {
    return explicitRibbonCellIdMatch[1];
  }

  if (!node) {
    return null;
  }

  const normalizedTermType = normalizeContentSlotTermType(
    termTypeOverride ?? getRegistryTermTypeFromField(field, node)
  );

  if (normalizedTermType.length === 0) {
    return null;
  }

  const matchingSlot = node.data.content_config.slots.find(
    (slot) => normalizeContentSlotTermType(slot.termType) === normalizedTermType
  );

  return matchingSlot?.id ?? null;
};

const getSlotTermTypeForNode = (node: FlowNode | null, slotId: string): string | null => {
  if (!node) {
    return null;
  }

  const slot = node.data.content_config.slots.find(
    (candidateSlot) => candidateSlot.id === slotId
  );

  if (typeof slot?.termType !== "string") {
    return null;
  }

  const normalizedTermType = normalizeContentSlotTermType(slot.termType);
  return normalizedTermType.length > 0 ? normalizedTermType : null;
};

const getSlotFieldLabelForNode = (node: FlowNode | null, slotId: string): string => {
  if (!node) {
    return "Slot";
  }

  const slot = node.data.content_config.slots.find(
    (candidateSlot) => candidateSlot.id === slotId
  );

  if (!slot) {
    return "Slot";
  }

  return normalizeConversationSlotTermTypeLabel(slot.termType);
};

const getRegistryTermTypeFromField = (
  field: DynamicRegistryTrackedField,
  node: FlowNode | null = null
): string => {
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

  if (field.startsWith("slot:[")) {
    const slotId = parseSlotRegistryField(field);
    if (!slotId) {
      return "slot";
    }

    const result = getSlotTermTypeForNode(node, slotId) ?? "slot";

    return result;
  }

  return field;
};

const parseMenuTermRegistryField = (field: DynamicRegistryTrackedField): string | null => {
  const match = /^menu_term:\[(.+)\]$/.exec(field);
  return match ? match[1] : null;
};

const parseRibbonCellRegistryField = (
  field: DynamicRegistryTrackedField
): { cellId: string; fieldName: RibbonCellRegistryFieldName } | null => {
  const match = /^ribbon_cell:\[(.+)\]:(label|key_command|tool_tip)$/.exec(field);

  if (!match) {
    return null;
  }

  return {
    cellId: match[1],
    fieldName: match[2] as RibbonCellRegistryFieldName,
  };
};

const INSPECTOR_CONTENT_FIELD_LABELS: Record<RegistryTrackedField, string> = {
  title: "Title",
  body_text: "Body Text",
  primary_cta: "Primary CTA",
  secondary_cta: "Secondary CTA",
  helper_text: "Helper Text",
  error_text: "Error Text",
  notes: "Notes",
};

const getInspectorRegistryButtonStyle = (
  isActive: boolean
): React.CSSProperties => ({
  ...buttonStyle,
  width: 22,
  height: 22,
  minWidth: 22,
  padding: 0,
  borderRadius: 4,
  fontSize: 14,
  lineHeight: 1,
  borderColor: isActive ? "#93c5fd" : "#d4d4d8",
  background: isActive ? "#dbeafe" : "#fff",
  color: "#1e3a8a",
});

const getTermRegistryTermTypeLabel = (termType: string | null): string => {
  if (!termType) {
    return "Untyped";
  }

  return TERM_REGISTRY_TERM_TYPE_LABELS[termType] ?? termType;
};

const normalizeContentSlotTermType = (termType: string | null | undefined): string => {
  if (typeof termType !== "string") {
    return "";
  }

  const trimmedTermType = termType.trim();
  if (trimmedTermType.length === 0) {
    return "";
  }

  const lowerTermType = trimmedTermType.toLowerCase();
  if (TERM_REGISTRY_TERM_TYPE_LABELS[lowerTermType]) {
    return lowerTermType;
  }

  return lowerTermType === "body text" ? "body_text" : lowerTermType;
};

const getContentSlotInspectorLabel = (termType: string | null | undefined): string => {
  const normalizedTermType = normalizeContentSlotTermType(termType);

  if (normalizedTermType.length === 0) {
    return "Slot";
  }

  return (
    TERM_REGISTRY_TERM_TYPE_LABELS[normalizedTermType] ??
    TERM_REGISTRY_TERM_TYPE_LABELS[normalizedTermType.toLowerCase()] ??
    normalizedTermType
  );
};

const sortContentGroupsByRowColumn = (
  groupA: { row: number; column: number },
  groupB: { row: number; column: number }
): number => (groupA.row === groupB.row ? groupA.column - groupB.column : groupA.row - groupB.row);

const sortContentSlotsByPosition = (
  slotA: { position: number },
  slotB: { position: number }
): number => slotA.position - slotB.position;

const getMenuTermSlotValueFromContentConfig = (
  contentConfig: NodeContentConfig,
  groupId: string
): string => {
  const groupSlots = contentConfig.slots
    .filter((slot) => slot.groupId === groupId)
    .sort(sortContentSlotsByPosition);

  const menuTermSlot =
    groupSlots.find((slot) => normalizeContentSlotTermType(slot.termType) === "menu_term") ??
    groupSlots.find((slot) => slot.position === 0) ??
    groupSlots[0] ??
    null;

  return menuTermSlot?.value ?? "";
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

const HISTORY_STACK_MAX_DEPTH = 30;
const TEXT_EDIT_HISTORY_DEBOUNCE_MS = 800;

const TEXT_HISTORY_TRACKED_FIELDS = new Set<EditableMicrocopyField>([
  "title",
  "body_text",
  "primary_cta",
  "secondary_cta",
  "helper_text",
  "error_text",
  "notes",
]);

type HistorySnapshot = EditorSnapshot & {
  selectedNodeId: string | null;
  selectedNodeIds: string[];
  selectedEdgeId: string | null;
};





























































































































































































































































































export default function Page() {
  const supabase = useMemo(() => createClient(), []);
  const closeAllPopups = useUiStore((state) => state.closeAllPopups);

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
  const [registryDragPreview, setRegistryDragPreview] =
    useState<TermRegistryDragPreview | null>(null);
  const [isRegistryDragActive, setIsRegistryDragActive] = useState(false);
  const [isCanvasRegistryDropActive, setIsCanvasRegistryDropActive] = useState(false);
  const [controlledLanguageDraftRow, setControlledLanguageDraftRow] =
    useState<ControlledLanguageDraftRow>(createEmptyControlledLanguageDraftRow);
  const [openControlledLanguageFieldType, setOpenControlledLanguageFieldType] = useState<
    DynamicRegistryTrackedField | null
  >(null);
  const [clpRegistryFieldFilter, setClpRegistryFieldFilter] =
    useState<DynamicRegistryTrackedField | null>(null);
  const [inspectorRegistryPickerSearchQuery, setInspectorRegistryPickerSearchQuery] =
    useState("");
  const [menuTermDeleteError, setMenuTermDeleteError] = useState<string | null>(null);
  const [pendingOptionInputs, setPendingOptionInputs] = useState<
    Record<GlobalOptionField, string>
  >(createEmptyPendingOptionInputs);
  const [activeSidePanelTab, setActiveSidePanelTab] = useState<
    "edit" | "journey" | "admin"
  >("edit");
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
  const [showNodeIdsOnCanvas, setShowNodeIdsOnCanvas] = useState(false);
  const [undoStack, setUndoStack] = useState<EditorSnapshot[]>([]);
  const [transferModalState, setTransferModalState] = useState<TransferModalState | null>(
    null
  );
  const [transferExportFormat, setTransferExportFormat] =
    useState<TransferExportFormat>("csv");
  const [clpExportFieldSelection, setClpExportFieldSelection] = useState<
    Record<ClpExportFieldKey, boolean>
  >(createDefaultClpExportFieldSelection);
  const [transferFeedback, setTransferFeedback] = useState<ImportFeedback | null>(null);
  const [autoSaveChangeCounter, setAutoSaveChangeCounter] = useState(0);
  const [sidePanelWidth, setSidePanelWidth] = useState<number>(readInitialSidePanelWidth);
  const [isResizingSidePanel, setIsResizingSidePanel] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [authenticatedUserEmail, setAuthenticatedUserEmail] = useState<string | null>(
    null
  );
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
  const startTextEditHistoryBurstRef = useRef<() => void>(() => undefined);
  const flushTextEditHistoryBurstRef = useRef<() => void>(() => undefined);
  const createFrameFromSelectionRef = useRef<
    (selectedNodesForFrameCreation?: FlowNode[]) => void
  >(() => undefined);
  const updateVerticalContentConfigByIdRef = useRef<
    (
      nodeId: string,
      updater: (currentConfig: NodeContentConfig) => NodeContentConfig,
      historyCaptureMode?: "discrete" | "text"
    ) => void
  >(() => undefined);
  const menuTermGlossaryTermsRef = useRef<string[]>([]);
  const sidePanelResizeStartXRef = useRef(0);
  const sidePanelResizeStartWidthRef = useRef(SIDE_PANEL_MIN_WIDTH);
  const canvasClipboardRef = useRef<CanvasClipboardSnapshot | null>(null);
  const activeRegistryDragPayloadRef = useRef<TermRegistryDragPayload | null>(null);
  const pasteInvocationCountRef = useRef(0);
  const historyStackRef = useRef<HistorySnapshot[]>([]);
  const historyIndexRef = useRef(-1);
  const nodeMoveHistorySnapshotRef = useRef<HistorySnapshot | null>(null);
  const nodeMoveHistoryCapturedOnStartRef = useRef(false);
  const deletionHistoryCapturedThisBatchRef = useRef(false);
  const deletionHistoryResetTimeoutRef = useRef<number | null>(null);
  const textEditHistoryBeforeSnapshotRef = useRef<HistorySnapshot | null>(null);
  const textEditHistoryDebounceTimeoutRef = useRef<number | null>(null);
  const didJustOpenRegistryPickerRef = useRef(false);

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

  useEffect(() => {
    let isActive = true;

    const syncAuthenticatedUserEmail = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isActive) {
        return;
      }

      setAuthenticatedUserEmail(user?.email ?? null);
    };

    void syncAuthenticatedUserEmail();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticatedUserEmail(session?.user?.email ?? null);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(
    () => () => {
      if (undoCaptureTimeoutRef.current !== null) {
        window.clearTimeout(undoCaptureTimeoutRef.current);
      }

      if (menuTermDeleteErrorTimeoutRef.current !== null) {
        window.clearTimeout(menuTermDeleteErrorTimeoutRef.current);
      }

      if (deletionHistoryResetTimeoutRef.current !== null) {
        window.clearTimeout(deletionHistoryResetTimeoutRef.current);
      }

      if (textEditHistoryDebounceTimeoutRef.current !== null) {
        window.clearTimeout(textEditHistoryDebounceTimeoutRef.current);
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
    setMenuTermDeleteError(VMN_MINIMUM_TERM_ERROR_MESSAGE);

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

  const setHistoryBaseline = useCallback((snapshot: HistorySnapshot) => {
    historyStackRef.current = [snapshot];
    historyIndexRef.current = 0;
  }, []);

  const clearHistory = useCallback(() => {
    historyStackRef.current = [];
    historyIndexRef.current = -1;
  }, []);

  const applyHistorySnapshot = useCallback(
    (snapshot: HistorySnapshot) => {
      setNodes(cloneFlowNodes(snapshot.nodes));
      setEdges(cloneEdges(snapshot.edges));
      setAdminOptions(cloneGlobalOptions(snapshot.adminOptions));
      setControlledLanguageGlossary(
        cloneControlledLanguageGlossary(snapshot.controlledLanguageGlossary)
      );
      setTermRegistry(snapshot.termRegistry.map((entry) => ({ ...entry })));
      setUiJourneySnapshotPresets(
        cloneUiJourneySnapshotPresets(snapshot.uiJourneySnapshotPresets)
      );
      setUiJourneyConversationSnapshot(
        cloneUiJourneyConversationEntries(snapshot.uiJourneyConversationSnapshot)
      );
      setIsUiJourneyConversationOpen(snapshot.isUiJourneyConversationOpen);
      setSelectedUiJourneySnapshotPresetId(snapshot.selectedUiJourneySnapshotPresetId);
      setRecalledUiJourneyNodeIds([...snapshot.recalledUiJourneyNodeIds]);
      setRecalledUiJourneyEdgeIds([...snapshot.recalledUiJourneyEdgeIds]);
      setUiJourneySnapshotDraftName(snapshot.uiJourneySnapshotDraftName);
      setSelectedNodeId(snapshot.selectedNodeId);
      setSelectedNodeIds([...snapshot.selectedNodeIds]);
      setSelectedEdgeId(snapshot.selectedEdgeId);
    },
    [setEdges, setNodes]
  );

  const createHistorySnapshot = useCallback(
    (): HistorySnapshot => ({
      nodes: cloneFlowNodes(nodes),
      edges: cloneEdges(edges),
      adminOptions: cloneGlobalOptions(adminOptions),
      controlledLanguageGlossary: cloneControlledLanguageGlossary(
        controlledLanguageGlossary
      ),
      termRegistry: termRegistry.map((entry) => ({ ...entry })),
      uiJourneySnapshotPresets: cloneUiJourneySnapshotPresets(uiJourneySnapshotPresets),
      uiJourneyConversationSnapshot: cloneUiJourneyConversationEntries(
        uiJourneyConversationSnapshot
      ),
      isUiJourneyConversationOpen,
      selectedUiJourneySnapshotPresetId,
      recalledUiJourneyNodeIds: [...recalledUiJourneyNodeIds],
      recalledUiJourneyEdgeIds: [...recalledUiJourneyEdgeIds],
      uiJourneySnapshotDraftName,
      selectedNodeId,
      selectedNodeIds: [...selectedNodeIds],
      selectedEdgeId,
    }),
    [
      adminOptions,
      controlledLanguageGlossary,
      edges,
      isUiJourneyConversationOpen,
      nodes,
      recalledUiJourneyEdgeIds,
      recalledUiJourneyNodeIds,
      selectedEdgeId,
      selectedNodeId,
      selectedNodeIds,
      selectedUiJourneySnapshotPresetId,
      termRegistry,
      uiJourneyConversationSnapshot,
      uiJourneySnapshotDraftName,
      uiJourneySnapshotPresets,
    ]
  );

  const commitHistorySnapshot = useCallback((snapshot: HistorySnapshot) => {
    const currentHistoryStack = historyStackRef.current;
    const currentHistoryIndex = historyIndexRef.current;

    const truncatedHistoryStack =
      currentHistoryIndex >= 0
        ? currentHistoryStack.slice(0, currentHistoryIndex + 1)
        : [];

    const nextHistoryStackWithSnapshot = [...truncatedHistoryStack, snapshot];
    const nextHistoryStack =
      nextHistoryStackWithSnapshot.length > HISTORY_STACK_MAX_DEPTH
        ? nextHistoryStackWithSnapshot.slice(
            nextHistoryStackWithSnapshot.length - HISTORY_STACK_MAX_DEPTH
          )
        : nextHistoryStackWithSnapshot;

    historyStackRef.current = nextHistoryStack;
    historyIndexRef.current = nextHistoryStack.length - 1;
  }, []);

  const pushToHistory = useCallback((snapshotOverride?: HistorySnapshot) => {
    if (store.session.view !== "editor") {
      return;
    }

    commitHistorySnapshot(snapshotOverride ?? createHistorySnapshot());markProjectDirty();
  }, [commitHistorySnapshot, createHistorySnapshot, markProjectDirty, store.session.view]);

  const flushTextEditHistoryBurst = useCallback(() => {
    if (textEditHistoryDebounceTimeoutRef.current !== null) {
      window.clearTimeout(textEditHistoryDebounceTimeoutRef.current);
      textEditHistoryDebounceTimeoutRef.current = null;
    }

    const snapshotBeforeTextEditBurst = textEditHistoryBeforeSnapshotRef.current;
    if (!snapshotBeforeTextEditBurst) {
      return;
    }

    textEditHistoryBeforeSnapshotRef.current = null;
    pushToHistory(snapshotBeforeTextEditBurst);
  }, [pushToHistory]);

  const startTextEditHistoryBurst = useCallback(() => {
    if (store.session.view !== "editor") {
      return;
    }

    if (textEditHistoryBeforeSnapshotRef.current === null) {
      textEditHistoryBeforeSnapshotRef.current = createHistorySnapshot();
    }

    if (textEditHistoryDebounceTimeoutRef.current !== null) {
      window.clearTimeout(textEditHistoryDebounceTimeoutRef.current);
    }

    textEditHistoryDebounceTimeoutRef.current = window.setTimeout(() => {
      textEditHistoryDebounceTimeoutRef.current = null;

      const snapshotBeforeTextEditBurst = textEditHistoryBeforeSnapshotRef.current;
      if (!snapshotBeforeTextEditBurst) {
        return;
      }

      textEditHistoryBeforeSnapshotRef.current = null;
      pushToHistory(snapshotBeforeTextEditBurst);
    }, TEXT_EDIT_HISTORY_DEBOUNCE_MS);
  }, [createHistorySnapshot, pushToHistory, store.session.view]);

  const captureDeletionHistoryOncePerBatch = useCallback(() => {
    if (deletionHistoryCapturedThisBatchRef.current) {
      return;
    }

    deletionHistoryCapturedThisBatchRef.current = true;
    pushToHistory();

    if (deletionHistoryResetTimeoutRef.current !== null) {
      window.clearTimeout(deletionHistoryResetTimeoutRef.current);
    }

    deletionHistoryResetTimeoutRef.current = window.setTimeout(() => {
      deletionHistoryCapturedThisBatchRef.current = false;
      deletionHistoryResetTimeoutRef.current = null;
    }, 0);
  }, [pushToHistory]);

  const undo = useCallback(() => {
    if (store.session.view !== "editor") {
      return;
    }

    flushTextEditHistoryBurst();

    if (undoCaptureTimeoutRef.current !== null) {
      window.clearTimeout(undoCaptureTimeoutRef.current);
      undoCaptureTimeoutRef.current = null;
    }

    const currentHistoryIndex = historyIndexRef.current;
    if (currentHistoryIndex < 1) {
      return;
    }

    const snapshotToRestore = historyStackRef.current[currentHistoryIndex];
    if (!snapshotToRestore) {
      return;
    }

    historyStackRef.current[currentHistoryIndex] = createHistorySnapshot();
    applyHistorySnapshot(snapshotToRestore);
    historyIndexRef.current = currentHistoryIndex - 1;
    markProjectDirty();
  }, [
    applyHistorySnapshot,
    createHistorySnapshot,
    flushTextEditHistoryBurst,
    markProjectDirty,
    store.session.view,
  ]);

  const redo = useCallback(() => {
    if (store.session.view !== "editor") {
      return;
    }

    flushTextEditHistoryBurst();

    if (undoCaptureTimeoutRef.current !== null) {
      window.clearTimeout(undoCaptureTimeoutRef.current);
      undoCaptureTimeoutRef.current = null;
    }

    const nextHistoryIndex = historyIndexRef.current + 1;
    if (nextHistoryIndex >= historyStackRef.current.length) {
      return;
    }

    const snapshotToRestore = historyStackRef.current[nextHistoryIndex];
    if (!snapshotToRestore) {
      return;
    }

    historyStackRef.current[nextHistoryIndex] = createHistorySnapshot();
    applyHistorySnapshot(snapshotToRestore);
    historyIndexRef.current = nextHistoryIndex;
    markProjectDirty();
  }, [
    applyHistorySnapshot,
    createHistorySnapshot,
    flushTextEditHistoryBurst,
    markProjectDirty,
    store.session.view,
  ]);

  const loadProjectIntoEditor = useCallback(
    (project: ProjectRecord) => {
      const normalizedAdminOptions = normalizeGlobalOptionConfig(
        project.canvas.adminOptions
      );
      const normalizedUiJourneySnapshotPresets = sanitizeUiJourneySnapshotPresets(
        project.canvas.uiJourneySnapshotPresets
      );
      const normalizedControlledLanguageGlossary = sanitizeControlledLanguageGlossary(
        project.canvas.controlledLanguageGlossary
      );
      const normalizedTermRegistry = Array.isArray(project.canvas.termRegistry)
        ? project.canvas.termRegistry
        : [];

      const hydratedNodes = sanitizePersistedNodes(
        project.canvas.nodes,
        normalizedAdminOptions
      );
      const prunedHydratedNodes = pruneFrameNodeMembership(hydratedNodes);
      const hydratedEdges = sanitizeEdges(project.canvas.edges, prunedHydratedNodes);
      const initialSelectedNodeId = prunedHydratedNodes[0]?.id ?? null;
      const initialSelectedNodeIds = initialSelectedNodeId ? [initialSelectedNodeId] : [];

      setAdminOptions(normalizedAdminOptions);
      setControlledLanguageGlossary(normalizedControlledLanguageGlossary);
      setTermRegistry(normalizedTermRegistry);
      setControlledLanguageDraftRow(createEmptyControlledLanguageDraftRow());
      setOpenControlledLanguageFieldType(null);
      setInspectorRegistryPickerSearchQuery("");
      setNodes(prunedHydratedNodes);
      setEdges(hydratedEdges);
      setUiJourneySnapshotPresets(normalizedUiJourneySnapshotPresets);
      setSelectedUiJourneySnapshotPresetId(null);
      setRecalledUiJourneyNodeIds([]);
      setRecalledUiJourneyEdgeIds([]);
      setUiJourneySnapshotDraftName("");
      setUiJourneyConversationSnapshot([]);
      setIsUiJourneyConversationOpen(false);
      setSelectedNodeId(initialSelectedNodeId);
      setSelectedNodeIds(initialSelectedNodeIds);
      setSelectedEdgeId(null);

      setHistoryBaseline({
        nodes: cloneFlowNodes(prunedHydratedNodes),
        edges: cloneEdges(hydratedEdges),
        adminOptions: cloneGlobalOptions(normalizedAdminOptions),
        controlledLanguageGlossary: cloneControlledLanguageGlossary(
          normalizedControlledLanguageGlossary
        ),
        termRegistry: normalizedTermRegistry.map((entry) => ({ ...entry })),
        uiJourneySnapshotPresets: cloneUiJourneySnapshotPresets(
          normalizedUiJourneySnapshotPresets
        ),
        uiJourneyConversationSnapshot: [],
        isUiJourneyConversationOpen: false,
        selectedUiJourneySnapshotPresetId: null,
        recalledUiJourneyNodeIds: [],
        recalledUiJourneyEdgeIds: [],
        uiJourneySnapshotDraftName: "",
        selectedNodeId: initialSelectedNodeId,
        selectedNodeIds: [...initialSelectedNodeIds],
        selectedEdgeId: null,
      });

      setUndoStack([]);
      setIsProjectSequencePanelOpen(false);
      canvasClipboardRef.current = null;
      pasteInvocationCountRef.current = 0;
      clearMenuTermDeleteError();
      setPendingOptionInputs(createEmptyPendingOptionInputs());
    },
    [clearMenuTermDeleteError, setEdges, setHistoryBaseline, setNodes]
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

  useEffect(() => {
    startTextEditHistoryBurstRef.current = startTextEditHistoryBurst;
  }, [startTextEditHistoryBurst]);

  useEffect(() => {
    flushTextEditHistoryBurstRef.current = flushTextEditHistoryBurst;
  }, [flushTextEditHistoryBurst]);

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

    clearHistory();
    setUndoStack([]);
  }, [clearHistory, persistCurrentProjectState, saveProjectNow, updateStore]);

  const onNodesChange = useCallback(
    (changes: NodeChange<FlowNode>[]) => {
      if (changes.length === 0) {
        return;
      }

      const hasNodeRemoval = changes.some((change) => change.type === "remove");
      if (hasNodeRemoval) {
        captureDeletionHistoryOncePerBatch();
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
    [captureDeletionHistoryOncePerBatch, queueUndoSnapshot, setNodes]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<FlowEdge>[]) => {
      if (changes.length === 0) {
        return;
      }

      const hasEdgeRemoval = changes.some((change) => change.type === "remove");
      if (hasEdgeRemoval) {
        captureDeletionHistoryOncePerBatch();
      }

      if (hasNonSelectionEdgeChanges(changes)) {
        queueUndoSnapshot();
      }
      setEdges((currentEdges) => applyEdgeChanges(changes, currentEdges));
    },
    [captureDeletionHistoryOncePerBatch, queueUndoSnapshot, setEdges]
  );

  const onNodeDragStart = useCallback<OnNodeDrag<FlowNode>>(
    (_event, _node, draggedNodes) => {
      const snapshotBeforeMove = createHistorySnapshot();
      nodeMoveHistorySnapshotRef.current = snapshotBeforeMove;

      if (draggedNodes.length > 1) {
        pushToHistory(snapshotBeforeMove);
        nodeMoveHistoryCapturedOnStartRef.current = true;
        return;
      }

      nodeMoveHistoryCapturedOnStartRef.current = false;
    },
    [createHistorySnapshot, pushToHistory]
  );

  const onNodeDragStop = useCallback<OnNodeDrag<FlowNode>>(
    () => {
      const snapshotBeforeMove = nodeMoveHistorySnapshotRef.current;

      if (!nodeMoveHistoryCapturedOnStartRef.current && snapshotBeforeMove) {
        pushToHistory(snapshotBeforeMove);
      }

      nodeMoveHistorySnapshotRef.current = null;
      nodeMoveHistoryCapturedOnStartRef.current = false;
    },
    [pushToHistory]
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

      if (
        (sourceNode?.data.node_type === "vertical_multi_term" ||
          sourceNode?.data.node_type === "horizontal_multi_term") &&
        nextEdgeKind === "sequential"
      ) {
        if (
          !isContentConfigConnectionAllowed(
            edges,
            sourceNode.id,
            sourceNode.data.content_config,
            nextSourceHandle
          )
        ) {
          nextSourceHandle = getFirstAvailableContentConfigSourceHandleId(
            edges,
            sourceNode.id,
            sourceNode.data.content_config
          );
        }

        if (
          !isContentConfigConnectionAllowed(
            edges,
            sourceNode.id,
            sourceNode.data.content_config,
            nextSourceHandle
          )
        ) {
          return;
        }
      }

      pushToHistory();

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
    [edges, nodes, pushToHistory, setEdges]
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

      if (
        (sourceNode?.data.node_type === "vertical_multi_term" ||
          sourceNode?.data.node_type === "horizontal_multi_term") &&
        nextEdgeKind === "sequential"
      ) {
        if (
          !isContentConfigConnectionAllowed(
            edges,
            sourceNode.id,
            sourceNode.data.content_config,
            nextSourceHandle,
            { ignoreEdgeId: oldEdge.id }
          )
        ) {
          nextSourceHandle = getFirstAvailableContentConfigSourceHandleId(
            edges,
            sourceNode.id,
            sourceNode.data.content_config,
            { ignoreEdgeId: oldEdge.id }
          );
        }

        if (
          !isContentConfigConnectionAllowed(
            edges,
            sourceNode.id,
            sourceNode.data.content_config,
            nextSourceHandle,
            { ignoreEdgeId: oldEdge.id }
          )
        ) {
          return;
        }
      }

      pushToHistory();

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
    [edges, nodes, pushToHistory, setEdges]
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
      nodeType: "default" | "vertical_multi_term" | "horizontal_multi_term" | "frame" = "default",
      options?: {
        primaryTextValue?: string;
        onNodeCreated?: (nodeId: string, createdNode: FlowNode) => void;
      }
    ) => {
      const rf = rfRef.current;
      if (!rf) {
        return null;
      }

      pushToHistory();

      const position = rf.screenToFlowPosition(clientPosition);
      const id = createNodeId();
      const normalizedPrimaryText = options?.primaryTextValue?.trim() ?? "";

      const nodeToCreate: SerializableFlowNode =
        nodeType === "vertical_multi_term"
          ? {
              id,
              position,
              data: {
                node_type: "vertical_multi_term",
                primary_cta: normalizedPrimaryText || "",
              },
            }
          : nodeType === "horizontal_multi_term"
            ? {
                id,
                position,
                data: {
                  node_type: "horizontal_multi_term",
                  ...(normalizedPrimaryText.length > 0
                    ? { primary_cta: normalizedPrimaryText }
                    : {}),
                },
              }
          : nodeType === "frame"
            ? {
                id,
                position,
                data: {
                  node_type: "frame",
                  title: normalizedPrimaryText,
                  frame_config: {
                    shade: "medium",
                    member_node_ids: [],
                    width: FRAME_NODE_MIN_WIDTH,
                    height: FRAME_NODE_MIN_HEIGHT,
                  },
                },
              }
          : {
              id,
              position,
              ...(normalizedPrimaryText.length > 0
                ? { data: { primary_cta: normalizedPrimaryText } }
                : {}),
            };

      const createdNode = normalizeNode(
        nodeToCreate,
        normalizeGlobalOptionConfig(adminOptions)
      );

      setNodes((nds) => [...nds, createdNode]);
      setSelectedNodeId(id);
      setSelectedNodeIds([id]);
      setSelectedEdgeId(null);
      options?.onNodeCreated?.(id, createdNode);
      return id;
    },
    [adminOptions, pushToHistory, setNodes]
  );

  const addNodeAtEvent = useCallback(
    (
      event: React.MouseEvent,
      nodeType: "default" | "vertical_multi_term" | "horizontal_multi_term" = "default"
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

  const handleQuickAddFromSideTab = useCallback(
    (nodeType: "default" | "vertical_multi_term" | "horizontal_multi_term") => {
      addNodeAtClientPosition(getCanvasFallbackClientPosition(), nodeType);
    },
    [addNodeAtClientPosition, getCanvasFallbackClientPosition]
  );

  const handleRegistryEntryDragStart = useCallback(
    (event: React.DragEvent<HTMLElement>, entry: TermRegistryEntry) => {
      const payload: TermRegistryDragPayload = {
        entryId: entry.id,
        termValue: entry.value,
        referenceKey: entry.friendlyId,
        nodeType:
          typeof entry.termType === "string" && isNodeType(entry.termType)
            ? entry.termType
            : null,
      };

      event.dataTransfer.setData(TERM_REGISTRY_DRAG_DATA_KEY, JSON.stringify(payload));
      event.dataTransfer.setData("text/plain", entry.value);
      event.dataTransfer.effectAllowed = "copy";
      activeRegistryDragPayloadRef.current = payload;

      setIsRegistryDragActive(true);
      setIsCanvasRegistryDropActive(false);
      setRegistryDragPreview({
        termValue: entry.value.trim().length > 0 ? entry.value : "Untitled term",
        clientX: event.clientX,
        clientY: event.clientY,
      });
    },
    []
  );

  const handleRegistryEntryDrag = useCallback(
    (event: React.DragEvent<HTMLElement>) => {
      if (!isRegistryDragActive) {
        return;
      }

      if (event.clientX <= 0 && event.clientY <= 0) {
        return;
      }

      setRegistryDragPreview((currentPreview) =>
        currentPreview
          ? {
              ...currentPreview,
              clientX: event.clientX,
              clientY: event.clientY,
            }
          : currentPreview
      );
    },
    [isRegistryDragActive]
  );

  const handleRegistryEntryDragEnd = useCallback(() => {
    activeRegistryDragPayloadRef.current = null;
    setIsRegistryDragActive(false);
    setIsCanvasRegistryDropActive(false);
    setRegistryDragPreview(null);
  }, []);

  const handleCanvasRegistryDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      const payload =
        parseTermRegistryDragPayload(event.dataTransfer) ??
        activeRegistryDragPayloadRef.current;
      if (!payload) {
        return;
      }

      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";


      if (!isCanvasRegistryDropActive) {
        setIsCanvasRegistryDropActive(true);
      }
    },
    [isCanvasRegistryDropActive]
  );

  const handleCanvasRegistryDragLeave = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      const nextTarget = event.relatedTarget;

      if (
        nextTarget instanceof Node &&
        canvasContainerRef.current?.contains(nextTarget)
      ) {
        return;
      }

      setIsCanvasRegistryDropActive(false);
    },
    []
  );

  const handleCanvasRegistryDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const payload =
        parseTermRegistryDragPayload(event.dataTransfer) ??
        activeRegistryDragPayloadRef.current;

      console.log("[CLP Drag] drop payload", payload, {
        dragTypes: Array.from(event.dataTransfer.types ?? []),
        clientX: event.clientX,
        clientY: event.clientY,
      });

      if (!payload) {
        activeRegistryDragPayloadRef.current = null;
        return;
      }

      setIsCanvasRegistryDropActive(false);
      setIsRegistryDragActive(false);
      setRegistryDragPreview(null);
      activeRegistryDragPayloadRef.current = null;

      const dropTargetElement = event.target as HTMLElement | null;
      const didDropOnExistingNode = Boolean(
        dropTargetElement?.closest(".react-flow__node")
      );

      if (didDropOnExistingNode) {
        console.log("[CLP Drag] drop ignored (over existing node)");
        return;
      }

      const droppedNodeType: "default" | "vertical_multi_term" | "horizontal_multi_term" =
        payload.nodeType === "vertical_multi_term" || payload.nodeType === "horizontal_multi_term"
          ? payload.nodeType
          : "default";

      console.log("[CLP Drag] creating node", {
        droppedNodeType,
        primaryTextValue: payload.termValue,
      });

      const createdNodeId = addNodeAtClientPosition(
        {
          x: event.clientX,
          y: event.clientY,
        },
        droppedNodeType,
        {
          primaryTextValue: payload.termValue,
          onNodeCreated: (createdNodeId, createdNode) => {
            const now = new Date().toISOString();

            setTermRegistry((currentRegistry) =>
              currentRegistry.map((entry) =>
                entry.id === payload.entryId
                  ? {
                      ...entry,
                      assignedNodeId: createdNodeId,
                      assignedSlotId: resolveAssignedSlotIdForRegistryAssignment(
                        "primary_cta",
                        createdNode,
                        "primary_cta"
                      ),
                      updatedAt: now,
                    }
                  : entry
              )
            );
          },
        }
      );

      console.log("[CLP Drag] node creation result", { createdNodeId });
    },
    [addNodeAtClientPosition, setTermRegistry]
  );

  const canDropRegistryEntryOnNodeField = useCallback(
    (dataTransfer: DataTransfer | null) => {
      const payload =
        parseTermRegistryDragPayload(dataTransfer) ??
        activeRegistryDragPayloadRef.current;

      if (!payload) {
        return false;
      }

      setIsCanvasRegistryDropActive((isActive) => (isActive ? false : isActive));

      return true;
    },
    []
  );

  const handleDropRegistryEntryOnNodeField = useCallback(
    (
      nodeId: string,
      field: RegistryTrackedField | SlotRegistryField,
      dataTransfer: DataTransfer | null
    ) => {
      const payload =
        parseTermRegistryDragPayload(dataTransfer) ??
        activeRegistryDragPayloadRef.current;

      if (!payload) {
        activeRegistryDragPayloadRef.current = null;
        return;
      }

      const targetNode = nodes.find((node) => node.id === nodeId) ?? null;

      pushToHistory();

      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          if (node.id !== nodeId || node.data.node_type !== "default") {
            return node;
          }

          const slotId = parseSlotRegistryField(field);

          if (slotId) {
            const matchingSlot = node.data.content_config.slots.find(
              (slot) => slot.id === slotId
            );

            console.log("[CLP Debug] default node slot write", {
              nodeId,
              slotId,
              newValue: payload.termValue,
              slotFound: !!matchingSlot,
            });

            return {
              ...node,
              data: {
                ...node.data,
                content_config: {
                  ...node.data.content_config,
                  slots: node.data.content_config.slots.map((slot) =>
                    slot.id === slotId
                      ? {
                          ...slot,
                          value: payload.termValue,
                        }
                      : slot
                  ),
                },
              },
            };
          }

          console.log("[CLP Debug] default node legacy write", {
            nodeId,
            field,
            newValue: payload.termValue,
          });

          return {
            ...node,
            data: {
              ...node.data,
              [field]: payload.termValue,
            },
          };
        })
      );

      setTermRegistry((currentRegistry) => {
        const draggedEntryIndex = currentRegistry.findIndex(
          (entry) => entry.id === payload.entryId
        );

        if (draggedEntryIndex === -1) {
          return currentRegistry;
        }

        const now = new Date().toISOString();
        let hasChanges = false;
        const nextTermType = getRegistryTermTypeFromField(field, targetNode);
        const targetAssignedSlotId = resolveAssignedSlotIdForRegistryAssignment(
          field,
          targetNode,
          nextTermType
        );

        const nextRegistry = currentRegistry.map((entry, entryIndex) => {
          if (
            entryIndex !== draggedEntryIndex &&
            entry.assignedNodeId === nodeId &&
            entry.assignedSlotId === targetAssignedSlotId
          ) {
            hasChanges = true;
            return {
              ...entry,
              assignedNodeId: null,
              assignedSlotId: null,
              updatedAt: now,
            };
          }

          return entry;
        });

        const draggedEntry = nextRegistry[draggedEntryIndex];

        if (
          draggedEntry.assignedNodeId !== nodeId ||
          draggedEntry.assignedSlotId !== targetAssignedSlotId ||
          draggedEntry.termType !== nextTermType
        ) {
          hasChanges = true;
          nextRegistry[draggedEntryIndex] = {
            ...draggedEntry,
            termType: nextTermType,
            assignedNodeId: nodeId,
            assignedSlotId: resolveAssignedSlotIdForRegistryAssignment(
              field,
              targetNode,
              nextTermType
            ),
            updatedAt: now,
          };
        }

        return hasChanges ? nextRegistry : currentRegistry;
      });

      setIsCanvasRegistryDropActive(false);
      setIsRegistryDragActive(false);
      setRegistryDragPreview(null);
      activeRegistryDragPayloadRef.current = null;
    },
    [nodes, pushToHistory, setNodes, setTermRegistry]
  );

  const resolveDroppedRegistryTerm = useCallback(
    (dataTransfer: DataTransfer | null): PendingRibbonRegistryTerm | null => {
      const payload =
        parseTermRegistryDragPayload(dataTransfer) ??
        activeRegistryDragPayloadRef.current;

      if (!payload) {
        activeRegistryDragPayloadRef.current = null;
        return null;
      }

      setIsCanvasRegistryDropActive(false);
      setIsRegistryDragActive(false);
      setRegistryDragPreview(null);
      activeRegistryDragPayloadRef.current = null;

      return {
        entryId: payload.entryId,
        termValue: payload.termValue,
        referenceKey: payload.referenceKey,
      };
    },
    []
  );

  const handleAssignPendingRibbonTermToField = useCallback(
    (
      nodeId: string,
      field: RibbonCellRegistryField,
      pendingTerm: PendingRibbonRegistryTerm
    ) => {
      pushToHistory();

      setTermRegistry((currentRegistry) => {
        const draggedEntryIndex = currentRegistry.findIndex(
          (entry) => entry.id === pendingTerm.entryId
        );

        if (draggedEntryIndex === -1) {
          return currentRegistry;
        }

        const now = new Date().toISOString();
        let hasChanges = false;
        const targetNode = nodes.find((node) => node.id === nodeId) ?? null;
        const nextTermType = getRegistryTermTypeFromField(field, targetNode);
        const targetAssignedSlotId = resolveAssignedSlotIdForRegistryAssignment(
          field,
          targetNode,
          nextTermType
        );

        const nextRegistry = currentRegistry.map((entry, entryIndex) => {
          if (
            entryIndex !== draggedEntryIndex &&
            entry.assignedNodeId === nodeId &&
            entry.assignedSlotId === targetAssignedSlotId
          ) {
            hasChanges = true;
            return {
              ...entry,
              assignedNodeId: null,
              assignedSlotId: null,
              updatedAt: now,
            };
          }

          return entry;
        });

        const draggedEntry = nextRegistry[draggedEntryIndex];

        if (
          draggedEntry.assignedNodeId !== nodeId ||
          draggedEntry.assignedSlotId !== targetAssignedSlotId ||
          draggedEntry.termType !== nextTermType
        ) {
          hasChanges = true;
          nextRegistry[draggedEntryIndex] = {
            ...draggedEntry,
            termType: nextTermType,
            assignedNodeId: nodeId,
            assignedSlotId: targetAssignedSlotId,
            updatedAt: now,
          };
        }

        return hasChanges ? nextRegistry : currentRegistry;
      });

      setIsCanvasRegistryDropActive(false);
      setIsRegistryDragActive(false);
      setRegistryDragPreview(null);
      activeRegistryDragPayloadRef.current = null;
    },
    [pushToHistory, setTermRegistry]
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
        setInspectorRegistryPickerSearchQuery("");
        addNodeAtEvent(event);
        return;
      }

      setOpenControlledLanguageFieldType(null);
      setInspectorRegistryPickerSearchQuery("");
      setSelectedNodeId(null);
      setSelectedNodeIds([]);
      setSelectedEdgeId(null);
    },
    [addNodeAtEvent, clearGlossaryHighlights, clearMenuTermDeleteError]
  );

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: FlowNode) => {
      clearMenuTermDeleteError();
      clearGlossaryHighlights();
      setOpenControlledLanguageFieldType(null);
      setInspectorRegistryPickerSearchQuery("");

      if (event.ctrlKey || event.metaKey) return;

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
      setInspectorRegistryPickerSearchQuery("");
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
      setInspectorRegistryPickerSearchQuery("");
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
    setInspectorRegistryPickerSearchQuery("");
    clearMenuTermDeleteError();

    setTermRegistry((currentRegistry) => {
      let nextRegistry = currentRegistry;
      let hasChanges = false;
      const now = new Date().toISOString();

      remappedPastedNodes.forEach((pastedNode) => {
        REGISTRY_TRACKED_FIELDS.forEach((field) => {
          const fieldValue = (pastedNode.data as Record<string, unknown>)[field];
              const targetAssignedSlotId = resolveAssignedSlotIdForRegistryAssignment(
                field,
                pastedNode,
                field
              );

          if (typeof fieldValue !== "string" || fieldValue.trim() === "") {
            return;
          }

          const existingIndex = nextRegistry.findIndex(
            (entry) =>
                  entry.assignedNodeId === pastedNode.id &&
                  entry.assignedSlotId === targetAssignedSlotId
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
            assignedSlotId: resolveAssignedSlotIdForRegistryAssignment(
              field,
              pastedNode,
              field
            ),
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
      pushToHistory();
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

    pushToHistory();
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
          assignedSlotId: null,
          updatedAt: now,
        };
      });

      return hasUpdatedEntry ? nextRegistry : currentRegistry;
    });
    setSelectedNodeId(null);
    setSelectedNodeIds([]);
    setSelectedEdgeId(null);
  }, [
    pushToHistory,
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

      const isRedoShortcut =
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        !event.altKey &&
        event.key.toLowerCase() === "z";

      if (isRedoShortcut) {
        if (isEditableEventTarget(event.target)) {
          return;
        }

        if (!isTargetInsideCanvas && !isBodyTarget) {
          return;
        }

        console.log("[history] redo shortcut detected", {
          historyIndex: historyIndexRef.current,
          historyLength: historyStackRef.current.length,
          hasFutureState:
            historyIndexRef.current < historyStackRef.current.length - 1,
        });

        event.preventDefault();
        redo();
        return;
      }

      const isUndoShortcut =
        (event.ctrlKey || event.metaKey) &&
        !event.shiftKey &&
        !event.altKey &&
        event.key.toLowerCase() === "z";

      if (isUndoShortcut) {
        if (isEditableEventTarget(event.target)) {
          return;
        }

        if (!isTargetInsideCanvas && !isBodyTarget) {
          return;
        }

        event.preventDefault();
        undo();
        return;
      }

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
          event.shiftKey ? "vertical_multi_term" : "default"
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

        addNodeAtClientPosition(clientPosition, "horizontal_multi_term");
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
    redo,
    selectedEdgeId,
    selectedNodeId,
    selectedNodeIds,
    store.session.editorMode,
    store.session.view,
    undo,
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

  const uiJourneyConversationPathName = useMemo(() => {
    if (selectedUiJourneySnapshotPresetId) {
      const selectedPreset = uiJourneySnapshotPresets.find(
        (preset) => preset.id === selectedUiJourneySnapshotPresetId
      );

      if (selectedPreset?.name.trim()) {
        return selectedPreset.name.trim();
      }
    }

    return "Current Selection";
  }, [selectedUiJourneySnapshotPresetId, uiJourneySnapshotPresets]);

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
        const isFrame = node.data.node_type === "frame";
        const frameArea = isFrame
          ? (node.data.frame_config?.width ?? 0) * (node.data.frame_config?.height ?? 0)
          : null;

        return {
          ...node,
          ...(isFrame && frameArea !== null
            ? { zIndex: Math.round(10000000 / Math.max(frameArea, 1)) }
            : { zIndex: node.selected ? 2000 : 1000 }),
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
    selectedNode.data.node_type !== "horizontal_multi_term" &&
    selectedNode.data.node_type !== "vertical_multi_term" &&
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
    setFeedbackEmail(authenticatedUserEmail ?? "");
    setIsFeedbackModalOpen(true);
  }, [authenticatedUserEmail]);

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

  const {
    frameChildNodeIds,
    childEntryIds,
    entryFrameParentId,
    entryMultiTermParentId,
  } = useMemo(() => {
    const frameChildNodeIds = new Map<string, string[]>();
    const childEntryIds = new Set<string>();
    const entryFrameParentId = new Map<string, string>();
    const entryMultiTermParentId = new Map<string, string>();

    const snapshotEntryNodeIds = new Set(
      uiJourneyConversationSnapshot.map((entry) => entry.nodeId)
    );
    const snapshotEntriesByNodeId = new Map<string, UiJourneyConversationEntry[]>();

    for (const entry of uiJourneyConversationSnapshot) {
      const existingEntries = snapshotEntriesByNodeId.get(entry.nodeId);
      if (existingEntries) {
        existingEntries.push(entry);
      } else {
        snapshotEntriesByNodeId.set(entry.nodeId, [entry]);
      }

      if (entry.entryId.includes(":cell:")) {
        childEntryIds.add(entry.entryId);
      }
    }

    const frameNodes = nodes.filter((node) => node.data.node_type === "frame");

    for (const frameNode of frameNodes) {
      const frameConfig = normalizeFrameNodeConfig(frameNode.data.frame_config);
      const filteredMemberNodeIds = frameConfig.member_node_ids.filter(
        (memberNodeId) => snapshotEntryNodeIds.has(memberNodeId)
      );

      frameChildNodeIds.set(frameNode.id, filteredMemberNodeIds);
    }

    for (const [frameNodeId, memberNodeIds] of frameChildNodeIds.entries()) {
      const frameEntry = uiJourneyConversationSnapshot.find(
        (entry) => entry.nodeId === frameNodeId && entry.nodeType === "frame"
      );

      if (!frameEntry) {
        continue;
      }

      for (const memberNodeId of memberNodeIds) {
        const matchingEntries = snapshotEntriesByNodeId.get(memberNodeId) ?? [];

        for (const matchingEntry of matchingEntries) {
          if (matchingEntry.nodeType === "frame") {
            continue;
          }

          childEntryIds.add(matchingEntry.entryId);
          entryFrameParentId.set(matchingEntry.entryId, frameEntry.entryId);
        }
      }
    }

    const currentMultiTermHeaderByNodeId = new Map<string, string>();

    for (const entry of uiJourneyConversationSnapshot) {
      const isMultiTermHeader =
        (entry.nodeType === "horizontal_multi_term" ||
          entry.nodeType === "vertical_multi_term") &&
        !entry.entryId.includes(":cell:");

      if (isMultiTermHeader) {
        currentMultiTermHeaderByNodeId.set(entry.nodeId, entry.entryId);
        continue;
      }

      if (!entry.entryId.includes(":cell:")) {
        continue;
      }

      const parentHeaderEntryId = currentMultiTermHeaderByNodeId.get(entry.nodeId);
      if (parentHeaderEntryId) {
        entryMultiTermParentId.set(entry.entryId, parentHeaderEntryId);
      }
    }

    return {
      frameChildNodeIds,
      childEntryIds,
      entryFrameParentId,
      entryMultiTermParentId,
    };
  }, [uiJourneyConversationSnapshot, nodes]);

  const openTransferModal = useCallback(
    (mode: TransferModalMode, context: TransferModalContext) => {
      setTransferModalState({ mode, context });

      if (mode === "export") {
        setTransferExportFormat("csv");

        if (context === "clp") {
          setClpExportFieldSelection(createDefaultClpExportFieldSelection());
        }
      }
    },
    []
  );

  const closeTransferModal = useCallback(() => {
    setTransferModalState(null);
  }, []);

  const handleClpExportFieldSelectionChange = useCallback(
    (field: ClpExportFieldKey, checked: boolean) => {
      setClpExportFieldSelection((currentSelection) => ({
        ...currentSelection,
        [field]: checked,
      }));
    },
    []
  );

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
      const targetNode = nodes.find((node) => node.id === nodeId) ?? null;

      setTermRegistry((currentRegistry) => {
        const now = new Date().toISOString();
        const targetAssignedSlotId = resolveAssignedSlotIdForRegistryAssignment(
          field,
          targetNode
        );
        const matchingEntries = currentRegistry.filter(
          (entry) =>
            entry.assignedNodeId === nodeId &&
            entry.assignedSlotId === targetAssignedSlotId
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
            termType: getRegistryTermTypeFromField(field, targetNode),
            assignedNodeId: nodeId,
            assignedSlotId: resolveAssignedSlotIdForRegistryAssignment(
              field,
              targetNode
            ),
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
    [nodes, setTermRegistry]
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
      flushTextEditHistoryBurst();
      syncSelectedRegistryFieldOnBlur(field, value);
    },
    [flushTextEditHistoryBurst, syncSelectedRegistryFieldOnBlur]
  );

  const commitSelectedMenuSlotRegistryField = useCallback(
    (slotId: string, value: string) => {
      flushTextEditHistoryBurst();

      if (!effectiveSelectedNodeId || selectedNode?.data.node_type !== "vertical_multi_term") {
        return;
      }

      syncFieldToRegistry(
        effectiveSelectedNodeId,
        buildContentSlotRegistryField(slotId),
        value
      );
    },
    [
      effectiveSelectedNodeId,
      flushTextEditHistoryBurst,
      selectedNode,
      syncFieldToRegistry,
    ]
  );

  const commitSelectedRibbonCellRegistryField = useCallback(
    (cellId: string, fieldName: RibbonCellRegistryFieldName, value: string) => {
      flushTextEditHistoryBurst();

      if (!effectiveSelectedNodeId || selectedNode?.data.node_type !== "horizontal_multi_term") {
        return;
      }

      syncFieldToRegistry(
        effectiveSelectedNodeId,
        buildRibbonCellRegistryField(cellId, fieldName),
        value
      );
    },
    [
      effectiveSelectedNodeId,
      flushTextEditHistoryBurst,
      selectedNode,
      syncFieldToRegistry,
    ]
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

      startTextEditHistoryBurst();
      flushTextEditHistoryBurst();

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
    [
      flushTextEditHistoryBurst,
      setTermRegistry,
      startTextEditHistoryBurst,
      termRegistry,
    ]
  );

  const commitRegistryEntryValue = useCallback(
    (entryId: string, nextValueRaw: string): boolean => {
      const targetEntry = termRegistry.find((entry) => entry.id === entryId);
      if (!targetEntry) {
        return false;
      }

      const nextValue = nextValueRaw.trim();
      if (nextValue.length === 0) {
        return false;
      }

      if (targetEntry.value === nextValue) {
        return true;
      }

      startTextEditHistoryBurst();
      flushTextEditHistoryBurst();

      const now = new Date().toISOString();

      setTermRegistry((currentRegistry) =>
        currentRegistry.map((entry) =>
          entry.id === entryId
            ? {
                ...entry,
                value: nextValue,
                updatedAt: now,
              }
            : entry
        )
      );

      if (!targetEntry.assignedNodeId) {
        return true;
      }

      const assignedNodeId = targetEntry.assignedNodeId;

      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          if (node.id !== assignedNodeId) {
            return node;
          }

          if (targetEntry.assignedSlotId) {
            const slotIndex = node.data.content_config.slots.findIndex(
              (slot) => slot.id === targetEntry.assignedSlotId
            );
            if (slotIndex !== -1) {
              return {
                ...node,
                data: {
                  ...node.data,
                  content_config: {
                    ...node.data.content_config,
                    slots: node.data.content_config.slots.map((slot) =>
                      slot.id === targetEntry.assignedSlotId
                        ? { ...slot, value: nextValue }
                        : slot
                    ),
                  },
                },
              };
            }
          }

          return node;
        })
      );

      return true;
    },
    [
      flushTextEditHistoryBurst,
      setNodes,
      setTermRegistry,
      startTextEditHistoryBurst,
      termRegistry,
    ]
  );

  const toggleRegistryEntryFriendlyIdLock = useCallback(
    (entryId: string) => {
      const targetEntry = termRegistry.find((entry) => entry.id === entryId);
      if (!targetEntry) {
        return;
      }

      pushToHistory();

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
    [pushToHistory, setTermRegistry, termRegistry]
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

      pushToHistory();
      setTermRegistry((currentRegistry) =>
        currentRegistry.filter((entry) => entry.id !== entryId)
      );
    },
    [pushToHistory, setTermRegistry, termRegistry]
  );

  const addRegistryEntry = useCallback(() => {
    const nextValue = registryDraftValue.trim();
    if (!nextValue) {
      return;
    }

    const normalizedTermType = registryDraftTermType.trim();
    const nextTermType = normalizedTermType.length > 0 ? normalizedTermType : null;

    pushToHistory();

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
        assignedSlotId: null,
        deduplicationSuffix: null,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    setRegistryDraftValue("");
    setRegistryDraftTermType("");
  }, [
    pushToHistory,
    registryDraftTermType,
    registryDraftValue,
    setTermRegistry,
  ]);

  const updateSelectedField = useCallback(
    <K extends EditableMicrocopyField>(
      field: K,
      value: PersistableMicrocopyNodeData[K]
    ) => {
      if (!effectiveSelectedNodeId) return;

      if (TEXT_HISTORY_TRACKED_FIELDS.has(field)) {
        startTextEditHistoryBurst();
      }

      queueUndoSnapshot();

      setNodes((nds) =>
        nds.map((node) =>
          node.id === effectiveSelectedNodeId
            ? { ...node, data: { ...node.data, [field]: value } }
            : node
        )
      );
    },
    [effectiveSelectedNodeId, queueUndoSnapshot, setNodes, startTextEditHistoryBurst]
  );

  const updateSelectedContentSlotVisibility = useCallback(
    (slotId: string, isVisible: boolean) => {
      if (!effectiveSelectedNodeId) {
        return;
      }

      queueUndoSnapshot();

      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          if (node.id !== effectiveSelectedNodeId) {
            return node;
          }

          const nextContentConfig = {
            ...node.data.content_config,
            slots: node.data.content_config.slots.map((slot) =>
              slot.id === slotId
                ? {
                    ...slot,
                    visible: isVisible,
                  }
                : slot
            ),
          };

          return {
            ...node,
            data: {
              ...node.data,
              content_config: nextContentConfig,
            },
          };
        })
      );
    },
    [effectiveSelectedNodeId, queueUndoSnapshot, setNodes]
  );

  const updateSelectedContentSlotValue = useCallback(
    (slotId: string, value: string) => {
      if (!effectiveSelectedNodeId) {
        return;
      }

      startTextEditHistoryBurst();
      queueUndoSnapshot();

      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          if (node.id !== effectiveSelectedNodeId) {
            return node;
          }

          return {
            ...node,
            data: {
              ...node.data,
              content_config: {
                ...node.data.content_config,
                slots: node.data.content_config.slots.map((slot) =>
                  slot.id === slotId
                    ? {
                        ...slot,
                        value,
                      }
                    : slot
                ),
              },
            },
          };
        })
      );
    },
    [effectiveSelectedNodeId, queueUndoSnapshot, setNodes, startTextEditHistoryBurst]
  );

  const commitContentSlotRegistryField = useCallback(
    (slotId: string, value: string) => {
      flushTextEditHistoryBurst();

      if (!effectiveSelectedNodeId || selectedNode?.data.node_type === "frame") {
        return;
      }

      syncFieldToRegistry(
        effectiveSelectedNodeId,
        buildContentSlotRegistryField(slotId),
        value
      );
    },
    [effectiveSelectedNodeId, flushTextEditHistoryBurst, selectedNode, syncFieldToRegistry]
  );

  const updateNodeTypeById = useCallback(
    (nodeId: string, nextType: NodeType) => {
      const targetNode = nodes.find((node) => node.id === nodeId);
      if (!targetNode) {
        return;
      }

      if (targetNode.data.node_type === nextType) {
        return;
      }

      const currentNodeType = targetNode.data.node_type;
      const isMenuOrRibbon = currentNodeType === "vertical_multi_term" || currentNodeType === "horizontal_multi_term";
      const targetIsMenuOrRibbon = nextType === "vertical_multi_term" || nextType === "horizontal_multi_term";

      if (!isMenuOrRibbon || !targetIsMenuOrRibbon) {
        return;
      }

      pushToHistory();

      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          if (node.id !== nodeId) {
            return node;
          }

          if (nextType === "vertical_multi_term" && node.data.node_type === "horizontal_multi_term") {
            return {
              ...node,
              data: {
                ...node.data,
                node_type: "vertical_multi_term",
                content_config: {
                  ...node.data.content_config,
                  layout: "vertical" as const,
                },
              },
            };
          }

          if (nextType === "horizontal_multi_term" && node.data.node_type === "vertical_multi_term") {
            return {
              ...node,
              data: {
                ...node.data,
                node_type: "horizontal_multi_term",
                content_config: {
                  ...node.data.content_config,
                  layout: "horizontal" as const,
                },
              },
            };
          }

          return node;
        })
      );

      setEdges((currentEdges) => {
        return assignSequentialEdgesToGroupHandles(
          currentEdges,
          nodeId,
          buildContentConfigSourceHandleIds(targetNode.data.content_config)
        );
      });

      setOpenControlledLanguageFieldType(null);
      setInspectorRegistryPickerSearchQuery("");
    },
    [nodes, pushToHistory, setEdges, setNodes]
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

  const updateVerticalContentConfigById = useCallback(
    (
      nodeId: string,
      updater: (currentConfig: NodeContentConfig) => NodeContentConfig,
      historyCaptureMode: "discrete" | "text" = "discrete"
    ) => {
      const targetNode = nodes.find((node) => node.id === nodeId);
      if (
        !targetNode ||
        targetNode.data.node_type !== "vertical_multi_term"
      ) {
        return;
      }

      const currentContentConfig = normalizeNodeContentConfig(
        targetNode.data.content_config,
        "vertical"
      );
      const requestedNextContentConfig = updater(currentContentConfig);
      const normalizedNextContentConfig = normalizeNodeContentConfig(
        requestedNextContentConfig,
        "vertical"
      );

      const sortedNextGroups = [...normalizedNextContentConfig.groups].sort((groupA, groupB) =>
        groupA.row === groupB.row ? groupA.column - groupB.column : groupA.row - groupB.row
      );

      const getGroupMenuTermValue = (groupId: string, fallbackValue: string): string => {
        const groupSlots = normalizedNextContentConfig.slots
          .filter((slot) => slot.groupId === groupId)
          .sort((slotA, slotB) => slotA.position - slotB.position);
        const primaryMenuTermSlot =
          groupSlots.find(
            (slot) =>
              normalizeContentSlotTermType(slot.termType) === "menu_term" && slot.position === 0
          ) ??
          groupSlots.find(
            (slot) => normalizeContentSlotTermType(slot.termType) === "menu_term"
          ) ??
          null;

        return primaryMenuTermSlot?.value ?? fallbackValue;
      };

      const nextPrimaryCta =
        sortedNextGroups.length > 0
          ? getGroupMenuTermValue(sortedNextGroups[0]!.id, targetNode.data.primary_cta)
          : targetNode.data.primary_cta;
      const nextSecondaryCta =
        sortedNextGroups.length > 1
          ? getGroupMenuTermValue(sortedNextGroups[1]!.id, targetNode.data.secondary_cta)
          : targetNode.data.secondary_cta;

      if (historyCaptureMode === "text") {
        startTextEditHistoryBurst();
      } else {
        queueUndoSnapshot();
      }

      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          if (node.id !== nodeId) {
            return node;
          }

          return {
            ...node,
            data: {
              ...node.data,
              content_config: normalizedNextContentConfig,
              primary_cta: nextPrimaryCta,
              secondary_cta: nextSecondaryCta,
            },
          };
        })
      );

      setEdges((currentEdges) =>
        syncSequentialEdgesForContentConfig(currentEdges, nodeId, normalizedNextContentConfig)
      );

      const removedGroupIds = currentContentConfig.groups
        .map((group) => group.id)
        .filter(
          (groupId) => !normalizedNextContentConfig.groups.some((group) => group.id === groupId)
        );

      if (removedGroupIds.length > 0) {
        const removedGroupIdSet = new Set(removedGroupIds);
        const removedSlotIdSet = new Set(
          currentContentConfig.slots
            .filter(
              (slot) => slot.groupId !== null && removedGroupIdSet.has(slot.groupId)
            )
            .map((slot) => slot.id)
        );

        setTermRegistry((currentRegistry) => {
          const now = new Date().toISOString();
          let hasChanges = false;

          const nextRegistry = currentRegistry.map((entry) => {
            if (
              entry.assignedNodeId !== nodeId ||
              entry.assignedSlotId == null ||
              !removedSlotIdSet.has(entry.assignedSlotId ?? "")
            ) {
              return entry;
            }

            hasChanges = true;

            return {
              ...entry,
              assignedNodeId: null,
              assignedSlotId: null,
              updatedAt: now,
            };
          });

          return hasChanges ? nextRegistry : currentRegistry;
        });
      }

      setOpenControlledLanguageFieldType((current) => {
        if (!current) {
          return current;
        }

        const menuTermId = current ? parseMenuTermRegistryField(current) : null;
        if (!menuTermId) {
          return current;
        }

        return normalizedNextContentConfig.groups.some((group) => group.id === menuTermId)
          ? current
          : null;
      });
    },
    [nodes, queueUndoSnapshot, setEdges, setNodes, setTermRegistry, startTextEditHistoryBurst]
  );

  const selectedVerticalContentConfig = useMemo(() => {
    if (!selectedNode || selectedNode.data.node_type !== "vertical_multi_term") {
      return null;
    }

    return normalizeNodeContentConfig(selectedNode.data.content_config, "vertical");
  }, [selectedNode]);

  const selectedFrameNodeConfig = useMemo(() => {
    if (!selectedNode || selectedNode.data.node_type !== "frame") {
      return null;
    }

    return normalizeFrameNodeConfig(selectedNode.data.frame_config);
  }, [selectedNode]);

  const selectedHorizontalContentConfig = useMemo(() => {
    if (!selectedNode || selectedNode.data.node_type !== "horizontal_multi_term") {
      return null;
    }

    return normalizeNodeContentConfig(selectedNode.data.content_config, "horizontal");
  }, [selectedNode]);

  const updateSelectedMenuMaxRightConnections = useCallback(
    (nextValue: number) => {
      if (!effectiveSelectedNodeId || !selectedVerticalContentConfig) {
        return;
      }

      updateVerticalContentConfigById(effectiveSelectedNodeId, (currentConfig) => {
        const sortedGroups = [...currentConfig.groups].sort((groupA, groupB) =>
          groupA.row === groupB.row ? groupA.column - groupB.column : groupA.row - groupB.row
        );
        const nextMax = clampMenuRightConnections(nextValue);
        let nextGroups = [...currentConfig.groups];
        let nextSlots = [...currentConfig.slots];

        if (nextMax > sortedGroups.length) {
          for (let nextColumnIndex = sortedGroups.length; nextColumnIndex < nextMax; nextColumnIndex += 1) {
            const groupId = createContentGroupId();

            nextGroups = [
              ...nextGroups,
              {
                id: groupId,
                row: 0,
                column: nextColumnIndex,
              },
            ];

            nextSlots = [
              ...nextSlots,
              ...(["menu_term", "key_command", "tool_tip"] as const).map((termType, index) => ({
                id: createContentSlotId(),
                value: "",
                termType,
                groupId,
                position: index,
              })),
            ];
          }
        } else if (nextMax < sortedGroups.length) {
          const groupsToRemove = sortedGroups.slice(nextMax);
          const removedGroupIdSet = new Set(groupsToRemove.map((group) => group.id));

          nextGroups = nextGroups.filter((group) => !removedGroupIdSet.has(group.id));
          nextSlots = nextSlots.filter(
            (slot) => slot.groupId === null || !removedGroupIdSet.has(slot.groupId)
          );
        }

        const sortedNextGroups = [...nextGroups].sort((groupA, groupB) =>
          groupA.row === groupB.row ? groupA.column - groupB.column : groupA.row - groupB.row
        );

        return normalizeNodeContentConfig(
          {
            ...currentConfig,
            rows: 1,
            columns: Math.max(1, nextMax),
            groups: sortedNextGroups.map((group, index) => ({
              ...group,
              row: 0,
              column: index,
            })),
            slots: nextSlots,
          },
          "vertical"
        );
      });
    },
    [effectiveSelectedNodeId, selectedVerticalContentConfig, updateVerticalContentConfigById]
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
      if (!targetNode || targetNode.data.node_type !== "horizontal_multi_term") {
        return;
      }

      const currentContentConfig = normalizeNodeContentConfig(
        targetNode.data.content_config,
        "horizontal"
      );
      const sortedCurrentGroups = [...currentContentConfig.groups].sort((groupA, groupB) =>
        groupA.row === groupB.row ? groupA.column - groupB.column : groupA.row - groupB.row
      );
      const nextColumns = Math.max(HMN_MIN_COLUMNS, sortedCurrentGroups.length + delta);

      if (nextColumns === sortedCurrentGroups.length) {
        return;
      }

      let nextGroups = [...currentContentConfig.groups];
      let nextSlots = [...currentContentConfig.slots];

      if (nextColumns > sortedCurrentGroups.length) {
        const groupId = createContentGroupId();
        const nextGroup = {
          id: groupId,
          row: 0,
          column: sortedCurrentGroups.length,
        };

        const nextGroupSlots = (["cell_label", "key_command", "tool_tip"] as const).map(
          (termType, index) => ({
            id: createContentSlotId(),
            value: "",
            termType,
            groupId,
            position: index,
          })
        );

        nextGroups = [...nextGroups, nextGroup];
        nextSlots = [...nextSlots, ...nextGroupSlots];
      } else {
        const lastGroup = sortedCurrentGroups[sortedCurrentGroups.length - 1];
        if (!lastGroup) {
          return;
        }

        nextGroups = nextGroups.filter((group) => group.id !== lastGroup.id);
        nextSlots = nextSlots.filter((slot) => slot.groupId !== lastGroup.id);
      }

      const nextContentConfig = normalizeNodeContentConfig(
        {
          ...currentContentConfig,
          rows: 1,
          columns: nextColumns,
          groups: nextGroups,
          slots: nextSlots,
        },
        "horizontal"
      );

      queueUndoSnapshot();

      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === targetNode.id
            ? {
                ...node,
                data: {
                  ...node.data,
                  content_config: nextContentConfig,
                },
              }
            : node
        )
      );

      setEdges((currentEdges) =>
        syncSequentialEdgesForContentConfig(currentEdges, targetNode.id, nextContentConfig)
      );

      setOpenControlledLanguageFieldType((current) => {
        if (!current) {
          return current;
        }

        const ribbonField = parseRibbonCellRegistryField(current);
        if (!ribbonField) {
          return current;
        }

        return nextContentConfig.groups.some((group) => group.id === ribbonField.cellId)
          ? current
          : null;
      });
    },
    [effectiveSelectedNodeId, nodes, queueUndoSnapshot, setEdges, setNodes]
  );

  const updateRibbonCellField = useCallback(
    (slotId: string, value: string) => {
      if (!effectiveSelectedNodeId || !selectedNode || selectedNode.data.node_type !== "horizontal_multi_term") {
        return;
      }

      const targetNode = nodes.find((node) => node.id === effectiveSelectedNodeId);
      if (!targetNode || targetNode.data.node_type !== "horizontal_multi_term") {
        return;
      }

      const currentContentConfig = normalizeNodeContentConfig(
        targetNode.data.content_config,
        "horizontal"
      );
      if (!currentContentConfig.slots.some((slot) => slot.id === slotId)) {
        return;
      }

      const nextContentConfig = normalizeNodeContentConfig(
        {
          ...currentContentConfig,
          slots: currentContentConfig.slots.map((slot) =>
            slot.id === slotId
            ? {
                ...slot,
                value,
              }
            : slot
          ),
        },
        "horizontal"
      );

      startTextEditHistoryBurst();
      queueUndoSnapshot();

      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === targetNode.id
            ? {
                ...node,
                data: {
                  ...node.data,
                  content_config: nextContentConfig,
                },
              }
            : node
        )
      );
    },
    [
      effectiveSelectedNodeId,
      nodes,
      queueUndoSnapshot,
      selectedNode,
      setNodes,
      startTextEditHistoryBurst,
    ]
  );

  const commitSelectedMenuRightConnectionsInput = useCallback((rawValue: string) => {
    const sanitizedValue = rawValue.replace(/[^\d]/g, "");
    const parsedValue = Number.parseInt(sanitizedValue, 10);
    const nextValue = clampMenuRightConnections(
      Number.isFinite(parsedValue)
        ? parsedValue
        : VMN_GROUPS_MIN
    );

    if (!selectedVerticalContentConfig) {
      return String(nextValue);
    }

    const currentGroupCount = selectedVerticalContentConfig.groups.length;

    if (nextValue !== currentGroupCount) {
      updateSelectedMenuMaxRightConnections(nextValue);
    }

    return String(nextValue);
  }, [selectedVerticalContentConfig, updateSelectedMenuMaxRightConnections]);

  const addSelectedMenuTerm = useCallback(() => {
    if (!effectiveSelectedNodeId || !selectedVerticalContentConfig) {
      return;
    }

    updateVerticalContentConfigById(effectiveSelectedNodeId, (currentConfig) => {
      const sortedGroups = [...currentConfig.groups].sort((groupA, groupB) =>
        groupA.row === groupB.row ? groupA.column - groupB.column : groupA.row - groupB.row
      );
      const nextColumnIndex = sortedGroups.length;
      const groupId = createContentGroupId();

      return {
        ...currentConfig,
        rows: 1,
        columns: nextColumnIndex + 1,
        groups: [
          ...currentConfig.groups,
          {
            id: groupId,
            row: 0,
            column: nextColumnIndex,
          },
        ],
        slots: [
          ...currentConfig.slots,
          ...(["menu_term", "key_command", "tool_tip"] as const).map((termType, index) => ({
            id: createContentSlotId(),
            value: "",
            termType,
            groupId,
            position: index,
          })),
        ],
      };
    });
  }, [effectiveSelectedNodeId, selectedVerticalContentConfig, updateVerticalContentConfigById]);

  const updateSelectedMenuSlotValueById = useCallback(
    (slotId: string, value: string) => {
      if (!effectiveSelectedNodeId || !selectedVerticalContentConfig) {
        return;
      }

      updateVerticalContentConfigById(
        effectiveSelectedNodeId,
        (currentConfig) => {
          if (!currentConfig.slots.some((slot) => slot.id === slotId)) {
            return currentConfig;
          }

          return {
            ...currentConfig,
            slots: currentConfig.slots.map((slot) =>
              slot.id === slotId
                ? {
                    ...slot,
                    value,
                  }
                : slot
            ),
          };
        },
        "text"
      );
    },
    [effectiveSelectedNodeId, selectedVerticalContentConfig, updateVerticalContentConfigById]
  );

  const deleteSelectedMenuTermById = useCallback(
    (termId: string) => {
      if (!effectiveSelectedNodeId || !selectedVerticalContentConfig) {
        return;
      }

      if (selectedVerticalContentConfig.groups.length <= VMN_GROUPS_MIN) {
        showMenuTermDeleteBlockedMessage();
        return;
      }

      const termToDeleteGroup = selectedVerticalContentConfig.groups.find(
        (group) => group.id === termId
      );
      const termToDeleteSlot =
        selectedVerticalContentConfig?.slots.find(
          (slot) =>
            slot.groupId === termId &&
            normalizeContentSlotTermType(slot.termType) === "menu_term" &&
            slot.position === 0
        ) ??
        selectedVerticalContentConfig?.slots.find(
          (slot) =>
            slot.groupId === termId && normalizeContentSlotTermType(slot.termType) === "menu_term"
        ) ??
        null;
      const termToDelete = {
        id: termToDeleteGroup?.id,
        term: termToDeleteSlot?.value ?? "",
      };

      if (!termToDelete) {
        return;
      }

      const confirmed = window.confirm(
        `Delete this menu term (${termToDelete.term || "Untitled"})? This will also remove any sequential edge attached to it.`
      );

      if (!confirmed) {
        return;
      }

      updateVerticalContentConfigById(effectiveSelectedNodeId, (currentConfig) => {
        const filteredGroups = currentConfig.groups
          .filter((group) => group.id !== termId)
          .sort((groupA, groupB) =>
            groupA.row === groupB.row ? groupA.column - groupB.column : groupA.row - groupB.row
          );
        const nextColumns = clampMenuRightConnections(
          Math.max(filteredGroups.length, VMN_GROUPS_MIN)
        );

        return {
          ...currentConfig,
          rows: 1,
          columns: nextColumns,
          groups: filteredGroups.map((group, index) => ({
            ...group,
            row: 0,
            column: index,
          })),
          slots: currentConfig.slots.filter((slot) => slot.groupId !== termId),
        };
      });

      setOpenControlledLanguageFieldType((current) => {
        if (!current) {
          return current;
        }

        const slotId = parseSlotRegistryField(current);
        if (slotId) {
          return selectedVerticalContentConfig.slots.some((slot) => slot.id === slotId)
            ? current
            : null;
        }

        const menuTermId = parseMenuTermRegistryField(current);
        return menuTermId === termId ? null : current;
      });
    },
    [
      effectiveSelectedNodeId,
      selectedVerticalContentConfig,
      showMenuTermDeleteBlockedMessage,
      updateVerticalContentConfigById,
    ]
  );

  const toggleInspectorRegistryPickerForField = useCallback(
    (field: DynamicRegistryTrackedField, nodeOverride: FlowNode | null = null) => {
      const targetNode = nodeOverride ?? selectedNode;

      console.log("[CLP Registry Picker] field clicked", {
        field,
        termType: getRegistryTermTypeFromField(field, targetNode),
      });

      didJustOpenRegistryPickerRef.current = true;
      setClpActiveView("registry");
      setOpenControlledLanguageFieldType(field);
      setClpRegistryFieldFilter(field);
      setInspectorRegistryPickerSearchQuery("");
    },
    [selectedNode]
  );

  const openRegistryPickerForNodeField = useCallback(
    (nodeId: string, field: DynamicRegistryTrackedField) => {
      const targetNode = nodes.find((node) => node.id === nodeId) ?? null;

      setSelectedEdgeId(null);
      setSelectedNodeId(nodeId);
      setSelectedNodeIds([nodeId]);
      toggleInspectorRegistryPickerForField(field, targetNode);
    },
    [nodes, toggleInspectorRegistryPickerForField]
  );

  const closeInspectorRegistryPicker = useCallback(() => {
    didJustOpenRegistryPickerRef.current = false;
    setOpenControlledLanguageFieldType(null);
    setClpRegistryFieldFilter(null);
    setInspectorRegistryPickerSearchQuery("");
  }, []);

  const assignRegistryEntryToInspectorField = useCallback(
    (field: DynamicRegistryTrackedField, entry: TermRegistryEntry) => {
      if (!effectiveSelectedNodeId) {
        return;
      }

      const targetTermType = getRegistryTermTypeFromField(field, selectedNode);
      const targetAssignedSlotId = resolveAssignedSlotIdForRegistryAssignment(
        field,
        selectedNode,
        targetTermType
      );

      const assignedToOtherField =
        entry.assignedNodeId !== null &&
        (entry.assignedNodeId !== effectiveSelectedNodeId ||
          entry.assignedSlotId !== targetAssignedSlotId);

      let createDuplicateEntry = false;

      if (assignedToOtherField) {
        const confirmed = window.confirm(
          "This term is already assigned to another field. Assign it here as well?"
        );

        if (!confirmed) {
          return;
        }

        createDuplicateEntry = true;
      }

      if (isRegistryTrackedField(field)) {
        updateSelectedField(field, entry.value);
      } else {
        const slotId = parseSlotRegistryField(field);
        const menuTermId = parseMenuTermRegistryField(field);
        const ribbonCellField = parseRibbonCellRegistryField(field);

        if (slotId) {
          if (selectedNode?.data.node_type === "vertical_multi_term") {
            updateSelectedMenuSlotValueById(slotId, entry.value);
          } else {
            updateSelectedContentSlotValue(slotId, entry.value);
          }
        } else if (menuTermId) {
          const menuSlot =
            selectedVerticalContentConfig?.slots
              .filter((slot) => slot.groupId === menuTermId)
              .sort(sortContentSlotsByPosition)
              .find(
                (slot) => normalizeContentSlotTermType(slot.termType) === "menu_term"
              ) ?? null;

          if (menuSlot) {
            updateSelectedMenuSlotValueById(menuSlot.id, entry.value);
          }
        } else if (ribbonCellField) {
          const targetRibbonSlotTermType =
            ribbonCellField.fieldName === "label"
              ? "cell_label"
              : ribbonCellField.fieldName;
          const targetRibbonSlot =
            selectedHorizontalContentConfig?.slots.find(
              (slot) =>
                slot.groupId === ribbonCellField.cellId &&
                normalizeContentSlotTermType(slot.termType) === targetRibbonSlotTermType
            ) ?? null;

          if (targetRibbonSlot) {
            updateRibbonCellField(targetRibbonSlot.id, entry.value);
          }
        }
      }

      const now = new Date().toISOString();

      pushToHistory();

      setTermRegistry((currentRegistry) => {
        let hasChanges = false;

        let nextRegistry = currentRegistry.map((registryEntry) => {
          if (
            registryEntry.assignedNodeId === effectiveSelectedNodeId &&
            registryEntry.assignedSlotId === targetAssignedSlotId &&
            (createDuplicateEntry || registryEntry.id !== entry.id)
          ) {
            hasChanges = true;
            return {
              ...registryEntry,
              assignedNodeId: null,
              assignedSlotId: null,
              updatedAt: now,
            };
          }

          return registryEntry;
        });

        if (createDuplicateEntry) {
          hasChanges = true;
          nextRegistry = [
            ...nextRegistry,
            {
              ...entry,
              id: crypto.randomUUID(),
              termType: targetTermType,
              assignedNodeId: effectiveSelectedNodeId,
              assignedSlotId: resolveAssignedSlotIdForRegistryAssignment(
                field,
                selectedNode,
                targetTermType
              ),
              createdAt: now,
              updatedAt: now,
            },
          ];
        } else {
          const existingIndex = nextRegistry.findIndex(
            (registryEntry) => registryEntry.id === entry.id
          );

          if (existingIndex !== -1) {
            const existingEntry = nextRegistry[existingIndex];
            if (
              existingEntry.assignedNodeId !== effectiveSelectedNodeId ||
              existingEntry.assignedSlotId !== targetAssignedSlotId ||
              existingEntry.termType !== targetTermType
            ) {
              hasChanges = true;
              nextRegistry = [...nextRegistry];
              nextRegistry[existingIndex] = {
                ...existingEntry,
                termType: targetTermType,
                assignedNodeId: effectiveSelectedNodeId,
                assignedSlotId: resolveAssignedSlotIdForRegistryAssignment(
                  field,
                  selectedNode,
                  targetTermType
                ),
                updatedAt: now,
              };
            }
          }
        }

        return hasChanges ? nextRegistry : currentRegistry;
      });

    },
    [
      effectiveSelectedNodeId,
      pushToHistory,
      setTermRegistry,
      updateRibbonCellField,
      updateSelectedContentSlotValue,
      updateSelectedField,
      updateSelectedMenuSlotValueById,
      selectedHorizontalContentConfig,
      selectedVerticalContentConfig,
    ]
  );

  const activeInspectorRegistryPickerField = useMemo<DynamicRegistryTrackedField | null>(() => {
    if (!openControlledLanguageFieldType || !effectiveSelectedNodeId || !selectedNode) {
      return null;
    }

    if (isRegistryTrackedField(openControlledLanguageFieldType)) {
      return openControlledLanguageFieldType;
    }

    const menuTermId = parseMenuTermRegistryField(openControlledLanguageFieldType);
    if (menuTermId) {
      if (selectedNode.data.node_type !== "vertical_multi_term") {
        return null;
      }

      return selectedVerticalContentConfig?.groups.some((group) => group.id === menuTermId)
        ? openControlledLanguageFieldType
        : null;
    }

    const ribbonCellField = parseRibbonCellRegistryField(openControlledLanguageFieldType);
    if (ribbonCellField) {
      if (selectedNode.data.node_type !== "horizontal_multi_term") {
        return null;
      }

      return selectedHorizontalContentConfig?.groups.some(
        (group) => group.id === ribbonCellField.cellId
      )
        ? openControlledLanguageFieldType
        : null;
    }

    const slotId = parseSlotRegistryField(openControlledLanguageFieldType);
    if (slotId) {
      return selectedNode.data.content_config.slots.some((slot) => slot.id === slotId)
        ? openControlledLanguageFieldType
        : null;
    }

    return null;
  }, [
    effectiveSelectedNodeId,
    openControlledLanguageFieldType,
    selectedVerticalContentConfig,
    selectedNode,
    selectedHorizontalContentConfig,
  ]);

  const inspectorRegistryPickerFieldLabel = useMemo(() => {
    if (!clpRegistryFieldFilter) {
      return "";
    }

    if (isRegistryTrackedField(clpRegistryFieldFilter)) {
      return INSPECTOR_CONTENT_FIELD_LABELS[clpRegistryFieldFilter];
    }

    const menuTermId = parseMenuTermRegistryField(clpRegistryFieldFilter);
    if (menuTermId) {
      const menuTermIndex = [...(selectedVerticalContentConfig?.groups ?? [])]
        .sort((groupA, groupB) =>
          groupA.row === groupB.row ? groupA.column - groupB.column : groupA.row - groupB.row
        )
        .findIndex((group) => group.id === menuTermId);
      return typeof menuTermIndex === "number" && menuTermIndex >= 0
        ? `Menu Term ${menuTermIndex + 1}`
        : "Menu Term";
    }

    const ribbonCellField = parseRibbonCellRegistryField(clpRegistryFieldFilter);
    if (ribbonCellField) {
      const fieldLabel =
        ribbonCellField.fieldName === "label"
          ? "Label"
          : ribbonCellField.fieldName === "key_command"
            ? "Key Command"
            : "Tool Tip";

      return fieldLabel;
    }

    const slotId = parseSlotRegistryField(clpRegistryFieldFilter);
    if (slotId) {
      return getSlotFieldLabelForNode(selectedNode, slotId);
    }

    return clpRegistryFieldFilter;
  }, [
    clpRegistryFieldFilter,
    selectedVerticalContentConfig,
    selectedNode,
    selectedHorizontalContentConfig,
  ]);

  const inspectorRegistryPickerTargetTermType = useMemo(() => {
    if (!clpRegistryFieldFilter) {
      return null;
    }

    return getRegistryTermTypeFromField(clpRegistryFieldFilter, selectedNode);
  }, [clpRegistryFieldFilter, selectedNode]);

  const clpRegistryFieldFilterAssignedSlotId = useMemo(() => {
    if (!clpRegistryFieldFilter) {
      return null;
    }

    return resolveAssignedSlotIdForRegistryAssignment(
      clpRegistryFieldFilter,
      selectedNode,
      inspectorRegistryPickerTargetTermType
    );
  }, [
    clpRegistryFieldFilter,
    inspectorRegistryPickerTargetTermType,
    selectedNode,
  ]);

  const filteredInspectorRegistryEntries = useMemo(() => {
    console.log("[CLP Registry Filter] comparing", {
      inspectorRegistryPickerTargetTermType,
      firstThreeRegistryEntryTermTypes: termRegistry
        .slice(0, 3)
        .map((entry) => entry.termType),
    });

    if (!inspectorRegistryPickerTargetTermType) {
      return [];
    }

    const searchQuery = inspectorRegistryPickerSearchQuery.trim().toLowerCase();

    return termRegistry
      .filter((entry) => entry.termType === inspectorRegistryPickerTargetTermType)
      .filter((entry) => {
        if (!searchQuery) {
          return true;
        }

        return (
          entry.value.toLowerCase().includes(searchQuery) ||
          (entry.friendlyId?.toLowerCase().includes(searchQuery) ?? false)
        );
      })
      .sort((entryA, entryB) => entryA.value.localeCompare(entryB.value));
  }, [
    inspectorRegistryPickerSearchQuery,
    inspectorRegistryPickerTargetTermType,
    termRegistry,
  ]);

  useEffect(() => {
    if (!openControlledLanguageFieldType && clpRegistryFieldFilter) {
      setClpRegistryFieldFilter(null);
    }
  }, [clpRegistryFieldFilter, openControlledLanguageFieldType]);

  useEffect(() => {
    if (didJustOpenRegistryPickerRef.current) {
      didJustOpenRegistryPickerRef.current = false;
      return;
    }

    if (openControlledLanguageFieldType && !activeInspectorRegistryPickerField) {
      closeInspectorRegistryPicker();
    }
  }, [
    activeInspectorRegistryPickerField,
    closeInspectorRegistryPicker,
    openControlledLanguageFieldType,
  ]);

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

    pushToHistory();

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
    setInspectorRegistryPickerSearchQuery("");
    setSelectedEdgeId(null);
    setSelectedNodeId(frameId);
    setSelectedNodeIds([frameId]);
    },
    [adminOptions, pushToHistory, selectedNonFrameNodesForFrameCreation, setNodes]
  );

  useEffect(() => {
    updateVerticalContentConfigByIdRef.current = updateVerticalContentConfigById;
  }, [updateVerticalContentConfigById]);

  useEffect(() => {
    createFrameFromSelectionRef.current = createFrameFromSelection;
  }, [createFrameFromSelection]);

  const glossaryHighlightedNodeIdSet = useMemo(
    () => new Set(glossaryHighlightedNodeIds),
    [glossaryHighlightedNodeIds]
  );

  const handleFlowCopyNodeBeforeChange = useCallback(() => {
    startTextEditHistoryBurstRef.current();
  }, []);

  const handleFlowCopyNodeTextEditBlur = useCallback(() => {
    flushTextEditHistoryBurstRef.current();
  }, []);

  const handleFlowCopyNodeVerticalContentConfigChange = useCallback(
    (
      nodeId: string,
      updater: (currentConfig: NodeContentConfig) => NodeContentConfig,
      historyCaptureMode: "discrete" | "text" = "discrete"
    ) => {
      updateVerticalContentConfigByIdRef.current(nodeId, updater, historyCaptureMode);
    },
    []
  );
const nodeCallbacksRef = useRef({
  handleFlowCopyNodeBeforeChange,
  handleFlowCopyNodeTextEditBlur,
  syncFieldToRegistry,
  openRegistryPickerForNodeField,
  canDropRegistryEntryOnNodeField,
  handleDropRegistryEntryOnNodeField,
  resolveDroppedRegistryTerm,
  handleAssignPendingRibbonTermToField,
  showMenuTermDeleteBlockedMessage,
  handleFlowCopyNodeVerticalContentConfigChange,
});
nodeCallbacksRef.current = {
  handleFlowCopyNodeBeforeChange,
  handleFlowCopyNodeTextEditBlur,
  syncFieldToRegistry,
  openRegistryPickerForNodeField,
  canDropRegistryEntryOnNodeField,
  handleDropRegistryEntryOnNodeField,
  resolveDroppedRegistryTerm,
  handleAssignPendingRibbonTermToField,
  showMenuTermDeleteBlockedMessage,
  handleFlowCopyNodeVerticalContentConfigChange,
};
 const nodeTypes = useMemo(
  () => ({
    flowcopyNode: (props: NodeProps<FlowNode>) => (
      <FlowCopyNode
        {...props}
        onBeforeChange={nodeCallbacksRef.current.handleFlowCopyNodeBeforeChange}
        onTextEditBlur={nodeCallbacksRef.current.handleFlowCopyNodeTextEditBlur}
        onCommitRegistryField={nodeCallbacksRef.current.syncFieldToRegistry}
        onRegistryPickerOpen={nodeCallbacksRef.current.openRegistryPickerForNodeField}
        onCanDropRegistryEntry={nodeCallbacksRef.current.canDropRegistryEntryOnNodeField}
        onDropRegistryEntryOnField={nodeCallbacksRef.current.handleDropRegistryEntryOnNodeField}
        onResolveDroppedRegistryTerm={nodeCallbacksRef.current.resolveDroppedRegistryTerm}
        onAssignPendingRibbonTermToField={nodeCallbacksRef.current.handleAssignPendingRibbonTermToField}
        menuTermGlossaryTerms={menuTermGlossaryTermsRef.current}
        glossaryHighlightedNodeIds={glossaryHighlightedNodeIdSet}
        showNodeId={showNodeIdsOnCanvas}
        onMenuTermDeleteBlocked={nodeCallbacksRef.current.showMenuTermDeleteBlockedMessage}
        onVerticalContentConfigChange={
          nodeCallbacksRef.current.handleFlowCopyNodeVerticalContentConfigChange
        }
      />
    ),
  }),
  [glossaryHighlightedNodeIdSet, showNodeIdsOnCanvas]
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
        if (node.data.node_type !== "vertical_multi_term") {
          return maxCount;
        }

        const groupCount = node.data.content_config?.groups?.length ?? 0;
        return Math.max(maxCount, groupCount);
      }, 0),
    [projectTableRows]
  );

  const menuTermColumnIndexes = useMemo(
    () =>
      Array.from(
        { length: Math.max(0, maxMenuTermColumnCount) },
        (_, menuTermIndex) => menuTermIndex
      ),
    [maxMenuTermColumnCount]
  );

  const maxRibbonCellColumnCount = useMemo(
    () =>
      projectTableRows.reduce((maxCount, { node }) => {
        if (node.data.node_type !== "horizontal_multi_term") {
          return maxCount;
        }

        const groupCount = node.data.content_config?.groups?.length ?? 0;
        return Math.max(maxCount, groupCount);
      }, 0),
    [projectTableRows]
  );

  const ribbonCellColumnIndexes = useMemo(
    () =>
      Array.from(
        { length: Math.max(0, maxRibbonCellColumnCount) },
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

          const nextNodeData = {
            ...node.data,
            [field]: value,
          };

          const shouldDualWriteDefaultContentSlot =
            node.data.node_type === "default" &&
            (field === "title" ||
              field === "primary_cta" ||
              field === "secondary_cta" ||
              field === "helper_text" ||
              field === "error_text" ||
              field === "body_text" ||
              field === "notes");

          if (shouldDualWriteDefaultContentSlot) {
            const normalizedContentConfig = normalizeNodeContentConfig(
              node.data.content_config,
              "single"
            );
            const matchingSlotIndex = normalizedContentConfig.slots.findIndex(
              (slot) => slot.termType === field
            );

            if (matchingSlotIndex !== -1) {
              return {
                ...node,
                data: {
                  ...nextNodeData,
                  content_config: {
                    ...normalizedContentConfig,
                    slots: normalizedContentConfig.slots.map((slot, slotIndex) =>
                      slotIndex === matchingSlotIndex
                        ? {
                            ...slot,
                            value,
                          }
                        : slot
                    ),
                  },
                },
              };
            }
          }

          return {
            ...node,
            data: nextNodeData,
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
    (
      format: "json" | "csv",
      fieldSelection: Record<ClpExportFieldKey, boolean> =
        createDefaultClpExportFieldSelection()
    ): boolean => {
      if (!activeProject) {
        return false;
      }

      const selectedFieldKeys = CLP_EXPORT_FIELD_OPTIONS.filter(
        ({ key }) => fieldSelection[key]
      ).map(({ key }) => key);

      if (selectedFieldKeys.length === 0) {
        setTransferFeedback({
          type: "error",
          message: "Select at least one Term Registry field to export.",
        });
        return false;
      }

      const nodeById = new Map(nodes.map((node) => [node.id, node] as const));

const frameByMemberNodeId = new Map<string, string>();
nodes.forEach((node) => {
  if (node.data.node_type === "frame") {
    const frameConfig = normalizeFrameNodeConfig(node.data.frame_config);
    const frameTitle = typeof node.data.title === "string" ? node.data.title.trim() : "";
    frameConfig.member_node_ids.forEach((memberId: string) => {
      frameByMemberNodeId.set(memberId, frameTitle);
    });
  }
});

const registryRows: Record<ClpExportFieldKey, string>[] = termRegistry.map((entry) => {
  const assignedNode = entry.assignedNodeId
    ? nodeById.get(entry.assignedNodeId) ?? null
    : null;
  const nodeTitle = assignedNode?.data?.title;
  const trimmedNodeTitle = typeof nodeTitle === "string" ? nodeTitle.trim() : "";
        const assignmentStatus = entry.assignedNodeId
          ? trimmedNodeTitle
            ? `Assigned to: ${trimmedNodeTitle}`
            : "Assigned"
          : "Unassigned";
        const sequenceNumberValue =
          entry.assignedNodeId && ordering.sequenceByNodeId[entry.assignedNodeId] !== undefined
            ? String(ordering.sequenceByNodeId[entry.assignedNodeId])
            : "";

        return {
  frame: entry.assignedNodeId ? frameByMemberNodeId.get(entry.assignedNodeId) ?? "" : "",
  title: trimmedNodeTitle,
  termValue: entry.value,
  referenceKey: entry.friendlyId ?? "",
          nodeType: assignedNode?.data?.node_type ?? "",
          sequenceNumber: sequenceNumberValue,
          assignmentStatus,
        };
      });

      const projectName = activeProject.name.trim() || activeProject.id;
      const fileName = `${projectName}-term-registry.${format}`;

      if (format === "json") {
        const payloadRows = registryRows.map((row) => {
          const filteredRow: Partial<Record<ClpExportFieldKey, string>> = {};

          selectedFieldKeys.forEach((key) => {
            filteredRow[key] = row[key];
          });

          return filteredRow;
        });

        const payload = JSON.stringify(payloadRows, null, 2);

        downloadTextFile(activeProject.id, "json", payload, fileName);

        setTransferFeedback({
          type: "success",
          message: `Exported ${payloadRows.length} term registry row(s) as JSON.`,
        });
        return true;
      }

      const selectedFieldLabels = selectedFieldKeys.map(
        (key) =>
          CLP_EXPORT_FIELD_OPTIONS.find((fieldOption) => fieldOption.key === key)?.label ?? key
      );

      const header = selectedFieldLabels.map((label) => escapeCsvCell(label)).join(",");
      const rows = registryRows.map((row) =>
        selectedFieldKeys.map((key) => escapeCsvCell(row[key])).join(",")
      );
      const payload = [header, ...rows].join("\n");

      downloadTextFile(activeProject.id, "csv", payload, fileName);

      setTransferFeedback({
        type: "success",
        message: `Exported ${registryRows.length} term registry row(s) as CSV.`,
      });
      return true;
    },
    [
      activeProject,
      downloadTextFile,
      nodes,
      ordering.sequenceByNodeId,
      termRegistry,
    ]
  );

  const handleTransferModalClpImport = useCallback(
    ({ rows, columnMapping, importMode }: ClpImportSubmission) => {
      const termValueColumn = columnMapping.termValue;

      if (!termValueColumn) {
        setTransferFeedback({
          type: "error",
          message: "Map a Term Value column before importing.",
        });
        return;
      }

      const toImportText = (rawValue: unknown): string => {
        if (rawValue === null || rawValue === undefined) {
          return "";
        }

        if (typeof rawValue === "string") {
          return rawValue;
        }

        if (typeof rawValue === "number" || typeof rawValue === "boolean") {
          return String(rawValue);
        }

        try {
          return JSON.stringify(rawValue);
        } catch {
          return String(rawValue);
        }
      };

      const isReplaceMode = importMode === "replace";
      const registrySeedEntries = isReplaceMode ? [] : termRegistry;

      const existingTermValueSet = new Set(
        registrySeedEntries
          .map((entry) => entry.value.trim().toLowerCase())
          .filter((value) => value.length > 0)
      );

      const existingFriendlyIds = registrySeedEntries
        .map((entry) => (typeof entry.friendlyId === "string" ? entry.friendlyId.trim() : ""))
        .filter((friendlyId) => friendlyId.length > 0);
      const existingFriendlyIdSet = new Set(existingFriendlyIds);

      const hasDotTermPattern = existingFriendlyIds.some((friendlyId) =>
        friendlyId.startsWith("term.")
      );
      const hasHyphenTermPattern = existingFriendlyIds.some((friendlyId) =>
        friendlyId.startsWith("term-")
      );
      const hasUnderscoreTermPattern = existingFriendlyIds.some((friendlyId) =>
        friendlyId.startsWith("term_")
      );

      const keyPrefix = hasDotTermPattern
        ? "term."
        : hasHyphenTermPattern
          ? "term-"
          : hasUnderscoreTermPattern
            ? "term_"
            : "term.";
      const keyDelimiter = keyPrefix.endsWith(".")
        ? "."
        : keyPrefix.endsWith("-")
          ? "-"
          : "_";

      const createAutoFriendlyId = (termValue: string): string => {
        const normalizedSlug = termValue
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/_+/g, "_")
          .replace(/^_+|_+$/g, "");

        const baseFriendlyId = `${keyPrefix}${normalizedSlug || "value"}`;

        if (!existingFriendlyIdSet.has(baseFriendlyId)) {
          existingFriendlyIdSet.add(baseFriendlyId);
          return baseFriendlyId;
        }

        let suffix = 2;
        let nextFriendlyId = `${baseFriendlyId}${keyDelimiter}${suffix}`;

        while (existingFriendlyIdSet.has(nextFriendlyId)) {
          suffix += 1;
          nextFriendlyId = `${baseFriendlyId}${keyDelimiter}${suffix}`;
        }

        existingFriendlyIdSet.add(nextFriendlyId);
        return nextFriendlyId;
      };

      const validUnassignedStatuses = new Set(["unassigned", "not assigned"]);

      const now = new Date().toISOString();
      const importedEntries: TermRegistryEntry[] = [];
      let skippedDuplicateCount = 0;

      rows.forEach((row) => {
        const nextTermValue = toImportText(row[termValueColumn]).trim();
        if (nextTermValue.length === 0) {
          return;
        }

        const duplicateKey = nextTermValue.toLowerCase();

        if (existingTermValueSet.has(duplicateKey)) {
          skippedDuplicateCount += 1;
          return;
        }

        existingTermValueSet.add(duplicateKey);

        const mappedReferenceKeyValue = columnMapping.referenceKey
          ? toImportText(row[columnMapping.referenceKey]).trim()
          : "";

        const mappedNodeTypeValue = columnMapping.nodeType
          ? toImportText(row[columnMapping.nodeType]).trim()
          : "";

        const mappedAssignmentStatusValue = columnMapping.assignmentStatus
          ? toImportText(row[columnMapping.assignmentStatus]).trim().toLowerCase()
          : "";

        const hasExplicitValidUnassignedStatus = validUnassignedStatuses.has(
          mappedAssignmentStatusValue
        );

        importedEntries.push({
          id: crypto.randomUUID(),
          value: nextTermValue,
          friendlyId: columnMapping.referenceKey
            ? mappedReferenceKeyValue || null
            : createAutoFriendlyId(nextTermValue),
          friendlyIdLocked: false,
          termType: mappedNodeTypeValue.length > 0 ? mappedNodeTypeValue : null,
          assignedNodeId: hasExplicitValidUnassignedStatus ? null : null,
          assignedSlotId: null,
          deduplicationSuffix: null,
          createdAt: now,
          updatedAt: now,
        });
      });

      const shouldReplaceRegistry = isReplaceMode;
      const shouldMutateRegistry = shouldReplaceRegistry
        ? termRegistry.length > 0 || importedEntries.length > 0
        : importedEntries.length > 0;

      if (shouldMutateRegistry) {
        pushToHistory();
        setTermRegistry((currentRegistry) =>
          shouldReplaceRegistry
            ? importedEntries
            : [...currentRegistry, ...importedEntries]
        );

        if (shouldReplaceRegistry) {
          clearGlossaryHighlights();
        }
      }

      setClpActiveView("registry");
      closeTransferModal();

      const importedCount = importedEntries.length;
      const importedLabel = importedCount === 1 ? "term" : "terms";
      const duplicateLabel = skippedDuplicateCount === 1 ? "duplicate" : "duplicates";

      setTransferFeedback({
        type: importedCount > 0 || shouldReplaceRegistry ? "success" : "info",
        message: shouldReplaceRegistry
          ? skippedDuplicateCount > 0
            ? `Replaced registry: imported ${importedCount} ${importedLabel} (${skippedDuplicateCount} ${duplicateLabel} skipped).`
            : `Replaced registry: imported ${importedCount} ${importedLabel}.`
          : skippedDuplicateCount > 0
            ? `Imported ${importedCount} ${importedLabel} (${skippedDuplicateCount} ${duplicateLabel} skipped).`
            : importedCount > 0
              ? `Imported ${importedCount} ${importedLabel}.`
              : "No terms were imported.",
      });
    },
    [
      clearGlossaryHighlights,
      closeTransferModal,
      pushToHistory,
      termRegistry,
    ]
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
    (format: UiJourneyConversationExportFormat): boolean => {
      if (!activeProject) {
        return false;
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
      return true;
    },
    [activeProject, downloadTextFile, uiJourneyConversationSnapshot]
  );

  const exportProjectData = useCallback(
    (extension: ProjectTransferFormat): boolean => {
      if (!activeAccount || !activeProject) {
        return false;
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
          return false;
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
        return true;
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
      return true;
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

  const handleTransferModalExport = useCallback(() => {
    if (!transferModalState || transferModalState.mode !== "export") {
      return;
    }

    let didExport = false;

    switch (transferModalState.context) {
      case "project": {
        didExport = exportProjectData(transferExportFormat);
        break;
      }
      case "clp": {
        didExport = exportControlledLanguageGlossary(
          transferExportFormat,
          clpExportFieldSelection
        );
        break;
      }
      case "conversation": {
        didExport = exportUiJourneyConversation(transferExportFormat);
        break;
      }
      default: {
        const exhaustiveContext: never = transferModalState.context;
        throw new Error(`Unsupported transfer modal export context: ${String(exhaustiveContext)}`);
      }
    }

    if (didExport) {
      setTransferModalState(null);
    }
  }, [
    clpExportFieldSelection,
    exportControlledLanguageGlossary,
    exportProjectData,
    exportUiJourneyConversation,
    transferExportFormat,
    transferModalState,
  ]);

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
              const hasImportedContentConfigJson =
                (row.content_config_json ?? "").trim().length > 0;
              const importedContentConfigRaw = hasImportedContentConfigJson
                ? safeJsonParse(row.content_config_json ?? "")
                : null;
              const importedFrameConfigRaw = safeJsonParse(row.frame_config_json ?? "");
              
              const importedContentConfig: NodeContentConfig = hasImportedContentConfigJson
                ? (importedContentConfigRaw as NodeContentConfig)
                : migrateDefaultToContentConfig({
                    title: row.title ?? "",
                    body_text: row.body_text ?? "",
                    primary_cta: row.primary_cta ?? "",
                    secondary_cta: row.secondary_cta ?? "",
                    helper_text: row.helper_text ?? "",
                    error_text: row.error_text ?? "",
                  });
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
                  display_term_field: "primary_cta",
                  display_term_fields: ["primary_cta"],
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
                  frame_config: normalizeFrameNodeConfig(importedFrameConfigRaw),
                  content_config: importedContentConfig,
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
    if (!transferModalState) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setTransferModalState(null);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [transferModalState]);

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
                User Account Email
              </div>
              <div
                style={{
                  fontSize: 12,
                  lineHeight: 1,
                  fontWeight: 700,
                  color: "#1e293b",
                }}
              >
               {authenticatedUserEmail ?? "No email"}
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
            <button
              type="button"
              style={TRANSFER_PAIR_BUTTON_STYLE}
              onClick={() => openTransferModal("export", "project")}
            >
              Export Project
            </button>
            <button
              type="button"
              style={TRANSFER_PAIR_BUTTON_STYLE}
              onClick={triggerImportPicker}
            >
              Import Project
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
                  const sortedGroups = [...(node.data.content_config?.groups ?? [])].sort((a, b) => {
                    if (a.row !== b.row) return a.row - b.row;
                    return a.column - b.column;
                  });
                  const contentSlots = node.data.content_config?.slots ?? [];
                  const menuTermValues =
                    node.data.node_type === "vertical_multi_term"
                      ? sortedGroups.map((group) => {
                          const primarySlot = contentSlots
                            .filter((slot) => slot.groupId === group.id)
                            .sort((a, b) => a.position - b.position)[0];
                          return primarySlot?.value ?? "";
                        })
                      : [];
                  const ribbonCellValues =
                    node.data.node_type === "horizontal_multi_term"
                      ? sortedGroups.map((group) => {
                          const groupSlots = contentSlots
                            .filter((slot) => slot.groupId === group.id)
                            .sort((a, b) => a.position - b.position);
                          return {
                            label: groupSlots[0]?.value ?? "",
                            keyCommand: groupSlots[1]?.value ?? "",
                            toolTip: groupSlots[2]?.value ?? "",
                          };
                        })
                      : [];
                  const ribbonCellSummary =
                    node.data.node_type === "horizontal_multi_term"
                      ? (() => {
                          if (sortedGroups.length === 0) {
                            return "0 cells";
                          }
                          const ribbonCellSummaryValues = ribbonCellValues.map((cell) => {
                            const label = cell.label.trim();
                            if (label.length > 0) {
                              return label;
                            }
                            return cell.keyCommand.trim().length > 0 ? cell.keyCommand : "—";
                          });
                          return `${sortedGroups.length} cells: ${ribbonCellSummaryValues.join(", ")}`;
                        })()
                      : "";

                  const shouldDisableShoehornedFields =
                    node.data.node_type === "vertical_multi_term" ||
                    node.data.node_type === "horizontal_multi_term" ||
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

        <TransferModal
          state={transferModalState}
          exportFormat={transferExportFormat}
          clpExportFieldSelection={clpExportFieldSelection}
          onExportFormatChange={setTransferExportFormat}
          onClpExportFieldSelectionChange={handleClpExportFieldSelectionChange}
          onClose={closeTransferModal}
          onExport={handleTransferModalExport}
          onClpImport={handleTransferModalClpImport}
        />
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
        position: "relative",
      }}
    >
      <div
        ref={canvasContainerRef}
        onPointerMove={handleCanvasPointerMove}
        onPointerEnter={handleCanvasPointerEnter}
        onPointerLeave={handleCanvasPointerLeave}
        onPointerDown={handleCanvasPointerDown}
        onPointerUp={handleCanvasPointerUp}
        onDragOver={handleCanvasRegistryDragOver}
        onDragLeave={handleCanvasRegistryDragLeave}
        onDrop={handleCanvasRegistryDrop}
        style={{
          borderRight: "1px solid #e4e4e7",
          transition: "box-shadow 120ms ease, background-color 120ms ease",
          background: isCanvasRegistryDropActive ? "rgba(191, 219, 254, 0.18)" : undefined,
          boxShadow: isCanvasRegistryDropActive
            ? "inset 0 0 0 2px rgba(37, 99, 235, 0.42)"
            : "none",
        }}
      >
        <ReactFlow<FlowNode, FlowEdge>
          nodes={nodesWithSequence}
          elevateNodesOnSelect={false}
          edges={displayEdges}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
          colorMode="light"
          onInit={onInit}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStart={onNodeDragStart}
          onNodeDragStop={onNodeDragStop}
          onConnect={onConnect}
          onReconnect={onReconnect}
          onPaneClick={onPaneClick}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onSelectionChange={onSelectionChange}
          onMoveStart={closeAllPopups}
          onMoveEnd={closeAllPopups}
          zoomOnDoubleClick={false}
          fitView
          connectionLineStyle={EDGE_BASE_STYLE}
        >
          <Background />
          <MiniMap />
          <Controls />
        </ReactFlow>
      </div>

      <div
        style={{
          position: "absolute",
          top: "50%",
          left: `calc(100% - ${sidePanelWidth}px - 11px)`,
          transform: "translateY(-50%)",
          width: 22,
          border: "1px solid #cbd5e1",
          borderRadius: 8,
          background: "#f8fafc",
          boxShadow: "0 4px 12px rgba(15, 23, 42, 0.16)",
          zIndex: 40,
          display: "grid",
          gap: 4,
          padding: "4px 2px",
          justifyItems: "center",
          userSelect: "none",
        }}
      >
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize side panel"
          title="Drag to resize panel"
          onPointerDown={handleSidePanelResizePointerDown}
          style={{
            width: "100%",
            height: 8,
            cursor: "col-resize",
            borderRadius: 4,
            backgroundImage:
              "radial-gradient(circle, #94a3b8 1px, transparent 1px)",
            backgroundSize: "4px 4px",
            backgroundPosition: "center",
            opacity: isResizingSidePanel ? 1 : 0.85,
          }}
        />

        {[
          { key: "default", label: "D", title: "Add Default node" },
          { key: "horizontal_multi_term", label: "H", title: "Add Horizontal node" },
          { key: "vertical_multi_term", label: "V", title: "Add Vertical node" },
        ].map((item) => (
          <button
            key={`side-tab-add:${item.key}`}
            type="button"
            title={item.title}
            aria-label={item.title}
            style={{
              ...buttonStyle,
              width: 16,
              minWidth: 16,
              height: 16,
              padding: 0,
              borderRadius: 4,
              fontSize: 9,
              fontWeight: 700,
              lineHeight: 1,
              color: "#334155",
              borderColor: "#d4d4d8",
              background: "#fff",
            }}
            onPointerDown={(event) => {
              event.stopPropagation();
            }}
            onClick={() =>
              handleQuickAddFromSideTab(
                item.key as "default" | "vertical_multi_term" | "horizontal_multi_term"
              )
            }
          >
            {item.label}
          </button>
        ))}

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize side panel"
          title="Drag to resize panel"
          onPointerDown={handleSidePanelResizePointerDown}
          style={{
            width: "100%",
            height: 8,
            cursor: "col-resize",
            borderRadius: 4,
            backgroundImage:
              "radial-gradient(circle, #94a3b8 1px, transparent 1px)",
            backgroundSize: "4px 4px",
            backgroundPosition: "center",
            opacity: isResizingSidePanel ? 1 : 0.85,
          }}
        />
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
            <button
              type="button"
              style={TRANSFER_PAIR_BUTTON_STYLE}
              onClick={() => openTransferModal("export", "project")}
            >
              Export Project
            </button>
            <button
              type="button"
              style={TRANSFER_PAIR_BUTTON_STYLE}
              onClick={triggerImportPicker}
            >
              Import Project
            </button>
            <button
              type="button"
              style={{
                ...buttonStyle,
                opacity: undoStack.length === 0 ? 0.5 : 1,
                cursor: undoStack.length === 0 ? "not-allowed" : "pointer",
              }}
              onClick={undo}
            >
              Undo
            </button>
            <button
              type="button"
              style={buttonStyle}
              onClick={redo}
            >
              Redo
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

        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #e2e8f0" }}>
          <button
            type="button"
            style={{
              border: "none",
              borderRadius: 0,
              background: "transparent",
              padding: "8px 12px",
              fontSize: 13,
              cursor: "pointer",
              fontWeight: activeSidePanelTab === "edit" ? 700 : 400,
              color: activeSidePanelTab === "edit" ? "#1d4ed8" : "#64748b",
              borderBottom:
                activeSidePanelTab === "edit"
                  ? "2px solid #1d4ed8"
                  : "2px solid transparent",
            }}
            onClick={() => setActiveSidePanelTab("edit")}
          >
            Edit + Govern
          </button>
          <button
            type="button"
            style={{
              border: "none",
              borderRadius: 0,
              background: "transparent",
              padding: "8px 12px",
              fontSize: 13,
              cursor: "pointer",
              fontWeight: activeSidePanelTab === "journey" ? 700 : 400,
              color: activeSidePanelTab === "journey" ? "#1d4ed8" : "#64748b",
              borderBottom:
                activeSidePanelTab === "journey"
                  ? "2px solid #1d4ed8"
                  : "2px solid transparent",
            }}
            onClick={() => setActiveSidePanelTab("journey")}
          >
            Journey
          </button>
          <button
            type="button"
            style={{
              border: "none",
              borderRadius: 0,
              background: "transparent",
              padding: "8px 12px",
              fontSize: 13,
              cursor: "pointer",
              fontWeight: activeSidePanelTab === "admin" ? 700 : 400,
              color: activeSidePanelTab === "admin" ? "#1d4ed8" : "#64748b",
              borderBottom:
                activeSidePanelTab === "admin"
                  ? "2px solid #1d4ed8"
                  : "2px solid transparent",
            }}
            onClick={() => setActiveSidePanelTab("admin")}
          >
            Admin
          </button>
        </div>

        {activeSidePanelTab === "edit" && (
          <>

        <p style={{ marginTop: 0, marginBottom: 0, fontSize: 12, color: "#52525b" }}>
          Click a node to edit structured fields. Double-click empty canvas to add a
          Card. Keyboard shortcuts: <strong>Tab</strong> adds Card, and
          <strong> Shift+Tab</strong> adds Vertical Card at the pointer position.
          <strong> Shift+R</strong> adds Horizontal Card at the pointer position.
          <strong> Shift+F</strong> frames selected nodes. <strong>Ctrl/Cmd+C</strong>
          copies selected nodes (including frame members), and
          <strong> Ctrl/Cmd+V</strong> pastes non-destructive duplicates. All changes autosave. Use
          each field’s registry button (📋) to open the filtered CLP picker.
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

        {hasExactlyOneSelectedNode && selectedNode?.data.node_type === "vertical_multi_term" && (
          <>
            <p style={{ marginTop: 0, marginBottom: 0, fontSize: 12, color: "#1e3a8a" }}>
              Vertical Card mode: edit term rows below. These
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
                  {termRegistry.length} term row(s)
                </span>
                <button
                  type="button"
                  style={TRANSFER_PAIR_BUTTON_STYLE}
                  onClick={() => openTransferModal("export", "clp")}
                >
                  Export
                </button>
                <button
                  type="button"
                  style={TRANSFER_PAIR_BUTTON_STYLE}
                  onClick={() => openTransferModal("import", "clp")}
                >
                  Import
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
                                border: "1px solid transparent",
                                background: "transparent",
                                color: "#334155",
                                cursor: "default",
                              }}
                              value={CONTROLLED_LANGUAGE_FIELD_LABELS[row.field_type]}
                              readOnly={true}
                              aria-label="Field Type"
                            >
                            </input>
                          </td>

                          <td style={{ border: "1px solid #e2e8f0", padding: 6 }}>
                            <input
                              style={{
                                ...inputStyle,
                                fontSize: 11,
                                border: "1px solid transparent",
                                background: "transparent",
                                cursor: "default",
                              }}
                              value={row.term}
                              readOnly={true}
                              aria-label="Glossary Term"
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

                {clpRegistryFieldFilter && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      padding: "6px 8px",
                      border: "1px solid #bfdbfe",
                      borderRadius: 6,
                      background: "#f8fbff",
                    }}
                  >
                    <div style={{ fontSize: 11, color: "#1e3a8a", fontWeight: 700 }}>
                      Filtering: {inspectorRegistryPickerFieldLabel}
                    </div>
                    <button
                      type="button"
                      style={{ ...buttonStyle, fontSize: 11, padding: "2px 8px" }}
                      onClick={closeInspectorRegistryPicker}
                    >
                      Clear filter
                    </button>
                  </div>
                )}

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
                    placeholder={
                      clpRegistryFieldFilter
                        ? "Search value or friendly ID..."
                        : "Search terms or IDs..."
                    }
                    value={
                      clpRegistryFieldFilter
                        ? inspectorRegistryPickerSearchQuery
                        : registrySearchQuery
                    }
                    onChange={(event) => {
                      if (clpRegistryFieldFilter) {
                        setInspectorRegistryPickerSearchQuery(event.target.value);
                        return;
                      }

                      setRegistrySearchQuery(event.target.value);
                    }}
                  />
                  {!clpRegistryFieldFilter && (
                    <>
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
                        {TERM_REGISTRY_TERM_TYPE_OPTIONS.filter(
                          (termTypeOption) => termTypeOption.value.length > 0
                        ).map((termTypeOption) => (
                          <option
                            key={`registry-filter-type-option:${termTypeOption.value}`}
                            value={termTypeOption.value}
                          >
                            {termTypeOption.label}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                </div>

                <div
                  style={{
                    maxHeight: 400,
                    overflowY: "auto",
                    display: "grid",
                    gap: 4,
                  }}
                >
                  {clpRegistryFieldFilter ? (
                    filteredInspectorRegistryEntries.length === 0 ? (
                      <div
                        style={{
                          padding: 12,
                          fontSize: 11,
                          color: "#64748b",
                          textAlign: "center",
                        }}
                      >
                        No matching registry entries.
                      </div>
                    ) : (
                      filteredInspectorRegistryEntries.map((entry) => {
                        const isAssignedHere =
                          entry.assignedNodeId === effectiveSelectedNodeId &&
                          entry.assignedSlotId === clpRegistryFieldFilterAssignedSlotId;

                        const assignedNode = entry.assignedNodeId
                          ? nodes.find((node) => node.id === entry.assignedNodeId)
                          : null;
                        const nodeTitle = assignedNode?.data?.title;
                        const trimmedNodeTitle = typeof nodeTitle === "string" ? nodeTitle.trim() : "";
                        const assignmentStatus = entry.assignedNodeId
                          ? trimmedNodeTitle
                            ? `Assigned to: ${trimmedNodeTitle}`
                            : "Assigned"
                          : "Unassigned";

                        return (
                          <button
                            key={`clp-filtered-registry-entry:${entry.id}`}
                            type="button"
                            draggable
                            onDragStart={(event) => handleRegistryEntryDragStart(event, entry)}
                            onDrag={handleRegistryEntryDrag}
                            onDragEnd={handleRegistryEntryDragEnd}
                            style={{
                              ...buttonStyle,
                              textAlign: "left",
                              justifyContent: "flex-start",
                              flexDirection: "column",
                              alignItems: "flex-start",
                              gap: 2,
                              borderColor: isAssignedHere ? "#93c5fd" : "#d4d4d8",
                              background: isAssignedHere ? "#dbeafe" : "#fff",
                              padding: "6px 8px",
                            }}
                            onClick={() =>
                              assignRegistryEntryToInspectorField(clpRegistryFieldFilter, entry)
                            }
                          >
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>
                              {entry.value}
                            </div>
                            <div style={{ fontSize: 10, color: "#64748b" }}>
                              Key: {entry.friendlyId || "No key"}
                            </div>
                            <div style={{ fontSize: 10, color: "#64748b" }}>
                              {assignmentStatus}
                            </div>
                          </button>
                        );
                      })
                    )
                  ) : (
                    <>
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
                      const assignedNode = entry.assignedNodeId
                        ? nodes.find((node) => node.id === entry.assignedNodeId)
                        : null;
                      const nodeTitle = assignedNode?.data?.title;
                      const trimmedNodeTitle = typeof nodeTitle === "string" ? nodeTitle.trim() : "";
                      const assignmentStatus = entry.assignedNodeId
                        ? trimmedNodeTitle
                          ? `Assigned to: ${trimmedNodeTitle}`
                          : "Assigned"
                        : "Unassigned";
                      const hasFriendlyId = (entry.friendlyId ?? "").trim().length > 0;
                      const showEditableFriendlyId = !entry.friendlyIdLocked || !hasFriendlyId;

                      return (
                      <div
                        key={`registry-entry:${entry.id}`}
                        draggable
                        onDragStart={(event) => handleRegistryEntryDragStart(event, entry)}
                        onDrag={handleRegistryEntryDrag}
                        onDragEnd={handleRegistryEntryDragEnd}
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
                          <input
                            key={`registry-value:${entry.id}:${entry.value}`}
                            style={{
                              ...inputStyle,
                              fontSize: 12,
                              fontWeight: 700,
                              border: "1px solid #d4d4d8",
                              padding: "2px 6px",
                              minHeight: 24,
                            }}
                            defaultValue={entry.value}
                            title={entry.value}
                            onBlur={(event) => {
                              const didSave = commitRegistryEntryValue(
                                entry.id,
                                event.currentTarget.value
                              );

                              if (!didSave) {
                                event.currentTarget.value = entry.value;
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

                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "auto 1fr auto",
                              gap: 4,
                              alignItems: "center",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 10,
                                color: "#64748b",
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                              }}
                            >
                              Key:
                            </div>

                            {showEditableFriendlyId ? (
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
                                  background: "#fff",
                                  color: "#334155",
                                }}
                                defaultValue={entry.friendlyId ?? ""}
                                placeholder="Add ID..."
                                readOnly={false}
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
                            ) : (
                              <div
                                style={{
                                  fontSize: 10,
                                  color: "#64748b",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                                title={entry.friendlyId ?? ""}
                              >
                                {entry.friendlyId}
                              </div>
                            )}

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

                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr auto",
                              gap: 4,
                              alignItems: "center",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 10,
                                color: "#64748b",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                              title={assignmentStatus}
                            >
                              {assignmentStatus}
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

                        </div>
                      </div>
                      );
                    })
                  )}
                    </>
                  )}
                </div>
              </div>
            )}
          </section>

          </section>

          </>
        )}

        {activeSidePanelTab === "journey" && (
          <>
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
              </div>

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
            </section>
          </>
        )}

        {activeSidePanelTab === "admin" && (
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
            <div
              style={{
                borderTop: "2px solid #cbd5e1",
                marginTop: 4,
                marginBottom: 4,
                paddingTop: 8,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                }}
              >
                NODE IDENTITY
              </div>
            </div>

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
                  const currentNodeType = selectedNode.data.node_type;
                  const isEnabled =
                    isActive ||
                    ((currentNodeType === "vertical_multi_term" || currentNodeType === "horizontal_multi_term") &&
                      (nodeTypeOption === "vertical_multi_term" || nodeTypeOption === "horizontal_multi_term"));

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

            <div
              style={{
                borderTop: "2px solid #cbd5e1",
                marginTop: 4,
                marginBottom: 4,
                paddingTop: 8,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                }}
              >
                NODE CONTENT
              </div>
            </div>

            {selectedNode.data.node_type === "vertical_multi_term" ? (
              <>
                <label>
                  <div style={inspectorFieldLabelStyle}>Title</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
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
                    <button
                      type="button"
                      style={getInspectorRegistryButtonStyle(
                        activeInspectorRegistryPickerField === "title"
                      )}
                      title="Open CLP registry"
                      aria-label="Open CLP registry"
                      onClick={() => toggleInspectorRegistryPickerForField("title")}
                    >
                      📋
                    </button>
                  </div>
                </label>

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
                    Field visibility
                  </div>

                  <div
                    style={{
                      borderTop: "1px solid #bfdbfe",
                      marginTop: 2,
                    }}
                  />
                </div>

                <label>
                  <div style={inspectorFieldLabelStyle}>Menu Terms</div>
                  <input
                    key={`menu-right-connections:${selectedNode.id}:${
                      selectedVerticalContentConfig?.groups.length ??
                      VMN_GROUPS_MIN
                    }`}
                    style={inputStyle}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    defaultValue={
                      selectedVerticalContentConfig?.groups.length ??
                      VMN_GROUPS_MIN
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
                      Term Input
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
                          (selectedVerticalContentConfig?.groups.length ??
                            VMN_GROUPS_MAX) >=
                          VMN_GROUPS_MAX
                            ? 0.45
                            : 1,
                        cursor:
                          (selectedVerticalContentConfig?.groups.length ??
                            VMN_GROUPS_MAX) >=
                          VMN_GROUPS_MAX
                            ? "not-allowed"
                            : "pointer",
                      }}
                      title="Add menu term"
                      aria-label="Add menu term"
                      onClick={addSelectedMenuTerm}
                      disabled={
                        (selectedVerticalContentConfig?.groups.length ??
                          VMN_GROUPS_MAX) >=
                        VMN_GROUPS_MAX
                      }
                    >
                      +
                    </button>
                  </div>

                  {[...(selectedVerticalContentConfig?.groups ?? [])]
                    .sort((groupA, groupB) =>
                      groupA.row === groupB.row
                        ? groupA.column - groupB.column
                        : groupA.row - groupB.row
                    )
                    .map((menuGroup) => {
                    const groupSlots = (selectedVerticalContentConfig?.slots ?? [])
                      .filter((slot) => slot.groupId === menuGroup.id)
                      .sort(sortContentSlotsByPosition);

                    return (
                      <div
                        key={`inspector-menu-term:${menuGroup.id}`}
                        style={{
                          border: "1px solid #bfdbfe",
                          borderRadius: 6,
                          padding: 5,
                          display: "grid",
                          gap: 5,
                          background: "#fff",
                        }}
                      >
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
                            onClick={() => deleteSelectedMenuTermById(menuGroup.id)}
                          >
                            X
                          </button>
                        </div>

                        {groupSlots.map((slot) => {
                          const slotRegistryField = buildContentSlotRegistryField(slot.id);
                          const isRegistryPickerOpen =
                            activeInspectorRegistryPickerField === slotRegistryField;
                          const normalizedTermType = normalizeContentSlotTermType(slot.termType);
                          const isLongField = normalizedTermType === "tool_tip";

                          return (
                            <label
                              key={`inspector-menu-slot:${menuGroup.id}:${slot.id}`}
                              style={{ display: "grid", gap: 4 }}
                            >
                              <div
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: "#334155",
                                }}
                              >
                                {normalizeConversationSlotTermTypeLabel(slot.termType)}
                              </div>

                              <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                                {isLongField ? (
                                  <textarea
                                    style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
                                    value={slot.value ?? ""}
                                    placeholder="Add value"
                                    onChange={(event) =>
                                      updateSelectedMenuSlotValueById(
                                        slot.id,
                                        event.target.value
                                      )
                                    }
                                    onBlur={(event) =>
                                      commitSelectedMenuSlotRegistryField(
                                        slot.id,
                                        event.currentTarget.value
                                      )
                                    }
                                  />
                                ) : (
                                  <input
                                    style={inputStyle}
                                    value={slot.value ?? ""}
                                    placeholder="Add value"
                                    onChange={(event) =>
                                      updateSelectedMenuSlotValueById(
                                        slot.id,
                                        event.target.value
                                      )
                                    }
                                    onBlur={(event) =>
                                      commitSelectedMenuSlotRegistryField(
                                        slot.id,
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
                                )}

                                <button
                                  type="button"
                                  style={getInspectorRegistryButtonStyle(isRegistryPickerOpen)}
                                  title="Open CLP registry"
                                  aria-label="Open CLP registry"
                                  onClick={() =>
                                    toggleInspectorRegistryPickerForField(slotRegistryField)
                                  }
                                >
                                  📋
                                </button>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : selectedNode.data.node_type === "frame" ? (
              <>
                <label>
                  <div style={inspectorFieldLabelStyle}>Title</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
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
                    <button
                      type="button"
                      style={getInspectorRegistryButtonStyle(
                        activeInspectorRegistryPickerField === "title"
                      )}
                      title="Open CLP registry"
                      aria-label="Open CLP registry"
                      onClick={() => toggleInspectorRegistryPickerForField("title")}
                    >
                      📋
                    </button>
                  </div>
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
                    <option value="">—</option>
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
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
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
                    <button
                      type="button"
                      style={getInspectorRegistryButtonStyle(
                        activeInspectorRegistryPickerField === "notes"
                      )}
                      title="Open CLP registry"
                      aria-label="Open CLP registry"
                      onClick={() => toggleInspectorRegistryPickerForField("notes")}
                    >
                      📋
                    </button>
                  </div>
                </label>
              </>
            ) : (
              <>
                {/* hidden for beta */}
                {false &&
                  selectedNode?.data.node_type !== "horizontal_multi_term" && (
                    <label>
                      <div style={inspectorFieldLabelStyle}>Node shape</div>
                      <select
                        style={inputStyle}
                        value={selectedNode?.data.node_shape}
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
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
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
                    <button
                      type="button"
                      style={getInspectorRegistryButtonStyle(
                        activeInspectorRegistryPickerField === "title"
                      )}
                      title="Open CLP registry"
                      aria-label="Open CLP registry"
                      onClick={() => toggleInspectorRegistryPickerForField("title")}
                    >
                      📋
                    </button>
                  </div>
                </div>

                {selectedNode.data.node_type === "horizontal_multi_term" && selectedHorizontalContentConfig && (
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
                      Horizontal Cells
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
                        Columns: {selectedHorizontalContentConfig.groups.length}
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
                          aria-label="Add column"
                          title="Add column"
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
                              selectedHorizontalContentConfig.groups.length <=
                              HMN_MIN_COLUMNS
                                ? 0.45
                                : 1,
                            cursor:
                              selectedHorizontalContentConfig.groups.length <=
                              HMN_MIN_COLUMNS
                                ? "not-allowed"
                                : "pointer",
                          }}
                          onClick={() => updateRibbonColumns(-1)}
                          disabled={
                            selectedHorizontalContentConfig.groups.length <=
                            HMN_MIN_COLUMNS
                          }
                          aria-label="Remove column"
                          title="Remove column"
                        >
                          -
                        </button>
                      </div>
                    </div>

                    <div style={{ marginTop: 2 }}>
                      {[...selectedHorizontalContentConfig.groups]
                        .sort((groupA, groupB) =>
                          groupA.row === groupB.row
                            ? groupA.column - groupB.column
                            : groupA.row - groupB.row
                        )
                        .map((group) => {
                          const groupSlots = selectedHorizontalContentConfig.slots
                            .filter((slot) => slot.groupId === group.id)
                            .sort(sortContentSlotsByPosition);

                          return (
                          <div
                            key={`inspector-ribbon-cell:${group.id}`}
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
                              Cell {group.column + 1}
                            </div>

                            <div style={{ display: "grid", gap: 6 }}>
                              {groupSlots.map((slot) => {
                                const slotRegistryField = buildContentSlotRegistryField(slot.id);
                                const isRegistryPickerOpen =
                                  activeInspectorRegistryPickerField === slotRegistryField;
                                const normalizedTermType = normalizeContentSlotTermType(slot.termType);
                                const isLongField = normalizedTermType === "tool_tip";

                                return (
                                  <label
                                    key={`inspector-ribbon-slot:${group.id}:${slot.id}`}
                                    style={{ display: "grid", gap: 4 }}
                                  >
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        gap: 8,
                                      }}
                                    >
                                      <div style={{ fontSize: 11, color: "#334155", fontWeight: 700 }}>
                                        {normalizeConversationSlotTermTypeLabel(slot.termType)}
                                      </div>
                                      <button
                                        type="button"
                                        style={getInspectorRegistryButtonStyle(isRegistryPickerOpen)}
                                        title="Open CLP registry"
                                        aria-label="Open CLP registry"
                                        onClick={() =>
                                          toggleInspectorRegistryPickerForField(slotRegistryField)
                                        }
                                      >
                                        📋
                                      </button>
                                    </div>

                                    {isLongField ? (
                                      <textarea
                                        style={{ ...inputStyle, fontSize: 11 }}
                                        value={slot.value ?? ""}
                                        placeholder="Add value"
                                        rows={2}
                                        onChange={(event) =>
                                          updateRibbonCellField(slot.id, event.target.value)
                                        }
                                        onBlur={(event) =>
                                          commitContentSlotRegistryField(
                                            slot.id,
                                            event.currentTarget.value
                                          )
                                        }
                                      />
                                    ) : (
                                      <input
                                        style={{
                                          ...inputStyle,
                                          fontSize: 11,
                                          fontFamily:
                                            normalizedTermType === "key_command"
                                              ? "monospace"
                                              : undefined,
                                        }}
                                        value={slot.value ?? ""}
                                        placeholder="Add value"
                                        onChange={(event) =>
                                          updateRibbonCellField(slot.id, event.target.value)
                                        }
                                        onBlur={(event) =>
                                          commitContentSlotRegistryField(
                                            slot.id,
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
                                    )}
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                        })}
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
                          Field visibility
                        </div>

                        <div
                          style={{
                            borderTop: "1px solid #bfdbfe",
                            marginTop: 2,
                            paddingTop: 6,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: "#475569",
                              marginBottom: 4,
                              textTransform: "uppercase",
                              letterSpacing: 0.4,
                            }}
                          >
                            Displayed term fields
                          </div>

                          {selectedNode.data.content_config.slots
                            .filter(
                              (slot) =>
                                normalizeContentSlotTermType(slot.termType) !== "title"
                            )
                            .map((slot, slotIndex) => (
                            <label
                              key={`display-term-slot:${slot.id}:${slotIndex}`}
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
                                checked={slot.visible !== false}
                                onChange={(event) =>
                                  updateSelectedContentSlotVisibility(
                                    slot.id,
                                    event.target.checked
                                  )
                                }
                              />
                              {getContentSlotInspectorLabel(slot.termType)}
                            </label>
                          ))}
                        </div>
                      </div>

                    

                      <div>
                        <div style={{ fontSize: 12, marginBottom: 4, color: "#334155" }}>
                          Body Text
                        </div>
                        <textarea
                          style={{
                            ...inputStyle,
                            width: "100%",
                            minHeight: 70,
                            resize: "vertical",
                            marginBottom: 8,
                          }}
                          value={selectedNode.data.body_text ?? ""}
                          placeholder="Add body text"
                          onChange={(event) =>
                            updateNodeFieldById(selectedNode.id, "body_text", event.target.value)
                          }
                        />
                        <div style={{ fontSize: 11, marginBottom: 4, color: "#94a3b8" }}>
                          Preview (markdown)
                        </div>
                        <div
                          style={{
                            border: "1px solid #e2e8f0",
                            borderRadius: 6,
                            background: "#f8fafc",
                            padding: 8,
                          }}
                        >
                          <BodyTextPreview value={selectedNode.data.body_text ?? ""} />
                        </div>
                      </div>

                      {CONTROLLED_LANGUAGE_NODE_FIELDS.map((fieldType) => {
                        const normalizedFieldType = normalizeContentSlotTermType(fieldType);
                        const matchingSlot = selectedNode.data.content_config.slots.find(
                          (slot) =>
                            normalizeContentSlotTermType(slot.termType) === normalizedFieldType
                        );

                        if (!matchingSlot) {
                          return null;
                        }

                        const slotRegistryField = buildContentSlotRegistryField(matchingSlot.id);

                        return (
                          <label
                            key={`controlled-language-field:${fieldType}:${matchingSlot.id}`}
                          >
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
                                style={getInspectorRegistryButtonStyle(
                                  activeInspectorRegistryPickerField === slotRegistryField
                                )}
                                title="Open CLP registry"
                                aria-label="Open CLP registry"
                                onClick={() =>
                                  toggleInspectorRegistryPickerForField(slotRegistryField)
                                }
                              >
                                📋
                              </button>
                            </div>

                            <input
                              style={inputStyle}
                              value={matchingSlot.value}
                              onChange={(event) =>
                                updateSelectedContentSlotValue(
                                  matchingSlot.id,
                                  event.target.value
                                )
                              }
                              onBlur={(event) =>
                                commitContentSlotRegistryField(
                                  matchingSlot.id,
                                  event.target.value
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
                        );
                      })}
                      
                    </>
                  )}
              </>
            )}

            <div
              style={{
                borderTop: "2px solid #cbd5e1",
                marginTop: 4,
                marginBottom: 4,
                paddingTop: 8,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                }}
              >
                TAGGING
              </div>
            </div>

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
                    <option value="">—</option>
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
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
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
                    <button
                      type="button"
                      style={getInspectorRegistryButtonStyle(
                        activeInspectorRegistryPickerField === "notes"
                      )}
                      title="Open CLP registry"
                      aria-label="Open CLP registry"
                      onClick={() => toggleInspectorRegistryPickerForField("notes")}
                    >
                      📋
                    </button>
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
      </aside>

      {registryDragPreview && isRegistryDragActive && (
        <div
          style={{
            position: "fixed",
            left: registryDragPreview.clientX + 14,
            top: registryDragPreview.clientY + 14,
            zIndex: 2200,
            pointerEvents: "none",
            maxWidth: 280,
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid rgba(148, 163, 184, 0.8)",
            background: "rgba(15, 23, 42, 0.78)",
            color: "#fff",
            fontSize: 12,
            fontWeight: 700,
            boxShadow: "0 8px 20px rgba(15, 23, 42, 0.25)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {registryDragPreview.termValue}
        </div>
      )}

      <HelpModal isOpen={isHelpModalOpen} onClose={closeHelpModal} />

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
            background: "rgba(15, 23, 42, 0.46)",
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(1040px, 96vw)",
              maxHeight: "92vh",
              overflow: "hidden",
              border: "1px solid rgba(43, 108, 176, 0.22)",
              borderRadius: 14,
              backgroundColor: "#F0F4F8",
              backgroundImage:
                "linear-gradient(rgba(43, 108, 176, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(43, 108, 176, 0.08) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
              boxShadow: "0 24px 48px rgba(15, 23, 42, 0.22)",
              display: "grid",
              gridTemplateRows: "auto minmax(0, 1fr)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                padding: "14px 16px",
                borderBottom: "1px solid rgba(43, 108, 176, 0.2)",
                background: "rgba(255, 255, 255, 0.78)",
              }}
            >
              <div style={{ display: "grid", gap: 6 }}>
                <h3 style={{ margin: 0, fontSize: 18, color: "#1A365D" }}>
                  UI Journey Conversation
                </h3>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: 0.7,
                      textTransform: "uppercase",
                      color: "#5A7FA3",
                    }}
                  >
                    Saved Path
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1A365D" }}>
                    {uiJourneyConversationPathName}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#2B6CB0",
                      border: "1px solid rgba(43, 108, 176, 0.25)",
                      background: "#ffffff",
                      borderRadius: 999,
                      padding: "2px 10px",
                    }}
                  >
                    {uiJourneyConversationSnapshot.length} step(s)
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  flexWrap: "wrap",
                  gap: 6,
                }}
              >
                <button
                  type="button"
                  style={{
                    ...TRANSFER_PAIR_BUTTON_STYLE,
                    borderColor: "rgba(43, 108, 176, 0.25)",
                    background: "#ffffff",
                    color: "#2B6CB0",
                    fontWeight: 700,
                  }}
                  onClick={() => openTransferModal("export", "conversation")}
                >
                  Export
                </button>

                <button
                  type="button"
                  style={{
                    ...TRANSFER_PAIR_BUTTON_STYLE,
                    borderColor: "rgba(43, 108, 176, 0.25)",
                    background: "#ffffff",
                    color: "#2B6CB0",
                    fontWeight: 700,
                  }}
                  onClick={() => openTransferModal("import", "conversation")}
                >
                  Import
                </button>

                <button
                  type="button"
                  style={{
                    ...buttonStyle,
                    borderColor: "#94a3b8",
                    background: "#ffffff",
                    color: "#1A365D",
                    fontWeight: 700,
                  }}
                  onClick={closeUiJourneyConversation}
                >
                  Close
                </button>
              </div>
            </div>

            {uiJourneyConversationSnapshot.length === 0 ? (
              <p style={{ margin: 0, padding: "16px", fontSize: 13, color: "#5A7FA3" }}>
                No nodes found in the current selection.
              </p>
            ) : (
              <div
                style={{
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 0,
                  maxHeight: "min(72vh, 640px)",
                  overflowY: "auto",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "stretch",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      flexShrink: 0,
                      width: 28,
                      paddingTop: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#2B6CB0",
                        marginLeft: 10,
                        flexShrink: 0,
                      }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0, paddingTop: 6 }}>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: "#5A7FA3",
                        letterSpacing: 0.6,
                        textTransform: "uppercase",
                      }}
                    >
                      Sequence Start
                    </div>
                  </div>
                </div>

                {(() => {
                  const groupedEntries: { frame: typeof uiJourneyConversationSnapshot[0] | null; entries: typeof uiJourneyConversationSnapshot }[] = [];
                  const consumedEntryIds = new Set<string>();

                  for (let i = 0; i < uiJourneyConversationSnapshot.length; i++) {
                    const entry = uiJourneyConversationSnapshot[i];
                    if (consumedEntryIds.has(entry.entryId)) continue;

                    if (entry.nodeType === "frame") {
                      const memberNodeIds = frameChildNodeIds.get(entry.nodeId) ?? [];
                      const children = uiJourneyConversationSnapshot.filter(
                        (e) => memberNodeIds.includes(e.nodeId) && e.nodeType !== "frame" && !consumedEntryIds.has(e.entryId)
                      );
                      children.forEach((c) => consumedEntryIds.add(c.entryId));
                      consumedEntryIds.add(entry.entryId);
                      groupedEntries.push({ frame: entry, entries: children });
                    } else {
                      consumedEntryIds.add(entry.entryId);
                      groupedEntries.push({ frame: null, entries: [entry] });
                    }
                  }

                  let globalEntryIndex = 0;

                  return groupedEntries.map((group, groupIndex) => {
                    if (group.frame) {
                      const frameEntry = group.frame;
                      const frameHasTitle = frameEntry.title && frameEntry.title.trim().length > 0 && frameEntry.title.trim() !== "Untitled";
                      const frameSequenceIndex = globalEntryIndex;
                      globalEntryIndex++;

                      const frameVisibleFields = frameEntry.fields.filter(
                        (field) => typeof field.value === "string" && field.value.trim().length > 0
                      );
                      const frameHasNotes = typeof frameEntry.notes === "string" && frameEntry.notes.trim().length > 0;

                      return (
                        <div key={`ui-journey-frame-group:${frameEntry.entryId}`}>
                          {/* Frame header with sequence number */}
                          <div style={{ display: "flex", gap: 16, alignItems: "stretch" }}>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: 0,
                                alignSelf: "stretch",
                                flexShrink: 0,
                                width: 28,
                                paddingTop: 0,
                              }}
                            >
                              <div
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: "50%",
                                  marginTop: 2,
                                  background: "#2B6CB0",
                                  color: "#fff",
                                  fontSize: 12,
                                  fontWeight: 700,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                }}
                              >
                                {frameSequenceIndex + 1}
                              </div>
                              <div
                                style={{
                                  width: 2,
                                  flex: 1,
                                  background: "#2B6CB0",
                                  margin: "0 auto",
                                  minHeight: 8,
                                }}
                              />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  border: "2px solid #2B6CB0",
                                  borderRadius: 12,
                                  padding: "12px 14px 8px 14px",
                                  background: "#f0f5fa",
                                  marginTop: 4,
                                  marginBottom: 4,
                                }}
                              >
                                {frameHasTitle && (
                                  <div
                                    style={{
                                      textAlign: "center",
                                      fontWeight: 700,
                                      fontSize: 14,
                                      color: "#2B6CB0",
                                      marginBottom: 4,
                                    }}
                                  >
                                    {frameEntry.title.trim()}
                                  </div>
                                )}
                                {frameVisibleFields.length > 0 && (
                                  <div style={{ textAlign: "center", fontSize: 12, color: "#5A7FA3", marginBottom: 4 }}>
                                    {frameVisibleFields.map((field) => field.value.trim()).filter(Boolean).join(" · ")}
                                  </div>
                                )}
                                {frameHasNotes && (
                                  <div style={{ textAlign: "center", fontSize: 11, color: "#5A7FA3", fontStyle: "italic", marginBottom: 4 }}>
                                    {frameEntry.notes.trim()}
                                  </div>
                                )}

                                {/* Children rendered INSIDE the frame boundary */}
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                  {group.entries.map((entry, childIndex) => {
                                    const currentIndex = globalEntryIndex;
                                    globalEntryIndex++;
                                    const isMultiTermHeader =
                                      (entry.nodeType === "horizontal_multi_term" || entry.nodeType === "vertical_multi_term") &&
                                      !entry.entryId.includes(":cell:");
                                    const isMultiTermChild = entry.entryId.includes(":cell:");
                                    const hasTitle = entry.title && entry.title.trim().length > 0 && entry.title.trim() !== "Untitled";
                                    const isOrphanEntry = !isMultiTermChild && entry.connectionMeta.isOrphan;
                                    const visibleFields = entry.fields.filter(
                                      (field) => typeof field.value === "string" && field.value.trim().length > 0
                                    );
                                    const hasBodyText = typeof entry.bodyText === "string" && entry.bodyText.trim().length > 0;
                                    const hasNotes = typeof entry.notes === "string" && entry.notes.trim().length > 0;
                                    const regularFieldLabelStyle: React.CSSProperties = {
                                      fontSize: 11, color: "#5A7FA3", fontWeight: 600, textTransform: "uppercase",
                                    };
                                    const regularFieldValueStyle: React.CSSProperties = {
                                      fontSize: 14, color: "#1A365D", fontWeight: 600,
                                    };

                                    if (isMultiTermHeader) {
                                      return (
                                        <div key={`ui-journey-conversation:${entry.entryId}`} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                                          <div
                                            style={{
                                              display: "flex",
                                              flexDirection: "column",
                                              alignItems: "center",
                                              alignSelf: "stretch",
                                              flexShrink: 0,
                                              width: 24,
                                            }}
                                          >
                                            <div
                                              style={{
                                                width: 24, height: 24, borderRadius: "50%", background: "#2B6CB0",
                                                color: "#fff", fontSize: 11, fontWeight: 700, display: "flex",
                                                alignItems: "center", justifyContent: "center", flexShrink: 0,
                                              }}
                                            >
                                              {currentIndex + 1}
                                            </div>
                                            {childIndex < group.entries.length - 1 && (
                                              <div
                                                style={{
                                                  width: 2,
                                                  flex: 1,
                                                  background: "#2B6CB0",
                                                  margin: "0 auto",
                                                  minHeight: 4,
                                                }}
                                              />
                                            )}
                                          </div>
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            <div
                                              style={{
                                                background: "#2B6CB0", borderRadius: 8, padding: "8px 14px",
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                              }}
                                            >
                                              {(hasTitle || (entry.concept && entry.concept.trim())) && (
                                                <span style={{ fontWeight: 700, fontSize: 13, color: "#ffffff", display: "inline-flex", alignItems: "baseline", gap: 6 }}>
                                                  {hasTitle && entry.title.trim()}
                                                  {hasTitle && entry.concept && entry.concept.trim() && (
                                                    <span style={{ fontSize: 11, opacity: 0.7 }}>·</span>
                                                  )}
                                                  {entry.concept && entry.concept.trim() && (
                                                    <span style={{ fontWeight: 400, fontSize: 12, opacity: 0.75 }}>
                                                      {entry.concept.trim()}
                                                    </span>
                                                  )}
                                                </span>
                                              )}
                                              {!hasTitle && visibleFields.length === 0 && (
                                                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontStyle: "italic" }}>
                                                  No title
                                                </span>
                                              )}
                                            </div>
                                            {visibleFields.length > 0 && (
                                              <div style={{ marginTop: 4, display: "grid", gap: 4 }}>
                                                {visibleFields.map((field) => (
                                                  <div key={`${entry.nodeId}:${field.id ?? field.label}`} style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 4, alignItems: "baseline" }}>
                                                    <div style={regularFieldLabelStyle}>{field.label}</div>
                                                    <div style={regularFieldValueStyle}>{field.value.trim()}</div>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    }

                                    return (
                                      <div key={`ui-journey-conversation:${entry.entryId}`} style={{ display: "flex", gap: 12, alignItems: "flex-start", ...(isMultiTermChild ? { marginLeft: 24 } : {}) }}>
                                        <div
                                          style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            alignSelf: "stretch",
                                            flexShrink: 0,
                                            width: 24,
                                          }}
                                        >
                                          <div
                                            style={{
                                              width: 24, height: 24, borderRadius: "50%", background: "#2B6CB0",
                                              color: "#fff", fontSize: 11, fontWeight: 700, display: "flex",
                                              alignItems: "center", justifyContent: "center", flexShrink: 0,
                                            }}
                                          >
                                            {currentIndex + 1}
                                          </div>
                                          {childIndex < group.entries.length - 1 && (
                                            <div
                                              style={{
                                                width: 2,
                                                flex: 1,
                                                background: "#2B6CB0",
                                                margin: "0 auto",
                                                minHeight: 4,
                                              }}
                                            />
                                          )}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                          {hasTitle && (
                                            <div style={{ fontSize: 14, fontWeight: 700, color: "#1A365D", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                                              <span>{entry.title.trim()}</span>
                                            </div>
                                          )}
                                          <section
                                            style={{
                                              border: isMultiTermChild ? "1px solid rgba(43,108,176,0.25)" : "1px solid rgba(43,108,176,0.15)",
                                              borderRadius: 10,
                                              background: isMultiTermChild ? "#f8fbff" : "#ffffff",
                                              padding: "10px 12px",
                                              width: "100%",
                                            }}
                                          >
                                            <div style={{ display: "grid", gap: 6 }}>
                                              {visibleFields.length > 0 ? (
                                                visibleFields.map((field) => (
                                                  <div key={`${entry.nodeId}:${field.id ?? field.label}`} style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 4, alignItems: "baseline" }}>
                                                    <div style={regularFieldLabelStyle}>{field.label}</div>
                                                    <div style={regularFieldValueStyle}>{field.value.trim()}</div>
                                                  </div>
                                                ))
                                              ) : !isMultiTermChild ? (
                                                <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "left", fontStyle: "italic" }}>
                                                  No copy fields provided.
                                                </div>
                                              ) : null}
                                              {hasBodyText && (
                                                <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 4, alignItems: "baseline" }}>
                                                  <div style={regularFieldLabelStyle}>Body</div>
                                                  <div style={{ ...regularFieldValueStyle, fontSize: 14, textAlign: "left", whiteSpace: "pre-wrap" }}>
                                                    {entry.bodyText.trim()}
                                                  </div>
                                                </div>
                                              )}
                                              {hasNotes && (
                                                <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 4, alignItems: "baseline" }}>
                                                  <div style={regularFieldLabelStyle}>Notes</div>
                                                  <div style={{ ...regularFieldValueStyle, fontSize: 14, textAlign: "left", whiteSpace: "pre-wrap" }}>
                                                    {entry.notes.trim()}
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          </section>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Non-frame entries (standalone)
                    return group.entries.map((entry) => {
                      const currentIndex = globalEntryIndex;
                      globalEntryIndex++;
                      const isMultiTermHeader =
                        (entry.nodeType === "horizontal_multi_term" || entry.nodeType === "vertical_multi_term") &&
                        !entry.entryId.includes(":cell:");
                      const isMultiTermChild = entry.entryId.includes(":cell:");
                      const hasTitle = entry.title && entry.title.trim().length > 0 && entry.title.trim() !== "Untitled";
                      const isOrphanEntry = entry.connectionMeta.isOrphan;
                      const visibleFields = entry.fields.filter(
                        (field) => typeof field.value === "string" && field.value.trim().length > 0
                      );
                      const hasBodyText = typeof entry.bodyText === "string" && entry.bodyText.trim().length > 0;
                      const hasNotes = typeof entry.notes === "string" && entry.notes.trim().length > 0;
                      const isLastEntry = currentIndex === uiJourneyConversationSnapshot.length - 1;
                      const regularFieldLabelStyle: React.CSSProperties = {
                        fontSize: 11, color: "#5A7FA3", fontWeight: 600, textTransform: "uppercase",
                      };
                      const regularFieldValueStyle: React.CSSProperties = {
                        fontSize: 14, color: "#1A365D", fontWeight: 600,
                      };

                      if (isMultiTermHeader) {
                        return (
                          <div key={`ui-journey-conversation:${entry.entryId}`} style={{ display: "flex", gap: 16, alignItems: "stretch" }}>
                            <div
                              style={{
                                display: "flex", flexDirection: "column", alignItems: "center",
                                gap: 0, alignSelf: "stretch", flexShrink: 0, width: 28, paddingTop: 0,
                              }}
                            >
                              <div
                                style={{
                                  width: 28, height: 28, borderRadius: "50%", marginTop: 2,
                                  background: "#2B6CB0", color: "#fff", fontSize: 12, fontWeight: 700,
                                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                                }}
                              >
                                {currentIndex + 1}
                              </div>
                              {!isLastEntry && (
                                <div style={{ width: 2, flex: 1, background: "#2B6CB0", margin: "0 auto", minHeight: 8 }} />
                              )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  background: "#2B6CB0", borderRadius: 8, padding: "8px 14px", marginTop: 4,
                                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                                }}
                              >
                                {(hasTitle || (entry.concept && entry.concept.trim())) && (
                                  <span style={{ fontWeight: 700, fontSize: 13, color: "#ffffff", display: "inline-flex", alignItems: "baseline", gap: 6 }}>
                                    {hasTitle && entry.title.trim()}
                                    {hasTitle && entry.concept && entry.concept.trim() && (
                                      <span style={{ fontSize: 11, opacity: 0.7 }}>·</span>
                                    )}
                                    {entry.concept && entry.concept.trim() && (
                                      <span style={{ fontWeight: 400, fontSize: 12, opacity: 0.75 }}>
                                        {entry.concept.trim()}
                                      </span>
                                    )}
                                  </span>
                                )}
                                {!hasTitle && visibleFields.length === 0 && (
                                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontStyle: "italic" }}>No title</span>
                                )}
                              </div>
                              {visibleFields.length > 0 && (
                                <div style={{ marginTop: 4, display: "grid", gap: 4 }}>
                                  {visibleFields.map((field) => (
                                    <div key={`${entry.nodeId}:${field.id ?? field.label}`} style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 4, alignItems: "baseline" }}>
                                      <div style={regularFieldLabelStyle}>{field.label}</div>
                                      <div style={regularFieldValueStyle}>{field.value.trim()}</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={`ui-journey-conversation:${entry.entryId}`} style={{ display: "flex", gap: 16, alignItems: "stretch" }}>
                          <div
                            style={{
                              display: "flex", flexDirection: "column", alignItems: "center",
                              gap: 0, alignSelf: "stretch", flexShrink: 0, width: 28, paddingTop: 0,
                            }}
                          >
                            <div
                              style={{
                                width: 28, height: 28, borderRadius: "50%", marginTop: 2,
                                background: "#2B6CB0", color: "#fff", fontSize: 12, fontWeight: 700,
                                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                              }}
                            >
                              {currentIndex + 1}
                            </div>
                            {!isLastEntry && (
                              <div style={{ width: 2, flex: 1, background: "#2B6CB0", margin: "0 auto", minHeight: 8 }} />
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0, ...(isMultiTermChild ? { marginLeft: 24 } : {}) }}>
                            {hasTitle && (
                              <div style={{ fontSize: 14, fontWeight: 700, color: "#1A365D", marginTop: 8, marginBottom: 4, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                <span>{entry.title.trim()}</span>
                                {isOrphanEntry && (
                                  <span style={{ fontSize: 9, fontWeight: 700, color: "#b91c1c", border: "1px solid #fecaca", borderRadius: 999, background: "#fee2e2", padding: "1px 6px", lineHeight: 1.35 }}>
                                    (Orphaned)
                                  </span>
                                )}
                              </div>
                            )}
                            <section
                              style={{
                                border: isOrphanEntry ? "1px solid #fecaca" : isMultiTermChild ? "1px solid rgba(43,108,176,0.25)" : "1px solid rgba(43,108,176,0.15)",
                                borderRadius: 10,
                                background: isOrphanEntry ? "#fef2f2" : isMultiTermChild ? "#f8fbff" : "#ffffff",
                                padding: "10px 12px",
                                width: "100%",
                              }}
                            >
                              <div style={{ display: "grid", gap: 6 }}>
                                {visibleFields.length > 0 ? (
                                  visibleFields.map((field) => (
                                    <div key={`${entry.nodeId}:${field.id ?? field.label}`} style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 4, alignItems: "baseline" }}>
                                      <div style={regularFieldLabelStyle}>{field.label}</div>
                                      <div style={regularFieldValueStyle}>{field.value.trim()}</div>
                                    </div>
                                  ))
                                ) : !isMultiTermChild ? (
                                  <div style={{ fontSize: 12, color: isOrphanEntry ? "#b91c1c" : "#94a3b8", textAlign: "left", fontStyle: "italic" }}>
                                    No copy fields provided.
                                  </div>
                                ) : null}
                                {hasBodyText && (
                                  <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 4, alignItems: "baseline" }}>
                                    <div style={regularFieldLabelStyle}>Body</div>
                                    <div style={{ ...regularFieldValueStyle, fontSize: 14, textAlign: "left", whiteSpace: "pre-wrap" }}>{entry.bodyText.trim()}</div>
                                  </div>
                                )}
                                {hasNotes && (
                                  <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 4, alignItems: "baseline" }}>
                                    <div style={regularFieldLabelStyle}>Notes</div>
                                    <div style={{ ...regularFieldValueStyle, fontSize: 14, textAlign: "left", whiteSpace: "pre-wrap" }}>{entry.notes.trim()}</div>
                                  </div>
                                )}
                              </div>
                            </section>
                          </div>
                        </div>
                      );
                    });
                  });
                })()}

                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "stretch",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      flexShrink: 0,
                      width: 28,
                      paddingTop: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 1,
                        border: "2px solid #2B6CB0",
                        marginLeft: 10,
                        boxSizing: "border-box",
                        background: "transparent",
                        flexShrink: 0,
                      }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0, paddingTop: 6 }}>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: "#5A7FA3",
                        letterSpacing: 0.6,
                        textTransform: "uppercase",
                      }}
                    >
                      Sequence End
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <TransferModal
        state={transferModalState}
        exportFormat={transferExportFormat}
        clpExportFieldSelection={clpExportFieldSelection}
        onExportFormatChange={setTransferExportFormat}
        onClpExportFieldSelectionChange={handleClpExportFieldSelectionChange}
        onClose={closeTransferModal}
        onExport={handleTransferModalExport}
        onClpImport={handleTransferModalClpImport}
      />
    </div>
  );
}
