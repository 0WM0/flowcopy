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
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

The app remains a three-view local-first editor (`account` → `dashboard` → `editor`) in a single `app/page.tsx` surface, with this session focused on making the editor architecture ready for two authoring surfaces:

- canvas view (current primary UI)
- table view (project-scoped, synced dataset)

The key product-level change this session is the addition of persistent editor surface state in session data.

## 2) Core Data Model

`AppStore.session` was expanded to include:

- `editorMode: "canvas" | "table"`

Tabular data contracts were formalized for export/import work:

- `FLAT_EXPORT_COLUMNS` (session/account/project/node + ordering + JSON payload columns)
- `FlatExportRow` (`Record<FlatExportColumn, string>`)
- `ParsedTabularPayload` for parsed file rows/headers
- `ImportFeedback` message envelope for import status handling

Node-table metadata contracts were also defined:

- `TABLE_EDITABLE_FIELDS`
- `TABLE_FIELD_LABELS`
- `TABLE_SELECT_FIELDS`
- `TABLE_TEXTAREA_FIELDS`

## 3) Persistence and Migration Strategy

Session persistence paths were updated so editor mode is durable:

- `createEmptyStore()` now initializes `editorMode: "canvas"`
- `sanitizeAppStore()` validates incoming mode via `isEditorSurfaceMode(...)`, defaulting to `"canvas"`
- legacy migration (`migrateLegacyCanvasToStore`) now writes `editorMode: "canvas"`
- account/dashboard/editor transitions were updated so session writes always include `editorMode`

This prevents store-shape drift and keeps session payloads type-safe.

## 4) Ordering Model and Project Sequence ID

Existing ordering/sequence architecture remains in place (`computeFlowOrdering`, `computeProjectSequenceId`) and is now integrated into flat export shaping.

`createFlatExportRows(...)` maps the ordered node set to row output and writes:

- `node_id` as the node key
- `node_order_id` and `sequence_index` from `ordering.sequenceByNodeId`
- `project_sequence_id` to retain project-level ordering identity in exports

This keeps row-level tabular data aligned with the graph ordering model.

## 5) Node Rendering and Shape System

Canvas rendering architecture (shape system, edge visuals, side panel editing) was not replaced in this session. Instead, this session added table-facing metadata and option synchronization utilities so table editing can remain compatible with current node rendering contracts.

In practical terms, node rendering remains React Flow-based, while export/table contracts now describe the same node fields in a flat form.

## 6) Editor Interaction Model

Interaction behavior is now modeled for persistent surface state, even though full table-mode UI wiring is still pending:

- `editorMode` is preserved in session while opening projects
- auth/sign-out paths reset to `"canvas"`

This is the architectural basis for a persistent canvas/table toggle and full-screen table mode requested for project scope.

## 7) Refactor Outcomes

This session produced reusable helper primitives for tabular interoperability:

- CSV/XML serialization/parsing stack:
  - `buildCsvFromRows`, `parseCsvText`
  - `buildXmlFromRows`, `parseXmlText`
  - `detectTabularFormat`
- admin-option merge/sync helpers:
  - `mergeAdminOptionConfigs`
  - `syncAdminOptionsWithNodes`
- row factory:
  - `createFlatExportRows`

Overall outcome: the codebase now has explicit contracts for flat export/import and project-scoped node row generation, while preserving current graph-based editing.

## 8) Validation and Operational Notes

During this session, TypeScript session-shape issues were resolved by ensuring every session write includes `editorMode`.

Operationally, the architecture layer for CSV/XML + table synchronization is in place, but end-user controls (import/export buttons, full-screen table mode toggle, and import merge execution path) still require UI wiring and integration callbacks.

## 9) Recommended Next Steps

1. Wire export actions to generate and download CSV/XML using `createFlatExportRows(...)` + format builders.
2. Implement import upload flow using format detection/parsers and merge by `node_id` into the active project.
3. Add persistent canvas/table toggle UI bound to `session.editorMode`.
4. Implement full-screen project-scoped table view with inline editing mapped to node fields and immediate canvas sync.
5. Run `npx tsc --noEmit` and `npx eslint app/page.tsx` after wiring to confirm type/lint stability.

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




