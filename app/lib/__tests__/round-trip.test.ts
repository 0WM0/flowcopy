// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import type {
  AppStore,
  AccountRecord,
  ControlledLanguageGlossaryEntry,
  FlowEdge,
  FlowNode,
  FullProjectExportEnvelope,
  GlobalOptionConfig,
  ProjectRecord,
  SerializableFlowNode,
  TermRegistryEntry,
} from "../../types";
import {
  DEFAULT_GLOBAL_OPTIONS,
  FULL_PROJECT_EXPORT_FORMAT,
  FULL_PROJECT_EXPORT_SCHEMA_VERSION,
  PARALLEL_SOURCE_HANDLE_ID,
  PARALLEL_TARGET_HANDLE_ID,
  SEQUENTIAL_SOURCE_HANDLE_ID,
  SEQUENTIAL_TARGET_HANDLE_ID,
} from "../../constants";
import { buildCsvFromRows, buildXmlFromRows, createFlatExportRows } from "../export";
import {
  normalizeFlatRowKeys,
  parseCsvText,
  parseProjectRecordFromJsonText,
  parseXmlText,
  safeJsonParse,
  selectFlatImportRowsForProject,
  toNumeric,
} from "../import";
import {
  buildMenuSourceHandleId,
  buildRibbonSourceHandleId,
  isNodeShape,
  isNodeType,
  normalizeAndMigrateNodeContentConfig,
  normalizeFrameNodeConfig,
  pruneFrameNodeMembership,
  sanitizePersistedNodes,
  serializeNodesForStorage,
} from "../node-utils";
import { sanitizeControlledLanguageGlossary } from "../controlled-language";
import {
  getEdgeKind,
  normalizeEdgeData,
  sanitizeEdges,
  sanitizeEdgesForStorage,
} from "../edge-utils";
import {
  cloneGlobalOptions,
  mergeAdminOptionConfigs,
  normalizeGlobalOptionConfig,
  sanitizeProjectRecord,
  syncAdminOptionsWithNodes,
} from "../store";
import { computeFlowOrdering, computeParallelGroups, computeProjectSequenceId } from "../flow-ordering";

type FlatFormat = "csv" | "xml";

type CanonicalFixture = {
  session: AppStore["session"];
  account: AccountRecord;
  project: ProjectRecord;
  nodes: FlowNode[];
  edges: FlowEdge[];
  adminOptions: GlobalOptionConfig;
  controlledLanguageGlossary: ControlledLanguageGlossaryEntry[];
  termRegistry: TermRegistryEntry[];
  ordering: ReturnType<typeof computeFlowOrdering>;
  projectSequenceId: string;
};

type EdgeContractShape = {
  id: string;
  source: string;
  target: string;
  sourceHandle: string | null;
  targetHandle: string | null;
  edge_kind: string;
  line_style: string;
  stroke_color: string;
  is_reversed: boolean;
};

type RibbonConfigContractShape = {
  rows: number;
  columns: number;
  ribbon_style: string;
  cells: Array<{
    id: string;
    row: number;
    column: number;
    label: string;
    key_command: string;
    tool_tip: string;
  }>;
};

type ProjectContractShape = {
  projectMeta: {
    id: string;
    name: string;
  };
  nodeCount: number;
  nodeTypesById: Record<string, string>;
  menuTermsByNodeId: Record<string, string[]>;
  frameMembersByNodeId: Record<string, string[]>;
  ribbonConfigByNodeId: Record<string, RibbonConfigContractShape>;
  edgeReferencesValid: boolean;
  edges: EdgeContractShape[];
  sequenceByNodeId: Record<string, number>;
  glossary: ControlledLanguageGlossaryEntry[];
  termRegistry: TermRegistryEntry[];
  adminOptions: GlobalOptionConfig;
  serializedNodes: SerializableFlowNode[];
};

