import { useRef, useState, type CSSProperties } from "react";
import type { NodeProps } from "@xyflow/react";

import { theme } from "../lib/theme";

type FloatingTermNodeData = {
  value: string;
  editing: boolean;
  onCommit?: (value: string) => void;
  onCancel?: () => void;
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
};

export default function FloatingTermNode({ data }: NodeProps) {
  const floatingTermData = data as FloatingTermNodeData;
  const isCancelingRef = useRef(false);
  const [inputValue, setInputValue] = useState(floatingTermData.value);

  if (!floatingTermData.editing) {
    return <div style={BASE_PILL_STYLE}>{floatingTermData.value}</div>;
  }

  return (
    <input
      className="nodrag"
      autoFocus
      value={inputValue}
      onChange={(event) => setInputValue(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.stopPropagation();
          floatingTermData.onCommit?.(inputValue.trim());
          return;
        }

        if (event.key === "Escape") {
          isCancelingRef.current = true;
          event.preventDefault();
          event.stopPropagation();
          floatingTermData.onCancel?.();
        }
      }}
      onBlur={() => {
        if (isCancelingRef.current) {
          isCancelingRef.current = false;
          return;
        }

        floatingTermData.onCommit?.(inputValue.trim());
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      style={{
        ...BASE_PILL_STYLE,
        outline: "none",
      }}
    />
  );
}