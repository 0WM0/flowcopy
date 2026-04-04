import type {
  FlowNode,
  FlowEdge,
  FlowOrderingResult,
  MicrocopyNodeData,
  UiJourneyConversationEntry,
  UiJourneyConversationField,
  UiJourneyConversationConnectionMeta,
  UiJourneySnapshotPreset,
} from "../types";
import {
  HMN_SOURCE_HANDLE_PREFIX,
  VMN_SOURCE_HANDLE_PREFIX,
  TERM_REGISTRY_TERM_TYPE_LABELS,
} from "../constants";
import { computeFlowOrdering } from "./flow-ordering";
import { isSequentialEdge } from "./edge-utils";
import {
  isNodeType,
  normalizeFrameNodeConfig,
  normalizeNodeContentConfig,
} from "./node-utils";

type UiJourneySnapshotCapture = {
  nodeIds: string[];
  edgeIds: string[];
  conversation: UiJourneyConversationEntry[];
};

export const buildUiJourneyConversationEntryId = (
  nodeId: string,
  sequence: number | null
): string => `entry:${nodeId}:seq-${sequence ?? "x"}`;

export const buildUiJourneyConversationTitleFieldId = (nodeId: string): string =>
  `field:${nodeId}:title`;

export const buildUiJourneyConversationFieldId = (
  nodeId: string,
  sourceKey: string
): string => `field:${nodeId}:${sourceKey}`;

const buildUiJourneyConversationRibbonCellEntryId = (
  nodeId: string,
  cellId: string,
  sequence: number | null
): string => `entry:${nodeId}:cell:${cellId}:seq-${sequence ?? "x"}`;

const getUiJourneyConversationTitle = (nodeData: MicrocopyNodeData): string => {
  const normalizedTitle = nodeData.title.trim();
  return normalizedTitle.length > 0 ? normalizedTitle : "Untitled";
};

export const normalizeConversationSlotTermTypeLabel = (
  termType: string | null
): string => {
  if (typeof termType !== "string") {
    return "Untyped";
  }

  const normalizedTermType = termType.trim();
  if (normalizedTermType.length === 0) {
    return "Untyped";
  }

  const canonicalTermType =
    normalizedTermType.toLowerCase() === "term"
      ? "menu_term"
      : normalizedTermType.toLowerCase();

  return (
    TERM_REGISTRY_TERM_TYPE_LABELS[canonicalTermType] ??
    TERM_REGISTRY_TERM_TYPE_LABELS[normalizedTermType] ??
    normalizedTermType
  );
};

