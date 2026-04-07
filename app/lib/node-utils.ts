import type React from "react";
import type {
  FlowNode,
  FlowEdge,
  MicrocopyNodeData,
  PersistableMicrocopyNodeData,
  SerializableFlowNode,
  GlobalOptionConfig,
  NodeShape,
  NodeType,
  FrameShade,
  FrameNodeConfig,
  NodeContentConfig,
  NodeContentGroup,
  NodeContentLayout,
  NodeContentSlot,
} from "../types";
import {
  NODE_SHAPE_OPTIONS,
  DEFAULT_GLOBAL_OPTIONS,
  FRAME_NODE_MIN_WIDTH,
  FRAME_NODE_MIN_HEIGHT,
  FRAME_NODE_PADDING,
  FRAME_SHADE_STYLES,
  DIAMOND_CLIP_PATH,
  VMN_SOURCE_HANDLE_PREFIX,
  HMN_SOURCE_HANDLE_PREFIX,
  NODE_CONTENT_DEFAULT_LAYOUT,
  NODE_CONTENT_DEFAULT_ROWS,
  NODE_CONTENT_DEFAULT_COLUMNS,
  NODE_CONTENT_DEFAULT_STYLE,
  NODE_CONTENT_DEFAULT_SLOT_TYPES,
  TERM_REGISTRY_TERM_TYPE_OPTIONS,
  CONTENT_SLOT_ID_PREFIX,
  CONTENT_GROUP_ID_PREFIX,
  UI_JOURNEY_HIGHLIGHT_STROKE_COLOR,
  UI_JOURNEY_RECALLED_STROKE_COLOR,
} from "../constants";

export const isFrameShade = (value: unknown): value is FrameShade =>
  value === "light" || value === "medium" || value === "dark";

type NodeContentMigrationSource = {
  node_type?: unknown;
  title?: unknown;
  body_text?: unknown;
  primary_cta?: unknown;
  secondary_cta?: unknown;
  helper_text?: unknown;
  error_text?: unknown;
  notes?: unknown;
};

export const isNodeType = (value: unknown): value is NodeType =>
  value === "default" ||
  value === "vertical_multi_term" ||
  value === "frame" ||
  value === "horizontal_multi_term";

export const isNodeContentLayout = (value: unknown): value is NodeContentLayout =>
  value === "single" || value === "vertical" || value === "horizontal";

export const createNodeContentGroupId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `ncg-${crypto.randomUUID()}`
    : `ncg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const createNodeContentSlotId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `ncs-${crypto.randomUUID()}`
    : `ncs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const createContentSlotId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `${CONTENT_SLOT_ID_PREFIX}${crypto.randomUUID()}`
    : `${CONTENT_SLOT_ID_PREFIX}${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

export const createContentGroupId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `${CONTENT_GROUP_ID_PREFIX}${crypto.randomUUID()}`
    : `${CONTENT_GROUP_ID_PREFIX}${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const toSanitizedString = (value: unknown): string =>
  typeof value === "string" ? value : "";

const resolveCanonicalRegistryTermType = (
  requestedTermType: string,
  fallbackTermType: string
): string => {
  const findCanonicalValue = (value: string): string | null => {
    const normalized = value.trim().toLowerCase();
    if (normalized.length === 0) {
      return null;
    }

    const match = TERM_REGISTRY_TERM_TYPE_OPTIONS.find((option) => {
      const normalizedOptionValue = option.value.trim().toLowerCase();
      const normalizedOptionLabel = option.label.trim().toLowerCase();
      return (
        normalizedOptionValue === normalized || normalizedOptionLabel === normalized
      );
    });

    if (!match || match.value.trim().length === 0) {
      return null;
    }

    return match.value.trim();
  };

  return (
    findCanonicalValue(requestedTermType) ??
    findCanonicalValue(fallbackTermType) ??
    fallbackTermType.trim()
  );
};

const clampPositiveInteger = (value: unknown, fallback: number): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(1, Math.round(value));
};

