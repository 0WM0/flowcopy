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
  MenuNodeConfig,
  MenuNodeTerm,
  RibbonNodeCell,
  RibbonNodeConfig,
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
  MENU_NODE_RIGHT_CONNECTIONS_MIN,
  MENU_NODE_RIGHT_CONNECTIONS_MAX,
  MENU_SOURCE_HANDLE_PREFIX,
  RIBBON_NODE_MAX_ROWS,
  RIBBON_NODE_MIN_COLUMNS,
  RIBBON_NODE_DEFAULT_COLUMNS,
  RIBBON_NODE_DEFAULT_ROWS,
  RIBBON_SOURCE_HANDLE_PREFIX,
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
  menu_config?: unknown;
  ribbon_config?: unknown;
};

export const isNodeType = (value: unknown): value is NodeType =>
  value === "default" ||
  value === "menu" ||
  value === "frame" ||
  value === "ribbon" ||
  value === "vertical_multi_term" ||
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
  const normalizedMenuConfig = normalizeMenuNodeConfig(
    source.menu_config,
    toSanitizedString(source.primary_cta) || "Continue",
    1
  );

  const slots: NodeContentSlot[] = normalizedMenuConfig.terms.map((term, index) => ({
    id: term.id,
    value: term.term,
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

  if (nodeType === "ribbon") {
    return migrateRibbonToContentConfig(source.ribbon_config, toSanitizedString(source.title));
  }

  if (nodeType === "menu" || nodeType === "vertical_multi_term") {
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
    nodeType === "menu" || nodeType === "vertical_multi_term"
      ? "vertical"
      : nodeType === "ribbon" || nodeType === "horizontal_multi_term"
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

  if (node.data.node_type === "menu") {
    const menuConfig = normalizeMenuNodeConfig(node.data.menu_config, node.data.primary_cta);
    return {
      width: 260,
      height: Math.max(170, 120 + menuConfig.terms.length * 56),
    };
  }

  if (node.data.node_type === "ribbon") {
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

  if (node.data.node_type === "ribbon") {
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

export const createMenuNodeTerm = (term: string): MenuNodeTerm => ({
  id: createMenuTermId(),
  term,
});

export const clampMenuRightConnections = (
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

export const buildMenuSourceHandleId = (termId: string): string =>
  `${MENU_SOURCE_HANDLE_PREFIX}${termId}`;

export const buildMenuSourceHandleIds = (menuConfig: MenuNodeConfig): string[] =>
  menuConfig.terms.map((term) => buildMenuSourceHandleId(term.id));

export const isMenuSourceHandleId = (value: string | null | undefined): value is string =>
  typeof value === "string" && value.startsWith(MENU_SOURCE_HANDLE_PREFIX);

export const createRibbonCellId = (): string =>
  `rc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

export const createRibbonNodeCell = (
  row: number,
  column: number
): RibbonNodeCell => ({
  id: createRibbonCellId(),
  row,
  column,
  label: "",
  key_command: "",
  tool_tip: "",
});

export const normalizeRibbonNodeConfig = (value: unknown): RibbonNodeConfig => {
  const source =
    value && typeof value === "object" ? (value as Partial<RibbonNodeConfig>) : undefined;

  const requestedRows =
    typeof source?.rows === "number" ? source.rows : RIBBON_NODE_DEFAULT_ROWS;
  const requestedColumns =
    typeof source?.columns === "number" ? source.columns : RIBBON_NODE_DEFAULT_COLUMNS;

  const rows = Number.isFinite(requestedRows)
    ? Math.min(RIBBON_NODE_MAX_ROWS, Math.max(1, Math.round(requestedRows)))
    : RIBBON_NODE_DEFAULT_ROWS;
  const columns = Number.isFinite(requestedColumns)
    ? Math.max(RIBBON_NODE_MIN_COLUMNS, Math.round(requestedColumns))
    : RIBBON_NODE_DEFAULT_COLUMNS;

  const usedCellIds = new Set<string>();
  const occupiedPositions = new Set<string>();
  const normalizedCells: RibbonNodeCell[] = [];
  const sourceCells = Array.isArray(source?.cells) ? source.cells : [];
  const sourceCellCoordinates = sourceCells.flatMap((cellValue) => {
    if (!cellValue || typeof cellValue !== "object") {
      return [];
    }

    const sourceCell = cellValue as Partial<RibbonNodeCell>;
    if (
      typeof sourceCell.row !== "number" ||
      !Number.isFinite(sourceCell.row) ||
      typeof sourceCell.column !== "number" ||
      !Number.isFinite(sourceCell.column)
    ) {
      return [];
    }

    return [
      {
        row: Math.round(sourceCell.row),
        column: Math.round(sourceCell.column),
      },
    ];
  });
  const shouldNormalizeRowsFromOneBased =
    sourceCellCoordinates.length > 0 &&
    !sourceCellCoordinates.some((coordinate) => coordinate.row === 0) &&
    sourceCellCoordinates.every(
      (coordinate) => coordinate.row >= 1 && coordinate.row <= rows
    );
  const shouldNormalizeColumnsFromOneBased =
    sourceCellCoordinates.length > 0 &&
    !sourceCellCoordinates.some((coordinate) => coordinate.column === 0) &&
    sourceCellCoordinates.every(
      (coordinate) => coordinate.column >= 1 && coordinate.column <= columns
    );

  sourceCells.forEach((cellValue) => {
    if (!cellValue || typeof cellValue !== "object") {
      return;
    }

    const sourceCell = cellValue as Partial<RibbonNodeCell>;
    const rawRow =
      typeof sourceCell.row === "number" && Number.isFinite(sourceCell.row)
        ? Math.round(sourceCell.row)
        : Number.NaN;
    const rawColumn =
      typeof sourceCell.column === "number" && Number.isFinite(sourceCell.column)
        ? Math.round(sourceCell.column)
        : Number.NaN;

    if (!Number.isFinite(rawRow) || !Number.isFinite(rawColumn)) {
      return;
    }

    const row = shouldNormalizeRowsFromOneBased ? rawRow - 1 : rawRow;
    const column = shouldNormalizeColumnsFromOneBased ? rawColumn - 1 : rawColumn;

    if (row < 0 || row >= rows || column < 0 || column >= columns) {
      return;
    }

    const positionKey = `${row}:${column}`;
    if (occupiedPositions.has(positionKey)) {
      return;
    }

    let nextCellId =
      typeof sourceCell.id === "string" && sourceCell.id.trim().length > 0
        ? sourceCell.id.trim()
        : createRibbonCellId();

    while (usedCellIds.has(nextCellId)) {
      nextCellId = createRibbonCellId();
    }

    usedCellIds.add(nextCellId);
    occupiedPositions.add(positionKey);

    normalizedCells.push({
      id: nextCellId,
      row,
      column,
      label: typeof sourceCell.label === "string" ? sourceCell.label : "",
      key_command:
        typeof sourceCell.key_command === "string" ? sourceCell.key_command : "",
      tool_tip: typeof sourceCell.tool_tip === "string" ? sourceCell.tool_tip : "",
    });
  });

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const positionKey = `${row}:${column}`;

      if (occupiedPositions.has(positionKey)) {
        continue;
      }

      let nextCell = createRibbonNodeCell(row, column);

      while (usedCellIds.has(nextCell.id)) {
        nextCell = {
          ...nextCell,
          id: createRibbonCellId(),
        };
      }

      usedCellIds.add(nextCell.id);
      occupiedPositions.add(positionKey);
      normalizedCells.push(nextCell);
    }
  }

  normalizedCells.sort((a, b) => {
    if (a.row !== b.row) {
      return a.row - b.row;
    }

    return a.column - b.column;
  });

  return {
    rows,
    columns,
    cells: normalizedCells,
    ribbon_style: typeof source?.ribbon_style === "string" ? source.ribbon_style : "",
  };
};

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

export const migrateMenuToContentConfig = (
  menuConfig: unknown,
  fallbackPrimaryTerm: string,
  title: string
): NodeContentConfig => {
  const normalized = normalizeMenuNodeConfig(menuConfig, fallbackPrimaryTerm);
  const groups: NodeContentGroup[] = [];
  const slots: NodeContentSlot[] = [];
  const menuSlotTermTypes = [
    resolveCanonicalRegistryTermType("menu_term", "menu_term"),
    resolveCanonicalRegistryTermType("key_command", "key_command"),
    resolveCanonicalRegistryTermType("tool_tip", "tool_tip"),
  ];

  if (title) {
    slots.push({
      id: createContentSlotId(),
      value: title,
      termType: "Title",
      groupId: null,
      position: 0,
    });
  }

  normalized.terms.forEach((term, index) => {
    const groupId = createContentGroupId();
    groups.push({ id: groupId, row: index, column: 0 });

    menuSlotTermTypes.forEach((slotTermType, slotIndex) => {
      slots.push({
        id: createContentSlotId(),
        value: slotIndex === 0 ? term.term : "",
        termType: slotTermType,
        groupId,
        position: slotIndex,
      });
    });
  });

  return {
    layout: "vertical",
    rows: groups.length,
    columns: 1,
    groups,
    slots,
    style: "",
  };
};

export const migrateRibbonToContentConfig = (
  ribbonConfig: unknown,
  title: string
): NodeContentConfig => {
  const normalized = normalizeRibbonNodeConfig(ribbonConfig);
  const groups: NodeContentGroup[] = [];
  const slots: NodeContentSlot[] = [];

  if (title) {
    slots.push({
      id: createContentSlotId(),
      value: title,
      termType: "Title",
      groupId: null,
      position: 0,
    });
  }

  normalized.cells.forEach((cell) => {
    const groupId = createContentGroupId();
    groups.push({ id: groupId, row: cell.row, column: cell.column });

    const cellFields: [string, string][] = [
      [resolveCanonicalRegistryTermType("cell_label", "cell_label"), cell.label],
      [resolveCanonicalRegistryTermType("key_command", "key_command"), cell.key_command],
      [resolveCanonicalRegistryTermType("tool_tip", "tool_tip"), cell.tool_tip],
    ];

    cellFields.forEach(([slotTermType, value], slotIndex) => {
      slots.push({
        id: createContentSlotId(),
        value,
        termType: slotTermType,
        groupId,
        position: slotIndex,
      });
    });
  });

  return {
    layout: "horizontal",
    rows: normalized.rows,
    columns: normalized.columns,
    groups,
    slots,
    style: normalized.ribbon_style,
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

export const buildRibbonSourceHandleId = (cellId: string): string =>
  `${RIBBON_SOURCE_HANDLE_PREFIX}${cellId}`;

export const buildRibbonSourceHandleIds = (config: RibbonNodeConfig): string[] =>
  config.cells.map((cell) => buildRibbonSourceHandleId(cell.id));

export const isRibbonSourceHandleId = (handleId: string): boolean =>
  handleId.startsWith(RIBBON_SOURCE_HANDLE_PREFIX);

export const applyRibbonConfigToNodeData = (
  nodeData: MicrocopyNodeData,
  config: RibbonNodeConfig
): MicrocopyNodeData => ({
  ...nodeData,
  ribbon_config: config,
});

export const normalizeMenuNodeConfig = (
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
    normalizedTerms.push(createMenuNodeTerm(fallbackPrimaryTerm || ""));
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

export const getPrimaryMenuTermValue = (
  menuConfig: MenuNodeConfig,
  fallbackValue: string
): string => menuConfig.terms[0]?.term ?? fallbackValue;

export const getSecondaryMenuTermValue = (
  menuConfig: MenuNodeConfig,
  fallbackValue: string
): string => menuConfig.terms[1]?.term ?? fallbackValue;

export const applyMenuConfigToNodeData = (
  nodeData: MicrocopyNodeData,
  nextMenuConfig: MenuNodeConfig
): MicrocopyNodeData => ({
  ...nodeData,
  menu_config: nextMenuConfig,
  primary_cta: getPrimaryMenuTermValue(nextMenuConfig, nodeData.primary_cta),
  secondary_cta: getSecondaryMenuTermValue(nextMenuConfig, nodeData.secondary_cta),
});

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
      nodeType === "default" || nodeType === "menu"
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
    concept: overrides.concept ?? firstOptionOrFallback(globalOptions.concept, ""),
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
    menu_config: normalizeMenuNodeConfig(
      overrides.menu_config,
      overrides.primary_cta ?? "",
      1
    ),
    frame_config: normalizeFrameNodeConfig(overrides.frame_config),
    ...((() => { if (nodeType === "ribbon" || nodeType === "horizontal_multi_term") { console.log("CREATE_DEFAULT DEBUG", { nodeType, hasRibbonConfig: !!overrides.ribbon_config, ribbonCells: overrides.ribbon_config ? (overrides.ribbon_config as any).cells?.length : "no config" }); } return {}; })()),
    ribbon_config: null,
    content_config:
      (() => {
        if (
          overrides.content_config &&
          typeof overrides.content_config === "object" &&
          Array.isArray((overrides.content_config as Partial<NodeContentConfig>).slots)
        ) {
          const ccLayout: NodeContentLayout =
            nodeType === "vertical_multi_term" || nodeType === "menu" ? "vertical"
            : nodeType === "horizontal_multi_term" || nodeType === "ribbon" ? "horizontal"
            : "single";
          const candidate = normalizeNodeContentConfig(overrides.content_config, ccLayout);
          const needsGroups = ccLayout === "vertical" || ccLayout === "horizontal";
          if (needsGroups ? candidate.groups.length > 0 : candidate.slots.length > 0) {
            return candidate;
          }
        }
        return null;
      })() ?? (nodeType === "default"
          ? migrateDefaultToContentConfig(overrides)
          : nodeType === "frame"
            ? migrateFrameToContentConfig(overrides.title ?? "")
            : nodeType === "menu" || nodeType === "vertical_multi_term"
              ? migrateMenuToContentConfig(
                  overrides.menu_config,
                  overrides.primary_cta ?? "",
                  overrides.title ?? ""
                )
              : nodeType === "ribbon" || nodeType === "horizontal_multi_term"
                ? migrateRibbonToContentConfig(
                    overrides.ribbon_config,
                    overrides.title ?? ""
                  )
                : migrateDefaultToContentConfig(overrides)),
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
      ribbon_config:
        defaultData.node_type === "ribbon"
          ? normalizeRibbonNodeConfig(sourceData.ribbon_config)
          : null,
      content_config: (() => {
        if (
          sourceData.content_config &&
          typeof sourceData.content_config === "object" &&
          Array.isArray((sourceData.content_config as Partial<NodeContentConfig>).slots)
        ) {
          const ccLayout: NodeContentLayout =
            defaultData.node_type === "vertical_multi_term" || defaultData.node_type === "menu"
              ? "vertical"
              : defaultData.node_type === "horizontal_multi_term" || defaultData.node_type === "ribbon"
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
      menu_config: normalizeMenuNodeConfig(
        node.data.menu_config,
        node.data.primary_cta,
        node.data.node_type === "menu"
          ? node.data.menu_config.max_right_connections
          : 1
      ),
      frame_config: normalizeFrameNodeConfig(node.data.frame_config),
      ribbon_config:
        node.data.node_type === "ribbon"
          ? normalizeRibbonNodeConfig(node.data.ribbon_config)
          : null,
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
