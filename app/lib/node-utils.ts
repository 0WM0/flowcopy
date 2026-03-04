import type React from "react";
import type {
  FlowNode,
  FlowEdge,
  MicrocopyNodeData,
  SerializableFlowNode,
  GlobalOptionConfig,
  NodeShape,
  NodeType,
  FrameShade,
  MenuNodeConfig,
  MenuNodeTerm,
  FrameNodeConfig,
  PersistableMicrocopyNodeData,
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
  UI_JOURNEY_HIGHLIGHT_STROKE_COLOR,
  UI_JOURNEY_RECALLED_STROKE_COLOR,
} from "../constants";
import { isNodeControlledLanguageFieldType } from "./controlled-language";

export const isFrameShade = (value: unknown): value is FrameShade =>
  value === "light" || value === "medium" || value === "dark";

export const isNodeType = (value: unknown): value is NodeType =>
  value === "default" ||
  value === "menu" ||
  value === "frame" ||
  value === "ribbon";

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
): MicrocopyNodeData => ({
  title: overrides.title ?? "",
  body_text: overrides.body_text ?? "",
  primary_cta: overrides.primary_cta ?? "",
  secondary_cta: overrides.secondary_cta ?? "",
  helper_text: overrides.helper_text ?? "",
  error_text: overrides.error_text ?? "",
  display_term_field: isNodeControlledLanguageFieldType(overrides.display_term_field)
    ? overrides.display_term_field
    : "primary_cta",
  tone: overrides.tone ?? firstOptionOrFallback(globalOptions.tone, "neutral"),
  polarity: overrides.polarity ?? firstOptionOrFallback(globalOptions.polarity, "neutral"),
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
  card_style: overrides.card_style ?? firstOptionOrFallback(globalOptions.card_style, "default"),
  node_shape: isNodeShape(overrides.node_shape) ? overrides.node_shape : "rectangle",
  node_type: isNodeType(overrides.node_type) ? overrides.node_type : "default",
  menu_config: normalizeMenuNodeConfig(
    overrides.menu_config,
    overrides.primary_cta ?? "Continue",
    1
  ),
  frame_config: normalizeFrameNodeConfig(overrides.frame_config),
  ribbon_config: overrides.ribbon_config ?? null,
  parallel_group_id:
    typeof overrides.parallel_group_id === "string" &&
    overrides.parallel_group_id.trim().length > 0
      ? overrides.parallel_group_id.trim()
      : null,
  sequence_index: null,
});

export const normalizeNode = (
  node: SerializableFlowNode,
  globalOptions: GlobalOptionConfig
): FlowNode => ({
  id: node.id,
  type: "flowcopyNode",
  position: node.position ?? { x: 0, y: 0 },
  data: createDefaultNodeData(globalOptions, node.data ?? {}),
});

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
}: {
  selected: boolean;
  uiJourneyHighlighted: boolean;
  uiJourneyRecalled: boolean;
}): string | null => {
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
  } = {}
): React.CSSProperties => {
  const resolvedAccentColor = accentColor?.trim() || "#4f46e5";
  const highlightColor = resolveNodeHighlightColor({
    selected,
    uiJourneyHighlighted: options.uiJourneyHighlighted ?? false,
    uiJourneyRecalled: options.uiJourneyRecalled ?? false,
  });

  const baseStyle: React.CSSProperties = {
    boxSizing: "border-box",
    width: 260,
    minHeight: 120,
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
      body_text: node.data.body_text,
      primary_cta: node.data.primary_cta,
      secondary_cta: node.data.secondary_cta,
      helper_text: node.data.helper_text,
      error_text: node.data.error_text,
      display_term_field: node.data.display_term_field,
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
      ribbon_config: node.data.ribbon_config,
      parallel_group_id:
        parallelGroupByNodeId[node.id] ?? node.data.parallel_group_id ?? null,
    };

    return {
      id: node.id,
      position: node.position,
      data: persistableData,
    };
  });
