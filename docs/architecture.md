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

##02-22-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

FlowCopy’s editor remains a local-first project canvas/table system, but this session expanded the graph model from a single generic connection type into a typed-edge interaction model.

The primary product-level additions were:

- explicit edge selection + deletion UX parity with node selection/deletion
- two semantic edge kinds (`sequential` and `parallel`) with distinct visuals and behavior
- ordering semantics that preserve step progression while supporting parallel grouping at the same sequence position

## 2) Core Data Model

The graph edge and node contracts were extended to capture edge semantics and parallel grouping:

- `EdgeKind = "sequential" | "parallel"`
- `FlowEdgeData` now carries:
  - `edge_kind`
  - `stroke_color?`
  - `line_style?` (`solid | dashed | dotted`)
  - `is_reversed?` (sequential-only direction hint)
- `MicrocopyNodeData` includes:
  - `sequence_index: number | null`
  - `parallel_group_id: string | null`

Connection handle IDs also became semantic contracts:

- sequential: left/right handles (`s-tgt`, `s-src`)
- parallel: top/bottom handles (`p-tgt`, `p-src`, plus opposite-direction alternates)

## 3) Persistence and Migration Strategy

Persistence now round-trips typed edges and parallel grouping through the existing project canvas storage.

- `sanitizeEdgesForStorage(...)` normalizes edge payloads and guarantees `edge_kind` + style defaults.
- `serializeNodesForStorage(...)` persists computed `parallel_group_id` on nodes.
- `persistCurrentProjectState(...)` writes nodes, edges, and admin options back into active project snapshots.

Flat export/import compatibility was updated without changing the file contract shape:

- `project_edges_json` now carries `edge_kind`, `stroke_color`, `line_style`, and `is_reversed`.
- import hydration sanitizes unknown/missing edge kinds to a deterministic fallback (`sequential` unless parallel handles imply otherwise).

## 4) Ordering Model and Project Sequence ID

Ordering now explicitly separates sequential progression from parallel grouping.

- `computeFlowOrdering(...)` uses **only sequential edges** for topological ordering.
- `computeParallelGroups(...)` builds undirected connected components from **only parallel edges**.
- each parallel component receives deterministic `parallel_group_id` (`PG-` + sorted node IDs).
- sequence normalization applies a deterministic rule: all nodes in a parallel group take the minimum sequence index found in that group.
- tie-break ordering remains stable by `(x, y, id)`.

`computeProjectSequenceId(...)` was aligned with these semantics:

- sequence ID is derived from sequential order + sequential edge signature only
- parallel edges no longer perturb progression identity

## 5) Node Rendering and Shape System

Node rendering preserved the existing shape system while extending connection affordances for typed edges.

- Added top/bottom handles to the custom `flowcopyNode` renderer for parallel edge creation.
- Existing left/right handles continue to drive sequential edge creation.

Edge rendering was centralized through `applyEdgeVisuals(...)`:

- sequential edges: directional arrow marker, animated by default
- parallel edges: no markers, static/non-directional styling, neutral stroke defaults
- style mapping now supports line style variants and selected-edge emphasis

## 6) Editor Interaction Model

Selection and deletion behavior now supports both nodes and edges while preserving existing node UX.

- edge selection tracked via `onSelectionChange` / `onEdgeClick` (`selectedEdgeId`)
- node selection remains independent (`selectedNodeId`)
- keyboard deletion (`Delete` / `Backspace`) respects editable target guards
- deletion priority:
  1) selected edge
  2) selected node + incident edges

An edge inspector panel is shown when an edge is selected:

- kind (read-only currently)
- color picker
- line style selector
- direction selector (sequential only)
- explicit “Delete Edge” action

## 7) Refactor Outcomes

Key implementation outcomes from this session:

- introduced typed-edge model end-to-end (creation, rendering, persistence, import/export)
- implemented parallel connected-component grouping with deterministic IDs
- normalized sequence index within parallel groups while preserving stable display order
- implemented atomic undo snapshots for edge/node deletion and edge edits
- resolved selection robustness by using effective selected IDs derived from current graph state

## 8) Validation and Operational Notes

Validation completed successfully after implementation and cleanup:

- `npm run lint` passes
- `npx tsc --noEmit` passes

Operational notes:

- sequential cycles remain detectable in ordering; parallel edges are excluded from sequential cycle semantics
- edge visuals are recomputed from semantic data at render time (markers are not trusted as persisted truth)

## 9) Recommended Next Steps

1. Add edge context menu actions (delete, reset style) for faster canvas operations.
2. Add optional edge-kind toggling in inspector with guardrails for handle compatibility.
3. Add automated tests for parallel group computation and sequence normalization edge cases.
4. Add dedicated badges/legend for sequential vs parallel edges in canvas and table surfaces.
5. Extract ordering/grouping and edge-style logic into dedicated modules to reduce `app/page.tsx` complexity.

##02-22-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

FlowCopy remains a local-first, three-view product (`account` → `dashboard` → `editor`) but the editor is now a dual-surface system with a persistent mode:

