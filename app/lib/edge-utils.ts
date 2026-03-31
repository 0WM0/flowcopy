import type React from "react";
import type {
  FlowNode,
  FlowEdge,
  FlowEdgeData,
  EdgeKind,
  EdgeLineStyle,
  EdgeDirection,
  MenuNodeConfig,
  RibbonNodeConfig,
  NodeContentConfig,
} from "../types";
import {
  EDGE_STROKE_COLOR,
  PARALLEL_EDGE_STROKE_COLOR,
  EDGE_LINE_STYLE_DASH,
  EDGE_BASE_STYLE,
  DEFAULT_EDGE_OPTIONS,
  SEQUENTIAL_SOURCE_HANDLE_ID,
  SEQUENTIAL_SELECTED_STROKE_COLOR,
  PARALLEL_SELECTED_STROKE_COLOR,
} from "../constants";
import type { EdgeChange, NodeChange } from "@xyflow/react";
import { MarkerType } from "@xyflow/react";
import {
  buildContentConfigSourceHandleIds,
  buildMenuSourceHandleIds,
  isMenuSourceHandleId,
  buildRibbonSourceHandleIds,
  isRibbonSourceHandleId,
} from "./node-utils";

export const isEdgeKind = (value: unknown): value is EdgeKind =>
  value === "sequential" || value === "parallel";

export const isEdgeLineStyle = (value: unknown): value is EdgeLineStyle =>
  value === "solid" || value === "dashed" || value === "dotted";

export const syncSequentialEdgesForMenuNode = (
  edges: FlowEdge[],
  nodeId: string,
  menuConfig: MenuNodeConfig
): FlowEdge[] => {
  const allowedHandleIds = buildMenuSourceHandleIds(menuConfig);
  const allowedHandleIdSet = new Set(allowedHandleIds);
  const fallbackHandleId = allowedHandleIds[0] ?? null;

  return edges.flatMap((edge) => {
    if (edge.source !== nodeId || !isSequentialEdge(edge)) {
      return [edge];
    }

    if (!fallbackHandleId) {
      return [];
    }

    if (isMenuSourceHandleId(edge.sourceHandle)) {
      if (allowedHandleIdSet.has(edge.sourceHandle)) {
        return [edge];
      }

      return [];
    }

    return [
      {
        ...edge,
        sourceHandle: fallbackHandleId,
      },
    ];
  });
};

export const syncSequentialEdgesForRibbonNode = (
  nodeId: string,
  config: RibbonNodeConfig,
  edges: FlowEdge[]
): FlowEdge[] => {
  const allowedHandleIds = buildRibbonSourceHandleIds(config);
  const allowedHandleIdSet = new Set(allowedHandleIds);

  return edges.filter((edge) => {
    if (edge.source !== nodeId) return true;
    if (!edge.sourceHandle) return true;
    if (!isRibbonSourceHandleId(edge.sourceHandle)) return true;
    return allowedHandleIdSet.has(edge.sourceHandle);
  });
};

export const syncSequentialEdgesForContentConfig = (
  edges: FlowEdge[],
  nodeId: string,
  contentConfig: NodeContentConfig
): FlowEdge[] => {
  const allowedHandleIds = buildContentConfigSourceHandleIds(contentConfig);
  const allowedHandleIdSet = new Set(allowedHandleIds);
  const fallbackHandleId = allowedHandleIds[0] ?? null;

  return edges.flatMap((edge) => {
    if (edge.source !== nodeId || !isSequentialEdge(edge)) {
      return [edge];
    }

    if (!fallbackHandleId) {
      return [];
    }

    const isMenuHandle = isMenuSourceHandleId(edge.sourceHandle);
    const isRibbonHandle = edge.sourceHandle ? isRibbonSourceHandleId(edge.sourceHandle) : false;

    if (isMenuHandle || isRibbonHandle) {
      if (allowedHandleIdSet.has(edge.sourceHandle!)) {
        return [edge];
      }
      return [];
    }

    return [
      {
        ...edge,
        sourceHandle: fallbackHandleId,
      },
    ];
  });
};

export const assignSequentialEdgesToMenuHandles = (
  edges: FlowEdge[],
  nodeId: string,
  menuHandleIds: string[]
): FlowEdge[] => {
  if (menuHandleIds.length === 0) {
    return edges.filter((edge) => !(edge.source === nodeId && isSequentialEdge(edge)));
  }

  let sequentialIndex = 0;

  return edges.flatMap((edge) => {
    if (edge.source !== nodeId || !isSequentialEdge(edge)) {
      return [edge];
    }

    const nextHandleId = menuHandleIds[sequentialIndex];
    sequentialIndex += 1;

    if (!nextHandleId) {
      return [];
    }

    return [
      {
        ...edge,
        sourceHandle: nextHandleId,
      },
    ];
  });
};

