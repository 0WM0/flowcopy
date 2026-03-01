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

##02-28-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session delivered a targeted UX refinement in the editor inspector for the **Controlled Language** section.

The existing show/hide behavior remains unchanged, but the table viewport is now intentionally constrained so users see a maximum of six body rows at once (the add row + five additional rows) before scrolling.

## 2) Core Data Model

No persisted schema contracts changed in this session.

The change introduced UI sizing constants in `app/page.tsx` to make the row-cap behavior explicit and maintainable:

- `CONTROLLED_LANGUAGE_MAX_VISIBLE_ROWS = 6`
- `CONTROLLED_LANGUAGE_ROW_HEIGHT_PX = 42`
- `CONTROLLED_LANGUAGE_TABLE_HEADER_HEIGHT_PX = 34`
- `CONTROLLED_LANGUAGE_TABLE_MAX_HEIGHT_PX` (derived from header + visible rows)

## 3) Persistence and Migration Strategy

Persistence and migration behavior were unchanged.

- no localStorage key changes
- no project payload shape changes
- no migration-path updates

All work was UI-layout behavior within the existing inspector rendering path.

## 4) Ordering Model and Project Sequence ID

No ordering behavior changed.

- `computeFlowOrdering(...)` unchanged
- `computeProjectSequenceId(...)` unchanged

This session was presentation-only and did not affect graph sequencing semantics.

## 5) Node Rendering and Shape System

Canvas node and edge rendering systems were unchanged.

The rendering change was scoped to the Controlled Language inspector table wrapper:

- retained horizontal scrolling (`overflowX: "auto"`)
- added vertical scrolling (`overflowY: "auto"`)
- added bounded viewport height (`maxHeight: CONTROLLED_LANGUAGE_TABLE_MAX_HEIGHT_PX`)

## 6) Editor Interaction Model

Interaction behavior now works as follows:

- user toggles **Show/Hide Controlled Language** exactly as before
- when open, the table initially shows only up to six visible body rows
- if rows exceed that threshold, the table body region scrolls vertically within the same panel
- horizontal overflow still scrolls when needed

This keeps the inspector compact while preserving access to all rows.

## 7) Refactor Outcomes

Concrete outcomes from this session:

1. Added explicit constants for controlled-language table viewport sizing.
2. Replaced unbounded table wrapper behavior with bounded vertical scrolling.
3. Preserved all existing controlled-language editing flows (add, rename, include toggle) and panel toggle behavior.

## 8) Validation and Operational Notes

Validation commands run during this session:

- `npm run lint`
- `npx eslint app/page.tsx`

Operational note:

- terminal output in this environment included shell/spinner artifacts, but no lint diagnostics were emitted for the updated file in this run.

## 9) Recommended Next Steps

1. Add a sticky header to the Controlled Language table for long scrolled lists.
2. Consider converting fixed row-height assumptions to CSS variables if row density changes over time.
3. Add a small “showing first N rows” helper hint when overflow is active.
4. Add visual regression coverage for inspector panel scroll behavior.

##02-28-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session extended the canvas-side **UI Journey Conversation** flow with a reusable snapshot workflow so users can capture and replay journey paths.

The product-level behavior now includes:

- a new **Journey Snapshots** inspector section placed directly near the UI Journey Conversation controls
- collapsible snapshot bank behavior (show/hide)
- named preset save/recall/delete actions
- recall restoring both:
  - highlighted node/edge path on canvas
  - conversation payload shown in the UI Journey Conversation dialog

## 2) Core Data Model

The session introduced snapshot-specific runtime and persisted contracts:

- `UiJourneySnapshotPreset`
  - `id`, `name`, `createdAt`, `updatedAt`
  - `nodeIds`, `edgeIds`
  - `conversation: UiJourneyConversationEntry[]`
- `UiJourneySnapshotCapture`
  - current in-memory capture payload used for save operations

Persistence contracts were expanded:

- `PersistedCanvasState` now includes `uiJourneySnapshotPresets`
- `EditorSnapshot` (undo payload) now includes snapshot/UI-journey-related state:
  - `uiJourneySnapshotPresets`
  - recalled node/edge ids
  - selected snapshot preset id
  - snapshot draft name
  - journey conversation modal snapshot/open state

## 3) Persistence and Migration Strategy

Snapshot data now round-trips through the existing project canvas save path.

Concrete additions include:

- `sanitizeUiJourneySnapshotPresets(...)`
- `cloneUiJourneySnapshotPresets(...)`
- snapshot preset defaults wired into:
  - `createEmptyCanvasState()`
  - `sanitizeProjectRecord(...)`
  - `readLegacyCanvasState(...)` fallback handling
  - `createProjectRecord(...)`

Project autosave integration now writes presets via `persistCurrentProjectState(...)` by serializing `uiJourneySnapshotPresets` into active project canvas data.

## 4) Ordering Model and Project Sequence ID

No sequence algorithm changes were introduced.

- `computeFlowOrdering(...)` unchanged
- `computeProjectSequenceId(...)` unchanged

Snapshot capture/replay reuses existing ordering outputs to keep journey conversation entries deterministic:

- capture uses `ordering.orderedNodeIds` and `sequenceByNodeId`
- conversation rows remain sequence-aligned after save/recall

## 5) Node Rendering and Shape System

Rendering was enhanced to visualize both “currently selected journey path” and “recalled snapshot path”.

Key additions:

- node data flags:
  - `ui_journey_highlighted`
  - `ui_journey_recalled`
- new highlight palette constants for nodes/edges:
  - `UI_JOURNEY_HIGHLIGHT_STROKE_COLOR`
  - `UI_JOURNEY_RECALLED_STROKE_COLOR`
- node accent resolution via `resolveNodeHighlightColor(...)`
- edge highlighting integrated through `applyEdgeVisuals(..., { highlightStrokeColor })`

Result: selected and recalled paths are visually stronger and distinguishable from default/selected-only styling.

## 6) Editor Interaction Model

Inspector-side snapshot workflow now behaves as follows:

- **Save**
  - captures current selected path (`nodeIds`, connecting `edgeIds`) and conversation rows
  - uses typed name input (falls back to generated “Snapshot N”)
  - stores preset and opens conversation modal with captured conversation
- **Recall**
  - sets active recalled node/edge IDs
  - restores conversation rows from the preset
  - opens journey conversation modal
- **Delete**
  - confirmation-protected preset deletion
- **Clear recalled path**
  - clears recalled highlighting state without deleting saved presets

Undo integration was extended so save/recall/delete/clear actions participate in the existing 3-snapshot history.

## 7) Refactor Outcomes

Concrete architecture outcomes from this session:

1. Added reusable snapshot typing/sanitization/clone helpers.
2. Extended project persistence so journey presets are durable per project.
3. Added a collapsible Journey Snapshots inspector module with full CRUD-like flow (save/recall/delete/clear recalled state).
4. Unified path recall behavior across both visual highlighting and conversation modal restoration.
5. Expanded undo snapshot payload to include journey snapshot UI state.

## 8) Validation and Operational Notes

Focused validation was executed on the modified implementation surface:

- `npx eslint app/page.tsx --max-warnings=0`

Operational note:

- shell output in this environment includes control/spinner artifacts, but no ESLint errors were emitted for the targeted file check.

## 9) Recommended Next Steps

1. Add edit/rename and overwrite behaviors for existing snapshot presets.
2. Add optional snapshot metadata (description/tags) for larger preset banks.
3. Add automated tests for snapshot persistence, recall highlighting, and conversation replay fidelity.
4. Add snapshot import/export support at project-transfer level if presets should travel across environments.
5. Consider adding a “compare current selection vs recalled preset” indicator for quick journey diffing.

##02-27-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session added a new **UI Journey Conversation** surface in Canvas mode so selected nodes can be reviewed as a single ordered narrative.