export const buildUiJourneyConversationConnectionMetaByNodeId = ({
  nodes,
  includedNodeIds,
  edges,
}: {
  nodes: FlowNode[];
  includedNodeIds: string[];
  edges: FlowEdge[];
}): Record<string, UiJourneyConversationConnectionMeta> => {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const normalizedIncludedNodeIds = Array.from(new Set(includedNodeIds));
  const includedNodeIdSet = new Set(normalizedIncludedNodeIds);
  const adjacency = new Map<string, Set<string>>();
  const internalConnectorIdsByNodeId = new Map<string, Set<string>>();
  const allConnectorIdsByNodeId = new Map<string, Set<string>>();

  normalizedIncludedNodeIds.forEach((nodeId) => {
    adjacency.set(nodeId, new Set<string>());
    internalConnectorIdsByNodeId.set(nodeId, new Set<string>());
    allConnectorIdsByNodeId.set(nodeId, new Set<string>());
  });

  const hasValidFrameMembers = (nodeId: string): boolean => {
    const currentNode = nodeById.get(nodeId);
    if (!currentNode || currentNode.data.node_type !== "frame") {
      return false;
    }

    return normalizeFrameNodeConfig(currentNode.data.frame_config).member_node_ids.some(
      (memberNodeId) => {
        const memberNode = nodeById.get(memberNodeId);
        return Boolean(memberNode && memberNode.data.node_type !== "frame");
      }
    );
  };

  edges.forEach((edge) => {
    const sourceIncluded = includedNodeIdSet.has(edge.source);
    const targetIncluded = includedNodeIdSet.has(edge.target);

    if (!sourceIncluded && !targetIncluded) {
      return;
    }

    if (sourceIncluded) {
      allConnectorIdsByNodeId.get(edge.source)?.add(edge.id);
    }

    if (targetIncluded) {
      allConnectorIdsByNodeId.get(edge.target)?.add(edge.id);
    }

    if (!sourceIncluded || !targetIncluded) {
      return;
    }

    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);

    internalConnectorIdsByNodeId.get(edge.source)?.add(edge.id);
    internalConnectorIdsByNodeId.get(edge.target)?.add(edge.id);
  });

  const metaByNodeId: Record<string, UiJourneyConversationConnectionMeta> = {};
  const visitedNodeIds = new Set<string>();
  let nextGroupIndex = 0;

  normalizedIncludedNodeIds
    .slice()
    .sort((a, b) => a.localeCompare(b))
    .forEach((nodeId) => {
      if (visitedNodeIds.has(nodeId)) {
        return;
      }

      const neighbors = adjacency.get(nodeId);
      const hasInternalNeighbor = Boolean(neighbors && neighbors.size > 0);

      if (!hasInternalNeighbor) {
        visitedNodeIds.add(nodeId);

        const connectorIds = Array.from(allConnectorIdsByNodeId.get(nodeId) ?? []).sort(
          (a, b) => a.localeCompare(b)
        );
        const isOrphan = connectorIds.length === 0 && !hasValidFrameMembers(nodeId);

        metaByNodeId[nodeId] = {
          groupId: isOrphan ? null : `group:external:${nodeId}`,
          groupIndex: isOrphan ? null : nextGroupIndex++,
          connectorIds,
          connectedNodeIds: [],
          isOrphan,
        };

        return;
      }

      const queue = [nodeId];
      const componentNodeIds: string[] = [];
      const componentConnectorIds = new Set<string>();

      visitedNodeIds.add(nodeId);

      while (queue.length > 0) {
        const currentNodeId = queue.shift();
        if (!currentNodeId) {
          continue;
        }

        componentNodeIds.push(currentNodeId);

        internalConnectorIdsByNodeId.get(currentNodeId)?.forEach((connectorId) => {
          componentConnectorIds.add(connectorId);
        });

        adjacency.get(currentNodeId)?.forEach((neighborNodeId) => {
          if (visitedNodeIds.has(neighborNodeId)) {
            return;
          }

          visitedNodeIds.add(neighborNodeId);
          queue.push(neighborNodeId);
        });
      }

      const normalizedComponentNodeIds = componentNodeIds
        .slice()
        .sort((a, b) => a.localeCompare(b));
      const groupId = `group:${normalizedComponentNodeIds.join("|")}`;
      const groupIndex = nextGroupIndex++;
      const connectorIds = Array.from(componentConnectorIds).sort((a, b) =>
        a.localeCompare(b)
      );

      normalizedComponentNodeIds.forEach((componentNodeId) => {
        metaByNodeId[componentNodeId] = {
          groupId,
          groupIndex,
          connectorIds,
          connectedNodeIds: normalizedComponentNodeIds.filter(
            (candidateNodeId) => candidateNodeId !== componentNodeId
          ),
          isOrphan: false,
        };
      });
    });

  normalizedIncludedNodeIds.forEach((nodeId) => {
    if (metaByNodeId[nodeId]) {
      return;
    }

    const connectorIds = Array.from(allConnectorIdsByNodeId.get(nodeId) ?? []).sort((a, b) =>
      a.localeCompare(b)
    );
    const isOrphan = connectorIds.length === 0 && !hasValidFrameMembers(nodeId);

    metaByNodeId[nodeId] = {
      groupId: isOrphan ? null : `group:external:${nodeId}`,
      groupIndex: isOrphan ? null : nextGroupIndex++,
      connectorIds,
      connectedNodeIds: [],
      isOrphan,
    };
  });

  return metaByNodeId;
};