- `canvas` view (React Flow graph + side panel)
- `table` view (full-screen, project-scoped editable table)

The key product outcome this session is operational parity between these two surfaces for project data editing and file transfer (CSV/XML import/export).

## 2) Core Data Model

The session finalized a flat export/import contract while keeping the hierarchical in-app store:

- `AppStore`
  - `accounts: AccountRecord[]`
  - `session: { activeAccountId, activeProjectId, view, editorMode }`
- `editorMode: "canvas" | "table"` persisted in `session`

Tabular model additions are now explicit:

- `FLAT_EXPORT_COLUMNS` includes session, account, project, ordering, node fields, and serialized project-level payloads
- `FlatExportRow` / `ParsedTabularPayload` formalize row parsing and generation
- Node identity and ordering are first-class in flat rows:
  - `node_id`
  - `node_order_id`
  - `sequence_index`
  - `project_sequence_id`
- Project-level connectivity/options are embedded for transfer:
  - `project_edges_json`
  - `project_admin_options_json`

For table editing, field contracts were fully defined via `TABLE_EDITABLE_FIELDS`, `TABLE_FIELD_LABELS`, `TABLE_SELECT_FIELDS`, and `TABLE_TEXTAREA_FIELDS`.

## 3) Persistence and Migration Strategy

Persistence now consistently carries editor surface state and synchronized project data:

- `createEmptyStore()`, `sanitizeAppStore()`, and legacy migration defaults include `editorMode: "canvas"`
- `updateStore(...)` remains the single write path to localStorage (`flowcopy.store.v1`)
- `persistCurrentProjectState(...)` keeps active project canvas/admin data continuously synced to store

Import is now project-scoped by design:

- Imported rows are filtered to the active `project_id`
- Non-matching files are rejected with user feedback
- Hydrated nodes/edges/admin options are applied back into current editor state

## 4) Ordering Model and Project Sequence ID

Ordering architecture remains graph-first and is now exported/imported in flat form:

- `computeFlowOrdering(...)` supplies deterministic node sequence
- `computeProjectSequenceId(...)` provides stable project ordering identity
- `createFlatExportRows(...)` writes sequence outputs (`node_order_id`, `sequence_index`, `project_sequence_id`) per node row

Import respects order by sorting incoming node records using `node_order_id` (or `sequence_index`) before hydration.

## 5) Node Rendering and Shape System

Canvas rendering contracts (including shape system and action-color styling) were preserved and made table-compatible:

- Table editor writes directly into node fields used by React Flow rendering
- `node_shape` remains validated through `isNodeShape(...)`
- Select-backed fields (tone/polarity/reversibility/concept/action/card style) reuse admin/global option sets

Result: canvas visuals and table values now represent one shared node data source.

## 6) Editor Interaction Model

Interaction model now supports persistent mode switching and project-scoped table editing:

- `handleEditorModeChange(...)` toggles/stores `canvas` ↔ `table`
- Toggle controls are available in editor UI (including canvas-side control section)
- Table mode is full-screen and focused on project data only
- Table intentionally omits higher-level IDs from user editing scope while still showing node-level identifiers/order

Table edits are immediate and bi-directionally reflected:

- `updateNodeFieldById(...)` mutates live node state
- Switching back to canvas instantly reflects table changes

Import/export controls (CSV/XML) are wired into editor surfaces with status feedback and file picker integration.

## 7) Refactor Outcomes

This session moved the architecture from “prepared contracts” to fully integrated transfer + table operations:

- Added CSV/XML transfer stack end-to-end:
  - `buildCsvFromRows`, `parseCsvText`
  - `buildXmlFromRows`, `parseXmlText`
  - `detectTabularFormat`, `downloadTextFile`
- Added row assembly + import hydration paths:
  - `createFlatExportRows`
  - `importProjectDataFromFile`
- Added project-scoped full-table editor UI with inline inputs/selects/textareas
- Added transfer feedback UX and hidden file input trigger path

Quality refactors were also completed during lint resolution:

- Removed unused helper code
- Moved ref assignment (`captureUndoSnapshotRef`) into effect-safe update
- Added explicit lint suppressions where effect-driven bootstrap/autosave setState is intentional

## 8) Validation and Operational Notes

Validation completed with ESLint after wiring and refactors:

- `npm run lint` passes

Operational observations from this session:

- ESLint flat-config invocation does not support `--file` in this repo; full lint command is required
- Import requires matching `project_id` rows for active project
- Import supports both extension-based and content-based CSV/XML detection
- Row-level edge/options JSON are consumed from imported data and re-sanitized before hydration

## 9) Recommended Next Steps

1. Add automated tests for CSV/XML parse/build, row shaping, and import hydration edge cases.
2. Add optional import modes (replace vs merge-by-node-id) with explicit conflict handling.
3. Extend table editing to support position/order editing workflows (with validation guards).
4. Extract transfer and table modules from `app/page.tsx` to reduce component size and improve maintainability.
5. Add schema/version metadata to exported payloads for forward-compatible migrations.

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






