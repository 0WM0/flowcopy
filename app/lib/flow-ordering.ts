import type { FlowNode, FlowEdge, FlowOrderingResult, ParallelGroupInfo } from "../types";
import { isParallelEdge, isSequentialEdge } from "./edge-utils";

export const compareNodeOrder = (a: FlowNode, b: FlowNode): number => {
  if (a.position.x !== b.position.x) {
    return a.position.x - b.position.x;
  }

  if (a.position.y !== b.position.y) {
    return a.position.y - b.position.y;
  }

  return a.id.localeCompare(b.id);
};

export const buildParallelGroupId = (componentNodeIds: string[]): string =>
  `PG-${componentNodeIds.slice().sort((a, b) => a.localeCompare(b)).join("|")}`;

export const computeParallelGroups = (
  nodes: FlowNode[],
  edges: FlowEdge[]
): ParallelGroupInfo => {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const adjacency = new Map<string, Set<string>>();
  const visited = new Set<string>();

  nodes.forEach((node) => {
    adjacency.set(node.id, new Set<string>());
  });

  edges.forEach((edge) => {
    if (!isParallelEdge(edge)) {
      return;
    }

    if (!nodeById.has(edge.source) || !nodeById.has(edge.target)) {
      return;
    }

    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  });

  const sortedNodes = nodes.slice().sort(compareNodeOrder);
  const componentNodeIds: string[][] = [];
  const parallelGroupByNodeId: Partial<Record<string, string>> = {};

  sortedNodes.forEach((node) => {
    if (visited.has(node.id)) {
      return;
    }

    visited.add(node.id);

    const neighbors = adjacency.get(node.id);
    if (!neighbors || neighbors.size === 0) {
      return;
    }

    const component: string[] = [];
    const stack = [node.id];

    while (stack.length > 0) {
      const currentNodeId = stack.pop();
      if (!currentNodeId) {
        continue;
      }

      component.push(currentNodeId);

      const currentNeighbors = Array.from(adjacency.get(currentNodeId) ?? []).sort((a, b) =>
        a.localeCompare(b)
      );

      currentNeighbors.forEach((neighborNodeId) => {
        if (visited.has(neighborNodeId)) {
          return;
        }

        visited.add(neighborNodeId);
        stack.push(neighborNodeId);
      });
    }

    const normalizedComponent = component.sort((a, b) => a.localeCompare(b));
    const groupId = buildParallelGroupId(normalizedComponent);

    componentNodeIds.push(normalizedComponent);
    normalizedComponent.forEach((nodeId) => {
      parallelGroupByNodeId[nodeId] = groupId;
    });
  });

  componentNodeIds.sort((a, b) => {
    const first = a[0] ?? "";
    const second = b[0] ?? "";
    return first.localeCompare(second);
  });

  return {
    parallelGroupByNodeId,
    componentNodeIds,
  };
};

export const computeFlowOrdering = (nodes: FlowNode[], edges: FlowEdge[]): FlowOrderingResult => {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const sequentialEdges = edges.filter((edge) => isSequentialEdge(edge));
  const adjacency = new Map<string, Set<string>>();
  const indegree = new Map<string, number>();

  nodes.forEach((node) => {
    adjacency.set(node.id, new Set<string>());
    indegree.set(node.id, 0);
  });

  sequentialEdges.forEach((edge) => {
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

  const parallelGroupInfo = computeParallelGroups(nodes, edges);
  parallelGroupInfo.componentNodeIds.forEach((component) => {
    const componentIndices = component
      .map((nodeId) => sequenceByNodeId[nodeId])
      .filter((value): value is number => typeof value === "number");

    if (componentIndices.length === 0) {
      return;
    }

    const normalizedIndex = Math.min(...componentIndices);
    component.forEach((nodeId) => {
      sequenceByNodeId[nodeId] = normalizedIndex;
    });
  });

  const orderedNodeIdsBySequence = nodes
    .slice()
    .sort((a, b) => {
      const sequenceA = sequenceByNodeId[a.id] ?? Number.MAX_SAFE_INTEGER;
      const sequenceB = sequenceByNodeId[b.id] ?? Number.MAX_SAFE_INTEGER;

      if (sequenceA !== sequenceB) {
        return sequenceA - sequenceB;
      }

      return compareNodeOrder(a, b);
    })
    .map((node) => node.id);

  return {
    orderedNodeIds: orderedNodeIdsBySequence,
    sequentialOrderedNodeIds: orderedNodeIds,
    sequenceByNodeId,
    parallelGroupByNodeId: parallelGroupInfo.parallelGroupByNodeId,
    hasCycle,
  };
};

export const hashToBase36 = (value: string): string => {
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

export const computeProjectSequenceId = (
  orderedNodeIds: string[],
  nodes: FlowNode[],
  edges: FlowEdge[]
): string => {
  const validNodeIds = new Set(nodes.map((node) => node.id));

  const edgeSignature = edges
    .filter(
      (edge) =>
        isSequentialEdge(edge) && validNodeIds.has(edge.source) && validNodeIds.has(edge.target)
    )
    .map((edge) => `${edge.source}->${edge.target}`)
    .sort()
    .join("|");

  const payload = `v1|order:${orderedNodeIds.join(">")}|edges:${edgeSignature}`;
  return `FLOW-${hashToBase36(payload)}`;
};
