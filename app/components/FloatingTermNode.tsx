import { useContext, type CSSProperties } from "react";
import type { NodeProps } from "@xyflow/react";

import { FloatingTermCallbacksContext } from "../lib/floating-term-context";
import { theme } from "../lib/theme";

type FloatingTermNodeData = {
  value: string;
  entryId: string;
};

const BASE_PILL_STYLE: CSSProperties = {
  maxWidth: 280,
  padding: "6px 10px",
  borderRadius: theme.modal.sectionRadius,
  border: theme.toast.border,
  background: theme.toast.bg,
  color: theme.toast.text,
  fontSize: theme.toast.bodyFontSize,
  fontWeight: theme.toast.weight,
  boxShadow: theme.toast.shadow,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  cursor: "pointer",
};

export default function FloatingTermNode({ data, selected }: NodeProps) {
  const d = data as FloatingTermNodeData;
  const callbacks = useContext(FloatingTermCallbacksContext);
  const style: CSSProperties = {
    ...BASE_PILL_STYLE,
    ...(selected
      ? {
          outline: theme.node.borderSelected,
          outlineOffset: 2,
          boxShadow: `${theme.toast.shadow}, ${theme.node.selectedShadow}`,
        }
      : {}),
  };

  return (
    <div
      style={style}
      onClick={(event) => {
        event.stopPropagation();
        // ReactFlow handles selection; do not open overlay on single-click.
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        callbacks?.onPillClick(d.entryId);
      }}
    >
      {d.value}
    </div>
  );
}