export const normalizeNodeContentConfig = (
  value: unknown,
  layout: NodeContentLayout
): NodeContentConfig => {
  const source =
    value && typeof value === "object"
      ? (value as Partial<NodeContentConfig>)
      : undefined;

  const resolvedLayout =
    source?.layout === "single" ||
    source?.layout === "vertical" ||
    source?.layout === "horizontal"
      ? source.layout
      : layout;

  const sourceSlots = Array.isArray(source?.slots) ? source.slots : [];
  const sourceGroups = Array.isArray(source?.groups) ? source.groups : [];

  const usedSlotIds = new Set<string>();
  const slots: NodeContentSlot[] = sourceSlots.flatMap((slotValue) => {
    if (!slotValue || typeof slotValue !== "object") {
      return [];
    }

    const s = slotValue as Partial<NodeContentSlot>;

    let slotId =
      typeof s.id === "string" && s.id.trim().length > 0
        ? s.id.trim()
        : createContentSlotId();
    while (usedSlotIds.has(slotId)) {
      slotId = createContentSlotId();
    }
    usedSlotIds.add(slotId);

    return [
      {
        id: slotId,
        value: typeof s.value === "string" ? s.value : "",
        termType: typeof s.termType === "string" ? s.termType : null,
        groupId: typeof s.groupId === "string" ? s.groupId : null,
        position:
          typeof s.position === "number" && Number.isFinite(s.position)
            ? s.position
            : 0,
        visible: typeof s.visible === "boolean" ? s.visible : undefined,
      },
    ];
  });

  const usedGroupIds = new Set<string>();
  const groups: NodeContentGroup[] = sourceGroups.flatMap((groupValue) => {
    if (!groupValue || typeof groupValue !== "object") {
      return [];
    }

    const g = groupValue as Partial<NodeContentGroup>;

    let groupId =
      typeof g.id === "string" && g.id.trim().length > 0
        ? g.id.trim()
        : createContentGroupId();
    while (usedGroupIds.has(groupId)) {
      groupId = createContentGroupId();
    }
    usedGroupIds.add(groupId);

    return [
      {
        id: groupId,
        row: typeof g.row === "number" && Number.isFinite(g.row) ? g.row : 0,
        column:
          typeof g.column === "number" && Number.isFinite(g.column)
            ? g.column
            : 0,
      },
    ];
  });

  const rows =
    typeof source?.rows === "number" && Number.isFinite(source.rows)
      ? Math.max(1, source.rows)
      : Math.max(1, groups.length);
  const columns =
    typeof source?.columns === "number" && Number.isFinite(source.columns)
      ? Math.max(1, source.columns)
      : 1;

  return {
    layout: resolvedLayout,
    rows,
    columns,
    groups,
    slots,
    style: typeof source?.style === "string" ? source.style : "",
  };
};

const migrateMultiTermNodeContentConfig = (
  source: NodeContentMigrationSource,
  layout: Extract<NodeContentLayout, "vertical" | "horizontal">
): NodeContentConfig => {
  const values = [toSanitizedString(source.primary_cta), toSanitizedString(source.secondary_cta)]
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  const fallbackValues = values.length > 0 ? values : ["Continue"];

  const slots: NodeContentSlot[] = fallbackValues.map((value, index) => ({
    id: createContentSlotId(),
    value,
    termType: "menu_term",
    groupId: null,
    position: index,
  }));

  return normalizeNodeContentConfig({
    layout,
    rows: layout === "horizontal" ? 1 : Math.max(1, slots.length),
    columns: layout === "horizontal" ? Math.max(1, slots.length) : 1,
    groups: [],
    slots,
    style: NODE_CONTENT_DEFAULT_STYLE,
  }, layout);
};