export const buildUiJourneyConversationFields = (
  nodeId: string,
  nodeData: MicrocopyNodeData
): UiJourneyConversationField[] => {
  if (
    nodeData.node_type === "vertical_multi_term" ||
    nodeData.node_type === "horizontal_multi_term"
  ) {
    const layout =
      nodeData.node_type === "horizontal_multi_term" ? "horizontal" : "vertical";
    const normalizedContentConfig = normalizeNodeContentConfig(
      nodeData.content_config,
      layout
    );

    const sortedGroups = [...normalizedContentConfig.groups].sort((a, b) => {
      if (a.row !== b.row) {
        return a.row - b.row;
      }

      return a.column - b.column;
    });

    return sortedGroups.flatMap((group) =>
      normalizedContentConfig.slots
        .filter((slot) => slot.groupId === group.id)
        .sort((a, b) => a.position - b.position)
        .flatMap((slot) => {
          const normalizedValue = slot.value.trim();
          if (!normalizedValue) {
            return [];
          }

          return [
            {
              id: buildUiJourneyConversationFieldId(nodeId, `content_slot:${slot.id}`),
              sourceKey: `content_slot:${slot.id}`,
              label: normalizeConversationSlotTermTypeLabel(slot.termType),
              value: normalizedValue,
            },
          ];
        })
    );
  }

  const normalizedContentConfig = normalizeNodeContentConfig(
    nodeData.content_config,
    "single"
  );

  return [...normalizedContentConfig.slots]
    .sort((a, b) => a.position - b.position)
    .flatMap((slot) => {
      const normalizedValue = slot.value.trim();
      if (!normalizedValue) {
        return [];
      }

      return [
        {
          id: buildUiJourneyConversationFieldId(nodeId, `content_slot:${slot.id}`),
          sourceKey: `content_slot:${slot.id}`,
          label: normalizeConversationSlotTermTypeLabel(slot.termType),
          value: normalizedValue,
        },
      ];
    });
};

const buildUiJourneyConversationRibbonHeaderFields = (
  nodeId: string,
  nodeData: MicrocopyNodeData
): UiJourneyConversationField[] => {
  const fields: UiJourneyConversationField[] = [];

  const addField = (label: string, sourceKey: string, value: string) => {
    const normalizedValue = value.trim();
    if (!normalizedValue) {
      return;
    }

    fields.push({
      id: buildUiJourneyConversationFieldId(nodeId, sourceKey),
      sourceKey,
      label,
      value: normalizedValue,
    });
  };

  addField("Concept", "concept", nodeData.concept);
  addField("Notes", "notes", nodeData.notes);

  return fields;
};

const buildUiJourneyConversationVmnHeaderFields = (
  nodeId: string,
  nodeData: MicrocopyNodeData
): UiJourneyConversationField[] => {
  const fields: UiJourneyConversationField[] = [];

  const addField = (label: string, sourceKey: string, value: string) => {
    const normalizedValue = value.trim();
    if (!normalizedValue) {
      return;
    }

    fields.push({
      id: buildUiJourneyConversationFieldId(nodeId, sourceKey),
      sourceKey,
      label,
      value: normalizedValue,
    });
  };

  addField("Concept", "concept", nodeData.concept);
  addField("Notes", "notes", nodeData.notes);

  return fields;
};

export const cloneUiJourneyConversationEntries = (
  entries: UiJourneyConversationEntry[]
): UiJourneyConversationEntry[] =>
  entries.map((entry) => ({
    entryId: entry.entryId,
    nodeInstanceId: entry.nodeInstanceId,
    titleFieldId: entry.titleFieldId,
    nodeId: entry.nodeId,
    nodeType: entry.nodeType,
    sequence: entry.sequence,
    title: entry.title,
    fields: entry.fields.map((field) => ({
      id: field.id,
      sourceKey: field.sourceKey,
      label: field.label,
      value: field.value,
    })),
    connectionMeta: {
      groupId: entry.connectionMeta.groupId,
      groupIndex: entry.connectionMeta.groupIndex,
      connectorIds: [...entry.connectionMeta.connectorIds],
      connectedNodeIds: [...entry.connectionMeta.connectedNodeIds],
      isOrphan: entry.connectionMeta.isOrphan,
    },
    bodyText: entry.bodyText,
    notes: entry.notes,
    concept: entry.concept,
    tone: entry.tone,
    polarity: entry.polarity,
    reversibility: entry.reversibility,
    actionTypeName: entry.actionTypeName,
    actionTypeColor: entry.actionTypeColor,
  }));