export const remapMenuSequentialEdgesToDefaultHandle = (
  edges: FlowEdge[],
  nodeId: string
): FlowEdge[] =>
  edges.map((edge) => {
    if (
      edge.source !== nodeId ||
      !isSequentialEdge(edge) ||
      !isMenuSourceHandleId(edge.sourceHandle)
    ) {
      return edge;
    }

    return {
      ...edge,
      sourceHandle: SEQUENTIAL_SOURCE_HANDLE_ID,
    };
  });

export const getSequentialOutgoingEdgesForNode = (
  edges: FlowEdge[],
  nodeId: string,
  options: { ignoreEdgeId?: string } = {}
): FlowEdge[] =>
  edges.filter(
    (edge) =>
      edge.source === nodeId &&
      edge.id !== options.ignoreEdgeId &&
      isSequentialEdge(edge)
  );

export const getFirstAvailableMenuSourceHandleId = (
  edges: FlowEdge[],
  nodeId: string,
  menuConfig: MenuNodeConfig,
  options: { ignoreEdgeId?: string } = {}
): string | null => {
  const usedHandleIds = new Set(
    getSequentialOutgoingEdgesForNode(edges, nodeId, options)
      .map((edge) => edge.sourceHandle)
      .filter((handleId): handleId is string => isMenuSourceHandleId(handleId))
  );

  return (
    buildMenuSourceHandleIds(menuConfig).find(
      (handleId) => !usedHandleIds.has(handleId)
    ) ?? null
  );
};

export const isMenuSequentialConnectionAllowed = (
  edges: FlowEdge[],
  nodeId: string,
  menuConfig: MenuNodeConfig,
  sourceHandle: string | null | undefined,
  options: { ignoreEdgeId?: string } = {}
): boolean => {
  if (!isMenuSourceHandleId(sourceHandle)) {
    return false;
  }

  const allowedHandleIds = new Set(buildMenuSourceHandleIds(menuConfig));
  if (!allowedHandleIds.has(sourceHandle)) {
    return false;
  }

  const outgoingSequentialEdges = getSequentialOutgoingEdgesForNode(
    edges,
    nodeId,
    options
  );

  if (outgoingSequentialEdges.length >= menuConfig.max_right_connections) {
    return false;
  }

  if (outgoingSequentialEdges.some((edge) => edge.sourceHandle === sourceHandle)) {
    return false;
  }

  return true;
};

export const isRibbonSequentialConnectionAllowed = (
  nodeId: string,
  handleId: string,
  config: RibbonNodeConfig,
  edges: FlowEdge[]
): boolean => {
  if (!isRibbonSourceHandleId(handleId)) return false;

  const allowedHandleIds = new Set(buildRibbonSourceHandleIds(config));
  if (!allowedHandleIds.has(handleId)) return false;

  const existing = edges.filter(
    (edge) => edge.source === nodeId && edge.sourceHandle === handleId
  );

  return existing.length === 0;
};

export const getDefaultEdgeStrokeColor = (edgeKind: EdgeKind): string =>
  edgeKind === "parallel" ? PARALLEL_EDGE_STROKE_COLOR : EDGE_STROKE_COLOR;

export const inferEdgeKindFromHandles = (
  sourceHandle?: string | null,
  targetHandle?: string | null
): EdgeKind =>
  (typeof sourceHandle === "string" && sourceHandle.startsWith("p-")) ||
  (typeof targetHandle === "string" && targetHandle.startsWith("p-"))
    ? "parallel"
    : "sequential";

export const normalizeEdgeData = (
  value: unknown,
  fallbackKind: EdgeKind
): FlowEdgeData => {
  const source =
    value && typeof value === "object" ? (value as Partial<FlowEdgeData>) : undefined;

  const edge_kind = isEdgeKind(source?.edge_kind) ? source.edge_kind : fallbackKind;
  const line_style = isEdgeLineStyle(source?.line_style)
    ? source.line_style
    : "solid";
  const stroke_color =
    typeof source?.stroke_color === "string" && source.stroke_color.trim().length > 0
      ? source.stroke_color
      : getDefaultEdgeStrokeColor(edge_kind);

  return {
    edge_kind,
    stroke_color,
    line_style,
    is_reversed:
      edge_kind === "sequential" && typeof source?.is_reversed === "boolean"
        ? source.is_reversed
        : undefined,
  };
};

export const getEdgeDirection = (edgeData: FlowEdgeData): EdgeDirection =>
  edgeData.edge_kind === "sequential" && edgeData.is_reversed ? "reversed" : "forward";

export const getEdgeKind = (
  edge: Pick<FlowEdge, "data" | "sourceHandle" | "targetHandle">
): EdgeKind =>
  isEdgeKind(edge.data?.edge_kind)
    ? edge.data.edge_kind
    : inferEdgeKindFromHandles(edge.sourceHandle, edge.targetHandle);

export const isSequentialEdge = (
  edge: Pick<FlowEdge, "data" | "sourceHandle" | "targetHandle">
): boolean => getEdgeKind(edge) === "sequential";

export const isParallelEdge = (
  edge: Pick<FlowEdge, "data" | "sourceHandle" | "targetHandle">
): boolean => getEdgeKind(edge) === "parallel";

