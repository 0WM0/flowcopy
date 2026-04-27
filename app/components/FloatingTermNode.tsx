import type { CSSProperties } from "react";
import type { NodeProps } from "@xyflow/react";

import { theme } from "../lib/theme";

type FloatingTermNodeData = {
  value: string;
  entryId: string;
  onPillClick: (entryId: string) => void;
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
  return (
    <div
      style={BASE_PILL_STYLE}
      onClick={(event) => {
        event.stopPropagation();
        d.onPillClick(d.entryId);
      }}
    >
      {d.value}
    </div>
  );
}