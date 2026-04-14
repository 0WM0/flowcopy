import type React from "react";
import { MarkerType, type DefaultEdgeOptions } from "@xyflow/react";
import { theme } from "../lib/theme";
import type {
  FrameShade,
  EdgeKind,
  GlobalOptionField,
  GlobalOptionConfig,
  NodeContentLayout,
  EditableMicrocopyField,
  ControlledLanguageFieldType,
  NodeControlledLanguageFieldType,
  DefaultNodeDisplayFieldType,
  UiJourneyConversationExportFormat,
  DownloadTextExtension,
  FlatExportColumn,
} from "../types";

export const FLAT_EXPORT_COLUMNS = [
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
  "content_config_json",
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
  "frame_config_json",
  "project_admin_options_json",
  "project_controlled_language_json",
  "project_term_registry_json",
  "project_edges_json",
] as const satisfies readonly FlatExportColumn[];

export const APP_STORAGE_KEY = "flowcopy.store.v1";
export const LEGACY_STORAGE_KEY = "flowcopy.canvas.v2";
export const SINGLE_ACCOUNT_CODE = "000";
export const FULL_PROJECT_EXPORT_FORMAT = "flowcopy.project.full";
export const FULL_PROJECT_EXPORT_SCHEMA_VERSION = 1;

export const NODE_SHAPE_OPTIONS = [
  "rectangle",
  "rounded",
  "pill",
  "diamond",
];

export const NODE_TYPE_OPTIONS = ["default", "vertical_multi_term", "horizontal_multi_term"];
export const NODE_TYPE_LABELS: Record<(typeof NODE_TYPE_OPTIONS)[number], string> = {
  default: "Default",
  vertical_multi_term: "Vertical",
  horizontal_multi_term: "Horizontal",
};
export const UNIFIED_NODE_TYPE_OPTIONS = [
  "default",
  "vertical_multi_term",
  "horizontal_multi_term",
];
export const UNIFIED_NODE_TYPE_LABELS: Record<
  (typeof UNIFIED_NODE_TYPE_OPTIONS)[number],
  string
> = {
  default: "Default",
  vertical_multi_term: "Vertical Multi-Term",
  horizontal_multi_term: "Horizontal Multi-Term",
};
export const FRAME_SHADE_OPTIONS: FrameShade[] = ["light", "medium", "dark"];
export const FRAME_SHADE_LABELS: Record<FrameShade, string> = {
  light: "Light",
  medium: "Medium",
  dark: "Dark",
};

export const VMN_GROUPS_MIN = 1;
export const VMN_GROUPS_MAX = 12;
export const VMN_SOURCE_HANDLE_PREFIX = "menu-src-";
export const VMN_MINIMUM_TERM_ERROR_MESSAGE =
  "You must have at least 1 menu term for this note type. You can change the term if you like.";

export const FRAME_NODE_MIN_WIDTH = 260;
export const FRAME_NODE_MIN_HEIGHT = 180;
export const FRAME_NODE_PADDING = 28;

export const HMN_MAX_ROWS = 3;
export const HMN_MIN_COLUMNS = 1;
export const HMN_DEFAULT_COLUMNS = 1;
export const HMN_DEFAULT_ROWS = 1;
export const HMN_CELL_MAX_KEY_COMMAND_LENGTH = 24;
export const HMN_SOURCE_HANDLE_PREFIX = "ribbon-cell-";
export const HMN_TOP_HANDLE_ID = "ribbon-top";
export const HMN_BOTTOM_HANDLE_ID = "ribbon-bottom";

export const NODE_CONTENT_LAYOUT_OPTIONS: NodeContentLayout[] = [
  "single",
  "vertical",
  "horizontal",
];
export const NODE_CONTENT_DEFAULT_LAYOUT: NodeContentLayout = "single";
export const NODE_CONTENT_DEFAULT_ROWS = 1;
export const NODE_CONTENT_DEFAULT_COLUMNS = 1;
export const NODE_CONTENT_DEFAULT_STYLE = "";
export const NODE_CONTENT_DEFAULT_SLOT_TYPES: string[] = [
  "Title",
  "Primary CTA",
  "Secondary CTA",
  "Helper Text",
  "Error Text",
  "Body Text",
];

export const MULTI_TERM_DEFAULT_SLOT_TYPES: string[] = [
  "menu_term",
  "key_command",
  "tool_tip",
];

export const CONTENT_SLOT_ID_PREFIX = "cs-";
export const CONTENT_GROUP_ID_PREFIX = "cg-";

export const FRAME_SHADE_STYLES: Record<
  FrameShade,
  {
    border: string;
    background: string;
    tabBackground: string;
    tabText: string;
  }
