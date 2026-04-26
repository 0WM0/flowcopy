import { useRef, useState, type CSSProperties } from "react";

import { theme } from "../lib/theme";

type Props = {
  clientX: number;
  clientY: number;
  onCommit: (value: string) => void;
  onCancel: () => void;
};

export default function FloatingTermInputOverlay({
  clientX,
  clientY,
  onCommit,
  onCancel,
}: Props) {
  const [value, setValue] = useState("");
  const isCancelingRef = useRef(false);

  const overlayStyle: CSSProperties = {
    position: "fixed",
    left: clientX,
    top: clientY,
    zIndex: 2200,
    minWidth: 180,
    padding: "8px 12px",
    borderRadius: 8,
    border: `2px solid ${theme.primitives.indigo700}`,
    background: theme.primitives.white,
    color: "#18181B",
    fontSize: 14,
    outline: "none",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  };

  return (
    <input
      className="nodrag"
      autoFocus
      placeholder="Type a term..."
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.stopPropagation();
          event.preventDefault();
          onCommit(value.trim());
          return;
        }

        if (event.key === "Escape") {
          isCancelingRef.current = true;
          event.stopPropagation();
          event.preventDefault();
          onCancel();
        }
      }}
      onBlur={() => {
        if (isCancelingRef.current) {
          isCancelingRef.current = false;
          return;
        }

        onCommit(value.trim());
      }}
      style={overlayStyle}
    />
  );
}