export const migrateLegacyNodeContentConfig = (
  source: NodeContentMigrationSource
): NodeContentConfig => {
  const nodeType = isNodeType(source.node_type) ? source.node_type : "default";

  if (nodeType === "vertical_multi_term") {
    return migrateMultiTermNodeContentConfig(source, "vertical");
  }

  if (nodeType === "horizontal_multi_term") {
    return migrateMultiTermNodeContentConfig(source, "horizontal");
  }

  return migrateDefaultToContentConfig({
    title: toSanitizedString(source.title),
    body_text: toSanitizedString(source.body_text),
    primary_cta: toSanitizedString(source.primary_cta),
    secondary_cta: toSanitizedString(source.secondary_cta),
    helper_text: toSanitizedString(source.helper_text),
    error_text: toSanitizedString(source.error_text),
    notes: toSanitizedString(source.notes),
  });
};

export const normalizeAndMigrateNodeContentConfig = (
  contentConfigValue: unknown,
  source: NodeContentMigrationSource
): NodeContentConfig => {
  const nodeType = isNodeType(source.node_type) ? source.node_type : "default";
  const layout: NodeContentLayout =
    nodeType === "vertical_multi_term"
      ? "vertical"
      : nodeType === "horizontal_multi_term"
        ? "horizontal"
        : "single";

if (contentConfigValue !== undefined && contentConfigValue !== null) {
    const candidate = normalizeNodeContentConfig(contentConfigValue, layout);
    const needsGroups = layout === "vertical" || layout === "horizontal";
    if (needsGroups ? candidate.groups.length > 0 : candidate.slots.length > 0) {
      return candidate;
    }
  }
  const migrated = migrateLegacyNodeContentConfig(source);
  console.log("MIGRATION DEBUG", { nodeType: source.node_type, groups: migrated.groups.length, slots: migrated.slots.length });
  return migrated;
};

export const clampFrameDimension = (value: number, minimum: number): number => {
  if (!Number.isFinite(value)) {
    return minimum;
  }

  return Math.max(minimum, Math.round(value));
};

export const sanitizeFrameMemberNodeIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const memberNodeIds: string[] = [];

  value.forEach((rawItem) => {
    if (typeof rawItem !== "string") {
      return;
    }

    const nextId = rawItem.trim();
    if (!nextId || seen.has(nextId)) {
      return;
    }

    seen.add(nextId);
    memberNodeIds.push(nextId);
  });

  return memberNodeIds;
};

export const normalizeFrameNodeConfig = (
  value: unknown,
  fallbackMemberNodeIds: string[] = []
): FrameNodeConfig => {
  const source =
    value && typeof value === "object" ? (value as Partial<FrameNodeConfig>) : undefined;

  const memberNodeIdsFromValue = sanitizeFrameMemberNodeIds(source?.member_node_ids);
  const fallbackMembers = sanitizeFrameMemberNodeIds(fallbackMemberNodeIds);

  return {
    shade: isFrameShade(source?.shade) ? source.shade : "medium",
    member_node_ids:
      memberNodeIdsFromValue.length > 0 ? memberNodeIdsFromValue : fallbackMembers,
    width: clampFrameDimension(source?.width ?? FRAME_NODE_MIN_WIDTH, FRAME_NODE_MIN_WIDTH),
    height: clampFrameDimension(
      source?.height ?? FRAME_NODE_MIN_HEIGHT,
      FRAME_NODE_MIN_HEIGHT
    ),
  };
};

export const getFallbackNodeSize = (node: FlowNode): { width: number; height: number } => {
  if (node.data.node_type === "frame") {
    const frameConfig = normalizeFrameNodeConfig(node.data.frame_config);
    return {
      width: frameConfig.width,
      height: frameConfig.height,
    };
  }

  if (node.data.node_type === "vertical_multi_term") {
    const menuConfig = normalizeNodeContentConfig(
      node.data.content_config,
      "vertical"
    );
    return {
      width: 260,
      height: Math.max(170, 120 + Math.max(1, menuConfig.groups.length) * 56),
    };
  }

  if (node.data.node_type === "horizontal_multi_term") {
    return {
      width: 300,
      height: 120,
    };
  }

  switch (node.data.node_shape) {
    case "pill":
      return { width: 380, height: 190 };
    case "diamond":
      return { width: 460, height: 340 };
    case "rounded":
    case "rectangle":
    default:
      return { width: 260, height: 120 };
  }
};

