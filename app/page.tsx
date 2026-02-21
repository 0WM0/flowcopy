"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  addEdge,
  reconnectEdge,
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type DefaultEdgeOptions,
  type Edge,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

type NodeShape = "rectangle" | "rounded" | "pill" | "diamond";

type MicrocopyNodeData = {
  title: string;
  body_text: string;
  primary_cta: string;
  secondary_cta: string;
  helper_text: string;
  error_text: string;
  tone: string;
  polarity: string;
  reversibility: string;
  concept: string;
  notes: string;
  action_type_name: string;
  action_type_color: string;
  card_style: string;
  node_shape: NodeShape;
  sequence_index: number | null;
};

type PersistableMicrocopyNodeData = Omit<MicrocopyNodeData, "sequence_index">;
type EditableMicrocopyField = keyof PersistableMicrocopyNodeData;

type GlobalOptionConfig = {
  tone: string[];
  polarity: string[];
  reversibility: string[];
  concept: string[];
  action_type_name: string[];
  action_type_color: string[];
  card_style: string[];
};

type GlobalOptionField = keyof GlobalOptionConfig;

type FlowNode = Node<MicrocopyNodeData, "flowcopyNode">;

type SerializableFlowNode = {
  id: string;
  position?: FlowNode["position"];
  data?: Partial<PersistableMicrocopyNodeData>;
};

type PersistedCanvasState = {
  nodes: SerializableFlowNode[];
  edges: Edge[];
  adminOptions: GlobalOptionConfig;
};

type FlowOrderingResult = {
  orderedNodeIds: string[];
  sequenceByNodeId: Partial<Record<string, number>>;
  hasCycle: boolean;
};

const STORAGE_KEY = "flowcopy.canvas.v2";

const NODE_SHAPE_OPTIONS: NodeShape[] = [
  "rectangle",
  "rounded",
  "pill",
  "diamond",
];

const EDGE_STROKE_COLOR = "#1d4ed8";

const EDGE_BASE_STYLE: React.CSSProperties = {
  stroke: EDGE_STROKE_COLOR,
  strokeWidth: 2.6,
};

const DEFAULT_EDGE_OPTIONS: DefaultEdgeOptions = {
  type: "smoothstep",
  animated: true,
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: EDGE_STROKE_COLOR,
    width: 20,
    height: 20,
  },
  style: EDGE_BASE_STYLE,
};

const GLOBAL_OPTION_FIELDS: GlobalOptionField[] = [
  "tone",
  "polarity",
  "reversibility",
  "concept",
  "action_type_name",
  "action_type_color",
  "card_style",
];

const GLOBAL_OPTION_LABELS: Record<GlobalOptionField, string> = {
  tone: "Tone",
  polarity: "Polarity",
  reversibility: "Reversibility",
  concept: "Concept",
  action_type_name: "Action Type Name",
  action_type_color: "Action Type Color",
  card_style: "Card Style",
};

const DEFAULT_GLOBAL_OPTIONS: GlobalOptionConfig = {
  tone: ["neutral", "friendly", "formal", "urgent"],
  polarity: ["neutral", "positive", "destructive"],
  reversibility: ["reversible", "irreversible"],
  concept: ["Entry point", "Confirmation", "Error handling"],
  action_type_name: ["Submit Data", "Acknowledge", "Navigate"],
  action_type_color: ["#4f46e5", "#047857", "#dc2626"],
  card_style: ["default", "subtle", "warning", "success"],
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #d4d4d8",
  borderRadius: 6,
  padding: "6px 8px",
  fontSize: 12,
  background: "#fff",
};

const buttonStyle: React.CSSProperties = {
  border: "1px solid #d4d4d8",
  borderRadius: 6,
  background: "#fff",
  padding: "6px 10px",
  cursor: "pointer",
  fontSize: 12,
};

const createEmptyPendingOptionInputs = (): Record<GlobalOptionField, string> => ({
  tone: "",
  polarity: "",
  reversibility: "",
  concept: "",
  action_type_name: "",
  action_type_color: "",
  card_style: "",
});

