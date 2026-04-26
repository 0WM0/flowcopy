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

function PillEditor({
  initialValue,
  onCommit,
  onCancel,
}: {
  initialValue: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
}) {
  const [inputValue, setInputValue] = useState(initialValue);
  const isCancelingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <input
      className="nodrag"
      ref={inputRef}
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.stopPropagation();
          onCommit(inputValue.trim());
          return;
        }
        if (event.key === "Escape") {
          isCancelingRef.current = true;
          event.preventDefault();
          event.stopPropagation();
          onCancel();
        }
      }}
      onBlur={() => {
        if (isCancelingRef.current) {
          isCancelingRef.current = false;
          return;
        }
        onCommit(inputValue.trim());
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{ ...BASE_PILL_STYLE, outline: "none" }}
    />
  );
}

export default function FloatingTermNode({ data }: NodeProps) {
  const floatingTermData = data as FloatingTermNodeData;

  if (!floatingTermData.editing) {
    return <div style={BASE_PILL_STYLE}>{floatingTermData.value}</div>;
  }

  return (
    <PillEditor
      initialValue={floatingTermData.value}
      onCommit={(v) => floatingTermData.onCommit?.(v)}
      onCancel={() => floatingTermData.onCancel?.()}
    />
  );
}