export const isEditableEventTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const tagName = target.tagName;
  return (
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT" ||
    target.closest("[contenteditable='true']") !== null
  );
};

export const hasNonSelectionNodeChanges = (changes: NodeChange<FlowNode>[]): boolean =>
  changes.some((change) => change.type !== "select");

export const hasNonSelectionEdgeChanges = (changes: EdgeChange<FlowEdge>[]): boolean =>
  changes.some((change) => change.type !== "select");

export const cloneEdges = (edges: FlowEdge[]): FlowEdge[] =>
  edges.map((edge) => ({
    ...edge,
    data: edge.data ? { ...edge.data } : edge.data,
    markerEnd:
      edge.markerEnd && typeof edge.markerEnd === "object"
        ? { ...edge.markerEnd }
        : edge.markerEnd,
    markerStart:
      edge.markerStart && typeof edge.markerStart === "object"
        ? { ...edge.markerStart }
        : edge.markerStart,
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

export const sanitizeEdgesForStorage = (value: unknown): FlowEdge[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const sourceEdge = item as Partial<FlowEdge>;
    const source =
      typeof sourceEdge.source === "string" ? sourceEdge.source.trim() : "";
    const target =
      typeof sourceEdge.target === "string" ? sourceEdge.target.trim() : "";

    if (!source || !target) {
      return [];
    }

    const fallbackKind = inferEdgeKindFromHandles(
      sourceEdge.sourceHandle,
      sourceEdge.targetHandle
    );

    const markerStart =
      sourceEdge.markerStart && typeof sourceEdge.markerStart === "object"
        ? { ...sourceEdge.markerStart }
        : sourceEdge.markerStart;
    const markerEnd =
      sourceEdge.markerEnd && typeof sourceEdge.markerEnd === "object"
        ? { ...sourceEdge.markerEnd }
        : sourceEdge.markerEnd;

    return [
      {
        ...sourceEdge,
        source,
        target,
        id:
          typeof sourceEdge.id === "string" && sourceEdge.id.trim().length > 0
            ? sourceEdge.id
            : `e-${source}-${target}`,
        data: normalizeEdgeData(sourceEdge.data, fallbackKind),
        markerStart,
        markerEnd,
      } as FlowEdge,
    ];
  });
};

export const applyEdgeVisuals = (
  edge: FlowEdge,
  options: {
    selected?: boolean;
    highlightStrokeColor?: string | null;
  } = {}
): FlowEdge => {
  const edgeKind = getEdgeKind(edge);
  const normalizedData = normalizeEdgeData(edge.data, edgeKind);
  const edgeDirection = getEdgeDirection(normalizedData);
  const dashPattern = EDGE_LINE_STYLE_DASH[normalizedData.line_style ?? "solid"];
  const baseStroke = normalizedData.stroke_color ?? getDefaultEdgeStrokeColor(edgeKind);
  const selected = options.selected ?? false;
  const highlightStrokeColor = options.highlightStrokeColor ?? null;
  const selectedStroke =
    edgeKind === "parallel"
      ? PARALLEL_SELECTED_STROKE_COLOR
      : SEQUENTIAL_SELECTED_STROKE_COLOR;
  const resolvedStroke = selected
    ? selectedStroke
    : highlightStrokeColor ?? baseStroke;

  const sequentialArrowMarker = {
    type: MarkerType.ArrowClosed,
    color: resolvedStroke,
    width: 16,
    height: 16,
  };

  const style: React.CSSProperties = {
    ...EDGE_BASE_STYLE,
    ...(edge.style ?? {}),
    stroke: resolvedStroke,
    strokeWidth: selected || highlightStrokeColor ? 3.4 : EDGE_BASE_STYLE.strokeWidth,
    strokeDasharray: dashPattern,
    opacity: selected || highlightStrokeColor ? 1 : edgeKind === "parallel" ? 0.9 : 1,
  };

  return {
    ...edge,
    data: normalizedData,
    type: edge.type ?? DEFAULT_EDGE_OPTIONS.type,
    animated:
      edgeKind === "parallel"
        ? false
        : typeof edge.animated === "boolean"
          ? edge.animated
          : true,
    markerStart:
      edgeKind === "parallel"
        ? undefined
        : edgeDirection === "reversed"
          ? edge.markerStart ?? sequentialArrowMarker
          : undefined,
    markerEnd:
      edgeKind === "parallel"
        ? undefined
        : edgeDirection === "reversed"
          ? undefined
          : edge.markerEnd ?? sequentialArrowMarker,
    style,
  };
};

export const sanitizeEdges = (persistedEdges: FlowEdge[], nodes: FlowNode[]): FlowEdge[] => {
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

    const fallbackKind = inferEdgeKindFromHandles(edge.sourceHandle, edge.targetHandle);

    return [
      applyEdgeVisuals({
        ...edge,
        id: uniqueId,
        source,
        target,
        data: normalizeEdgeData(edge.data, fallbackKind),
      }),
    ];
  });
};
