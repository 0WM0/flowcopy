import { useEffect, useRef, useState, type CSSProperties } from "react";
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
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [inputValue, setInputValue] = useState(floatingTermData.value);

  useEffect(() => {
    if (!floatingTermData.editing) {
      return;
    }

    inputRef.current?.focus();
    inputRef.current?.select();
  }, [floatingTermData.editing]);

  if (!floatingTermData.editing) {
    return <div style={BASE_PILL_STYLE}>{floatingTermData.value}</div>;
  }

  return (
    <input
      ref={inputRef}
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
          event.preventDefault();
          event.stopPropagation();
          floatingTermData.onCancel?.();
        }
      }}
      style={{
        ...BASE_PILL_STYLE,
        outline: "none",
      }}
    />
  );
}