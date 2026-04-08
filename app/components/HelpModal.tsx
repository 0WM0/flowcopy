import React from "react";

import { buttonStyle } from "../constants";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type HelpShortcutDefinition = {
  keys: string;
  description: string;
};

const HELP_CANVAS_SHORTCUTS: HelpShortcutDefinition[] = [
  {
    keys: "Tab",
    description: "Add a Card at the pointer position in Canvas mode.",
  },
  {
    keys: "Shift + Tab",
    description: "Add a Vertical Card at the pointer position in Canvas mode.",
  },
  {
    keys: "Shift + R",
    description: "Add a Horizontal Card at the pointer position in Canvas mode.",
  },
  {
    keys: "Shift + F",
    description:
      "Frame selected non-frame cards (requires at least two selected cards).",
  },
  {
    keys: "Ctrl/Cmd + C",
    description:
      "Copy selected cards in Canvas mode to clipboard (selected frames include their member cards).",
  },
  {
    keys: "Ctrl/Cmd + V",
    description:
      "Paste copied cards as non-destructive duplicates (new IDs, internal edges preserved, offset placement).",
  },
  {
    keys: "Delete / Backspace",
    description: "Delete selected card(s) or selected edge.",
  },
  {
    keys: "Escape",
    description: "Close the currently open modal window.",
  },
];