const buildCanonicalFixture = (): CanonicalFixture => {
  const projectId = "PRJ-ROUNDTRIP";
  const projectName = "Round Trip Canonical";
  const createdAt = "2026-01-02T03:04:05.000Z";

  const defaultNodeId = "node-default";
  const menuNodeId = "node-menu";
  const ribbonNodeId = "node-ribbon";
  const frameNodeId = "node-frame";

  const menuTermPrimaryId = "menu-term-primary";
  const menuTermSecondaryId = "menu-term-secondary";
  const menuTermTertiaryId = "menu-term-tertiary";

  const ribbonCell00Id = "ribbon-cell-00";
  const ribbonCell01Id = "ribbon-cell-01";
  const ribbonCell02Id = "ribbon-cell-02";
  const ribbonCell10Id = "ribbon-cell-10";
  const ribbonCell11Id = "ribbon-cell-11";
  const ribbonCell12Id = "ribbon-cell-12";

  const adminOptions = normalizeGlobalOptionConfig({
    tone: [...DEFAULT_GLOBAL_OPTIONS.tone, "assertive"],
    polarity: [...DEFAULT_GLOBAL_OPTIONS.polarity],
    reversibility: [...DEFAULT_GLOBAL_OPTIONS.reversibility],
    concept: [...DEFAULT_GLOBAL_OPTIONS.concept, "Power user path"],
    action_type_name: [...DEFAULT_GLOBAL_OPTIONS.action_type_name, "Escalate"],
    action_type_color: [...DEFAULT_GLOBAL_OPTIONS.action_type_color, "#0ea5e9"],
    card_style: [...DEFAULT_GLOBAL_OPTIONS.card_style, "contrast"],
  });

  const controlledLanguageGlossary = sanitizeControlledLanguageGlossary([
    {
      field_type: "primary_cta",
      term: "Continue",
      include: true,
    },
    {
      field_type: "menu_term",
      term: "Open dashboard",
      include: true,
    },
    {
      field_type: "key_command",
      term: "Ctrl+Shift+P",
      include: true,
    },
    {
      field_type: "cell_label",
      term: "Quick Actions",
      include: true,
    },
    {
      field_type: "tool_tip",
      term: "Shows advanced shortcuts",
      include: false,
    },
  ]);

  const termRegistry: TermRegistryEntry[] = [
    {
      id: "term-reg-1",
      value: "Continue",
      friendlyId: "checkout.confirm.primary_cta",
      friendlyIdLocked: true,
      termType: "primary_cta",
      assignedNodeId: defaultNodeId,
      deduplicationSuffix: null,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "term-reg-2",
      value: "Open dashboard",
      friendlyId: "menu.open_dashboard",
      friendlyIdLocked: false,
      termType: "menu_term",
      assignedNodeId: menuNodeId,
      deduplicationSuffix: null,
      createdAt,
      updatedAt: createdAt,
    },
  ];

  const serializableNodes: SerializableFlowNode[] = [
    {
      id: defaultNodeId,
      position: { x: 120, y: 140 },
      data: {
        title: "Default Node",
        body_text: "Welcome to checkout",
        primary_cta: "Continue",
        secondary_cta: "Cancel",
        helper_text: "You can review this later",
        error_text: "We could not save your changes",
        tone: "friendly",
        polarity: "neutral",
        reversibility: "reversible",
        concept: "Entry point",
        notes: "Default notes",
        action_type_name: "Navigate",
        action_type_color: "#4f46e5",
        card_style: "default",
        node_shape: "rounded",
        node_type: "default",
        frame_config: {
          shade: "medium",
          member_node_ids: [],
          width: 260,
          height: 180,
        },
        parallel_group_id: null,
      },
    },
    {
      id: menuNodeId,
      position: { x: 420, y: 140 },
      data: {
        title: "Menu Node",
        body_text: "Choose the next path",
        primary_cta: "Open dashboard",
        secondary_cta: "Need help",
        helper_text: "Pick one of the terms",
        error_text: "Could not open menu",
        tone: "formal",
        polarity: "positive",
        reversibility: "reversible",
        concept: "Confirmation",
        notes: "Menu notes",
        action_type_name: "Submit Data",
        action_type_color: "#047857",
        card_style: "subtle",
        node_shape: "rectangle",
        node_type: "vertical_multi_term",
        content_config: {
          layout: "vertical",
          rows: 1,
          columns: 3,
          style: "",
          groups: [
            { id: menuTermPrimaryId, row: 0, column: 0 },
            { id: menuTermSecondaryId, row: 0, column: 1 },
            { id: menuTermTertiaryId, row: 0, column: 2 },
          ],
          slots: [
            {
              id: "menu-slot-primary-term",
              value: "Open dashboard",
              termType: "menu_term",
              groupId: menuTermPrimaryId,
              position: 0,
            },
            {
              id: "menu-slot-primary-key",
              value: "",
              termType: "key_command",
              groupId: menuTermPrimaryId,
              position: 1,
            },
            {
              id: "menu-slot-primary-tooltip",
              value: "",
              termType: "tool_tip",
              groupId: menuTermPrimaryId,
              position: 2,
            },
            {
              id: "menu-slot-secondary-term",
              value: "Try again",
              termType: "menu_term",
              groupId: menuTermSecondaryId,
              position: 0,
            },
            {
              id: "menu-slot-secondary-key",
              value: "",
              termType: "key_command",
              groupId: menuTermSecondaryId,
              position: 1,
            },
            {
              id: "menu-slot-secondary-tooltip",
              value: "",
              termType: "tool_tip",
              groupId: menuTermSecondaryId,
              position: 2,
            },
            {
              id: "menu-slot-tertiary-term",
              value: "Contact support",
              termType: "menu_term",
              groupId: menuTermTertiaryId,
              position: 0,
            },
            {
              id: "menu-slot-tertiary-key",
              value: "",
              termType: "key_command",
              groupId: menuTermTertiaryId,
              position: 1,
            },
            {
              id: "menu-slot-tertiary-tooltip",
              value: "",
              termType: "tool_tip",
              groupId: menuTermTertiaryId,
              position: 2,
            },
          ],
        },
        frame_config: {
          shade: "medium",
          member_node_ids: [],
          width: 260,
          height: 180,
        },
        parallel_group_id: null,
      },
    },
    {
      id: ribbonNodeId,
      position: { x: 760, y: 140 },
      data: {
        title: "Ribbon Node",
        body_text: "Ribbon body text",
        primary_cta: "Execute",
        secondary_cta: "Abort",
        helper_text: "Ribbon helper",
        error_text: "Ribbon error",
        tone: "urgent",
        polarity: "neutral",
        reversibility: "irreversible",
        concept: "Error handling",
        notes: "Ribbon notes",
        action_type_name: "Escalate",
        action_type_color: "#0ea5e9",
        card_style: "contrast",
        node_shape: "rectangle",
        node_type: "ribbon",
        content_config: {
          layout: "horizontal",
          rows: 2,
          columns: 3,
          style: "compact",
          groups: [
            { id: ribbonCell00Id, row: 0, column: 0 },
            { id: ribbonCell01Id, row: 0, column: 1 },
            { id: ribbonCell02Id, row: 0, column: 2 },
            { id: ribbonCell10Id, row: 1, column: 0 },
            { id: ribbonCell11Id, row: 1, column: 1 },
            { id: ribbonCell12Id, row: 1, column: 2 },
          ],
          slots: [
            {
              id: "ribbon-slot-00-label",
              value: "Quick Actions",
              termType: "cell_label",
              groupId: ribbonCell00Id,
              position: 0,
            },
            {
              id: "ribbon-slot-00-key",
              value: "Ctrl+Shift+P",
              termType: "key_command",
              groupId: ribbonCell00Id,
              position: 1,
            },
            {
              id: "ribbon-slot-00-tooltip",
              value: "Shows advanced shortcuts",
              termType: "tool_tip",
              groupId: ribbonCell00Id,
              position: 2,
            },
            {
              id: "ribbon-slot-01-label",
              value: "Search",
              termType: "cell_label",
              groupId: ribbonCell01Id,
              position: 0,
            },
            {
              id: "ribbon-slot-01-key",
              value: "Ctrl+K",
              termType: "key_command",
              groupId: ribbonCell01Id,
              position: 1,
            },
            {
              id: "ribbon-slot-01-tooltip",
              value: "Find command",
              termType: "tool_tip",
              groupId: ribbonCell01Id,
              position: 2,
            },
            {
              id: "ribbon-slot-02-label",
              value: "",
              termType: "cell_label",
              groupId: ribbonCell02Id,
              position: 0,
            },
            {
              id: "ribbon-slot-02-key",
              value: "",
              termType: "key_command",
              groupId: ribbonCell02Id,
              position: 1,
            },
            {
              id: "ribbon-slot-02-tooltip",
              value: "",
              termType: "tool_tip",
              groupId: ribbonCell02Id,
              position: 2,
            },
            {
              id: "ribbon-slot-10-label",
              value: "Refresh",
              termType: "cell_label",
              groupId: ribbonCell10Id,
              position: 0,
            },
            {
              id: "ribbon-slot-10-key",
              value: "F5",
              termType: "key_command",
              groupId: ribbonCell10Id,
              position: 1,
            },
            {
              id: "ribbon-slot-10-tooltip",
              value: "Reload table",
              termType: "tool_tip",
              groupId: ribbonCell10Id,
              position: 2,
            },
            {
              id: "ribbon-slot-11-label",
              value: "Export",
              termType: "cell_label",
              groupId: ribbonCell11Id,
              position: 0,
            },
            {
              id: "ribbon-slot-11-key",
              value: "Ctrl+E",
              termType: "key_command",
              groupId: ribbonCell11Id,
              position: 1,
            },
            {
              id: "ribbon-slot-11-tooltip",
              value: "Export current view",
              termType: "tool_tip",
              groupId: ribbonCell11Id,
              position: 2,
            },
            {
              id: "ribbon-slot-12-label",
              value: "Settings",
              termType: "cell_label",
              groupId: ribbonCell12Id,
              position: 0,
            },
            {
              id: "ribbon-slot-12-key",
              value: "Ctrl,",
              termType: "key_command",
              groupId: ribbonCell12Id,
              position: 1,
            },
            {
              id: "ribbon-slot-12-tooltip",
              value: "Open preferences",
              termType: "tool_tip",
              groupId: ribbonCell12Id,
              position: 2,
            },
          ],
        },
        frame_config: {
          shade: "medium",
          member_node_ids: [],
          width: 260,
          height: 180,
        },
        parallel_group_id: null,
      },
    },
    {
      id: frameNodeId,
      position: { x: 60, y: 50 },
      data: {
        title: "Frame Node",
        body_text: "",
        primary_cta: "",
        secondary_cta: "",
        helper_text: "",
        error_text: "",
        tone: "neutral",
        polarity: "neutral",
        reversibility: "reversible",
        concept: "Power user path",
        notes: "Frame notes",
        action_type_name: "Navigate",
        action_type_color: "#4f46e5",
        card_style: "default",
        node_shape: "rectangle",
        node_type: "frame",
        frame_config: {
          shade: "dark",
          member_node_ids: [defaultNodeId, menuNodeId, ribbonNodeId],
          width: 860,
          height: 420,
        },
        parallel_group_id: null,
      },
    },
  ];

  const nodes = pruneFrameNodeMembership(
    sanitizePersistedNodes(serializableNodes, adminOptions)
  );

  const edgeSeed: FlowEdge[] = [
    {
      id: "e-default-menu",
      source: defaultNodeId,
      target: menuNodeId,
      sourceHandle: SEQUENTIAL_SOURCE_HANDLE_ID,
      targetHandle: SEQUENTIAL_TARGET_HANDLE_ID,
      data: {
        edge_kind: "sequential",
        line_style: "dashed",
        stroke_color: "#1d4ed8",
      },
    },
    {
      id: "e-menu-ribbon",
      source: menuNodeId,
      target: ribbonNodeId,
      sourceHandle: buildMenuSourceHandleId(menuTermPrimaryId),
      targetHandle: SEQUENTIAL_TARGET_HANDLE_ID,
      data: {
        edge_kind: "sequential",
        line_style: "solid",
        stroke_color: "#0ea5e9",
      },
    },
    {
      id: "e-ribbon-frame",
      source: ribbonNodeId,
      target: frameNodeId,
      sourceHandle: buildRibbonSourceHandleId(ribbonCell11Id),
      targetHandle: SEQUENTIAL_TARGET_HANDLE_ID,
      data: {
        edge_kind: "sequential",
        line_style: "dotted",
        stroke_color: "#7c3aed",
        is_reversed: false,
      },
    },
    {
      id: "e-menu-frame-parallel",
      source: menuNodeId,
      target: frameNodeId,
      sourceHandle: PARALLEL_SOURCE_HANDLE_ID,
      targetHandle: PARALLEL_TARGET_HANDLE_ID,
      data: {
        edge_kind: "parallel",
        line_style: "dashed",
        stroke_color: "#64748b",
      },
    },
  ];

  const edges = sanitizeEdges(sanitizeEdgesForStorage(edgeSeed), nodes);
  const ordering = computeFlowOrdering(nodes, edges);
  const projectSequenceId = computeProjectSequenceId(
    ordering.sequentialOrderedNodeIds,
    nodes,
    edges
  );

  const parallelGroupByNodeId = computeParallelGroups(nodes, edges).parallelGroupByNodeId;

  const project = sanitizeProjectRecord({
    id: projectId,
    name: projectName,
    createdAt,
    updatedAt: createdAt,
    canvas: {
      nodes: serializeNodesForStorage(nodes, parallelGroupByNodeId),
      edges,
      adminOptions: cloneGlobalOptions(adminOptions),
      controlledLanguageGlossary,
      termRegistry,
      uiJourneySnapshotPresets: [],
    },
  });

  if (!project) {
    throw new Error("Failed to build canonical project fixture.");
  }

  const account: AccountRecord = {
    id: "acct-111",
    code: "111",
    projects: [project],
  };

  const session: AppStore["session"] = {
    activeAccountId: account.id,
    activeProjectId: project.id,
    view: "editor",
    editorMode: "canvas",
  };

  return {
    session,
    account,
    project,
    nodes,
    edges,
    adminOptions,
    controlledLanguageGlossary,
    termRegistry,
    ordering,
    projectSequenceId,
  };
};