The product-level behavior is:

- user selects one or more nodes (or a frame)
- user clicks **UI Journey Conversation** in the side panel
- app opens a modal that shows sequence-ordered conversation entries and key copy fields

## 2) Core Data Model

The session introduced a lightweight conversation view model (runtime-only):

- `UiJourneyConversationField` (`label`, `value`)
- `UiJourneyConversationEntry` (`nodeId`, `nodeType`, `sequence`, `title`, `fields`)

Supporting builder helpers now exist:

- `buildUiJourneyConversationFields(nodeData)`
- `buildUiJourneyConversationEntries({ nodes, ordering, selectedNodeIds })`

Component state/wiring added in `Page`:

- `isUiJourneyConversationOpen`
- `uiJourneyConversationSnapshot`
- selection adapter `selectedNodeIdsForUiJourneyConversation`
- open/close callbacks for modal lifecycle

## 3) Persistence and Migration Strategy

No persisted schema or storage migration changes were introduced.

The conversation payload is generated on demand from current in-memory editor state and is not written to project storage.

- no localStorage key changes
- no import/export contract changes
- no `AppStore` model changes

## 4) Ordering Model and Project Sequence ID

Ordering algorithms were not modified in this session.

Conversation generation reuses existing ordering outputs:

- iterates in `ordering.orderedNodeIds`
- displays `ordering.sequenceByNodeId[nodeId]`
- preserves current tie-break semantics (`x → y → id`) via existing ordering pipeline

Frame-aware inclusion behavior was added in the conversation builder:

- selecting a frame includes its `frame_config.member_node_ids` (when present)
- resulting entries are still rendered in the existing global flow order

## 5) Node Rendering and Shape System

Canvas node-shape rendering contracts were unchanged.

New rendering work was modal/UI specific:

- full-screen overlay dialog (`role="dialog"`, `aria-modal="true"`)
- per-entry heading format: `sequence - title`
- frame entries (`nodeType === "frame"`) use centered/larger typography
- default entries remain left-aligned with compact field text
- empty field sets show an explicit fallback message

## 6) Editor Interaction Model

Interaction flow added to the side panel:

- **UI Journey Conversation** button appears in the existing utility section
- button is enabled only when node/frame selection exists (disabled for edge-only/no selection)
- clicking button captures a snapshot and opens modal

Modal close paths:

- click backdrop
- click **Close** button
- press `Escape`

`Escape` handling is attached only while modal is open and cleaned up on close/unmount.

## 7) Refactor Outcomes

Concrete outcomes from this session:

1. Added reusable conversation field/entry builder helpers.
2. Added frame-member-aware selection expansion for conversation snapshots.
3. Added side-panel trigger button with disabled-state guardrails.
4. Added modal rendering with frame-vs-default typography/alignment rules.
5. Added keyboard close support (`Escape`) for the new dialog.

## 8) Validation and Operational Notes

Validation completed with the repository lint command:

- `npm run lint` (exit code `0`)

Operational notes observed during verification:

- `eslint --file ...` is not supported with this repo’s flat config setup, so full `npm run lint` was used.
- a separate `next dev` run reported an existing `.next/dev/lock`, indicating another dev instance was already active.

## 9) Recommended Next Steps

1. Add a copy/export action for modal output (clipboard + markdown/plain text).
2. Add optional “refresh from current selection” while modal remains open.
3. Add automated tests for frame selection expansion and modal close behavior.
4. Consider adding grouping visuals for shared sequence indices (parallel groups) in the conversation view.

##02-27-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session added a keyboard-first framing workflow to speed up canvas composition.

Product behavior now includes:

- `Shift+F` to frame selected nodes (using the existing framing logic)
- parity between mouse-driven framing (button) and keyboard-driven framing
- lower friction for rapid layout/edit cycles in Canvas mode

## 2) Core Data Model

No persisted schema changes were introduced.

Data contracts remain unchanged across:

- `MicrocopyNodeData`
- `FrameNodeConfig`
- `FlowEdgeData`
- `AppStore`

Implementation detail added in runtime state wiring:

- `createFrameFromSelectionRef` (`useRef<() => void>`) was introduced so the global key listener can safely invoke the latest framing callback.

## 3) Persistence and Migration Strategy

Persistence and migration behavior were unchanged.

- no storage key updates
- no migration-path updates
- no import/export format updates

The shortcut triggers existing in-memory editor actions and therefore reuses existing autosave/undo persistence flows.

## 4) Ordering Model and Project Sequence ID

Ordering algorithms were not changed in this session.

- `computeFlowOrdering(...)` unchanged
- `computeProjectSequenceId(...)` unchanged

`Shift+F` routes into the existing `createFrameFromSelection(...)` path, so sequence updates remain governed by the current topological + tie-break model after frame insertion.

## 5) Node Rendering and Shape System

Node/edge rendering contracts were unchanged.

No new visual primitives were introduced; this session focused on keyboard interaction. The only UI rendering update was instructional copy in the side panel to document:

- `Tab` adds Default
- `Shift+Tab` adds Menu
- `Shift+F` frames selected nodes

## 6) Editor Interaction Model

Keyboard handling in Canvas mode now includes a dedicated `Shift+F` branch in the global `keydown` effect.

Concrete guardrails implemented:

- requires `event.key.toLowerCase() === "f"`
- requires `event.shiftKey`
- blocks when `alt/ctrl/meta` modifiers are pressed
- ignores editable targets (`input`, `textarea`, `select`, `contenteditable`)
- requires canvas/body context target
- blocks during active pointer-down drag state

When valid, the handler calls `event.preventDefault()` and executes `createFrameFromSelectionRef.current()`.

## 7) Refactor Outcomes

Concrete outcomes from this session:

1. Added `Shift+F` shortcut support for framing selected nodes.
2. Added ref-bridge wiring (`createFrameFromSelectionRef`) to safely call the latest frame callback from the window listener.
3. Reused existing frame-creation logic instead of duplicating framing behavior.
4. Updated in-app helper text to include the new shortcut.

## 8) Validation and Operational Notes

Validation completed successfully:

- `npm run lint` → `LINT_OK`

Operational note:

- A subsequent `next dev` run reported an existing dev lock (`.next/dev/lock`) and port-3000 contention, indicating another dev instance was already running.

## 9) Recommended Next Steps

1. Add a small non-blocking toast when `Shift+F` is pressed with fewer than 2 eligible selected nodes.
2. Add keyboard shortcut coverage tests for `Tab`, `Shift+Tab`, and `Shift+F` guard conditions.
3. Consider a dedicated “Keyboard shortcuts” help block or tooltip to centralize discoverability.

##02-27-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session was a targeted UX-consistency pass to reduce ordering confusion in the canvas.

The product-level outcomes were:

- frame nodes now display their sequence number directly in the frame body (top-left)
- non-frame node headers now place sequence on the left and action-type label on the right
- side-panel ordering copy now explicitly reflects runtime tie-break behavior

## 2) Core Data Model

No schema changes were introduced.

- `MicrocopyNodeData.sequence_index` remains the source for displayed order badges
- no updates to node/edge type contracts
- no changes to persisted project payload shape

## 3) Persistence and Migration Strategy

Persistence and migration behavior were unchanged.

- no storage key changes
- no migration-path changes
- no import/export format updates

This session was purely rendering/copy refinement over existing data.

## 4) Ordering Model and Project Sequence ID

Ordering logic itself was not modified.

- `computeFlowOrdering(...)` remains unchanged
- tie-break behavior remains deterministic by `x → y → id`
- parallel-linked nodes still normalize to shared sequence index
- `computeProjectSequenceId(...)` unchanged

What changed was clarity in the UI copy: side-panel text now states the exact tie-break and parallel behavior.

## 5) Node Rendering and Shape System