const createNodeId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `node-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const isNodeShape = (value: unknown): value is NodeShape =>
  typeof value === "string" && NODE_SHAPE_OPTIONS.includes(value as NodeShape);

const ensureArrayOfStrings = (value: unknown, fallback: string[]): string[] => {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  const validItems = value.filter((item): item is string => typeof item === "string");
  return validItems.length > 0 ? validItems : [...fallback];
};

const normalizeGlobalOptionConfig = (value: unknown): GlobalOptionConfig => {
  const source =
    value && typeof value === "object"
      ? (value as Partial<GlobalOptionConfig>)
      : undefined;

  return {
    tone: ensureArrayOfStrings(source?.tone, DEFAULT_GLOBAL_OPTIONS.tone),
    polarity: ensureArrayOfStrings(source?.polarity, DEFAULT_GLOBAL_OPTIONS.polarity),
    reversibility: ensureArrayOfStrings(
      source?.reversibility,
      DEFAULT_GLOBAL_OPTIONS.reversibility
    ),
    concept: ensureArrayOfStrings(source?.concept, DEFAULT_GLOBAL_OPTIONS.concept),
    action_type_name: ensureArrayOfStrings(
      source?.action_type_name,
      DEFAULT_GLOBAL_OPTIONS.action_type_name
    ),
    action_type_color: ensureArrayOfStrings(
      source?.action_type_color,
      DEFAULT_GLOBAL_OPTIONS.action_type_color
    ),
    card_style: ensureArrayOfStrings(source?.card_style, DEFAULT_GLOBAL_OPTIONS.card_style),
  };
};

const readPersistedCanvasState = (): PersistedCanvasState | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as {
      nodes?: SerializableFlowNode[];
      edges?: Edge[];
      adminOptions?: Partial<GlobalOptionConfig>;
    };

    return {
      nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
      edges: Array.isArray(parsed.edges) ? parsed.edges : [],
      adminOptions: normalizeGlobalOptionConfig(parsed.adminOptions),
    };
  } catch (error) {
    console.error("Failed to parse saved canvas state", error);
    return null;
  }
};

const cleanedOptions = (options: string[]): string[] =>
  options.map((option) => option.trim()).filter((option) => option.length > 0);

const firstOptionOrFallback = (options: string[], fallback: string): string =>
  cleanedOptions(options)[0] ?? fallback;

const buildSelectOptions = (
  options: string[],
  currentValue: string,
  fallbackOptions: string[]
): string[] => {
  const cleaned = cleanedOptions(options);
  const withFallback = cleaned.length > 0 ? cleaned : fallbackOptions;
  const unique = Array.from(new Set(withFallback));

  if (currentValue && !unique.includes(currentValue)) {
    return [currentValue, ...unique];
  }

  return unique;
};

const createDefaultNodeData = (
  globalOptions: GlobalOptionConfig,
  overrides: Partial<PersistableMicrocopyNodeData> = {}
): MicrocopyNodeData => ({
  title: overrides.title ?? "Untitled Node",
  body_text: overrides.body_text ?? "",
  primary_cta: overrides.primary_cta ?? "Continue",
  secondary_cta: overrides.secondary_cta ?? "",
  helper_text: overrides.helper_text ?? "",
  error_text: overrides.error_text ?? "",
  tone: overrides.tone ?? firstOptionOrFallback(globalOptions.tone, "neutral"),
  polarity: overrides.polarity ?? firstOptionOrFallback(globalOptions.polarity, "neutral"),
  reversibility:
    overrides.reversibility ??
    firstOptionOrFallback(globalOptions.reversibility, "reversible"),
  concept: overrides.concept ?? firstOptionOrFallback(globalOptions.concept, ""),
  notes: overrides.notes ?? "",
  action_type_name:
    overrides.action_type_name ??
    firstOptionOrFallback(globalOptions.action_type_name, "Submit Data"),
  action_type_color:
    overrides.action_type_color ??
    firstOptionOrFallback(globalOptions.action_type_color, "#4f46e5"),
  card_style: overrides.card_style ?? firstOptionOrFallback(globalOptions.card_style, "default"),
  node_shape: isNodeShape(overrides.node_shape) ? overrides.node_shape : "rectangle",
  sequence_index: null,
});

const normalizeNode = (
  node: SerializableFlowNode,
  globalOptions: GlobalOptionConfig
): FlowNode => ({
  id: node.id,
  type: "flowcopyNode",
  position: node.position ?? { x: 0, y: 0 },
  data: createDefaultNodeData(globalOptions, node.data ?? {}),
});

const applyEdgeVisuals = (edge: Edge): Edge => ({
  ...edge,
  type: edge.type ?? DEFAULT_EDGE_OPTIONS.type,
  animated: edge.animated ?? DEFAULT_EDGE_OPTIONS.animated,
  markerEnd: edge.markerEnd ?? DEFAULT_EDGE_OPTIONS.markerEnd,
  style: {
    ...EDGE_BASE_STYLE,
    ...(edge.style ?? {}),
  },
});

const sanitizePersistedNodes = (
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

const sanitizeEdges = (persistedEdges: Edge[], nodes: FlowNode[]): Edge[] => {
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

    return [
      applyEdgeVisuals({
        ...edge,
        id: uniqueId,
        source,
        target,
      }),
    ];
  });
};

const compareNodeOrder = (a: FlowNode, b: FlowNode): number => {
  if (a.position.x !== b.position.x) {
    return a.position.x - b.position.x;
  }

  if (a.position.y !== b.position.y) {
    return a.position.y - b.position.y;
  }

  return a.id.localeCompare(b.id);
};

const computeFlowOrdering = (nodes: FlowNode[], edges: Edge[]): FlowOrderingResult => {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const adjacency = new Map<string, Set<string>>();
  const indegree = new Map<string, number>();

  nodes.forEach((node) => {
    adjacency.set(node.id, new Set<string>());
    indegree.set(node.id, 0);
  });

  edges.forEach((edge) => {
    if (!nodeById.has(edge.source) || !nodeById.has(edge.target)) {
      return;
    }

    const neighbors = adjacency.get(edge.source);
    if (!neighbors || neighbors.has(edge.target)) {
      return;
    }

    neighbors.add(edge.target);
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
  });

  const available = nodes
    .filter((node) => (indegree.get(node.id) ?? 0) === 0)
    .sort(compareNodeOrder);

  const orderedNodeIds: string[] = [];

  while (available.length > 0) {
    const current = available.shift();
    if (!current) {
      break;
    }

    orderedNodeIds.push(current.id);

    const sortedNeighbors = Array.from(adjacency.get(current.id) ?? [])
      .map((neighborId) => nodeById.get(neighborId))
      .filter((neighbor): neighbor is FlowNode => Boolean(neighbor))
      .sort(compareNodeOrder);

    sortedNeighbors.forEach((neighbor) => {
      const nextIndegree = (indegree.get(neighbor.id) ?? 0) - 1;
      indegree.set(neighbor.id, nextIndegree);

      if (nextIndegree === 0) {
        available.push(neighbor);
        available.sort(compareNodeOrder);
      }
    });
  }

  const hasCycle = orderedNodeIds.length !== nodes.length;

  if (hasCycle) {
    const unresolved = nodes
      .filter((node) => !orderedNodeIds.includes(node.id))
      .sort(compareNodeOrder);

    orderedNodeIds.push(...unresolved.map((node) => node.id));
  }

  const sequenceByNodeId = orderedNodeIds.reduce<Partial<Record<string, number>>>(
    (acc, nodeId, index) => {
      acc[nodeId] = index + 1;
      return acc;
    },
    {}
  );

  return {
    orderedNodeIds,
    sequenceByNodeId,
    hasCycle,
  };
};

const hashToBase36 = (value: string): string => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);
  }

  return (hash >>> 0).toString(36).toUpperCase().padStart(7, "0");
};

const computeProjectSequenceId = (
  orderedNodeIds: string[],
  nodes: FlowNode[],
  edges: Edge[]
): string => {
  const validNodeIds = new Set(nodes.map((node) => node.id));

  const edgeSignature = edges
    .filter((edge) => validNodeIds.has(edge.source) && validNodeIds.has(edge.target))
    .map((edge) => `${edge.source}->${edge.target}`)
    .sort()
    .join("|");

  const payload = `v1|order:${orderedNodeIds.join(">")}|edges:${edgeSignature}`;
  return `FLOW-${hashToBase36(payload)}`;
};

const getNodeShapeStyle = (
  shape: NodeShape,
  selected: boolean
): React.CSSProperties => {
  const baseStyle: React.CSSProperties = {
    width: 260,
    minHeight: 120,
    background: "#ffffff",
    border: selected ? "2px solid #2563eb" : "1px solid #d4d4d8",
    padding: 10,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
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
        borderRadius: 999,
      };

    case "diamond":
      return {
        ...baseStyle,
        width: 290,
        minHeight: 190,
        borderRadius: 0,
        clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
        padding: "26px 30px",
      };

    case "rectangle":
    default:
      return {
        ...baseStyle,
        borderRadius: 8,
      };
  }
};

const serializeNodesForStorage = (nodes: FlowNode[]): SerializableFlowNode[] =>
  nodes.map((node) => {
    const persistableData: PersistableMicrocopyNodeData = {
      title: node.data.title,
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
    };

    return {
      id: node.id,
      position: node.position,
      data: persistableData,
    };
  });

const initialNodes: FlowNode[] = [
  normalizeNode(
    {
      id: "1",
      position: { x: 100, y: 120 },
      data: {
        title: "Start",
        primary_cta: "Send",
        action_type_name: "Submit Data",
        concept: "Entry point",
      },
    },
    DEFAULT_GLOBAL_OPTIONS
  ),
  normalizeNode(
    {
      id: "2",
      position: { x: 420, y: 120 },
      data: {
        title: "Confirmation",
        primary_cta: "Done",
        action_type_name: "Acknowledge",
        action_type_color: "#047857",
      },
    },
    DEFAULT_GLOBAL_OPTIONS
  ),
];

const initialEdges: Edge[] = [
  applyEdgeVisuals({
    id: "e1-2",
    source: "1",
    target: "2",
    label: "",
  }),
];

function FlowCopyNode({ id, data, selected }: NodeProps<FlowNode>) {
  const { setNodes } = useReactFlow<FlowNode, Edge>();

  const updateField = useCallback(
    (field: EditableMicrocopyField, value: string) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, [field]: value } } : n
        )
      );
    },
    [id, setNodes]
  );

  return (
    <div style={getNodeShapeStyle(data.node_shape, selected)}>
      <Handle type="target" position={Position.Left} />

      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: data.action_type_color,
            border: `1px solid ${data.action_type_color}`,
            borderRadius: 999,
            padding: "2px 8px",
            background: "#fff",
          }}
        >
          {data.action_type_name}
        </span>
        <span style={{ fontSize: 11, color: "#1d4ed8", fontWeight: 600 }}>
          #{data.sequence_index ?? "-"}
        </span>
      </div>

      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 11, color: "#71717a", marginBottom: 4 }}>Title</div>
        <input
          className="nodrag"
          style={inputStyle}
          value={data.title}
          onChange={(event) => updateField("title", event.target.value)}
        />
      </div>

      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 11, color: "#71717a", marginBottom: 4 }}>
          Primary CTA
        </div>
        <input
          className="nodrag"
          style={inputStyle}
          value={data.primary_cta}
          onChange={(event) => updateField("primary_cta", event.target.value)}
        />
      </div>

      <div style={{ marginTop: 8, fontSize: 10, color: "#71717a" }}>id: {id}</div>

      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export default function Page() {
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    initialNodes[0]?.id ?? null
  );
  const [adminOptions, setAdminOptions] =
    useState<GlobalOptionConfig>(DEFAULT_GLOBAL_OPTIONS);
  const [pendingOptionInputs, setPendingOptionInputs] = useState<
    Record<GlobalOptionField, string>
  >(createEmptyPendingOptionInputs);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

  const rfRef = useRef<ReactFlowInstance<FlowNode, Edge> | null>(null);
  const hasLoadedRef = useRef(false);

  const nodeTypes = useMemo(() => ({ flowcopyNode: FlowCopyNode }), []);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const persistedState = readPersistedCanvasState();
    if (!persistedState) return;

    const timeoutId = window.setTimeout(() => {
      const normalizedAdminOptions = normalizeGlobalOptionConfig(
        persistedState.adminOptions
      );
      setAdminOptions(normalizedAdminOptions);

      const hydratedNodes =
        persistedState.nodes.length > 0
          ? sanitizePersistedNodes(persistedState.nodes, normalizedAdminOptions)
          : initialNodes;

      const hydratedEdges = sanitizeEdges(persistedState.edges, hydratedNodes);

      setNodes(hydratedNodes);
      setEdges(hydratedEdges);
      setSelectedNodeId(hydratedNodes[0]?.id ?? null);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [setEdges, setNodes]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        nodes: serializeNodesForStorage(nodes),
        edges,
        adminOptions,
      })
    );
  }, [adminOptions, edges, nodes]);

  const ordering = useMemo(() => computeFlowOrdering(nodes, edges), [nodes, edges]);

  const projectSequenceId = useMemo(
    () => computeProjectSequenceId(ordering.orderedNodeIds, nodes, edges),
    [edges, nodes, ordering.orderedNodeIds]
  );

  const nodesWithSequence = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          sequence_index: ordering.sequenceByNodeId[node.id] ?? null,
        },
      })),
    [nodes, ordering.sequenceByNodeId]
  );

  const displayEdges = useMemo(
    () =>
      edges.map((edge) => {
        const sourceOrder = ordering.sequenceByNodeId[edge.source];
        const targetOrder = ordering.sequenceByNodeId[edge.target];

        return applyEdgeVisuals({
          ...edge,
          label:
            sourceOrder && targetOrder ? `${sourceOrder} → ${targetOrder}` : edge.label,
          labelStyle: {
            fill: EDGE_STROKE_COLOR,
            fontWeight: 700,
            fontSize: 11,
          },
          labelBgStyle: {
            fill: "#eff6ff",
            fillOpacity: 0.95,
          },
          labelBgPadding: [4, 2],
          labelBgBorderRadius: 4,
        });
      }),
    [edges, ordering.sequenceByNodeId]
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
      : nodes[0]?.id ?? null;

  const selectedNode =
    effectiveSelectedNodeId === null
      ? null
      : nodes.find((node) => node.id === effectiveSelectedNodeId) ?? null;

  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) {
        return;
      }

      const newEdge = applyEdgeVisuals({
        id: `e-${params.source}-${params.target}-${createNodeId().slice(0, 8)}`,
        source: params.source,
        target: params.target,
        sourceHandle: params.sourceHandle,
        targetHandle: params.targetHandle,
        label: "",
      });

      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      setEdges((currentEdges) =>
        reconnectEdge(oldEdge, newConnection, currentEdges).map(applyEdgeVisuals)
      );
    },
    [setEdges]
  );

  const onInit = useCallback((instance: ReactFlowInstance<FlowNode, Edge>) => {
    rfRef.current = instance;
  }, []);

  const addNodeAtEvent = useCallback(
    (event: React.MouseEvent) => {
      const rf = rfRef.current;
      if (!rf) return;

      const position = rf.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const id = createNodeId();

      setNodes((nds) => [
        ...nds,
        normalizeNode({ id, position }, normalizeGlobalOptionConfig(adminOptions)),
      ]);
      setSelectedNodeId(id);
    },
    [adminOptions, setNodes]
  );

  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (event.detail === 2) {
        addNodeAtEvent(event);
        return;
      }

      setSelectedNodeId(null);
    },
    [addNodeAtEvent]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: FlowNode) => {
    setSelectedNodeId(node.id);
  }, []);

  const updateSelectedField = useCallback(
    (field: EditableMicrocopyField, value: string) => {
      if (!effectiveSelectedNodeId) return;

      setNodes((nds) =>
        nds.map((node) =>
          node.id === effectiveSelectedNodeId
            ? { ...node, data: { ...node.data, [field]: value } }
            : node
        )
      );
    },
    [effectiveSelectedNodeId, setNodes]
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
    [pendingOptionInputs]
  );

  const removeAdminOption = useCallback(
    (field: GlobalOptionField, optionValue: string) => {
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
    []
  );

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "grid",
        gridTemplateColumns: "1fr 400px",
      }}
    >
      <div style={{ borderRight: "1px solid #e4e4e7" }}>
        <ReactFlow<FlowNode, Edge>
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
          zoomOnDoubleClick={false}
          fitView
          connectionLineStyle={EDGE_BASE_STYLE}
        >
          <Background />
          <MiniMap />
          <Controls />
        </ReactFlow>
      </div>

      <aside style={{ padding: 12, overflowY: "auto" }}>
        <div
          style={{
            border: "1px solid #dbeafe",
            borderRadius: 8,
            background: "#f8fbff",
            padding: 10,
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 12, color: "#1e3a8a", fontWeight: 700 }}>
            Project Sequence ID
          </div>
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
            Order rule: topological flow, tie-break left → right by x-position.
          </div>

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

          <ol style={{ marginTop: 10, marginBottom: 0, paddingLeft: 18, fontSize: 12 }}>
            {orderedNodes.map((node) => (
              <li key={`order:${node.id}`} style={{ marginBottom: 4 }}>
                <strong>#{ordering.sequenceByNodeId[node.id]}</strong> {node.data.title || "Untitled"}
                <div style={{ color: "#64748b", fontSize: 11 }}>id: {node.id}</div>
              </li>
            ))}
          </ol>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <h2 style={{ margin: 0 }}>Node Data Panel</h2>
          <button
            type="button"
            style={buttonStyle}
            onClick={() => setIsAdminPanelOpen((open) => !open)}
          >
            {isAdminPanelOpen ? "Hide" : "Show"} Admin
          </button>
        </div>

        <p style={{ marginTop: 0, fontSize: 12, color: "#52525b" }}>
          Click a node to edit structured fields. Double-click empty canvas to add a
          node.
        </p>

        {isAdminPanelOpen && (
          <section
            style={{
              border: "1px solid #d4d4d8",
              borderRadius: 8,
              padding: 10,
              marginBottom: 12,
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

        {!selectedNode ? (
          <p style={{ fontSize: 13, color: "#71717a" }}>
            No node selected. Click any node on the canvas.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: 12, color: "#52525b" }}>
              <strong>node_id:</strong> {selectedNode.id}
              <br />
              <strong>sequence:</strong> {ordering.sequenceByNodeId[selectedNode.id] ?? "-"}
              <br />
              <strong>x_position:</strong> {Math.round(selectedNode.position.x)}
              <br />
              <strong>y_position:</strong> {Math.round(selectedNode.position.y)}
            </div>

            <label>
              <div style={{ fontSize: 12, marginBottom: 4 }}>node_shape</div>
              <select
                style={inputStyle}
                value={selectedNode.data.node_shape}
                onChange={(event) =>
                  updateSelectedField("node_shape", event.target.value as NodeShape)
                }
              >
                {NODE_SHAPE_OPTIONS.map((shape) => (
                  <option key={`shape:${shape}`} value={shape}>
                    {shape}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <div style={{ fontSize: 12, marginBottom: 4 }}>title</div>
              <input
                style={inputStyle}
                value={selectedNode.data.title}
                onChange={(event) => updateSelectedField("title", event.target.value)}
              />
            </label>

            <label>
              <div style={{ fontSize: 12, marginBottom: 4 }}>body_text</div>
              <textarea
                style={{ ...inputStyle, minHeight: 68, resize: "vertical" }}
                value={selectedNode.data.body_text}
                onChange={(event) => updateSelectedField("body_text", event.target.value)}
              />
            </label>

            <label>
              <div style={{ fontSize: 12, marginBottom: 4 }}>primary_cta</div>
              <input
                style={inputStyle}
                value={selectedNode.data.primary_cta}
                onChange={(event) =>
                  updateSelectedField("primary_cta", event.target.value)
                }
              />
            </label>

            <label>
              <div style={{ fontSize: 12, marginBottom: 4 }}>secondary_cta</div>
              <input
                style={inputStyle}
                value={selectedNode.data.secondary_cta}
                onChange={(event) =>
                  updateSelectedField("secondary_cta", event.target.value)
                }
              />
            </label>

            <label>
              <div style={{ fontSize: 12, marginBottom: 4 }}>helper_text</div>
              <input
                style={inputStyle}
                value={selectedNode.data.helper_text}
                onChange={(event) =>
                  updateSelectedField("helper_text", event.target.value)
                }
              />
            </label>

            <label>
              <div style={{ fontSize: 12, marginBottom: 4 }}>error_text</div>
              <input
                style={inputStyle}
                value={selectedNode.data.error_text}
                onChange={(event) =>
                  updateSelectedField("error_text", event.target.value)
                }
              />
            </label>

            <label>
              <div style={{ fontSize: 12, marginBottom: 4 }}>tone</div>
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
              <div style={{ fontSize: 12, marginBottom: 4 }}>polarity</div>
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
              <div style={{ fontSize: 12, marginBottom: 4 }}>reversibility</div>
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
              <div style={{ fontSize: 12, marginBottom: 4 }}>concept</div>
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
              <div style={{ fontSize: 12, marginBottom: 4 }}>notes</div>
              <textarea
                style={{ ...inputStyle, minHeight: 76, resize: "vertical" }}
                value={selectedNode.data.notes}
                onChange={(event) => updateSelectedField("notes", event.target.value)}
              />
            </label>

            <hr style={{ border: 0, borderTop: "1px solid #e4e4e7" }} />

            <label>
              <div style={{ fontSize: 12, marginBottom: 4 }}>action_type_name</div>
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
              <div style={{ fontSize: 12, marginBottom: 4 }}>action_type_color</div>
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
              <div style={{ fontSize: 12, marginBottom: 4 }}>card_style</div>
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
          </div>
        )}
      </aside>
    </div>
  );
}