export const getNodeVisualSize = (node: FlowNode): { width: number; height: number } => {
  const measuredNode = node as FlowNode & {
    measured?: {
      width?: number;
      height?: number;
    };
  };

  const widthCandidate =
    typeof measuredNode.width === "number"
      ? measuredNode.width
      : measuredNode.measured?.width;
  const heightCandidate =
    typeof measuredNode.height === "number"
      ? measuredNode.height
      : measuredNode.measured?.height;

  if (
    typeof widthCandidate === "number" &&
    Number.isFinite(widthCandidate) &&
    widthCandidate > 0 &&
    typeof heightCandidate === "number" &&
    Number.isFinite(heightCandidate) &&
    heightCandidate > 0
  ) {
    return {
      width: widthCandidate,
      height: heightCandidate,
    };
  }

  if (node.data.node_type === "horizontal_multi_term") {
    return getFallbackNodeSize(node);
  }

  return getFallbackNodeSize(node);
};

export const computeNodesBoundingRect = (
  nodes: FlowNode[]
):
  | {
      left: number;
      top: number;
      right: number;
      bottom: number;
      width: number;
      height: number;
    }
  | null => {
  if (nodes.length === 0) {
    return null;
  }

  let left = Number.POSITIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;

  nodes.forEach((node) => {
    const size = getNodeVisualSize(node);
    left = Math.min(left, node.position.x);
    top = Math.min(top, node.position.y);
    right = Math.max(right, node.position.x + size.width);
    bottom = Math.max(bottom, node.position.y + size.height);
  });

  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
  };
};

export const pruneFrameNodeMembership = (nodes: FlowNode[]): FlowNode[] => {
  const validMemberNodeIds = new Set(
    nodes
      .filter((node) => node.data.node_type !== "frame")
      .map((node) => node.id)
  );

  return nodes.flatMap((node) => {
    if (node.data.node_type !== "frame") {
      return [node];
    }

    const currentFrameConfig = normalizeFrameNodeConfig(node.data.frame_config);
    const nextMemberNodeIds = currentFrameConfig.member_node_ids.filter((memberNodeId) =>
      validMemberNodeIds.has(memberNodeId)
    );

    if (nextMemberNodeIds.length === 0) {
      return [];
    }

    if (nextMemberNodeIds.length === currentFrameConfig.member_node_ids.length) {
      return [node];
    }

    return [
      {
        ...node,
        data: {
          ...node.data,
          frame_config: {
            ...currentFrameConfig,
            member_node_ids: nextMemberNodeIds,
          },
        },
      },
    ];
  });
};

export const applyFrameMovementToMemberNodes = (
  previousNodes: FlowNode[],
  nextNodes: FlowNode[]
): FlowNode[] => {
  const previousNodeById = new Map(previousNodes.map((node) => [node.id, node]));
  const movementDeltas: Array<{
    memberNodeIds: string[];
    deltaX: number;
    deltaY: number;
  }> = [];

  nextNodes.forEach((node) => {
    if (node.data.node_type !== "frame") {
      return;
    }

    const previousNode = previousNodeById.get(node.id);
    if (!previousNode || previousNode.data.node_type !== "frame") {
      return;
    }

    const deltaX = node.position.x - previousNode.position.x;
    const deltaY = node.position.y - previousNode.position.y;

    if (Math.abs(deltaX) < 0.01 && Math.abs(deltaY) < 0.01) {
      return;
    }

    const frameConfig = normalizeFrameNodeConfig(node.data.frame_config);
    if (frameConfig.member_node_ids.length === 0) {
      return;
    }

    movementDeltas.push({
      memberNodeIds: frameConfig.member_node_ids,
      deltaX,
      deltaY,
    });
  });

  if (movementDeltas.length === 0) {
    return nextNodes;
  }

  return nextNodes.map((node) => {
    if (node.data.node_type === "frame" || node.selected) {
      return node;
    }

    let aggregateDeltaX = 0;
    let aggregateDeltaY = 0;

    movementDeltas.forEach((movementDelta) => {
      if (!movementDelta.memberNodeIds.includes(node.id)) {
        return;
      }

      aggregateDeltaX += movementDelta.deltaX;
      aggregateDeltaY += movementDelta.deltaY;
    });

    if (aggregateDeltaX === 0 && aggregateDeltaY === 0) {
      return node;
    }

    return {
      ...node,
      position: {
        x: node.position.x + aggregateDeltaX,
        y: node.position.y + aggregateDeltaY,
      },
    };
  });
};