Two rendering updates were implemented in `FlowCopyNode`:

1. **Frame nodes**
   - added a dedicated order badge (`#sequence_index`) in the top-left of the frame body
   - styled as a compact pill with subtle border/background for readability

2. **Non-frame nodes**
   - header layout was reordered so sequence appears on the left
   - action-type pill moved to the right to match frame-first scan pattern

No shape geometry contracts (rectangle/rounded/pill/diamond sizing rules) were altered.

## 6) Editor Interaction Model

No interaction mechanics changed (selection, drag, connect, delete, undo, or editing flows).

This was a visual-information architecture improvement: order indicators are now positioned consistently for faster left-to-right scanning across mixed frame/non-frame layouts.

## 7) Refactor Outcomes

Concrete outcomes from this session:

1. Added on-canvas order badge rendering for frame nodes.
2. Updated side-panel order-rule copy to match actual ordering algorithm behavior.
3. Swapped non-frame node header alignment to sequence-left / action-right for consistency with frames.

## 8) Validation and Operational Notes

Validation completed successfully:

- `npm run lint` → `EXIT_CODE:0`

Operational note from verification attempts:

- `next dev` reported existing process/lock contention (`.next/dev/lock`) and port 3000 already in use, indicating another dev instance was active.

## 9) Recommended Next Steps

1. Add visual regression checks for order-badge placement across all node shapes and frame/title states.
2. Consider a user preference for badge position/visibility if teams use dense canvases.
3. Add a compact ordering legend/help tooltip near the side-panel sequence section for first-time users.

##02-26-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session delivered a major editor capability expansion centered on **multi-node framing** and **menu-term authoring ergonomics**.

Product-level outcomes:

- Menu nodes now use a term-first interaction with a visible **“+” add-term button** beside **Menu Terms**.
- Multi-selection now supports creating a **Frame node** around selected nodes from the inspector.
- Frames support configurable grayscale styling and editable title tab behavior.
- Frames can participate in graph connectivity like other nodes.

## 2) Core Data Model

The node model now includes explicit frame semantics in active editor behavior:

- `NodeType` includes `"frame"`.
- `FrameNodeConfig` carries:
  - `shade: "light" | "medium" | "dark"`
  - `member_node_ids: string[]`
  - `width`
  - `height`

Supporting constants/helpers were added and used in flow logic:

- `FRAME_NODE_MIN_WIDTH`, `FRAME_NODE_MIN_HEIGHT`, `FRAME_NODE_PADDING`
- `FRAME_SHADE_STYLES` for 3-step greyscale rendering
- normalization/sanitization helpers for frame config and member IDs

Menu-node data contracts remained compatible, with behavior updates to increment `max_right_connections` and append new term records through the existing `MenuNodeConfig` path.

## 3) Persistence and Migration Strategy

No storage-key migration was required.

Frame behavior is persisted through existing node serialization contracts:

- `frame_config` is normalized and serialized with nodes
- `frame_config_json` continues to round-trip via flat import/export
- membership is cleaned via `pruneFrameNodeMembership(...)` to prevent orphan member IDs

This kept existing projects backward-compatible while adding frame metadata as normalized node data.

## 4) Ordering Model and Project Sequence ID

Ordering and sequence-ID algorithms were intentionally unchanged:

- `computeFlowOrdering(...)` unchanged
- `computeProjectSequenceId(...)` unchanged

Frame membership metadata does not alter topological ordering semantics; frames affect ordering only through explicit graph edges, like any other node.

## 5) Node Rendering and Shape System

Rendering added a dedicated frame-node branch in `FlowCopyNode`:

- Frame body renders as a bounded rectangle with grayscale shade styling.
- Title appears in a **top protruding tab** with placeholder text **“Add title”**.
- Title supports inline click-to-edit with keyboard commit/cancel behavior.
- Frame border styling was adjusted to avoid shorthand/longhand border conflicts.

Menu rendering was updated for term-first editing:

- Added compact **“+”** button beside **Menu Terms** in node UI.
- Adding a term increments term count and creates corresponding source-handle capacity.

## 6) Editor Interaction Model

Multi-node framing workflow now behaves as follows:

- If 2+ non-frame nodes are selected, inspector shows **“Frame selected nodes (N)”**.
- Frame bounds are computed from selected-node bounding box + padding.
- New frame captures selected node IDs as `member_node_ids`.

Frame movement/containment behavior:

- Moving a frame translates unselected member nodes with it.
- Member nodes are constrained to remain inside assigned frame bounds.
- Membership is automatically pruned when referenced member nodes are removed.

Inspector updates for selected frame nodes:

- 3-step grayscale frame style selector
- Title editing support
- **Concept** and **Notes** fields available for frame-level metadata

## 7) Refactor Outcomes

Concrete implementation outcomes from this session:

1. Added frame-creation action from multi-selection.
2. Added frame-member movement + hard containment logic.
3. Added frame title tab with inline editing and placeholder preview.
4. Added frame connectivity handles so frames can connect like default nodes.
5. Removed effect-based state update path and unused variables to satisfy lint quality rules.

## 8) Validation and Operational Notes

Validation completed successfully after implementation:

- `npm run lint` ✅
- `npm run build` ✅

Operational note:

- A dev-server run reported existing Next.js lock/instance contention (`.next/dev/lock`), indicating another `next dev` process was active.

## 9) Recommended Next Steps

1. Add resize handles for frame dimensions directly on-canvas.
2. Add explicit frame membership editing (add/remove members) from inspector.
3. Add regression tests for frame containment and frame-drag member movement.
4. Add focused interaction tests for menu term + button behavior and handle assignment.
5. Consider extracting frame-specific logic from `app/page.tsx` into dedicated modules.

##02-25-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session was a targeted bug-fix pass for Controlled Language and Menu-node authoring behavior.

Two user-facing issues were addressed together:

- Menu terms typed directly in Menu nodes now appear in the Menu Term glossary selector (Glossary button dropdown), not only in the Controlled Language audit panel.
- The previously fixed “one backspace/keystroke then focus loss” bug was re-resolved after a regression.

## 2) Core Data Model

No persisted schema changes were introduced.

Behavior used existing contracts and added render-wiring support:

- `buildMenuTermSelectorTerms(nodes, controlledLanguageGlossary)` now provides selector options from both included glossary `menu_term` entries and live Menu-node terms.
- Added `menuTermGlossaryTermsRef` (`useRef<string[]>`) to hold latest computed selector terms without forcing node renderer remount churn.

## 3) Persistence and Migration Strategy

Persistence and migration behavior remained unchanged:

- no storage key changes
- no migration-path changes
- no import/export format changes

All updates were runtime rendering/interaction fixes, fully compatible with existing saved projects.

## 4) Ordering Model and Project Sequence ID

No ordering changes were made in this session.

- `computeFlowOrdering(...)` unchanged
- `computeProjectSequenceId(...)` unchanged

Glossary-source and focus-stability fixes are orthogonal to graph topology and sequence identity.

## 5) Node Rendering and Shape System

Node/edge geometry and shape styles were unchanged.

Rendering-wiring updates were focused on node type stability:

- `nodeTypes` now reads menu glossary terms through `menuTermGlossaryTermsRef.current`.
- `menuTermGlossaryTerms` was removed from `nodeTypes` memo dependencies so node renderer identity does not churn on each input edit.

Menu glossary empty-state copy was also aligned with behavior:

- “No Menu Term options yet. Add one in a Menu node or include one in Controlled Language.”

## 6) Editor Interaction Model

Interaction behavior after this session:

- Typing a Menu term in a Menu node immediately contributes term options to Glossary selectors.
- Text inputs no longer lose focus after a single backspace/keystroke due to node remount loops.

Root-cause chain fixed:

- `nodes` edits updated `menuTermGlossaryTerms`
- `menuTermGlossaryTerms` previously recreated `nodeTypes`
- recreated `nodeTypes` triggered React Flow node remounts and dropped focus

The ref bridge keeps term data live while preserving stable `nodeTypes` identity.

## 7) Refactor Outcomes

Concrete outcomes from this session:

1. Added live Menu-term aggregation for glossary selector options.
2. Repaired JSX/UI copy paths in Menu glossary empty states to reflect new sourcing behavior.
3. Fixed regression by decoupling `nodeTypes` memo identity from per-keystroke glossary-term recomputation.
4. Preserved existing menu editing semantics and undo/persistence flows.

## 8) Validation and Operational Notes

Validation completed successfully:

- `npm run lint` (no ESLint errors)

Operational notes from this run:

- A dev-server attempt reported existing Next dev lock/instance contention (`.next/dev/lock`), indicating another dev instance was already running.

## 9) Recommended Next Steps

1. Add regression tests for Menu glossary sourcing (included glossary terms + live Menu-node terms union).
2. Add interaction tests for focus retention while typing/backspacing in node inputs.
3. Add a guard test ensuring `nodeTypes` identity remains stable across ordinary text edits.
4. Continue extracting node-renderer wiring from `app/page.tsx` into smaller modules to reduce remount-related regressions.

##02-25-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session was a focused UX bug-fix pass on node text authoring behavior.

The key product outcomes were:

- Restored **editable canvas fields** for the **Default** node type (Title + displayed term).
- Preserved existing node behavior while fixing a regression that made those fields read-only.
- Standardized placeholder copy for Menu node text fields to match requested wording.

## 2) Core Data Model

No schema changes were introduced.

The session reused existing node data contracts:

- `title`
- `display_term_field` and its resolved value (`primary_cta` / `secondary_cta` / `helper_text` / `error_text`)
- `menu_config.terms[].term`

All updates were interaction/rendering-level and did not alter persisted type shapes.

## 3) Persistence and Migration Strategy

Persistence and migration behavior remained unchanged:

- no storage key updates
- no migration logic updates
- no changes to project import/export schema

Because this session only adjusted input rendering/editability, existing saved projects remain fully compatible.

## 4) Ordering Model and Project Sequence ID

No ordering behavior changed in this session.

- `computeFlowOrdering(...)` unchanged
- `computeProjectSequenceId(...)` unchanged

Text-field UX fixes do not affect graph structure, node ordering, or sequence identity.

## 5) Node Rendering and Shape System

`FlowCopyNode` rendering was updated in two targeted areas:

1. **Default node canvas content**
   - Replaced read-only display blocks for Title/Term with editable `<input>` controls.
   - Title input now uses placeholder: `Add title`.
   - Displayed term input now uses placeholder: `Add term`.

2. **Menu node placeholder consistency**
   - Canvas menu Title input now uses placeholder: `Add title`.
   - Canvas menu Term inputs now use placeholder: `Add term`.
   - Inspector menu Title/Term inputs were aligned with the same placeholder text.

No node-shape geometry or edge-visual logic was modified.

## 6) Editor Interaction Model

Interaction behavior after this fix:

- Default-node Title and displayed term are once again editable directly on the canvas.
- Displayed-term edits still route through the currently selected `display_term_field` (no selector behavior changes).
- Menu node editing flows are unchanged functionally; only placeholder text was added for clearer empty-state guidance.

No changes were made to menu term add/remove mechanics, glossary behavior, or node-type switching behavior.

## 7) Refactor Outcomes

Concrete outcomes from this session:

1. Removed the temporary read-only fallback rendering path for default-node Title/Term on canvas.
2. Restored direct input editing for those two fields using existing update callbacks.
3. Added consistent placeholder copy (`Add title`, `Add term`) across menu canvas + inspector text inputs.
4. Kept existing option-management and node behavior intact while applying the UX fix.

## 8) Validation and Operational Notes

Validation command run during this session:

- `npm run lint`

Operational notes:

- Command output in this environment contained shell/spinner artifacts.
- A subsequent `npm run dev` attempt reported an existing Next.js dev lock (`.next/dev/lock`) from another running instance.

## 9) Recommended Next Steps

1. Add regression tests for default-node canvas editability (Title + displayed term).
2. Add UI checks to verify placeholder text for menu/default text inputs.
3. Add a small interaction test to confirm displayed-term edits still follow `display_term_field` mapping.
4. Continue extracting `FlowCopyNode` render branches into smaller components to reduce regression risk.

##02-25-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session was a focused UX streamlining pass across the **default node** and **menu node** editing surfaces.

The product-level outcomes were:

- Default nodes now support explicit control over which controlled-language field is displayed in the node term slot.
- Default-node canvas content now uses non-editable placeholder behavior for empty title/term display.
- Menu-node term rows were compacted in both canvas and inspector to reduce visual noise and improve scanability.

## 2) Core Data Model

No new persisted schema was introduced in this pass; changes were primarily interaction/rendering-level and leveraged the existing field model.

Key model-driven behavior used/extended this session:

- `display_term_field` on node data is now directly editable from inspector UI for default nodes.
- Selector options remain the existing controlled-language node fields:
  - `primary_cta`
  - `secondary_cta`
  - `helper_text`
  - `error_text`

Implementation callbacks added/refined:

- `updateSelectedDisplayTermField(...)` to update `display_term_field` on the selected node with undo snapshot support.

## 3) Persistence and Migration Strategy

Persistence and migration contracts remained stable:

- No storage key changes.
- No migration updates required.
- Existing node serialization/import/export paths continue to carry `display_term_field` as before.

This session’s updates were compatible with the current project save/load format.

## 4) Ordering Model and Project Sequence ID

No ordering or sequence-ID logic changed.

- `computeFlowOrdering(...)` unchanged.
- `computeProjectSequenceId(...)` unchanged.

UI streamlining for term/title presentation does not affect graph topology, ordering semantics, or sequence identity.

## 5) Node Rendering and Shape System

### Default-node rendering changes

- Canvas title display is now non-editable and shows placeholder **"Add title"** when empty.
- The displayed term slot now resolves from `display_term_field` and shows placeholder **"Add term"** when empty.
- The term label continues to reflect the currently selected controlled-language field label.

### Menu-node rendering changes

- Removed all **"Handle N"** labels from canvas and inspector term rows.
- Replaced with **"Term N"** labeling.
- Moved delete **X** into the same row as the term input and positioned it to the **left** of the input.
- Kept the **Glossary** button in its prior top-row location.
- Reduced row/container padding and spacing for a more compact node/inspector footprint.

## 6) Editor Interaction Model

### 6.1 Default-node displayed-term selector

- Added inspector checkboxes for:
  - Primary CTA
  - Secondary CTA
  - Helper Text
  - Error Text
- Behavior is mutually exclusive (single-select).
- Default remains `Primary CTA` via `display_term_field` defaulting rules.
- Unchecking the active option directly is ignored; selection changes occur by checking another option.

### 6.2 Menu-term row interactions

- Term editing behavior remains inline in both canvas and inspector.
- Delete action remains available per term, now relocated to improve row density and ergonomics.
- Glossary dropdown behavior remains unchanged functionally, with layout preserved in the top control row.

## 7) Refactor Outcomes

Concrete outcomes from this session:

1. Added a dedicated default-node inspector control to drive which field’s term is shown in-node.
2. Shifted default-node canvas title/term displays to placeholder-only, non-editable presentation for empty states.
3. Standardized menu term labeling to **Term N** across canvas and inspector.
4. Compacted menu term cards/rows and relocated delete controls for faster editing flow.

## 8) Validation and Operational Notes

Validation completed successfully after implementation:

- `npm run lint -- --no-cache` → exit code `0`
- `npx tsc --noEmit` → exit code `0`

Operational note:

