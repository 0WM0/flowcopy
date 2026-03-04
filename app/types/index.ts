import type { Node, Edge } from "@xyflow/react";

export type NodeShape = "rectangle" | "rounded" | "pill" | "diamond";
export type EdgeKind = "sequential" | "parallel";
export type EdgeLineStyle = "solid" | "dashed" | "dotted";
export type FrameShade = "light" | "medium" | "dark";
export type NodeType = "default" | "menu" | "frame" | "ribbon";
export type NodeControlledLanguageFieldType =
  | "primary_cta"
  | "secondary_cta"
  | "helper_text"
  | "error_text";
export type ControlledLanguageFieldType =
  | NodeControlledLanguageFieldType
  | "menu_term"
  | "key_command"
  | "tool_tip";

export type MenuNodeTerm = {
  id: string;
  term: string;
};

export type MenuNodeConfig = {
  max_right_connections: number;
  terms: MenuNodeTerm[];
};

export type FrameNodeConfig = {
  shade: FrameShade;
  member_node_ids: string[];
  width: number;
  height: number;
};

export type RibbonNodeCell = {
  id: string;
  row: number;
  column: number;
  key_command: string;
  tool_tip: string;
};

export type RibbonNodeConfig = {
  rows: number;
  columns: number;
  cells: RibbonNodeCell[];
  ribbon_style: string;
};

export type EdgeDirection = "forward" | "reversed";

export type FlowEdgeData = {
  edge_kind: EdgeKind;
  stroke_color?: string;
  line_style?: EdgeLineStyle;
  is_reversed?: boolean;
};

export type MicrocopyNodeData = {
  title: string;
  body_text: string;
  primary_cta: string;
  secondary_cta: string;
  helper_text: string;
  error_text: string;
  display_term_field: NodeControlledLanguageFieldType;
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
  frame_config: FrameNodeConfig;
  ribbon_config: RibbonNodeConfig | null;
  parallel_group_id: string | null;
  sequence_index: number | null;
  ui_journey_highlighted?: boolean;
  ui_journey_recalled?: boolean;
};

export type PersistableMicrocopyNodeData = Omit<
  MicrocopyNodeData,
  "sequence_index" | "ui_journey_highlighted" | "ui_journey_recalled"
>;

export type EditableMicrocopyField = Exclude<
  keyof PersistableMicrocopyNodeData,
  | "parallel_group_id"
  | "menu_config"
  | "frame_config"
  | "ribbon_config"
  | "node_type"
  | "display_term_field"
>;

export type GlobalOptionConfig = {
  tone: string[];
  polarity: string[];
  reversibility: string[];
  concept: string[];
  action_type_name: string[];
  action_type_color: string[];
  card_style: string[];
};

export type GlobalOptionField = keyof GlobalOptionConfig;

export type FlowNode = Node<MicrocopyNodeData, "flowcopyNode">;
export type FlowEdge = Edge<FlowEdgeData>;

export type SerializableFlowNode = {
  id: string;
  position?: FlowNode["position"];
  data?: Partial<PersistableMicrocopyNodeData>;
};

export type PersistedCanvasState = {
  nodes: SerializableFlowNode[];
  edges: FlowEdge[];
  adminOptions: GlobalOptionConfig;
  controlledLanguageGlossary: ControlledLanguageGlossaryEntry[];
  uiJourneySnapshotPresets: UiJourneySnapshotPreset[];
};

export type ControlledLanguageGlossaryEntry = {
  field_type: ControlledLanguageFieldType;
  term: string;
  include: boolean;
};

export type ControlledLanguageAuditTermEntry = {
  field_type: ControlledLanguageFieldType;
  term: string;
};

export type ControlledLanguageAuditRow = ControlledLanguageGlossaryEntry & {
  occurrences: number;
};

export type ControlledLanguageDraftRow = {
  field_type: ControlledLanguageFieldType;
  term: string;
  include: boolean;
};

export type FlowOrderingResult = {
  orderedNodeIds: string[];
  sequentialOrderedNodeIds: string[];
  sequenceByNodeId: Partial<Record<string, number>>;
  parallelGroupByNodeId: Partial<Record<string, string>>;
  hasCycle: boolean;
};

export type ParallelGroupInfo = {
  parallelGroupByNodeId: Partial<Record<string, string>>;
  componentNodeIds: string[][];
};

export type AppView = "account" | "dashboard" | "editor";
export type EditorSurfaceMode = "canvas" | "table";

export type ProjectRecord = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  canvas: PersistedCanvasState;
};

export type AccountRecord = {
  id: string;
  code: string;
  projects: ProjectRecord[];
};

export type AppStore = {
  version: 1;
  accounts: AccountRecord[];
  session: {
    activeAccountId: string | null;
    activeProjectId: string | null;
    view: AppView;
    editorMode: EditorSurfaceMode;
  };
};

export type FlatExportColumn =
  | "session_activeAccountId"
  | "session_activeProjectId"
  | "session_view"
  | "session_editorMode"
  | "account_id"
  | "account_code"
  | "project_id"
  | "project_name"
  | "project_createdAt"
  | "project_updatedAt"
  | "project_sequence_id"
  | "node_id"
  | "node_order_id"
  | "sequence_index"
  | "parallel_group_id"
  | "position_x"
  | "position_y"
  | "title"
  | "body_text"
  | "primary_cta"
  | "secondary_cta"
  | "helper_text"
  | "error_text"
  | "display_term_field"
  | "tone"
  | "polarity"
  | "reversibility"
  | "concept"
  | "notes"
  | "action_type_name"
  | "action_type_color"
  | "card_style"
  | "node_shape"
  | "node_type"
  | "menu_config_json"
  | "frame_config_json"
  | "ribbon_cells_json"
  | "project_admin_options_json"
  | "project_controlled_language_json"
  | "project_edges_json";

export type FlatExportRow = Record<FlatExportColumn, string>;

export type ParsedTabularPayload = {
  rows: Record<string, string>[];
  headers: string[];
};

export type UiJourneyConversationField = {
  id: string;
  sourceKey: string;
  label: string;
  value: string;
};

export type UiJourneyConversationConnectionMeta = {
  groupId: string | null;
  groupIndex: number | null;
  connectorIds: string[];
  connectedNodeIds: string[];
  isOrphan: boolean;
};

export type UiJourneyConversationEntry = {
  entryId: string;
  nodeInstanceId: string;
  titleFieldId: string;
  nodeId: string;
  nodeType: NodeType;
  sequence: number | null;
  title: string;
  fields: UiJourneyConversationField[];
  connectionMeta: UiJourneyConversationConnectionMeta;
  bodyText: string;
  notes: string;
};

export type UiJourneySnapshotPreset = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  nodeIds: string[];
  edgeIds: string[];
  conversation: UiJourneyConversationEntry[];
};

export type UiJourneyConversationExportFormat = "txt" | "md" | "html" | "rtf";
export type ProjectTransferFormat = "csv" | "xml" | "json";
export type DownloadTextExtension =
  | ProjectTransferFormat
  | UiJourneyConversationExportFormat;

export type FullProjectExportEnvelope = {
  format: "flowcopy.project.full";
  schemaVersion: 1;
  exportedAt: string;
  source: {
    appStoreVersion: AppStore["version"];
    accountId: string;
    accountCode: string;
    projectId: string;
  };
  payload: {
    project: ProjectRecord;
  };
};