export const createMenuTermId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `menu-${crypto.randomUUID()}`
    : `menu-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

export const buildMenuSourceHandleId = (termId: string): string =>
  `${VMN_SOURCE_HANDLE_PREFIX}${termId}`;

export const buildContentConfigSourceHandleIds = (
  contentConfig: NodeContentConfig
): string[] => {
  const layout = contentConfig.layout;
  const prefix =
    layout === "horizontal" ? HMN_SOURCE_HANDLE_PREFIX : VMN_SOURCE_HANDLE_PREFIX;
  const sortedGroups = [...contentConfig.groups].sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return a.column - b.column;
  });

  return sortedGroups.map((group) => `${prefix}${group.id}`);
};

export const isVmnSourceHandleId = (value: string | null | undefined): value is string =>
  typeof value === "string" && value.startsWith(VMN_SOURCE_HANDLE_PREFIX);

export const createRibbonCellId = (): string =>
  `rc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

export const migrateDefaultToContentConfig = (
  data: Partial<PersistableMicrocopyNodeData>
): NodeContentConfig => {
  const slots: NodeContentSlot[] = [];

  const fieldMap: [string, string, string][] = [
    ["title", resolveCanonicalRegistryTermType("title", "title"), data.title ?? ""],
    [
      "primary_cta",
      resolveCanonicalRegistryTermType("primary_cta", "primary_cta"),
      data.primary_cta ?? "",
    ],
    [
      "secondary_cta",
      resolveCanonicalRegistryTermType("secondary_cta", "secondary_cta"),
      data.secondary_cta ?? "",
    ],
    [
      "helper_text",
      resolveCanonicalRegistryTermType("helper_text", "helper_text"),
      data.helper_text ?? "",
    ],
    [
      "error_text",
      resolveCanonicalRegistryTermType("error_text", "error_text"),
      data.error_text ?? "",
    ],
    ["body_text", resolveCanonicalRegistryTermType("body_text", "body_text"), data.body_text ?? ""],
    ["notes", resolveCanonicalRegistryTermType("notes", "notes"), data.notes ?? ""],
  ];

  fieldMap.forEach(([fieldType, termType, value], index) => {
    slots.push({
      id: createContentSlotId(),
      value,
      termType,
      groupId: null,
      position: index,
      visible: fieldType === "primary_cta" || fieldType === "helper_text",
    });
  });

  return {
    layout: "single",
    rows: 0,
    columns: 0,
    groups: [],
    slots,
    style: "",
  };
};

export const migrateFrameToContentConfig = (title: string): NodeContentConfig => {
  return {
    layout: "single",
    rows: 0,
    columns: 0,
    groups: [],
    slots: [
      {
        id: createContentSlotId(),
        value: title ?? "",
        termType: "Title",
        groupId: null,
        position: 0,
      },
    ],
    style: "",
  };
};