export const sanitizeUniqueStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const sanitized: string[] = [];

  value.forEach((item) => {
    if (typeof item !== "string") {
      return;
    }

    const nextValue = item.trim();
    if (!nextValue || seen.has(nextValue)) {
      return;
    }

    seen.add(nextValue);
    sanitized.push(nextValue);
  });

  return sanitized;
};

export const sanitizeUiJourneyConversationEntries = (
  value: unknown
): UiJourneyConversationEntry[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const source = item as Partial<UiJourneyConversationEntry>;
    const nodeId = typeof source.nodeId === "string" ? source.nodeId.trim() : "";
    if (!nodeId) {
      return [];
    }

    const title = typeof source.title === "string" ? source.title : "";
    const bodyText =
      typeof source.bodyText === "string" ? source.bodyText.trim() : "";
    const notes = typeof source.notes === "string" ? source.notes.trim() : "";
    const sequence =
      typeof source.sequence === "number" && Number.isFinite(source.sequence)
        ? source.sequence
        : null;
    const nodeType = isNodeType(source.nodeType) ? source.nodeType : "default";
    const entryId =
      typeof source.entryId === "string" && source.entryId.trim().length > 0
        ? source.entryId.trim()
        : buildUiJourneyConversationEntryId(nodeId, sequence);
    const nodeInstanceId =
      typeof source.nodeInstanceId === "string" && source.nodeInstanceId.trim().length > 0
        ? source.nodeInstanceId.trim()
        : nodeId;
    const titleFieldId =
      typeof source.titleFieldId === "string" && source.titleFieldId.trim().length > 0
        ? source.titleFieldId.trim()
        : buildUiJourneyConversationTitleFieldId(nodeId);

    const fields = Array.isArray(source.fields)
      ? source.fields.flatMap((fieldItem) => {
          if (!fieldItem || typeof fieldItem !== "object") {
            return [];
          }

          const fieldSource = fieldItem as Partial<UiJourneyConversationField>;
          const label =
            typeof fieldSource.label === "string" ? fieldSource.label.trim() : "";
          const value = typeof fieldSource.value === "string" ? fieldSource.value : "";
          const fallbackSourceKey =
            typeof fieldSource.sourceKey === "string" && fieldSource.sourceKey.trim().length > 0
              ? fieldSource.sourceKey.trim()
              : label
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "_")
                  .replace(/^_+|_+$/g, "") || "field";
          const fieldId =
            typeof fieldSource.id === "string" && fieldSource.id.trim().length > 0
              ? fieldSource.id.trim()
              : buildUiJourneyConversationFieldId(nodeId, fallbackSourceKey);

          if (!label || value.trim().length === 0) {
            return [];
          }

          return [
            {
              id: fieldId,
              sourceKey: fallbackSourceKey,
              label,
              value,
            },
          ];
        })
      : [];

    const rawConnectionMeta =
      source.connectionMeta && typeof source.connectionMeta === "object"
        ? source.connectionMeta
        : null;
    const connectorIds = sanitizeUniqueStringArray(rawConnectionMeta?.connectorIds);
    const connectedNodeIds = sanitizeUniqueStringArray(rawConnectionMeta?.connectedNodeIds);
    const groupId =
      typeof rawConnectionMeta?.groupId === "string" && rawConnectionMeta.groupId.trim().length > 0
        ? rawConnectionMeta.groupId.trim()
        : null;
    const groupIndex =
      typeof rawConnectionMeta?.groupIndex === "number" &&
      Number.isFinite(rawConnectionMeta.groupIndex)
        ? rawConnectionMeta.groupIndex
        : null;
    const isOrphan =
      typeof rawConnectionMeta?.isOrphan === "boolean"
        ? rawConnectionMeta.isOrphan
        : groupId === null && connectorIds.length === 0 && connectedNodeIds.length === 0;

    return [
      {
        entryId,
        nodeInstanceId,
        titleFieldId,
        nodeId,
        nodeType,
        sequence,
        title,
        fields,
        bodyText,
        notes,
        connectionMeta: {
          groupId,
          groupIndex,
          connectorIds,
          connectedNodeIds,
          isOrphan,
        },
      },
    ];
  });
};