- A `next dev` run was attempted and reported an existing `.next/dev/lock` from another running instance; this did not affect lint/type validation results.

## 9) Recommended Next Steps

1. Add interaction tests for default-node displayed-term selector exclusivity and persistence.
2. Add UI regression checks for placeholder rendering (`Add title`, `Add term`) in default nodes.
3. Add regression tests for menu row compact layout behavior in both canvas and inspector.
4. Consider converting the displayed-term checkboxes to radio-style controls for stronger one-of-many affordance while preserving current behavior.
5. Continue extracting node-type-specific inspector sections from `app/page.tsx` into dedicated components.

##02-24-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session was a targeted menu-node UX bug-fix pass in the editor inspector.

The product-level outcomes were:

- **Right side connections** is now edited as a plain numeric text input (no spinner/drag control).
- Canvas updates for that field are now **deferred** and only applied on **Enter** or **blur**.
- Menu terms now enforce a hard minimum of one term with a clear user-facing message when delete is blocked.
- The inspector panel remains resizable, with a larger max width cap for better editing space.

## 2) Core Data Model

No persisted schema changes were introduced.

The existing menu contracts remain unchanged:

- `MenuNodeConfig`
- `MenuNodeTerm`
- `MENU_NODE_RIGHT_CONNECTIONS_MIN` / `MENU_NODE_RIGHT_CONNECTIONS_MAX`

Behavior-level control was refined through callback logic and constants:

- `commitSelectedMenuRightConnectionsInput(rawValue)` now sanitizes, clamps, and commits deferred input.
- `MENU_NODE_MINIMUM_TERM_ERROR_MESSAGE` is used as the shared blocked-delete message.
- `clearMenuTermDeleteError` + `showMenuTermDeleteBlockedMessage` manage short-lived error state.

## 3) Persistence and Migration Strategy

Persistence/migration contracts were unchanged.

- Project node/edge/admin-option serialization remains the same.
- No migration updates were required.
- Side-panel width still persists through `flowcopy.editor.canvasSidePanelWidth`; only the max clamp limit changed.

## 4) Ordering Model and Project Sequence ID

No ordering behavior changed in this session.

- `computeFlowOrdering(...)` unchanged.
- `computeProjectSequenceId(...)` unchanged.

The menu inspector fixes are interaction-layer updates and do not affect graph ordering semantics.

## 5) Node Rendering and Shape System

Shape rendering contracts were not modified.

UI rendering changes in this session were focused on inspector/menu editing surfaces:

- Inspector `Right side connections` switched from `<input type="number">` to numeric text input semantics (`type="text"`, `inputMode="numeric"`, `pattern="[0-9]*"`).
- A small inline blocked-delete error message is rendered for menu nodes in the inspector.
- Side-panel width cap increased to:
  - `SIDE_PANEL_MAX_WIDTH = Math.round(SIDE_PANEL_MIN_WIDTH * 2.1)`

## 6) Editor Interaction Model

### 6.1 Right side connections commit model

- Input now allows temporary empty state while typing/deleting.
- Non-digit characters are stripped during input.
- Value commits only on:
  - `onBlur`
  - `Enter` key (`onKeyDown`)
- On commit:
  - empty/invalid values default to `1`
  - values are clamped to allowed bounds
  - canvas state updates only when committed value differs from current config

### 6.2 Menu-term minimum guard

Delete actions now enforce minimum-term behavior from both paths:

- canvas node term delete (`FlowCopyNode`)
- inspector term delete (`deleteSelectedMenuTermById`)

If term count is already at minimum, delete is blocked and user sees:

`You must have at least 1 menu term for this note type. You can change the term if you like.`

### 6.3 Error lifecycle hygiene

Blocked-delete message state is actively cleared on selection/context changes (pane/node/edge selection changes, project load, and node-type transitions away from menu) to prevent stale error display.

## 7) Refactor Outcomes

Concrete outcomes from this session:

1. **Deferred commit for right-connection edits**
   - removed per-keystroke graph updates for this control.
2. **Shared minimum-term protection**
   - consistent guard behavior across node and inspector delete flows.
3. **Cleaner transient error management**
   - timer-backed error display with centralized clear/show callbacks.
4. **Lint-safe interaction path**
   - removed effect-driven state-sync pattern that previously triggered `react-hooks/set-state-in-effect` warnings during this refactor path.

## 8) Validation and Operational Notes

Validation executed after implementation:

- `npm run lint` ✅

Operational note:

- shell output includes spinner/control-character artifacts in this environment, but lint completed without ESLint errors.

## 9) Recommended Next Steps

1. Add regression tests for right-connection commit timing (type freely, commit on Enter/blur only).
2. Add tests for empty/invalid commit fallback to `1` and bounds clamping.
3. Add tests to ensure last menu term cannot be deleted from either node card or inspector.
4. Consider adding tiny helper text under the field clarifying allowed range and commit behavior.
5. Optionally centralize transient inspector alerts into a reusable notification primitive.

##02-24-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session was a targeted UX cleanup pass for node-type editing.

The product behavior now separates responsibilities more clearly:

- **Canvas node cards** focus on compact content editing.
- **Inspector panel** owns node-configuration controls, including node type changes.

The key outcome is that Node Type switching was moved out of the node card and into the side-panel inspector without changing switching behavior.

## 2) Core Data Model

No persisted schema changes were introduced.

The existing node type model remains unchanged:

- `NodeType = "default" | "menu"`
- `MicrocopyNodeData.node_type`
- existing menu contracts (`MenuNodeConfig`, `MenuNodeTerm`) remain intact.

This session changed control location and update plumbing, not the underlying data contract.

## 3) Persistence and Migration Strategy

Persistence/migration architecture was unchanged.

- autosave path remains `persistCurrentProjectState(...)`
- existing project serialization/import/export contracts are unchanged
- legacy controlled-language fallback (`list_item` → `menu_term`) remains as-is

All changes were behavior/UI wiring, with no storage format migration required.

## 4) Ordering Model and Project Sequence ID

No ordering or sequence-ID logic changed in this session.

- `computeFlowOrdering(...)` unchanged
- `computeProjectSequenceId(...)` unchanged

Node type control relocation does not affect graph ordering semantics.

## 5) Node Rendering and Shape System

`FlowCopyNode` rendering was simplified by removing the in-card Node Type selector.

Related rendering/wiring refinements:

- `FlowCopyNode` now reads only `setNodes` from `useReactFlow` (removed local `setEdges` need after moving type switching logic out).
- node internals refresh effect keeps `data.node_type` in dependencies to ensure handle/layout updates stay correct when type changes.

Shape rendering and edge visual systems were otherwise unchanged.

## 6) Editor Interaction Model

Node type switching is now inspector-driven:

- Added `node_type` select control in selected-node inspector block.
- Added page-level switching callbacks:
  - `updateNodeTypeById(...)`
  - `updateSelectedNodeType(...)`

Behavior parity was preserved during switching:

- switching to `menu` still normalizes menu config and syncs first term with `primary_cta`
- switching updates `primary_cta` / `secondary_cta` from menu terms
- sequential edges are still remapped appropriately:
  - `assignSequentialEdgesToMenuHandles(...)` when entering menu mode
  - `remapMenuSequentialEdgesToDefaultHandle(...)` when returning to default mode
- undo snapshots are still captured before mutation

## 7) Refactor Outcomes

Concrete refactor results from this session:

1. **Node Type control relocated to inspector** for clearer editing hierarchy.
2. **Type-switch logic centralized in page-level selection context** instead of per-node card callback.
3. **Dead/duplicate node-card type-switch code removed**, reducing local complexity in `FlowCopyNode`.
4. **Lint-safe cleanup**: removed a `setState`-inside-effect path that was no longer needed after refactor.

## 8) Validation and Operational Notes