const HELP_CONTEXT_SHORTCUTS: HelpShortcutDefinition[] = [
  {
    keys: "Enter (New project name)",
    description: "Create the project from the create-project input.",
  },
  {
    keys: "Enter (Snapshot name)",
    description: "Save the UI Journey snapshot using the typed name.",
  },
  {
    keys: "Enter (Global option input)",
    description: "Add the typed option in Global Attribute Admin.",
  },
  {
    keys: "Enter (Inspector text fields)",
    description: "Commit the current field value (input blurs and value syncs).",
  },
  {
    keys: "Enter (Controlled Language draft term)",
    description: "Add a new glossary term row.",
  },
  {
    keys: "Enter (Controlled Language row term)",
    description: "Commit rename edits for an existing glossary term.",
  },
  {
    keys: "Enter (Term Registry add term)",
    description: "Add a new term from the Term Registry draft value input.",
  },
  {
    keys: "Enter / Space (Frame title chip)",
    description: "Start frame-title editing.",
  },
  {
    keys: "Enter (Frame title input)",
    description: "Commit frame title (blur input).",
  },
  {
    keys: "Escape (Frame title input)",
    description: "Exit frame-title editing.",
  },
  {
    keys: "Enter / Space (Vertical Card cell)",
    description: "Open Vertical Card cell editor popup.",
  },
  {
    keys: "Escape (Vertical Card cell popup)",
    description: "Close Vertical Card cell editor popup.",
  },
];

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2090,
        background: "rgba(15, 23, 42, 0.58)",
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(960px, 97vw)",
          maxHeight: "90vh",
          overflowY: "auto",
          border: "1px solid #cbd5e1",
          borderRadius: 12,
          background: "#ffffff",
          boxShadow: "0 22px 45px rgba(15, 23, 42, 0.24)",
          padding: 14,
          display: "grid",
          gap: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <h3 id="help-modal-title" style={{ margin: 0, fontSize: 18, color: "#0f172a" }}>
            Termpath Help
          </h3>
          <button
            type="button"
            style={{
              ...buttonStyle,
              borderColor: "#94a3b8",
              color: "#0f172a",
              fontWeight: 700,
            }}
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <p style={{ margin: 0, fontSize: 12, color: "#475569" }}>
          Everything you can do in Termpath, organized by workflow.
        </p>

        {/* ── Section 1: Keyboard Shortcuts ── */}
        <section
          style={{
            border: "1px solid #dbeafe",
            borderRadius: 8,
            background: "#f8fbff",
            padding: 10,
          }}
        >
          <h4 style={{ marginTop: 0, marginBottom: 8, fontSize: 14, color: "#1e3a8a" }}>
            Keyboard shortcuts
          </h4>
          <div style={{ fontSize: 11, color: "#475569", marginBottom: 8 }}>
            Active when focus is on the canvas. Disabled while typing in inputs or textareas.
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6, fontSize: 12 }}>
            {HELP_CANVAS_SHORTCUTS.map((shortcut) => (
              <li key={`help-canvas-shortcut:${shortcut.keys}`}>
                <strong>{shortcut.keys}</strong> — {shortcut.description}
              </li>
            ))}
          </ul>

          <div style={{ marginTop: 12, marginBottom: 4, fontSize: 12, fontWeight: 700, color: "#1e293b" }}>
            Context-specific
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6, fontSize: 12 }}>
            {HELP_CONTEXT_SHORTCUTS.map((shortcut) => (
              <li key={`help-context-shortcut:${shortcut.keys}`}>
                <strong>{shortcut.keys}</strong> — {shortcut.description}
              </li>
            ))}
          </ul>
        </section>

        {/* ── Section 2: Canvas & Nodes ── */}
        <section
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            background: "#ffffff",
            padding: 10,
          }}
        >
          <h4 style={{ marginTop: 0, marginBottom: 8, fontSize: 14, color: "#1e293b" }}>
            Canvas and nodes
          </h4>
          <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6, fontSize: 12 }}>
            <li>
              <strong>Create nodes:</strong> double-click empty canvas to add a Card. Use Tab (Card), Shift+Tab (Vertical Card), or Shift+R (Horizontal Card) for fast creation from a selected node.
            </li>
            <li>
              <strong>Node types:</strong> Card (text fields for microcopy, including an optional body text field for longer copy). Vertical Card (configurable term rows with right-side connections). Horizontal Card (multi-cell grid for toolbar-style UI).
            </li>
            <li>
              <strong>Connect nodes:</strong> drag from a source handle on one node to a target handle on another to create an edge.
            </li>
            <li>
              <strong>Edit edges:</strong> click an edge to open the Edge Inspector. Adjust color, style, and direction.
            </li>
            <li>
              <strong>Frame nodes:</strong> select two or more nodes and press Shift+F to group them into a frame. Frames represent screens, components, or logical groups. The frame title appears in exports.
            </li>
            <li>
              <strong>Copy and paste:</strong> select node(s), Ctrl/Cmd+C to copy, Ctrl/Cmd+V to paste. Pasted nodes get new IDs. Frame copies include their member nodes.
            </li>
            <li>
              <strong>Delete:</strong> select node(s) or edge(s) and press Delete or Backspace.
            </li>
            <li>
              <strong>Undo / Redo:</strong> Ctrl+Z to undo, Ctrl+Shift+Z to redo. 30-step history. Also available as buttons in the top action bar. Text edits are grouped by an 800ms pause — keep typing and it counts as one undo step.
            </li>
          </ul>
        </section>

        {/* ── Section 3: Node Data Panel ── */}
        <section
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            background: "#ffffff",
            padding: 10,
          }}
        >
          <h4 style={{ marginTop: 0, marginBottom: 8, fontSize: 14, color: "#1e293b" }}>
            Node Data Panel (Inspector)
          </h4>
          <p style={{ margin: "0 0 8px", fontSize: 12, color: "#475569" }}>
            Select exactly one node to open the inspector on the right side. Three tabs organize the editing surface:
          </p>
          <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6, fontSize: 12 }}>
            <li>
              <strong>Edit + Govern tab:</strong> Node identity (ID, type), title, body text (multi-line), and all term fields (Primary CTA, Secondary CTA, Helper Text, Error Text). Each field has a 📋 button to open the registry picker filtered to the relevant term type. Field visibility checkboxes control which fields appear on the canvas node.
            </li>
            <li>
              <strong>Journey tab:</strong> UI Journey controls. Build and manage conversation snapshots, trigger path highlighting, and open the Conversation View modal.
            </li>
            <li>
              <strong>Admin tab:</strong> Global attribute option lists (Tone, Polarity, Reversibility, Concept, Action Type, Card Style). Sequence ID display. Project-level settings.
            </li>
            <li>
              <strong>Vertical Cards:</strong> show configurable term rows with right-side connections. Each term has its own 📋 registry picker.
            </li>
            <li>
              <strong>Horizontal Cards:</strong> show a cell grid. Each cell has Label, Key Command, and Tool Tip fields, each with its own 📋 registry picker.
            </li>
            <li>
              <strong>Body Text:</strong> a multi-line text field available on all node types for longer copy (instructions, descriptions, onboarding text).
            </li>
          </ul>
        </section>

        {/* ── Section 4: Term Registry & Governance ── */}
        <section
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            background: "#ffffff",
            padding: 10,
          }}
        >
          <h4 style={{ marginTop: 0, marginBottom: 8, fontSize: 14, color: "#1e293b" }}>
            Term Registry and governance
          </h4>
          <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6, fontSize: 12 }}>
            <li>
              <strong>Term Audit (View 1):</strong> read-only view of every unique term in your project. Shows occurrence count. Click a count to highlight matching nodes on the canvas.
            </li>
            <li>
              <strong>Term Registry (View 2):</strong> the governance backbone. Every governed term tracked with its value, reference key (user-defined string identifier), term type, assignment status, and lock state.
            </li>
            <li>
              <strong>Assign terms:</strong> click the 📋 button on any supported field to open the registry filtered to that field type. Pick a term to assign it. If the term is already assigned elsewhere, you can confirm to create a duplicate assignment.
            </li>
            <li>
              <strong>Drag from registry:</strong> drag a term from the registry to an empty canvas area to create a new node with that term. Drag to a Card field to assign it. Drag to a Horizontal Card cell to open the cell editor with the term pre-loaded.
            </li>
            <li>
              <strong>Reference keys:</strong> user-defined identifiers per term (e.g., checkout.confirm.primary_cta). These travel with the export and map to string keys in your codebase. Lock a key once it is confirmed correct.
            </li>
            <li>
              <strong>Term types:</strong> 12 built-in types — Untyped, Title, Body Text, Primary CTA, Secondary CTA, Helper Text, Error Text, Notes, Menu Term, Key Command, Tool Tip, Cell Label. Additional types can be defined by the user.
            </li>
            <li>
              <strong>Highlighting:</strong> click a term occurrence or assigned registry entry to highlight matching nodes on the canvas. Path highlights and term highlights coexist — dismiss them independently.
            </li>
          </ul>
        </section>

        {/* ── Section 5: Export & Import ── */}
        <section
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            background: "#ffffff",
            padding: 10,
          }}
        >
          <h4 style={{ marginTop: 0, marginBottom: 8, fontSize: 14, color: "#1e293b" }}>
            Export and import
          </h4>
          <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6, fontSize: 12 }}>
            <li>
              <strong>Export Project:</strong> full project data backup in JSON. Saves all nodes, edges, registry, admin settings, and journey snapshots.
            </li>
            <li>
              <strong>Import Project:</strong> restore a project from a previously exported JSON file.
            </li>
            <li>
              <strong>Export Term Registry:</strong> export governed terms as CSV or JSON. Selectable columns: Frame (screen/component grouping), Title (node name), Term Value, Reference Key, Node Type, Sequence Number, Assignment Status. Frame and Title provide the context a developer needs to locate where each term belongs.
            </li>
            <li>
              <strong>Import Term Registry:</strong> import terms from CSV or JSON. Upload a file, map your columns to Termpath fields, and preview before committing. Two modes: Add (merge with existing, skip duplicates) or Replace (wipe registry — warns about broken references).
            </li>
            <li>
              <strong>Export Conversation View:</strong> export the current UI Journey Conversation as PDF or DOCX. Includes the visual layout with throughline rail, numbered step circles, and two-column field grid.
            </li>
          </ul>
        </section>

        {/* ── Section 6: UI Journey & Conversation View ── */}
        <section
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            background: "#ffffff",
            padding: 10,
          }}
        >
          <h4 style={{ marginTop: 0, marginBottom: 8, fontSize: 14, color: "#1e293b" }}>
            UI Journey and Conversation View
          </h4>
          <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6, fontSize: 12 }}>
            <li>
              <strong>Journey snapshots:</strong> save a named path through your project. Recall it to highlight the path on the canvas and generate the Conversation View.
            </li>
            <li>
              <strong>Conversation View:</strong> opens as a modal showing every piece of text a user encounters along the selected path, in sequence. Each step shows the node title and all populated fields in a two-column layout (field label | value). This is the readable script of what your product says to a user.
            </li>
            <li>
              <strong>Export:</strong> export the Conversation View as PDF or DOCX with the full visual layout — throughline rail, numbered circles, content cards.
            </li>
          </ul>
        </section>

        {/* ── Section 7: Interface Layout ── */}
        <section
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            background: "#f8fafc",
            padding: 10,
          }}
        >
          <h4 style={{ marginTop: 0, marginBottom: 8, fontSize: 14, color: "#1e293b" }}>
            Interface layout
          </h4>
          <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6, fontSize: 12 }}>
            <li>
              <strong>Top action bar:</strong> Back to dashboard, Canvas/Table view toggle, Export Project, Import Project, Undo, Redo, Send Feedback, Help.
            </li>
            <li>
              <strong>Canvas (center):</strong> the main workspace. Nodes, edges, frames. Double-click to create. Drag to move. Scroll to zoom.
            </li>
            <li>
              <strong>Inspector panel (right):</strong> context-aware. Shows node data when a single node is selected, edge data when an edge is selected. Resize by dragging the left edge of the panel.
            </li>
            <li>
              <strong>Term Registry (right panel, Edit+Govern tab):</strong> always visible below the node fields. Add, edit, filter, and manage governed terms.
            </li>
            <li>
              <strong>Table View:</strong> toggle from the top action bar. Tabular view of all node data with dynamic columns for Vertical Card terms and Horizontal Card cells. Useful for scanning and reviewing across nodes.
            </li>
          </ul>
        </section>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            type="button"
            style={{
              ...buttonStyle,
              borderColor: "#dc2626",
              background: "#fef2f2",
              color: "#991b1b",
              fontWeight: 700,
            }}
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}