export const createUiJourneySnapshotPresetId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `snapshot-${crypto.randomUUID()}`
    : `snapshot-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

export const sanitizeUiJourneySnapshotPresets = (
  value: unknown
): UiJourneySnapshotPreset[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const usedIds = new Set<string>();

  return value.flatMap((item, index) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const source = item as Partial<UiJourneySnapshotPreset>;
    const rawId = typeof source.id === "string" ? source.id.trim() : "";
    const baseId = rawId || createUiJourneySnapshotPresetId();

    let nextId = baseId;
    let duplicateCounter = 1;
    while (usedIds.has(nextId)) {
      nextId = `${baseId}-${duplicateCounter}`;
      duplicateCounter += 1;
    }
    usedIds.add(nextId);

    const name =
      typeof source.name === "string" && source.name.trim().length > 0
        ? source.name.trim()
        : `Snapshot ${index + 1}`;

    const createdAt =
      typeof source.createdAt === "string" && source.createdAt.length > 0
        ? source.createdAt
        : new Date().toISOString();
    const updatedAt =
      typeof source.updatedAt === "string" && source.updatedAt.length > 0
        ? source.updatedAt
        : createdAt;

    return [
      {
        id: nextId,
        name,
        createdAt,
        updatedAt,
        nodeIds: sanitizeUniqueStringArray(source.nodeIds),
        edgeIds: sanitizeUniqueStringArray(source.edgeIds),
        conversation: sanitizeUiJourneyConversationEntries(source.conversation),
      },
    ];
  });
};

export const cloneUiJourneySnapshotPresets = (
  presets: UiJourneySnapshotPreset[]
): UiJourneySnapshotPreset[] =>
  presets.map((preset) => ({
    id: preset.id,
    name: preset.name,
    createdAt: preset.createdAt,
    updatedAt: preset.updatedAt,
    nodeIds: [...preset.nodeIds],
    edgeIds: [...preset.edgeIds],
    conversation: cloneUiJourneyConversationEntries(preset.conversation),
  }));

export const resolveUiJourneyConversationIncludedNodeIds = ({
  nodes,
  selectedNodeIds,
}: {
  nodes: FlowNode[];
  selectedNodeIds: string[];
}): string[] => {
  if (selectedNodeIds.length === 0) {
    return [];
  }

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const frameIdsByMemberNodeId = new Map<string, Set<string>>();

  nodes.forEach((node) => {
    if (node.data.node_type !== "frame") {
      return;
    }

    const frameConfig = normalizeFrameNodeConfig(node.data.frame_config);
    const validMemberNodeIds = frameConfig.member_node_ids.filter((memberNodeId) => {
      const memberNode = nodeById.get(memberNodeId);
      return Boolean(memberNode && memberNode.data.node_type !== "frame");
    });

    validMemberNodeIds.forEach((memberNodeId) => {
      const existingFrameIds = frameIdsByMemberNodeId.get(memberNodeId);
      if (existingFrameIds) {
        existingFrameIds.add(node.id);
        return;
      }

      frameIdsByMemberNodeId.set(memberNodeId, new Set([node.id]));
    });
  });

  const includedNodeIds = new Set<string>();
  const queue: string[] = [];

  const enqueueNodeId = (nodeId: string) => {
    if (!nodeById.has(nodeId) || includedNodeIds.has(nodeId)) {
      return;
    }

    includedNodeIds.add(nodeId);
    queue.push(nodeId);
  };

  selectedNodeIds.forEach(enqueueNodeId);

  while (queue.length > 0) {
    const currentNodeId = queue.shift();
    if (!currentNodeId) {
      continue;
    }

    const currentNode = nodeById.get(currentNodeId);
    if (!currentNode) {
      continue;
    }

    if (currentNode.data.node_type === "frame") {
      continue;
    }

    const containingFrameIds = frameIdsByMemberNodeId.get(currentNodeId);
    containingFrameIds?.forEach(enqueueNodeId);
  }

  return Array.from(includedNodeIds);
};

export const buildUiJourneyConversationEntries = ({
  nodes,
  edges,
  ordering,
  selectedNodeIds,
}: {
  nodes: FlowNode[];
  edges: FlowEdge[];
  ordering: FlowOrderingResult;
  selectedNodeIds: string[];
}): UiJourneyConversationEntry[] => {
  if (selectedNodeIds.length === 0) {
    return [];
  }

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const includedNodeIds = new Set(
    resolveUiJourneyConversationIncludedNodeIds({
      nodes,
      selectedNodeIds,
    })
  );

  const orderedIncludedNodeIds = ordering.orderedNodeIds
    .filter((nodeId) => includedNodeIds.has(nodeId))
    .slice();

  const connectionMetaByNodeId = buildUiJourneyConversationConnectionMetaByNodeId({
    nodes,
    includedNodeIds: orderedIncludedNodeIds,
    edges,
  });

  return orderedIncludedNodeIds
    .flatMap((nodeId) => {
      const node = nodeById.get(nodeId);
      if (!node) {
        return [];
      }

      const sequence = ordering.sequenceByNodeId[nodeId] ?? null;
      const fallbackConnectionMeta: UiJourneyConversationConnectionMeta = {
        groupId: null,
        groupIndex: null,
        connectorIds: [],
        connectedNodeIds: [],
        isOrphan: true,
      };

      if (node.data.node_type === "horizontal_multi_term") {
        const ribbonHeaderEntry: UiJourneyConversationEntry = {
          entryId: buildUiJourneyConversationEntryId(nodeId, sequence),
          nodeInstanceId: nodeId,
          titleFieldId: buildUiJourneyConversationTitleFieldId(nodeId),
          nodeId,
          nodeType: "horizontal_multi_term",
          sequence,
          title: getUiJourneyConversationTitle(node.data),
          fields: buildUiJourneyConversationRibbonHeaderFields(nodeId, node.data),
          bodyText: "",
          notes: "",
          concept: (node.data.concept ?? "").trim(),
          tone: (node.data.tone ?? "").trim(),
          polarity: (node.data.polarity ?? "").trim(),
          reversibility: (node.data.reversibility ?? "").trim(),
          actionTypeName: (node.data.action_type_name ?? "").trim(),
          actionTypeColor: (node.data.action_type_color ?? "").trim(),
          connectionMeta: connectionMetaByNodeId[nodeId] ?? fallbackConnectionMeta,
        };

        const normalizedContentConfig = normalizeNodeContentConfig(
          node.data.content_config,
          "horizontal"
        );

        const sortedGroups = [...normalizedContentConfig.groups].sort((a, b) => {
          if (a.row !== b.row) {
            return a.row - b.row;
          }

          return a.column - b.column;
        });

        const ribbonCellEntries: UiJourneyConversationEntry[] = sortedGroups
          .filter((group) => {
            const cellSourceHandlePrefix = `${HMN_SOURCE_HANDLE_PREFIX}${group.id}`;

            return edges.some((edge) => {
              if (edge.source !== nodeId) {
                return false;
              }

              if (!isSequentialEdge(edge)) {
                return false;
              }

              if (!includedNodeIds.has(edge.target)) {
                return false;
              }

              return (
                typeof edge.sourceHandle === "string" &&
                edge.sourceHandle.startsWith(cellSourceHandlePrefix)
              );
            });
          })
          .map((group) => {
            const cellScopedNodeId = `${nodeId}:cell:${group.id}`;
            const groupSlots = normalizedContentConfig.slots
              .filter((slot) => slot.groupId === group.id)
              .sort((a, b) => a.position - b.position);
            const labelSlot = groupSlots.find(
              (slot) => slot.termType?.trim().toLowerCase() === "cell_label"
            );
            const normalizedCellLabel = (labelSlot?.value ?? "").trim();

            return {
              entryId: buildUiJourneyConversationRibbonCellEntryId(nodeId, group.id, sequence),
              nodeInstanceId: cellScopedNodeId,
              titleFieldId: buildUiJourneyConversationTitleFieldId(cellScopedNodeId),
              nodeId,
              nodeType: "default",
              sequence,
              title:
                normalizedCellLabel.length > 0
                  ? normalizedCellLabel
                  : `Cell ${group.column + 1}`,
              fields: groupSlots.flatMap((slot) => {
                const normalizedValue = slot.value.trim();
                if (!normalizedValue) {
                  return [];
                }

                return [
                  {
                    id: buildUiJourneyConversationFieldId(
                      nodeId,
                      `content_slot:${slot.id}`
                    ),
                    sourceKey: `content_slot:${slot.id}`,
                    label: normalizeConversationSlotTermTypeLabel(slot.termType),
                    value: normalizedValue,
                  },
                ];
              }),
              bodyText: "",
              notes: "",
              concept: (node.data.concept ?? "").trim(),
              tone: (node.data.tone ?? "").trim(),
              polarity: (node.data.polarity ?? "").trim(),
              reversibility: (node.data.reversibility ?? "").trim(),
              actionTypeName: (node.data.action_type_name ?? "").trim(),
              actionTypeColor: (node.data.action_type_color ?? "").trim(),
              connectionMeta: connectionMetaByNodeId[nodeId] ?? fallbackConnectionMeta,
            };
          });

        return [ribbonHeaderEntry, ...ribbonCellEntries];
      }

      if (node.data.node_type === "vertical_multi_term") {
        const vmnHeaderEntry: UiJourneyConversationEntry = {
          entryId: buildUiJourneyConversationEntryId(nodeId, sequence),
          nodeInstanceId: nodeId,
          titleFieldId: buildUiJourneyConversationTitleFieldId(nodeId),
          nodeId,
          nodeType: "vertical_multi_term",
          sequence,
          title: getUiJourneyConversationTitle(node.data),
          fields: buildUiJourneyConversationVmnHeaderFields(nodeId, node.data),
          bodyText: "",
          notes: "",
          concept: (node.data.concept ?? "").trim(),
          tone: (node.data.tone ?? "").trim(),
          polarity: (node.data.polarity ?? "").trim(),
          reversibility: (node.data.reversibility ?? "").trim(),
          actionTypeName: (node.data.action_type_name ?? "").trim(),
          actionTypeColor: (node.data.action_type_color ?? "").trim(),
          connectionMeta: connectionMetaByNodeId[nodeId] ?? fallbackConnectionMeta,
        };

        const normalizedContentConfig = normalizeNodeContentConfig(
          node.data.content_config,
          "vertical"
        );

        const sortedGroups = [...normalizedContentConfig.groups].sort((a, b) => {
          if (a.row !== b.row) {
            return a.row - b.row;
          }

          return a.column - b.column;
        });

        const vmnGroupEntries: UiJourneyConversationEntry[] = sortedGroups
          .filter((group) => {
            const groupSourceHandlePrefix = `${VMN_SOURCE_HANDLE_PREFIX}${group.id}`;

            return edges.some((edge) => {
              if (edge.source !== nodeId) {
                return false;
              }

              if (!isSequentialEdge(edge)) {
                return false;
              }

              if (!includedNodeIds.has(edge.target)) {
                return false;
              }

              return (
                typeof edge.sourceHandle === "string" &&
                edge.sourceHandle.startsWith(groupSourceHandlePrefix)
              );
            });
          })
          .map((group) => {
            const groupScopedNodeId = `${nodeId}:cell:${group.id}`;
            const groupSlots = normalizedContentConfig.slots
              .filter((slot) => slot.groupId === group.id)
              .sort((a, b) => a.position - b.position);
            const primarySlot = groupSlots.find((slot) => slot.position === 0);
            const normalizedPrimarySlotValue = (primarySlot?.value ?? "").trim();

            return {
              entryId: buildUiJourneyConversationRibbonCellEntryId(nodeId, group.id, sequence),
              nodeInstanceId: groupScopedNodeId,
              titleFieldId: buildUiJourneyConversationTitleFieldId(groupScopedNodeId),
              nodeId,
              nodeType: "default",
              sequence,
              title:
                normalizedPrimarySlotValue.length > 0
                  ? normalizedPrimarySlotValue
                  : `Term ${group.column + 1}`,
              fields: groupSlots.flatMap((slot) => {
                const normalizedValue = slot.value.trim();
                if (!normalizedValue) {
                  return [];
                }

                return [
                  {
                    id: buildUiJourneyConversationFieldId(
                      nodeId,
                      `content_slot:${slot.id}`
                    ),
                    sourceKey: `content_slot:${slot.id}`,
                    label: normalizeConversationSlotTermTypeLabel(slot.termType),
                    value: normalizedValue,
                  },
                ];
              }),
              bodyText: "",
              notes: "",
              concept: (node.data.concept ?? "").trim(),
              tone: (node.data.tone ?? "").trim(),
              polarity: (node.data.polarity ?? "").trim(),
              reversibility: (node.data.reversibility ?? "").trim(),
              actionTypeName: (node.data.action_type_name ?? "").trim(),
              actionTypeColor: (node.data.action_type_color ?? "").trim(),
              connectionMeta: connectionMetaByNodeId[nodeId] ?? fallbackConnectionMeta,
            };
          });

        return [vmnHeaderEntry, ...vmnGroupEntries];
      }

      return [
        {
        entryId: buildUiJourneyConversationEntryId(nodeId, sequence),
        nodeInstanceId: nodeId,
        titleFieldId: buildUiJourneyConversationTitleFieldId(nodeId),
        nodeId,
        nodeType: node.data.node_type,
        sequence,
        title: getUiJourneyConversationTitle(node.data),
        fields: buildUiJourneyConversationFields(nodeId, node.data),
        bodyText: (node.data.body_text ?? "").trim(),
        notes: (node.data.notes ?? "").trim(),
        concept: (node.data.concept ?? "").trim(),
        tone: (node.data.tone ?? "").trim(),
        polarity: (node.data.polarity ?? "").trim(),
        reversibility: (node.data.reversibility ?? "").trim(),
        actionTypeName: (node.data.action_type_name ?? "").trim(),
        actionTypeColor: (node.data.action_type_color ?? "").trim(),
        connectionMeta: connectionMetaByNodeId[nodeId] ?? fallbackConnectionMeta,
      },
      ];
    });
};

export const buildUiJourneySnapshotCapture = ({
  nodes,
  edges,
  ordering,
  selectedNodeIds,
}: {
  nodes: FlowNode[];
  edges: FlowEdge[];
  ordering: FlowOrderingResult;
  selectedNodeIds: string[];
}): UiJourneySnapshotCapture => {
  const conversation = buildUiJourneyConversationEntries({
    nodes,
    edges,
    ordering,
    selectedNodeIds,
  });

  if (conversation.length === 0) {
    return {
      nodeIds: [],
      edgeIds: [],
      conversation: [],
    };
  }

  const nodeIds = conversation.map((entry) => entry.nodeId);
  const nodeIdSet = new Set(nodeIds);

  const edgeIds = edges
    .filter(
      (edge) => nodeIdSet.has(edge.source) && nodeIdSet.has(edge.target)
    )
    .map((edge) => edge.id);

  return {
    nodeIds,
    edgeIds,
    conversation,
  };
};
