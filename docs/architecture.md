# FlowCopy Architecture Log

## How to keep updating this file

### Date-entry convention
1. For each new session, add a new date marker at the very top of the **Session Entries** section using:
   - `##MM-DD-YYYY##`
2. Keep newest entry first (reverse chronological order).
3. Do not delete prior entries; keep them as historical context.

### Repeatable prompt (copy/paste each session)
```text
Update `docs/architecture.md` by adding a NEW top session entry (do not delete older entries).
Use date marker format: `##MM-DD-YYYY##` with today's date.
Use this exact section template and fill each section with concrete implementation details from this session:

# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape
## 2) Core Data Model
## 3) Persistence and Migration Strategy
## 4) Ordering Model and Project Sequence ID
## 5) Node Rendering and Shape System
## 6) Editor Interaction Model
## 7) Refactor Outcomes
## 8) Validation and Operational Notes
## 9) Recommended Next Steps
```

---

## Session Entries

##02-21-2026##
# FlowCopy Architecture (Session Summary)

This document captures the architecture that emerged during the current implementation session, including the major refactors, algorithmic decisions, and UI rendering changes.

## 1) High-Level Product Shape

FlowCopy is now a **local-first, project-based flow editor** built in `app/page.tsx` using React + React Flow (`@xyflow/react`).

The app is organized as a simple stateful SPA with 3 top-level views:

- `account` — gate entry with a 3-digit code (currently only `000` accepted)
- `dashboard` — list/create/open projects for the active account
- `editor` — graph canvas + data panel + admin options for the selected project

All changes persist to browser localStorage and are scoped per project.

---

## 2) Core Data Model

### 2.1 Node and graph types

- `NodeShape = "rectangle" | "rounded" | "pill" | "diamond"`
- `MicrocopyNodeData` holds node content fields and metadata including:
  - action metadata (`action_type_name`, `action_type_color`)
  - presentational metadata (`card_style`, `node_shape`)
  - derived ordering metadata (`sequence_index`)
- `FlowNode = Node<MicrocopyNodeData, "flowcopyNode">`

Persistence separates editable data from derived values:

- `PersistableMicrocopyNodeData = Omit<MicrocopyNodeData, "sequence_index">`

### 2.2 App/store hierarchy

- `AppStore`
  - `accounts: AccountRecord[]`
  - `session: { activeAccountId, activeProjectId, view }`
- `AccountRecord`
  - `id`
  - `code`
  - `projects: ProjectRecord[]`
- `ProjectRecord`
  - `id` (`PRJ-...`)
  - `name`
  - `createdAt`, `updatedAt`
  - `canvas: PersistedCanvasState`

`PersistedCanvasState` contains:

- serialized nodes
- edges
- global admin option sets

Storage keys:

- `APP_STORAGE_KEY = "flowcopy.store.v1"`
- legacy migration key: `LEGACY_STORAGE_KEY = "flowcopy.canvas.v2"`

---

## 3) Persistence and Migration Strategy

### 3.1 Local-first persistence

- `updateStore` is the central mutator that also writes the full store to localStorage.
- `persistCurrentProjectState` writes current editor graph/admin state into the active project.
- Autosave is continuous via effect-driven persistence while in editor mode.

### 3.2 Legacy compatibility

- `readAppStore()` tries `flowcopy.store.v1` first.
- If missing/invalid, `migrateLegacyCanvasToStore()` attempts migration from `flowcopy.canvas.v2`.
- Migrated content is wrapped as a generated project (`"Migrated Project"`) under account `000`.

### 3.3 Sanitization/normalization

Inbound persisted data is never trusted directly. It flows through helpers that:

- validate/normalize arrays and option sets
- sanitize serializable node payloads and edges
- deduplicate IDs
- restore defaults when values are missing/invalid

This keeps the editor resilient against malformed local data.

---

## 4) Ordering Model and Project Sequence ID

### 4.1 Ordering semantics

Flow ordering is computed from graph direction using `computeFlowOrdering(nodes, edges)`:

- topological ordering (Kahn-style) over directed edges
- deterministic tie-break when multiple nodes are available:
  - compare x-position
  - then y-position
  - then node id

Cycle handling:

- if unresolved nodes remain, they are appended deterministically by the same comparator
- UI surfaces a cycle warning

### 4.2 Sequence propagation

- `sequenceByNodeId` is derived and projected into render nodes as `sequence_index`
- edges are labeled in render as `sourceOrder → targetOrder` for directional clarity

### 4.3 Project-scoped sequence identity

`computeProjectSequenceId(orderedNodeIds, nodes, edges)` builds a stable project-level identifier:

1. normalize edge signature (`source->target`, sorted)
2. combine with ordered node list into deterministic payload
3. hash via `hashToBase36`
4. prefix as `FLOW-...`

Result: changing connections, order, or topology updates the sequence ID live.

---

## 5) Node Rendering and Shape System

### 5.1 Shape support

Node shape is selectable per node and persisted:

- rectangle
- rounded
- pill
- diamond

### 5.2 Action color as border accent

`action_type_color` now drives both:

- action label visual treatment
- node border/accent color

Selection highlighting is separate (blue ring/shadow), so selected state remains legible even with custom border colors.

### 5.3 Diamond refactor (key UX iteration)

Diamond styling went through multiple revisions based on user feedback:

1. **Initial state**: small/insufficient, border readability issues.
2. **First fix**: larger size and stronger boundary, but looked pseudo-3D and could visually mask content.
3. **Final architecture**: flat 2D layered model:
   - `DIAMOND_CLIP_PATH` shared geometry
   - outer border layer (`getDiamondBorderLayerStyle`) at lower z-index
   - inner white surface layer (`getDiamondSurfaceLayerStyle`)
   - content layer (`getNodeContentStyle`) above both

This yields a head-on 2D border while keeping node content visually in front.

### 5.4 Pill sizing updates

Pill dimensions/padding were increased to ensure node content fields fit cleanly without clipping.

---

## 6) Editor Interaction Model

### 6.1 Canvas interactions

- double-click empty pane: add node
- click node: select for side-panel editing
- connect/reconnect edges with directional markers

### 6.2 Side panel

- project metadata and sequence ID
- ordered node list and cycle notice
- full selected-node field editor
- admin panel for global option lists (tone/polarity/etc.)

### 6.3 Undo system

Undo is implemented as snapshot-based history:

- `queueUndoSnapshot` captures immutable snapshots of nodes/edges/admin options
- short debounce/coalescing (~220ms)
- capped stack of 3 snapshots
- `handleUndo` restores full editor state and selected node coherently

---

## 7) Refactor Outcomes

Major structural outcome of the session:

- evolved from a single-canvas prototype into a **project-scoped application model**
- established deterministic graph-order and identity mechanics
- improved rendering architecture for non-rectangular nodes (especially diamond)
- added migration path and robust sanitization to protect persisted data quality

---

## 8) Validation and Operational Notes

During implementation, checks repeatedly passed:

- TypeScript compile: `npx tsc --noEmit`
- ESLint: `npx eslint app/page.tsx`

Local dev server occasionally reported an existing Next lock/port conflict due to another running instance, but this did not block compile/lint verification.

---

## 9) Recommended Next Steps

1. Split `app/page.tsx` into modules (`store`, `graph/ordering`, `render/styles`, `ui/views`) to reduce file size and coupling.
2. Add unit tests for:
   - `computeFlowOrdering`
   - `computeProjectSequenceId`
   - migration/sanitization helpers
3. Add visual regression coverage for shape rendering (especially diamond layering).
4. Consider backend sync model once multi-user/project sharing is needed.



