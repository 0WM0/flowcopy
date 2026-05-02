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

export default function FloatingTermNode({ data }: NodeProps) {
  const d = data as FloatingTermNodeData;
  const callbacks = useContext(FloatingTermCallbacksContext);
  return (
    <div
      style={BASE_PILL_STYLE}
      onClick={(event) => {
        event.stopPropagation();
        callbacks?.onPillClick(d.entryId);
      }}
    >
      {d.value}
    </div>
  );
}