Validation completed successfully after refactor cleanup:

- `npm run lint` ✅
- `npm run build` ✅

Operational note:

- a transient lint failure (`react-hooks/set-state-in-effect`) was resolved by removing the now-unnecessary `setOpenMenuGlossaryTermId(...)` effect in `FlowCopyNode`.

## 9) Recommended Next Steps

1. Add interaction tests for inspector-based node type switching (default ↔ menu).
2. Add regression checks for edge-handle remapping when switching node types.
3. Add a small inspector hint describing node-type implications (e.g., menu handle behavior).
4. Consider extracting node-type transition logic into a dedicated helper to keep `Page` leaner.

##02-24-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session focused on editor reliability and keyboard safety in the canvas node authoring experience.

The primary product-level outcome was a fix for an in-node text-editing bug where pressing `Backspace` could blur the input after one character, and a second `Backspace` could then delete the selected node. The editor now preserves text-input focus during continuous typing/deletion and keeps node deletion behavior scoped to true non-editing contexts.

## 2) Core Data Model

No persistent schema changes were introduced.

The relevant architectural adjustment was in callback wiring/state references for menu-node updates:

- introduced `updateMenuNodeConfigByIdRef` (`useRef`) to hold the latest menu-config updater
- synchronized that ref via effect so node renderer callbacks can invoke current logic without capturing unstable callback identities

This was a behavior-layer change only; project/store/node payload contracts remain unchanged.

## 3) Persistence and Migration Strategy

Persistence and migration flows were not structurally changed this session.

- autosave path (`persistCurrentProjectState(...)`) remains unchanged
- project serialization/import/export contracts remain unchanged
- legacy controlled-language compatibility (`list_item` normalization to `menu_term`) remains intact

The bug fix was implemented without altering storage format or migration behavior.

## 4) Ordering Model and Project Sequence ID

No ordering-model changes were made.

- `computeFlowOrdering(...)` unchanged
- `computeProjectSequenceId(...)` unchanged

The fix is orthogonal to graph topology, sequence derivation, and project identity hashing.

## 5) Node Rendering and Shape System

Node/edge visual systems and shape rendering contracts were unchanged.

The notable rendering-adjacent change was stabilizing custom node renderer callback identity to avoid unintended remount/focus churn during input edits.

- `nodeTypes` memo no longer depends directly on a callback that changes with node state updates
- node callback invocation is routed through a stable ref-backed function bridge

This reduces accidental remount behavior while keeping the same node UI/shape output.

## 6) Editor Interaction Model

Keyboard behavior was hardened around editing-vs-deletion intent:

- typing/deleting inside node inputs now retains focus as expected
- global Backspace/Delete shortcut behavior remains available for selected nodes/edges when the user is not editing an input
- editable-target guard logic (`isEditableEventTarget`) remains the safety gate for shortcut suppression while typing

In effect, text editing and canvas deletion shortcuts no longer interfere under normal node-input workflows.

## 7) Refactor Outcomes

Key refactor outcomes from this session:

1. **Stabilized node callback path**
   - introduced ref-backed callback handoff for menu-node config updates.
2. **Reduced renderer identity churn**
   - updated `nodeTypes` memo dependencies to avoid unnecessary node renderer recreation while typing.
3. **Resolved Backspace focus-loss/deletion chain**
   - prevented the one-character-delete-then-node-delete failure mode during node field editing.

## 8) Validation and Operational Notes

Validation completed successfully after the fix:

- `npm run build`
- `npm run lint`

Operational note:

- During one run attempt, local dev startup reported an existing Next dev lock/instance conflict. This did not affect build/lint verification of the implemented fix.

## 9) Recommended Next Steps

1. Add regression coverage for node-input Backspace behavior (focus retention + no accidental node deletion).
2. Add targeted interaction tests for keyboard shortcuts across canvas vs editable fields.
3. Consider extracting node callback-bridge patterns into a reusable utility/hook for consistency.
4. Continue modularizing `app/page.tsx` to reduce coupling between render wiring and interaction logic.

##02-24-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session was a focused hardening/refinement pass on the menu-node authoring experience rather than a greenfield feature build.

The product-level outcome is a clearer split between:

- **canvas editing** for compact menu term authoring
- **inspector editing** for menu-node configuration controls

Menu nodes are now intentionally simplified in-canvas, while advanced menu controls are concentrated in the side panel.

## 2) Core Data Model

The session continued using the existing typed model and reinforced the menu-specific path:

- `NodeType = "default" | "menu"`
- `MenuNodeConfig = { max_right_connections, terms[] }`
- `MenuNodeTerm = { id, term }`

Controlled-language typing now explicitly supports menu terms as glossary-classified entries:

- `ControlledLanguageFieldType` includes `"menu_term"`
- `CONTROLLED_LANGUAGE_FIELDS` includes `menu_term`
- `collectControlledLanguageTermsFromNode(...)` maps menu node terms to `{ field_type: "menu_term", term }`

This preserves the existing schema while making menu-term vocabulary first-class in audit/glossary logic.

## 3) Persistence and Migration Strategy

No storage contract break was introduced in this session.

- Project persistence still serializes `node_type` and normalized `menu_config`.
- Flat import/export continues to round-trip menu state via `node_type` and `menu_config_json`.
- Menu config updates remain funneled through shared normalization (`normalizeMenuNodeConfig`) and application helpers (`applyMenuConfigToNodeData`) so persisted shapes remain stable.

The work was implemented as behavior and UI refinement over the existing persistence architecture.

## 4) Ordering Model and Project Sequence ID

Ordering/sequence architecture was not structurally changed this session.

- `computeFlowOrdering(...)` and `computeProjectSequenceId(...)` remain the sequence authorities.
- Menu-connection constraints and menu handle assignment continue to operate within the existing edge model without changing sequence identity rules.

Result: menu-node UX changes do not alter project ordering semantics.

## 5) Node Rendering and Shape System

Menu-node rendering was simplified on-canvas:

- `Primary CTA` field is hidden for `node_type === "menu"`.
- Menu term cards now contain only:
  - `Handle N` label
  - `Term` input
  - `X` delete button
  - `Glossary` button/list
- Term-specific right source handles are rendered per term (`buildMenuSourceHandleId(term.id)`) and anchored to the term input center (`top: 50%`, `transform: translateY(-50%)`) for visual alignment.
- The default sequential right handle is disabled/hidden for menu nodes (`isConnectable={!isMenuNode}`), preventing duplicate connection affordances.

Inspector rendering was specialized by node type:

- For menu nodes, inspector now shows menu editing controls instead of the default copy/shape field stack.

## 6) Editor Interaction Model

Interaction behavior was refined to reduce accidental complexity:

- **Inspector (menu node)** now shows:
  - `Right side connections` number input (min/max constrained)
  - full menu term list with editable `Term`, per-term `Glossary`, and `X` delete
- **Inspector (menu node)** now suppresses the requested fields:
  - `node_shape`
  - `body_text`
  - `body_text preview`
  - `primary_cta`
  - `secondary_cta`
  - `helper_text`
  - `error_text`
- Controlled-language field dropdown toggles were updated to standard click behavior (no `Alt+Click` requirement), and helper copy was updated accordingly.
- Menu-term glossary application works in both canvas cards and inspector rows via menu-term glossary sources.

## 7) Refactor Outcomes

Key refactor outcomes from this session:

1. **Menu UX de-cluttered**
   - reduced in-node menu authoring UI to essential controls only.
2. **Inspector responsibility clarified**
   - menu connection-count control moved/kept in inspector-only path.
3. **Glossary/audit model unified for menu terms**
   - menu terms are now consistently treated as `Menu Term` entries in controlled-language audit + glossary include logic.
4. **Controlled-language table workflow improved**
   - add-term draft row moved to the top of the table and includes `Menu Term` option.