const exportFlatPayload = (fixture: CanonicalFixture, format: FlatFormat): string => {
  const rows = createFlatExportRows({
    session: fixture.session,
    account: fixture.account,
    project: fixture.project,
    projectSequenceId: fixture.projectSequenceId,
    nodes: fixture.nodes,
    ordering: fixture.ordering,
    adminOptions: fixture.adminOptions,
    controlledLanguageGlossary: fixture.controlledLanguageGlossary,
    termRegistry: fixture.termRegistry,
    edges: fixture.edges,
  });

  return format === "csv" ? buildCsvFromRows(rows) : buildXmlFromRows(rows);
};

const importProjectFromFlatPayload = (
  format: FlatFormat,
  payload: string,
  preferredProjectId: string
): ProjectRecord => {
  const parsed = format === "csv" ? parseCsvText(payload) : parseXmlText(payload);
  const normalizedRows = parsed.rows.map(normalizeFlatRowKeys);
  const { projectId: importedProjectId, projectRows } = selectFlatImportRowsForProject({
    rows: normalizedRows,
    preferredProjectId,
  });

  if (projectRows.length === 0) {
    throw new Error("Import payload has no rows.");
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
    const nodeId = rowNodeId.length > 0 ? rowNodeId : `node-${index + 1}`;

    const x = toNumeric(row.position_x);
    const y = toNumeric(row.position_y);
    const importedNodeType = isNodeType(row.node_type) ? row.node_type : "default";
    const importedContentConfigRaw = safeJsonParse(row.content_config_json ?? "");
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
        content_config: normalizeAndMigrateNodeContentConfig(importedContentConfigRaw, {
          node_type: importedNodeType,
          title: row.title,
          body_text: row.body_text,
          primary_cta: row.primary_cta,
          secondary_cta: row.secondary_cta,
          helper_text: row.helper_text,
          error_text: row.error_text,
          notes: row.notes,
        }),
        frame_config: normalizeFrameNodeConfig(importedFrameConfigRaw),
      },
    };
  });

  const firstRow = projectRows[0];
  const parsedEdgesRaw = safeJsonParse(firstRow.project_edges_json ?? "");
  const parsedAdminOptionsRaw = safeJsonParse(firstRow.project_admin_options_json ?? "");
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
    sanitizePersistedNodes(importedNodes, normalizeGlobalOptionConfig(parsedAdminOptionsRaw))
  );

  const hydratedNodes = pruneFrameNodeMembership(
    sanitizePersistedNodes(importedNodes, nextAdminOptions)
  );
  const hydratedEdges = sanitizeEdges(sanitizeEdgesForStorage(parsedEdgesRaw), hydratedNodes);
  const parallelGroupByNodeId = computeParallelGroups(
    hydratedNodes,
    hydratedEdges
  ).parallelGroupByNodeId;

  const importedGlossary = sanitizeControlledLanguageGlossary(parsedControlledLanguageRaw);
  const importedTermRegistry = Array.isArray(parsedTermRegistryRaw)
    ? parsedTermRegistryRaw
    : [];
  const fallbackProjectName = `Imported ${importedProjectId}`;
  const createdAtFallback = "2026-01-01T00:00:00.000Z";

  const importedProject = sanitizeProjectRecord({
    id: importedProjectId,
    name: (firstRow.project_name ?? "").trim() || fallbackProjectName,
    createdAt: (firstRow.project_createdAt ?? "").trim() || createdAtFallback,
    updatedAt: (firstRow.project_updatedAt ?? "").trim() || createdAtFallback,
    canvas: {
      nodes: serializeNodesForStorage(hydratedNodes, parallelGroupByNodeId),
      edges: hydratedEdges,
      adminOptions: cloneGlobalOptions(nextAdminOptions),
      controlledLanguageGlossary: importedGlossary,
      termRegistry: importedTermRegistry,
      uiJourneySnapshotPresets: [],
    },
  });

  if (!importedProject) {
    throw new Error("Import did not produce a valid project.");
  }

  return importedProject;
};

