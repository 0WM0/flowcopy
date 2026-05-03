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

export default function FloatingTermNode({ data, selected, id }: NodeProps) {
  const d = data as FloatingTermNodeData;
  const callbacks = useContext(FloatingTermCallbacksContext);
  const highlightedNodeIds = callbacks?.highlightedNodeIds;
  const isHighlighted = highlightedNodeIds?.has(id) ?? false;
  const style: CSSProperties = {
    ...BASE_PILL_STYLE,
    ...(selected
      ? {
          outline: theme.node.borderSelected,
          outlineOffset: 2,
          boxShadow: `${theme.toast.shadow}, ${theme.node.selectedShadow}`,
        }
      : {}),
    ...(isHighlighted
      ? {
          outline: `2px solid ${theme.clp.audit.highlight.borderColor}`,
          outlineOffset: 2,
        }
      : {}),
  };

  return (
    <div
      style={style}
      onDoubleClick={(event) => {
        event.stopPropagation();
        callbacks?.onPillClick(d.entryId);
      }}
    >
      {d.value}
    </div>
  );
}