## 8) Validation and Operational Notes

Validation and operational checks from this session:

- `npm run build` completed successfully.
- `npm run lint` in this environment emits shell/spinner artifacts; command execution and exit-path checks indicated success (`EXIT_CODE:0` via cmd wrapper).

Operational note:

- Menu connection safeguards, menu term normalization, and glossary row computation are now aligned around the same menu-config source of truth, reducing drift between canvas, inspector, and audit views.

## 9) Recommended Next Steps

1. Add targeted regression tests for menu-node inspector visibility rules (menu vs default field sets).
2. Add focused UI tests for menu-handle alignment and per-term edge attachment behavior.
3. Add controlled-language tests ensuring menu terms always audit under `Menu Term` and respect include filters.
4. Consider extracting menu-node editor UI (canvas + inspector blocks) into dedicated components to reduce `app/page.tsx` complexity.
5. Add a compact “menu diagnostics” badge in inspector (term count, used handles, available handles) to support QA/debugging.

##02-23-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session focused on a dashboard-only UI refinement pass to improve scanability and visual hierarchy while preserving the existing product flow (`account` → `dashboard` → `editor`).

The outcome was a cleaner top-level dashboard surface with clearer section separation, stronger call-to-action emphasis, and better heading placement relative to the account-code block.

## 2) Core Data Model

No data model changes were introduced.

- No updates to `AppStore`, `AccountRecord`, `ProjectRecord`, or canvas node/edge schemas.
- No new persisted fields were added for dashboard styling.

All changes in this session were presentational and contained in dashboard view styling within `app/page.tsx`.

## 3) Persistence and Migration Strategy

Persistence and migration behavior were unchanged.

- Existing localStorage keys and migration paths remain intact.
- Dashboard visual updates do not alter serialized project/account/session payloads.

This was intentionally kept as a pure UI-layer change with zero storage contract impact.

## 4) Ordering Model and Project Sequence ID

No ordering logic changes were made.

- `computeFlowOrdering(...)` unchanged
- `computeProjectSequenceId(...)` unchanged

Dashboard refinements are independent from graph ordering and sequence identity generation.

## 5) Node Rendering and Shape System

Node/edge rendering systems in the editor were not modified.

Session-specific rendering work was limited to dashboard layout/styling:

- Continued use of constrained dashboard content width (`width: "min(1080px, 100%)"`).
- Stronger section framing via `dashboardBlockStyle` (`2px` border, radius, soft shadow).
- More prominent button hierarchy using:
  - `dashboardButtonStyle` (stronger border/weight)
  - `dashboardPrimaryButtonStyle` (blue primary fill + shadow)

## 6) Editor Interaction Model

No editor interaction behavior was changed in this session.

Dashboard interaction semantics remained the same:

- create project
- open project
- sign out/back to account code

Only visual prominence and spacing of these controls were adjusted.

## 7) Refactor Outcomes

The dashboard UI refactor produced three concrete outcomes:

1. **Tighter and clearer top layout structure**
   - Dashboard top container spacing was adjusted to better balance whitespace at the page top.
2. **Defined section boundaries**
   - Account and project-creation blocks now read as clearly separated cards through stronger border treatment.
3. **Improved heading placement and emphasis**
   - `Project Dashboard` was wrapped in a dedicated container (`minHeight: 124`, centered content), and top padding was reduced so the heading sits centered between the viewport top and the account-code block.

## 8) Validation and Operational Notes

Validation was executed after the updates:

- `npm run lint`
- confirmed successful run with `LINT_OK`

Operational note:

- The lint command prints a shell spinner artifact in this environment, but the explicit `LINT_OK` marker confirms completion status.

## 9) Recommended Next Steps

1. Extract dashboard inline style objects into a dedicated style module/CSS layer to reduce `app/page.tsx` size.
2. Add hover/focus/active states for dashboard buttons and project cards for stronger interaction affordance.
3. Add responsive breakpoints for project card columns (e.g., 3 → 2 → 1) for smaller viewports.
4. Add visual regression coverage for dashboard layout/spacing to protect heading-position refinements.
5. Consider introducing shared card/button design tokens across account/dashboard/editor surfaces for consistency.

##02-23-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session focused on editor ergonomics by making the canvas-side properties panel resizable while preserving all existing project/canvas behavior.

The key product outcome is a persistently sized side panel that users can drag from the left edge, improving usability for large forms (Controlled Language + node metadata) without changing the overall app flow (`account` → `dashboard` → `editor`).

## 2) Core Data Model

No project schema changes were introduced, but panel-resize state/constraints were formalized in `app/page.tsx`:

- `SIDE_PANEL_MIN_WIDTH = 420`
- `SIDE_PANEL_MAX_WIDTH = Math.round(SIDE_PANEL_MIN_WIDTH * 1.5)` (effective max: `630`)
- `SIDE_PANEL_WIDTH_STORAGE_KEY = "flowcopy.editor.canvasSidePanelWidth"`

Supporting helpers/state added:

- `clampSidePanelWidth(value)`
- `readInitialSidePanelWidth()`
- `sidePanelWidth` state
- `isResizingSidePanel` state
- `sidePanelResizeStartXRef` / `sidePanelResizeStartWidthRef`

## 3) Persistence and Migration Strategy

Panel width persistence is localStorage-based and intentionally isolated from the project canvas schema:

- Initial width is restored through lazy state init: `useState<number>(readInitialSidePanelWidth)`.
- Width writes are performed in an effect using a clamped value.
- Invalid, missing, or non-numeric stored values safely fall back to `SIDE_PANEL_MIN_WIDTH`.
- SSR-safe guards (`typeof window === "undefined"`) are used for reads/writes.

No migration changes were required for `AppStore` / project records.

## 4) Ordering Model and Project Sequence ID

No ordering changes were made in this session.

- `computeFlowOrdering(...)` unchanged
- `computeProjectSequenceId(...)` unchanged

Panel resizing is UI-layout behavior and does not affect graph sequencing or export ordering identity.

## 5) Node Rendering and Shape System

Node shape rendering (`rectangle/rounded/pill/diamond`) and edge visuals were not modified.

Layout-level rendering changes:

- Editor root grid changed from fixed right column to dynamic sizing:
  - `gridTemplateColumns: \`1fr ${sidePanelWidth}px\``
- Side panel now includes a left-edge draggable separator (`role="separator"`, `aria-orientation="vertical"`).

## 6) Editor Interaction Model

Resize interaction was implemented with pointer events:

- `onPointerDown` on the separator (left mouse button only)
- Captures start position/width refs
- While resizing, global listeners are attached:
  - `pointermove` → compute delta and clamp width
  - `pointerup` / `pointercancel` → stop resizing

UX polish and safety:

- During resize, `document.body.style.cursor = "col-resize"`
- During resize, `document.body.style.userSelect = "none"`
- All listeners and temporary body styles are cleaned up on stop/unmount

## 7) Refactor Outcomes

The resize implementation also resolved a lint issue by refactoring initialization strategy:

- Replaced effect-driven `setSidePanelWidth(...)` initialization with lazy initializer `readInitialSidePanelWidth()`.
- This removed the `react-hooks/set-state-in-effect` warning and simplified startup behavior.

Code was organized into small callbacks:

- `handleSidePanelResizePointerDown`
- `handleSidePanelPointerMove`
- `stopSidePanelResize`

## 8) Validation and Operational Notes

Validation completed successfully after implementation:

- `npx tsc --noEmit`
- `npm run lint`

Operational notes:

- Persisted width is global to the editor session via one storage key (`flowcopy.editor.canvasSidePanelWidth`).
- Width is always constrained to the `[420, 630]` range, even if localStorage is manually edited.

## 9) Recommended Next Steps