export const createDefaultHmnContentConfig = (): NodeContentConfig => {
  const groupId = createContentGroupId();
  return {
    layout: "horizontal",
    rows: 1,
    columns: 1,
    groups: [{ id: groupId, row: 0, column: 0 }],
    slots: [
      { id: createContentSlotId(), value: "", termType: "cell_label", groupId, position: 0 },
      { id: createContentSlotId(), value: "", termType: "key_command", groupId, position: 1 },
      { id: createContentSlotId(), value: "", termType: "tool_tip", groupId, position: 2 },
    ],
    style: NODE_CONTENT_DEFAULT_STYLE,
  };
};

export const createDefaultVmnContentConfig = (): NodeContentConfig => {
  const groupId = createContentGroupId();
  return {
    layout: "vertical",
    rows: 1,
    columns: 1,
    groups: [{ id: groupId, row: 0, column: 0 }],
    slots: [
      { id: createContentSlotId(), value: "", termType: "menu_term", groupId, position: 0 },
    ],
    style: NODE_CONTENT_DEFAULT_STYLE,
  };
};

export const buildRibbonSourceHandleId = (cellId: string): string =>
  `${HMN_SOURCE_HANDLE_PREFIX}${cellId}`;

export const isHmnSourceHandleId = (handleId: string): boolean =>
  handleId.startsWith(HMN_SOURCE_HANDLE_PREFIX);