const exportJsonPayload = (fixture: CanonicalFixture): string => {
  const envelope: FullProjectExportEnvelope = {
    format: FULL_PROJECT_EXPORT_FORMAT,
    schemaVersion: FULL_PROJECT_EXPORT_SCHEMA_VERSION,
    exportedAt: "2026-01-02T03:04:06.000Z",
    source: {
      appStoreVersion: 1,
      accountId: fixture.account.id,
      accountCode: fixture.account.code,
      projectId: fixture.project.id,
    },
    payload: {
      project: fixture.project,
    },
  };

  return JSON.stringify(envelope, null, 2);
};

const normalizeProjectForContract = (project: ProjectRecord): ProjectContractShape => {
  const adminOptions = normalizeGlobalOptionConfig(project.canvas.adminOptions);
  const hydratedNodes = pruneFrameNodeMembership(
    sanitizePersistedNodes(project.canvas.nodes, adminOptions)
  );
  const hydratedEdges = sanitizeEdges(sanitizeEdgesForStorage(project.canvas.edges), hydratedNodes);

  const parallelGroupByNodeId = computeParallelGroups(
    hydratedNodes,
    hydratedEdges
  ).parallelGroupByNodeId;

  const serializedNodes = serializeNodesForStorage(hydratedNodes, parallelGroupByNodeId)
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id));

  const ordering = computeFlowOrdering(hydratedNodes, hydratedEdges);

  const sequenceByNodeId = Object.fromEntries(
    Object.entries(ordering.sequenceByNodeId)
      .filter((entry): entry is [string, number] => typeof entry[1] === "number")
      .sort((a, b) => a[0].localeCompare(b[0]))
  );

  const nodeTypesById = Object.fromEntries(
    serializedNodes
      .map((node) => [node.id, node.data?.node_type ?? "default"] as const)
      .sort((a, b) => a[0].localeCompare(b[0]))
  );

  const menuTermsByNodeId = Object.fromEntries(
    serializedNodes
      .filter((node) => node.data?.node_type === "vertical_multi_term")
      .map((node) => {
        const contentConfig = node.data?.content_config;
        const groups = [...(contentConfig?.groups ?? [])].sort((a, b) => {
          if (a.row !== b.row) {
            return a.row - b.row;
          }
          return a.column - b.column;
        });

        const terms = groups.map((group) => {
          const slot = (contentConfig?.slots ?? []).find((candidate) => {
            return (
              candidate.groupId === group.id &&
              typeof candidate.termType === "string" &&
              candidate.termType.toLowerCase() === "menu_term"
            );
          });

          return slot?.value ?? "";
        });

        return [node.id, terms] as const;
      })
      .sort((a, b) => a[0].localeCompare(b[0]))
  );

  const frameMembersByNodeId = Object.fromEntries(
    serializedNodes
      .filter((node) => node.data?.node_type === "frame")
      .map((node) => [node.id, node.data?.frame_config?.member_node_ids ?? []] as const)
      .sort((a, b) => a[0].localeCompare(b[0]))
  );

  const ribbonConfigByNodeId = Object.fromEntries(
    serializedNodes
      .filter((node) => node.data?.node_type === "ribbon")
      .map((node) => {
        const contentConfig = node.data?.content_config;
        const groups = [...(contentConfig?.groups ?? [])].sort((a, b) => {
          if (a.row !== b.row) {
            return a.row - b.row;
          }
          return a.column - b.column;
        });
        const slots = contentConfig?.slots ?? [];

        const getSlotValue = (groupId: string, termType: string): string => {
          const slot = slots.find((candidate) => {
            return (
              candidate.groupId === groupId &&
              typeof candidate.termType === "string" &&
              candidate.termType.toLowerCase() === termType
            );
          });

          return slot?.value ?? "";
        };

        return [
          node.id,
          {
            rows: groups.reduce((maxRow, group) => Math.max(maxRow, group.row + 1), 0),
            columns: groups.reduce(
              (maxColumn, group) => Math.max(maxColumn, group.column + 1),
              0
            ),
            ribbon_style: contentConfig?.style ?? "",
            cells: groups.map((group) => ({
              id: group.id,
              row: group.row,
              column: group.column,
              label: getSlotValue(group.id, "cell_label"),
              key_command: getSlotValue(group.id, "key_command"),
              tool_tip: getSlotValue(group.id, "tool_tip"),
            })),
          },
        ] as const;
      })
      .sort((a, b) => a[0].localeCompare(b[0]))
  );

  const nodeIds = new Set(serializedNodes.map((node) => node.id));
  const edgeReferencesValid = hydratedEdges.every(
    (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
  );

  const edges = hydratedEdges
    .map((edge) => {
      const edgeKind = getEdgeKind(edge);
      const normalizedData = normalizeEdgeData(edge.data, edgeKind);

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle ?? null,
        targetHandle: edge.targetHandle ?? null,
        edge_kind: normalizedData.edge_kind,
        line_style: normalizedData.line_style ?? "solid",
        stroke_color: normalizedData.stroke_color ?? "",
        is_reversed: Boolean(normalizedData.is_reversed),
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  return {
    projectMeta: {
      id: project.id,
      name: project.name,
    },
    nodeCount: serializedNodes.length,
    nodeTypesById,
    menuTermsByNodeId,
    frameMembersByNodeId,
    ribbonConfigByNodeId,
    edgeReferencesValid,
    edges,
    sequenceByNodeId,
    glossary: sanitizeControlledLanguageGlossary(project.canvas.controlledLanguageGlossary),
    termRegistry: Array.isArray(project.canvas.termRegistry)
      ? project.canvas.termRegistry
      : [],
    adminOptions: cloneGlobalOptions(adminOptions),
    serializedNodes,
  };
};

const assertRoundTripContract = (
  expected: ProjectContractShape,
  actual: ProjectContractShape
): void => {
  expect(actual.nodeCount).toBe(expected.nodeCount);
  expect(actual.nodeTypesById).toEqual(expected.nodeTypesById);
  expect(actual.ribbonConfigByNodeId).toEqual(expected.ribbonConfigByNodeId);
  expect(actual.menuTermsByNodeId).toEqual(expected.menuTermsByNodeId);
  expect(actual.frameMembersByNodeId).toEqual(expected.frameMembersByNodeId);
  expect(actual.edgeReferencesValid).toBe(true);
  expect(actual.edges).toEqual(expected.edges);
  expect(actual.sequenceByNodeId).toEqual(expected.sequenceByNodeId);
  expect(actual.glossary).toEqual(expected.glossary);
  expect(actual).toEqual(expected);
};

describe("round-trip contract (serialization drift safety net)", () => {
  it.each(["csv", "xml", "json"] as const)(
    "preserves canonical project shape for %s export/import",
    (format) => {
      const fixture = buildCanonicalFixture();
      const expectedContractShape = normalizeProjectForContract(fixture.project);

      const importedProject =
        format === "json"
          ? parseProjectRecordFromJsonText(exportJsonPayload(fixture))
          : importProjectFromFlatPayload(
              format,
              exportFlatPayload(fixture, format),
              fixture.project.id
            );

      const actualContractShape = normalizeProjectForContract(importedProject);

      assertRoundTripContract(expectedContractShape, actualContractShape);
    }
  );
});