> = {
  light: {
    border: theme.frame.shade0.border,
    background: theme.frame.shade0.bg,
    tabBackground: theme.frame.shade0.tabBg,
    tabText: theme.frame.shade0.tabText,
  },
  medium: {
    border: theme.frame.shade1.border,
    background: theme.frame.shade1.bg,
    tabBackground: theme.frame.shade1.tabBg,
    tabText: theme.frame.shade1.tabText,
  },
  dark: {
    border: theme.frame.shade2.border,
    background: theme.frame.shade2.bg,
    tabBackground: theme.frame.shade2.tabBg,
    tabText: theme.frame.shade2.tabText,
  },
};

export const EDGE_STROKE_COLOR = theme.edge.sequential.stroke;
export const PARALLEL_EDGE_STROKE_COLOR = theme.edge.parallel.stroke;

export const EDGE_LINE_STYLE_OPTIONS = [
  "solid",
  "dashed",
  "dotted",
] as const;

export const EDGE_LINE_STYLE_DASH: Record<
  (typeof EDGE_LINE_STYLE_OPTIONS)[number],
  string | undefined
> = {
  solid: undefined,
  dashed: "6 4",
  dotted: "2 4",
};

export const EDGE_BASE_STYLE: React.CSSProperties = {
  stroke: EDGE_STROKE_COLOR,
  strokeWidth: 2.6,
};

export const SEQUENTIAL_SOURCE_HANDLE_ID = "s-src";
export const SEQUENTIAL_TARGET_HANDLE_ID = "s-tgt";
export const PARALLEL_SOURCE_HANDLE_ID = "p-src";
export const PARALLEL_TARGET_HANDLE_ID = "p-tgt";
export const PARALLEL_ALT_SOURCE_HANDLE_ID = "p-src-top";
export const PARALLEL_ALT_TARGET_HANDLE_ID = "p-tgt-bottom";

export const SEQUENTIAL_SELECTED_STROKE_COLOR = theme.edge.sequential.selectedStroke;
export const PARALLEL_SELECTED_STROKE_COLOR = theme.edge.parallel.selectedStroke;
export const UI_JOURNEY_HIGHLIGHT_STROKE_COLOR = theme.edge.journey.highlight;
export const UI_JOURNEY_RECALLED_STROKE_COLOR = theme.edge.journey.recalled;

export const DIAMOND_CLIP_PATH = "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)";

export const DEFAULT_EDGE_OPTIONS: DefaultEdgeOptions = {
  type: "smoothstep",
  animated: true,
};

export const GLOBAL_OPTION_FIELDS: GlobalOptionField[] = [
  "tone",
  "polarity",
  "reversibility",
  "concept",
  "action_type_name",
  "action_type_color",
  "card_style",
];

export const GLOBAL_OPTION_LABELS: Record<GlobalOptionField, string> = {
  tone: "Tone",
  polarity: "Polarity",
  reversibility: "Reversibility",
  concept: "Concept",
  action_type_name: "Action Type Name",
  action_type_color: "Action Type Color",
  card_style: "Card Style",
};

export const DEFAULT_GLOBAL_OPTIONS: GlobalOptionConfig = {
  tone: ["Neutral", "Friendly", "Formal", "Urgent"],
  polarity: ["Neutral", "Positive", "Destructive"],
  reversibility: ["Reversible", "Irreversible"],
  concept: ["Entry Point", "Confirmation", "Error Handling"],
  action_type_name: ["Submit Data", "Acknowledge", "Navigate"],
  action_type_color: ["#4f46e5", "#047857", "#dc2626"],
  card_style: ["Default", "Subtle", "Warning", "Success"],
};

export const CONTROLLED_LANGUAGE_FIELDS: ControlledLanguageFieldType[] = [
  "primary_cta",
  "secondary_cta",
  "helper_text",
  "error_text",
  "menu_term",
  "key_command",
  "cell_label",
  "tool_tip",
];

export const CONTROLLED_LANGUAGE_NODE_FIELDS: NodeControlledLanguageFieldType[] = [
  "primary_cta",
  "secondary_cta",
  "helper_text",
  "error_text",
];

export const DEFAULT_NODE_DISPLAY_FIELDS: DefaultNodeDisplayFieldType[] = [
  ...CONTROLLED_LANGUAGE_NODE_FIELDS,
  "body_text",
];

export const CONTROLLED_LANGUAGE_FIELD_LABELS: Record<
  ControlledLanguageFieldType,
  string
> = {
  primary_cta: "Primary CTA",
  secondary_cta: "Secondary CTA",
  helper_text: "Helper Text",
  error_text: "Error Text",
  menu_term: "Menu Term",
  key_command: "Key Command",
  cell_label: "Cell Label",
  tool_tip: "Tool Tip",
};