export const createNodeId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `node-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

export const isNodeShape = (value: unknown): value is NodeShape =>
  typeof value === "string" && NODE_SHAPE_OPTIONS.includes(value as NodeShape);

export const cloneFlowNodes = (nodes: FlowNode[]): FlowNode[] =>
  nodes.map((node) => ({
    ...node,
    position: { ...node.position },
    data: { ...node.data },
  }));

export const sanitizeSerializableFlowNodes = (value: unknown): SerializableFlowNode[] => {
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

export const cleanedOptions = (options: string[]): string[] =>
  options.map((option) => option.trim()).filter((option) => option.length > 0);

export const firstOptionOrFallback = (options: string[], fallback: string): string =>
  cleanedOptions(options)[0] ?? fallback;

export const getDefaultActionTypeName = (options: string[]): string =>
  cleanedOptions(options).find((option) => option.toLowerCase() === "navigate") ??
  firstOptionOrFallback(options, "Navigate");

export const createDefaultNodeData = (
  globalOptions: GlobalOptionConfig,
  overrides: Partial<PersistableMicrocopyNodeData> = {}
): MicrocopyNodeData => {
  const nodeType = isNodeType(overrides.node_type) ? overrides.node_type : "default";

  return {
    title: overrides.title ?? "",
    showTitle:
      nodeType === "default" || nodeType === "vertical_multi_term"
        ? false
        : typeof overrides.showTitle === "boolean"
          ? overrides.showTitle
          : true,
    body_text: overrides.body_text ?? "",
    primary_cta: overrides.primary_cta ?? "",
    secondary_cta: overrides.secondary_cta ?? "",
    helper_text: overrides.helper_text ?? "",
    error_text: overrides.error_text ?? "",
    tone: overrides.tone ?? firstOptionOrFallback(globalOptions.tone, "neutral"),
    polarity:
      overrides.polarity ?? firstOptionOrFallback(globalOptions.polarity, "neutral"),
    reversibility:
      overrides.reversibility ??
      firstOptionOrFallback(globalOptions.reversibility, "reversible"),
    concept: overrides.concept ?? "",
    notes: overrides.notes ?? "",
    action_type_name:
      overrides.action_type_name ??
      getDefaultActionTypeName(globalOptions.action_type_name),
    action_type_color:
      overrides.action_type_color ??
      firstOptionOrFallback(globalOptions.action_type_color, "#4f46e5"),
    card_style:
      overrides.card_style ?? firstOptionOrFallback(globalOptions.card_style, "default"),
    node_shape: isNodeShape(overrides.node_shape) ? overrides.node_shape : "rectangle",
    node_type: nodeType,
    frame_config: normalizeFrameNodeConfig(overrides.frame_config),
    content_config:
      (() => {
        if (
          overrides.content_config &&
          typeof overrides.content_config === "object" &&
          Array.isArray((overrides.content_config as Partial<NodeContentConfig>).slots)
        ) {
          const ccLayout: NodeContentLayout =
            nodeType === "vertical_multi_term" ? "vertical"
            : nodeType === "horizontal_multi_term" ? "horizontal"
            : "single";
          const candidate = normalizeNodeContentConfig(overrides.content_config, ccLayout);
          const needsGroups = ccLayout === "vertical" || ccLayout === "horizontal";
          if (needsGroups ? candidate.groups.length > 0 : candidate.slots.length > 0) {
            return candidate;
          }
        }
        return null;
      })() ??
      (nodeType === "horizontal_multi_term"
        ? createDefaultHmnContentConfig()
        : nodeType === "vertical_multi_term"
          ? createDefaultVmnContentConfig()
          : migrateDefaultToContentConfig({
              title: overrides.title,
              body_text: overrides.body_text,
              primary_cta: overrides.primary_cta,
              secondary_cta: overrides.secondary_cta,
              helper_text: overrides.helper_text,
              error_text: overrides.error_text,
              notes: overrides.notes,
            })),
    parallel_group_id:
      typeof overrides.parallel_group_id === "string" &&
      overrides.parallel_group_id.trim().length > 0
        ? overrides.parallel_group_id.trim()
        : null,
    sequence_index: null,
  };
};

export const normalizeNode = (
  node: SerializableFlowNode,
  globalOptions: GlobalOptionConfig
): FlowNode => {
  const sourceData =
    node.data && typeof node.data === "object"
      ? (node.data as Partial<PersistableMicrocopyNodeData>)
      : {};
  const defaultData = createDefaultNodeData(globalOptions, sourceData);

  return {
    id: node.id,
    type: "flowcopyNode",
    position: node.position ?? { x: 0, y: 0 },
    data: {
      ...defaultData,
      content_config: (() => {
        if (
          sourceData.content_config &&
          typeof sourceData.content_config === "object" &&
          Array.isArray((sourceData.content_config as Partial<NodeContentConfig>).slots)
        ) {
          const ccLayout: NodeContentLayout =
            defaultData.node_type === "vertical_multi_term"
              ? "vertical"
              : defaultData.node_type === "horizontal_multi_term"
                ? "horizontal"
                : "single";
          const candidate = normalizeNodeContentConfig(sourceData.content_config, ccLayout);
          const needsGroups = ccLayout === "vertical" || ccLayout === "horizontal";
          if (needsGroups ? candidate.groups.length > 0 : candidate.slots.length > 0) {
            return candidate;
          }
        }
        return defaultData.content_config;
      })(),
    },
  };
};

export const sanitizePersistedNodes = (
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

export const constrainNodesToFrameMembershipBounds = (nodes: FlowNode[]): FlowNode[] => {
  const frameNodes = nodes.filter((node) => node.data.node_type === "frame");
  if (frameNodes.length === 0) {
    return nodes;
  }

  const memberFramesByNodeId = new Map<string, FlowNode[]>();

  frameNodes.forEach((frameNode) => {
    const frameConfig = normalizeFrameNodeConfig(frameNode.data.frame_config);

    frameConfig.member_node_ids.forEach((memberNodeId) => {
      const existingFrames = memberFramesByNodeId.get(memberNodeId);
      if (existingFrames) {
        existingFrames.push(frameNode);
        return;
      }

      memberFramesByNodeId.set(memberNodeId, [frameNode]);
    });
  });

  if (memberFramesByNodeId.size === 0) {
    return nodes;
  }

  return nodes.map((node) => {
    if (node.data.node_type === "frame") {
      return node;
    }

    const containingFrames = memberFramesByNodeId.get(node.id);
    if (!containingFrames || containingFrames.length === 0) {
      return node;
    }

    const nodeSize = getNodeVisualSize(node);
    let nextX = node.position.x;
    let nextY = node.position.y;

    containingFrames.forEach((frameNode) => {
      const frameConfig = normalizeFrameNodeConfig(frameNode.data.frame_config);
      const minX = frameNode.position.x;
      const minY = frameNode.position.y;
      const maxX = Math.max(minX, frameNode.position.x + frameConfig.width - nodeSize.width);
      const maxY = Math.max(minY, frameNode.position.y + frameConfig.height - nodeSize.height);

      nextX = Math.min(maxX, Math.max(minX, nextX));
      nextY = Math.min(maxY, Math.max(minY, nextY));
    });

    if (nextX === node.position.x && nextY === node.position.y) {
      return node;
    }

    return {
      ...node,
      position: {
        x: nextX,
        y: nextY,
      },
    };
  });
};

export const resolveNodeHighlightColor = ({
  selected,
  uiJourneyHighlighted,
  uiJourneyRecalled,
  glossaryHighlighted,
}: {
  selected: boolean;
  uiJourneyHighlighted: boolean;
  uiJourneyRecalled: boolean;
  glossaryHighlighted?: boolean;
}): string | null => {
  if (glossaryHighlighted) {
    return "#f59e0b";
  }

  if (uiJourneyRecalled) {
    return UI_JOURNEY_RECALLED_STROKE_COLOR;
  }

  if (uiJourneyHighlighted) {
    return UI_JOURNEY_HIGHLIGHT_STROKE_COLOR;
  }

  if (selected) {
    return "#2563eb";
  }

  return null;
};

export const getNodeShapeStyle = (
  shape: NodeShape,
  selected: boolean,
  accentColor: string,
  options: {
    uiJourneyHighlighted?: boolean;
    uiJourneyRecalled?: boolean;
    glossaryHighlighted?: boolean;
  } = {}
): React.CSSProperties => {
  const resolvedAccentColor = accentColor?.trim() || "#4f46e5";
  const highlightColor = resolveNodeHighlightColor({
    selected,
    uiJourneyHighlighted: options.uiJourneyHighlighted ?? false,
    uiJourneyRecalled: options.uiJourneyRecalled ?? false,
    glossaryHighlighted: options.glossaryHighlighted ?? false,
  });

  const baseStyle: React.CSSProperties = {
    boxSizing: "border-box",
    width: 260,
    minHeight: 75,
    position: "relative",
    background: "#ffffff",
    border: `2px solid ${highlightColor ?? resolvedAccentColor}`,
    padding: 10,
    boxShadow: highlightColor
      ? `0 0 0 3px ${highlightColor}, 0 3px 10px rgba(0, 0, 0, 0.12)`
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
        boxShadow: highlightColor
          ? `0 0 0 3px ${highlightColor}`
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

export const getDiamondBorderLayerStyle = (accentColor: string): React.CSSProperties => ({
  position: "absolute",
  inset: 0,
  background: accentColor,
  clipPath: DIAMOND_CLIP_PATH,
  zIndex: 0,
  pointerEvents: "none",
});

export const getDiamondSurfaceLayerStyle = (): React.CSSProperties => ({
  position: "absolute",
  inset: 6,
  background: "#ffffff",
  clipPath: DIAMOND_CLIP_PATH,
  zIndex: 1,
  pointerEvents: "none",
});

export const getNodeContentStyle = (shape: NodeShape): React.CSSProperties => {
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

export const serializeNodesForStorage = (
  nodes: FlowNode[],
  parallelGroupByNodeId: Partial<Record<string, string>> = {}
): SerializableFlowNode[] =>
  nodes.map((node) => {
    const persistableData: PersistableMicrocopyNodeData = {
      title: node.data.title,
      showTitle: node.data.showTitle,
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
      frame_config: normalizeFrameNodeConfig(node.data.frame_config),
      content_config: node.data.content_config,
      parallel_group_id:
        parallelGroupByNodeId[node.id] ?? node.data.parallel_group_id ?? null,
    };

    return {
      id: node.id,
      position: node.position,
      data: persistableData,
    };
  });