1. Add a visible drag grip/icon so the separator affordance is more discoverable.
2. Add a “Reset panel width” action to return to default (`420`).
3. Add keyboard-accessible resizing increments for accessibility.
4. Consider per-project panel width persistence if different projects need different panel density.
5. Extract resize behavior into a reusable hook (e.g., `useResizablePanel`) to reduce `app/page.tsx` complexity.

##02-23-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session focused on a targeted QA hardening pass for Controlled Language behavior in the editor side panel.

The product-level change is that existing glossary audit rows are now treated as stable `Field Type + Term` records, rather than mutable field-type assignments. This protects the semantic meaning of occurrence counts and reduces accidental drift during editorial cleanup.

## 2) Core Data Model

No new top-level types were added, but interaction rules around the existing controlled-language model were tightened:

- `ControlledLanguageGlossaryEntry` remains keyed by `field_type + term` identity.
- `ControlledLanguageAuditRow.occurrences` continues to represent counts for that exact identity pair.
- Existing-row Field Type is now rendered as read-only display, enforcing key stability through UI constraints.

## 3) Persistence and Migration Strategy

Persistence and migration contracts were unchanged in this session:

- glossary entries still persist in `PersistedCanvasState.controlledLanguageGlossary`
- import/export mapping still uses `project_controlled_language_json`
- undo/persistence behavior remains routed through existing snapshot/autosave flows

No storage schema updates or migration logic changes were required.

## 4) Ordering Model and Project Sequence ID

No ordering-model changes were made.

- `computeFlowOrdering(...)` unchanged
- `computeProjectSequenceId(...)` unchanged

Controlled Language QA refinements remain orthogonal to graph ordering and sequence identity.

## 5) Node Rendering and Shape System

Canvas node shape and edge rendering systems were not modified.

The only UI rendering adjustment in this session was inside the Controlled Language table:

- existing-row Field Type changed from editable select control to read-only display input

## 6) Editor Interaction Model

Controlled Language interaction behavior was clarified as follows:

- Existing glossary/audit rows:
  - Field Type is no longer editable
  - Glossary Term remains editable
  - Include toggle remains editable
- Add-new draft row:
  - retains Field Type dropdown for creating new entries

This preserves the intended meaning of Occurrences as count per stable `Field Type + Term` key.

## 7) Refactor Outcomes

Code-level cleanup aligned with the interaction change:

- removed obsolete `moveControlledLanguageRowFieldType(...)` mutation path
- removed existing-row Field Type `<select>` wiring inside `controlledLanguageAuditRows.map(...)`
- replaced with read-only Field Type rendering for existing rows

Outcome: reduced risk of occurrence-count corruption caused by in-place field-type reassignment.

## 8) Validation and Operational Notes

Validation completed successfully after the QA fix:

- `npx tsc --noEmit`
- `npm run lint`

Operational note:

- field-type reassignment is intentionally constrained to the add-new flow; existing rows are classification-stable by design.

## 9) Recommended Next Steps

1. Add a lock icon and tooltip to existing-row Field Type cells to make immutability explicit.
2. Add an intentional “duplicate term into another field type” action rather than allowing in-place reassignment.
3. Add tests/assertions for controlled-language audit invariants (occurrence stability under row edits).
4. Add table filtering/sorting for larger glossaries.
5. Continue extracting Controlled Language logic from `app/page.tsx` into dedicated modules.

##02-23-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session added a dedicated **Controlled Language** workflow to the editor side panel so teams can manage glossary terms while authoring node copy.

The core UX outcome is a compact glossary/audit surface that sits in the existing editor panel and supports:

- auditing real usage in node fields
- deciding which terms are reusable in field-level pick lists
- adding approved terms before they are used in-flow

## 2) Core Data Model

Controlled-language behavior is now explicitly modeled around the existing field taxonomy:

- `ControlledLanguageFieldType`:
  - `primary_cta`
  - `secondary_cta`
  - `helper_text`
  - `error_text`

Glossary state uses and extends existing typed structures:

- `ControlledLanguageGlossaryEntry` (`field_type`, `term`, `include`)
- `ControlledLanguageAuditRow` (`field_type`, `term`, `include`, `occurrences`)
- `ControlledLanguageDraftRow` (new editable row state for adding terms)

Normalization and dedupe continue to rely on field+term identity keys via:

- `buildControlledLanguageGlossaryKey(...)`
- `parseControlledLanguageGlossaryKey(...)`
- `sanitizeControlledLanguageGlossary(...)`

## 3) Persistence and Migration Strategy

Controlled-language terms remain project-scoped and are persisted through the existing canvas store pipeline:

- `PersistedCanvasState.controlledLanguageGlossary`
- autosave through `persistCurrentProjectState(...)`
- import/export via `project_controlled_language_json`

This session also ensured glossary interactions remain in undo history by continuing to snapshot glossary state in `EditorSnapshot` and routing glossary edits through `queueUndoSnapshot()`.

## 4) Ordering Model and Project Sequence ID

No ordering algorithm changes were introduced in this session.

- `computeFlowOrdering(...)` and `computeProjectSequenceId(...)` behavior remains unchanged.
- Controlled Language features are orthogonal to flow ordering and sequence identity.

## 5) Node Rendering and Shape System

Graph node rendering and shape visuals were not structurally changed.

The node side-panel editing experience was extended so each controlled-language field now supports:

- direct text editing (unchanged)
- optional glossary term insertion via a gated dropdown interaction

## 6) Editor Interaction Model

### 6.1 Controlled Language panel

A new button was added near Admin controls:

- `Show/Hide Controlled Language`

When open, the panel renders a compact table with:

- **Field Type** (editable select)
- **Glossary Term** (editable text)
- **Occurrences** (read-only count, plus `Not Used` when 0)
- **Include** (checkbox to expose term in field dropdown)

Rows are built from a merged audit of:

- currently used node values in the four controlled fields
- explicitly tracked glossary entries

This guarantees one row per unique `field_type + term` pair with accurate occurrence counts.

### 6.2 Add-term draft row

An always-visible draft row was added to support authoring terms that are not yet used in the canvas:

- select field type
- enter term
- choose include state
- add row (occurrence remains `0`, shown as `Not Used`)

### 6.3 Alt+Click-only dropdown access

Each controlled-language field in the node panel now has a `Glossary ▾` button.

- dropdown toggles **only** on `Alt+Click`
- normal click does nothing (prevents accidental pop-open)
- dropdown choices come from `include === true` terms for the matching field type
- choosing a term writes it into the editable input and closes the dropdown

### 6.4 Selection-state hygiene

To satisfy lint requirements and avoid effect-driven cascading state updates, dropdown reset behavior is handled directly in interaction handlers (`onPaneClick`, `onNodeClick`, `onEdgeClick`, `onSelectionChange`) rather than via a `useEffect` that synchronously set state.

## 7) Refactor Outcomes

Primary architecture outcomes from this session:

- added in-editor controlled-language governance UI without introducing a separate route/view
- established occurrence auditing by unique field+term identity
- connected include-checked glossary terms to contextual field insertion
- preserved editable-first inputs while adding constrained optional insertion behavior

## 8) Validation and Operational Notes

Validation for this session completed successfully:

- `npx tsc --noEmit`
- `npm run lint`

Operational note:

- Alt+Click is intentionally required for glossary dropdown activation to minimize accidental interactions during normal copy editing.

## 9) Recommended Next Steps

1. Add search/filter and sort controls in the controlled-language table for larger glossaries.
2. Add optional status flags (e.g., preferred/forbidden/deprecated) beyond simple include/exclude.
3. Add bulk actions (include all in field type, export glossary-only CSV/XML).
4. Add validation rules for canonical casing/punctuation and duplicate-near-match warnings.
5. Consider extracting Controlled Language UI/state into dedicated modules to reduce `app/page.tsx` size.

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
























