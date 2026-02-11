"use client";

import React, { useCallback } from "react";
import {
  ReactFlow,
  addEdge,
  Background,
  Controls,
  MiniMap,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type ReactFlowInstance,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

const initialNodes: Node[] = [
  { id: "1", position: { x: 100, y: 120 }, data: { label: "Start" } },
  { id: "2", position: { x: 420, y: 120 }, data: { label: "Next" } },
];

const initialEdges: Edge[] = [{ id: "e1-2", source: "1", target: "2" }];

export default function Page() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onInit = useCallback((instance: ReactFlowInstance) => {
    (window as any).__rf = instance;
  }, []);

  const addNodeAtEvent = useCallback(
    (event: React.MouseEvent) => {
      const rf: ReactFlowInstance | undefined = (window as any).__rf;
      if (!rf) return;

      const position = rf.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : String(Date.now());

      setNodes((nds) => [
        ...nds,
        {
          id,
          position,
          data: { label: "New Node (double-click to edit)" },
        },
      ]);
    },
    [setNodes]
  );

  const onNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const next = window.prompt(
        "Edit node label:",
        String((node.data as any)?.label ?? "")
      );
      if (next === null) return;

      setNodes((nds) =>
        nds.map((n) =>
          n.id === node.id
            ? { ...n, data: { ...(n.data as any), label: next } }
            : n
        )
      );
    },
    [setNodes]
  );

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onInit={onInit}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDoubleClick={onNodeDoubleClick}
        fitView
      >
        <Background />
        <MiniMap />
        <Controls />
      </ReactFlow>

      {/* Transparent overlay to reliably catch double-click on empty canvas */}
      <div
        onDoubleClick={(e) => {
          // If you double-clicked a node, don't add a new one.
          const el = e.target as HTMLElement;
          if (el.closest(".react-flow__node")) return;

          e.preventDefault();
          e.stopPropagation();
          addNodeAtEvent(e);
        }}
        style={{
          position: "absolute",
          inset: 0,
          background: "transparent",
          pointerEvents: "auto",
        }}
      />
    </div>
  );
}