export const TERM_REGISTRY_TERM_TYPE_LABELS: Record<string, string> = {
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

export const TERM_REGISTRY_TERM_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
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

export const CONTROLLED_LANGUAGE_FIELD_ORDER: Record<
  ControlledLanguageFieldType,
  number
> = {
  primary_cta: 0,
  secondary_cta: 1,
  helper_text: 2,
  error_text: 3,
  menu_term: 4,
  key_command: 5,
  cell_label: 6,
  tool_tip: 7,
};

export const CONTROLLED_LANGUAGE_MAX_VISIBLE_ROWS = 6;
export const CONTROLLED_LANGUAGE_ROW_HEIGHT_PX = 42;
export const CONTROLLED_LANGUAGE_TABLE_HEADER_HEIGHT_PX = 34;
export const CONTROLLED_LANGUAGE_TABLE_MAX_HEIGHT_PX =
  CONTROLLED_LANGUAGE_TABLE_HEADER_HEIGHT_PX +
  CONTROLLED_LANGUAGE_MAX_VISIBLE_ROWS * CONTROLLED_LANGUAGE_ROW_HEIGHT_PX;

export const UI_JOURNEY_CONVERSATION_EXPORT_FORMAT_LABELS: Record<
  UiJourneyConversationExportFormat,
  string
> = {
  txt: "TXT",
  md: "Markdown",
  html: "HTML",
  rtf: "RTF",
  csv: "CSV",
  xml: "XML",
  json: "JSON",
};

export const UI_JOURNEY_CONVERSATION_EXPORT_FORMATS: UiJourneyConversationExportFormat[] = [
  "txt",
  "md",
  "html",
  "rtf",
  "csv",
  "xml",
  "json",
];

export const DOWNLOAD_TEXT_MIME_BY_EXTENSION: Record<
  DownloadTextExtension,
  string
> = {
  csv: "text/csv;charset=utf-8",
  xml: "application/xml;charset=utf-8",
  json: "application/json;charset=utf-8",
  txt: "text/plain;charset=utf-8",
  md: "text/markdown;charset=utf-8",
  html: "text/html;charset=utf-8",
  rtf: "application/rtf;charset=utf-8",
};

export const TABLE_TEXTAREA_FIELDS = new Set<EditableMicrocopyField>([
  "body_text",
  "notes",
]);

export const TABLE_SELECT_FIELDS = new Set<EditableMicrocopyField>([
  "tone",
  "polarity",
  "reversibility",
  "concept",
  "action_type_name",
  "action_type_color",
  "card_style",
  "node_shape",
]);

export const TABLE_FIELD_LABELS: Record<EditableMicrocopyField, string> = {
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

export const TABLE_EDITABLE_FIELDS: EditableMicrocopyField[] = [
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

export const GLOBAL_OPTION_TO_NODE_FIELD: Record<
  GlobalOptionField,
  EditableMicrocopyField
> = {
  tone: "tone",
  polarity: "polarity",
  reversibility: "reversibility",
  concept: "concept",
  action_type_name: "action_type_name",
  action_type_color: "action_type_color",
  card_style: "card_style",
};

export const SIDE_PANEL_MIN_WIDTH = 420;
export const SIDE_PANEL_MAX_WIDTH = 1440;
export const SIDE_PANEL_WIDTH_STORAGE_KEY = "flowcopy.editor.panelWidths";

export const inputStyle: React.CSSProperties = {
  width: "100%",
  border: theme.table.border,
  borderRadius: 6,
  padding: "6px 8px",
  fontSize: 12,
  background: theme.primitives.white,
};

export const buttonStyle: React.CSSProperties = {
  border: theme.table.border,
  borderRadius: 6,
  background: theme.primitives.white,
  padding: "6px 10px",
  cursor: "pointer",
  fontSize: 12,
};

export const getToggleButtonStyle = (
  isActive: boolean
): React.CSSProperties => ({
  ...buttonStyle,
  borderColor: isActive ? theme.button.primary.bg : theme.primitives.blue200,
  background: isActive ? theme.primitives.blue600 : theme.primitives.blue50,
  color: isActive ? theme.primitives.white : theme.primitives.blue900,
  fontWeight: theme.button.primary.weight,
  boxShadow: isActive ? theme.button.primary.shadow : "none",
});

export const inspectorFieldLabelStyle: React.CSSProperties = {
  fontSize: 12,
  marginBottom: 4,
  fontWeight: theme.inspector.card.fieldLabelWeight,
  color: theme.inspector.card.fieldLabel,
};