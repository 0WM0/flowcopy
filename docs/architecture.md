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

##03-13-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session was a targeted ribbon-node interaction reliability fix.

The ribbon cell click-to-edit popup now opens consistently when users click a ribbon cell in the canvas node, including under normal React Flow pan/zoom usage.

## 2) Core Data Model

No persisted schema or type-contract changes were introduced.

Existing ribbon contracts remain unchanged:

- `RibbonNodeCell` fields (`label`, `key_command`, `tool_tip`)
- ribbon popup state model in renderer (`editingCellId`, `cellPopupPosition`)

The fix was interaction/positioning logic only.

## 3) Persistence and Migration Strategy

Persistence and migration behavior were unchanged:

- no localStorage key changes
- no project payload shape changes
- no migration-path updates

Ribbon cell edits continue to persist through existing node-state update and autosave/persist flows.

## 4) Ordering Model and Project Sequence ID

No ordering logic changed in this session.

- `computeFlowOrdering(...)` unchanged
- `computeProjectSequenceId(...)` unchanged

The popup fix is orthogonal to graph ordering and sequence identity.

## 5) Node Rendering and Shape System

`app/components/FlowCopyNode.tsx` ribbon rendering was updated in the cell + popup interaction path:

- ribbon cells now use `className="nodrag nopan"`
- popup container now uses `className="nodrag nopan"`
- popup JSX remains present and unchanged in structure (Label, Key Command, Tool Tip, Done)

Popup positioning was corrected to use cell-local offsets relative to the ribbon container instead of viewport-pointer coordinates, preventing misplaced/off-screen popups under transformed canvas conditions.

## 6) Editor Interaction Model

Ribbon cell interaction behavior is now stabilized:

- click/keyboard activation opens popup for the targeted cell
- open handlers stop propagation to avoid canvas-level interference
- popup container stops pointer/click propagation
- popup close paths remain:
  - **Done** button
  - `Escape`
  - outside click

This preserves expected authoring flow while preventing pan/selection handlers from hijacking popup interactions.

## 7) Refactor Outcomes

Concrete outcomes from this session:

1. Reworked `openRibbonCellEditor(...)` position calculation to container-local offset math.
2. Added `nopan` to ribbon cells and popup container alongside existing `nodrag` usage.
3. Added event-propagation guards (`stopPropagation`) on ribbon cell and popup interaction points.
4. Kept popup fields and close behavior intact per existing ribbon editing contract.

## 8) Validation and Operational Notes

Validation completed successfully:

- `npx tsc --noEmit` ✅

Operational note:

- one transient TypeScript annotation issue during implementation was corrected (`nextOffsetParent` type annotation) before final validation pass.

## 9) Recommended Next Steps

1. Add regression tests for ribbon popup opening at non-100% zoom and after canvas pan.
2. Add interaction tests for popup open/close lifecycle (click cell, outside click, Escape, Done).
3. Consider clamping popup position to node bounds for extreme small/large node layouts.

##03-12-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session refined inspector behavior for multi-selection in Canvas mode.

When more than one node is selected, the inspector no longer shows editable data for an arbitrary single node. Instead, it now shows a clear guidance message and requires users to narrow selection to exactly one node before editing node data.

## 2) Core Data Model

No persisted schema or type contracts changed.

The change introduced selection-state derivation for inspector rendering in `app/page.tsx`:

- `selectedInspectorNodeIds` (normalized, deduped selection set)
- `hasExactlyOneSelectedNode`
- `hasMultipleSelectedNodes`

These are runtime UI-state derivations only and do not alter node/edge/project models.

## 3) Persistence and Migration Strategy

No persistence or migration behavior changed.

- no localStorage key updates
- no project payload updates
- no migration-path updates

This was a presentation/interaction guard update in inspector rendering logic.

## 4) Ordering Model and Project Sequence ID

No ordering or sequence-ID behavior changed.

- `computeFlowOrdering(...)` unchanged
- `computeProjectSequenceId(...)` unchanged

Inspector gating is orthogonal to graph ordering computation.

## 5) Node Rendering and Shape System

Canvas node/edge rendering contracts were unchanged.

The update was scoped to inspector-side rendering conditions in `app/page.tsx`:

- node editor content now renders only when exactly one node is selected
- multi-selection renders a neutral empty-state message
- edge inspector still renders when an edge is selected and no nodes are selected

## 6) Editor Interaction Model

Inspector behavior now resolves selection states explicitly:

1. **No node selected** → "No selection. Click a node or edge on the canvas."
2. **Exactly one node selected** → full node editor UI
3. **Multiple nodes selected** → "Multiple nodes selected. Select a single node to edit its data."

Menu-node helper copy/error block visibility was also gated to single-node selection so menu-editing affordances do not appear in multi-select mode.

## 7) Refactor Outcomes

Concrete outcomes from this session:

1. Added normalized inspector selection-id derivation (`selectedInspectorNodeIds`).
2. Added explicit single vs multiple selection booleans.
3. Updated inspector conditional rendering to block node-editor rendering unless selection size is exactly one.
4. Added multi-selection guidance message using the same empty-state visual style as no-selection messaging.

## 8) Validation and Operational Notes

Validation completed successfully:

- `npx tsc --noEmit` ✅

Operational note: a follow-up `npm run dev` attempt in this environment reported an existing Next dev lock (`.next/dev/lock`) from another running instance; unrelated to this inspector logic change.

## 9) Recommended Next Steps

1. Add focused UI tests for inspector state gating (none/single/multiple selections).
2. Add regression coverage ensuring multi-selection never mounts single-node editor controls.
3. Consider adding a compact selection-count badge in the inspector header for additional clarity.

##03-12-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session completed conversation-export parity across all primary formats by extending the already-updated CSV/XML/JSON behavior to HTML and RTF.

The conversation export surface now consistently includes:

- sequence boundary markers (`Sequence Start` / `Sequence End`)
- step counters (`"1 of N"`)
- omission of empty fields/values

for conversation-view exports in CSV, XML, JSON, HTML, and RTF.

## 2) Core Data Model

No persisted schema/type contracts were changed.

The session reused existing conversation export normalization contracts in `app/lib/export.ts`:

- `normalizeUiJourneyConversationExportEntries(...)`
- `visibleFields`
- `stepLabel`
- optional `bodyText` / `notes` nullability checks

This kept export behavior model-driven without introducing new payload fields.

## 3) Persistence and Migration Strategy

No storage, migration, or project-schema changes were required.

Changes were export-generation and UI routing only:

- no localStorage key changes
- no project payload format changes
- no migration-path updates

## 4) Ordering Model and Project Sequence ID

No ordering/sequence algorithms changed.

- `computeFlowOrdering(...)` unchanged
- `computeProjectSequenceId(...)` unchanged

Step counters in exports use existing conversation entry order and count; they do not alter graph ordering semantics.

## 5) Node Rendering and Shape System

No canvas node/edge rendering changes were made.

HTML export rendering was enhanced to more closely mirror Conversation View presentation:

- step labels per entry
- sequence boundary markers in output
- filtered field display (no empty values)
- orphan-aware visual treatment retained in exported conversation styling

## 6) Editor Interaction Model

Conversation export button routing in `app/page.tsx` was updated so the conversation modal now calls conversation-specific exporters for HTML/RTF:

- `html` → `buildUiJourneyConversationHtmlExport(...)`
- `rtf` → `buildUiJourneyConversationRtfExport(...)`

This aligns HTML/RTF behavior with existing conversation-specific CSV/XML/JSON export routing.

## 7) Refactor Outcomes

Concrete outcomes from this session:

1. Added `buildUiJourneyConversationHtmlExport(...)` in `app/lib/export.ts`.
2. Added `buildUiJourneyConversationRtfExport(...)` in `app/lib/export.ts`.
3. Implemented sequence start/end markers and step counters in both new exporters.
4. Ensured empty conversation fields are omitted via normalized visible-field filtering.
5. Updated conversation export switch in `app/page.tsx` to use new HTML/RTF conversation exporters.

## 8) Validation and Operational Notes

Validation completed successfully:

- `npx tsc --noEmit` ✅

Operationally, this closes the format gap where HTML/RTF previously used older conversation export behavior.

## 9) Recommended Next Steps

1. Add focused tests for conversation HTML/RTF export parity (markers, step labels, empty-field omission).
2. Add snapshot-based golden tests for exported HTML readability and RTF content structure.
3. Consider consolidating legacy/plain conversation exporters vs conversation-specific export variants to reduce duplication.

##03-11-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session fixed the Supabase auto-save regression and then stabilized the editor after an infinite re-render risk.

The product-level outcome is:

- auto-save now writes live editor state (not stale/default payloads)
- auto-save no longer re-triggers from object-reference churn
- editor remains idle after compile until a real edit happens

## 2) Core Data Model

No database table/schema changes were introduced. The key contract change was at hook API level:

- `useAutoSave(projectId, data, changeCounter)`

The Supabase `projects.data` payload shape remains aligned with editor/local persistence shape and continues to include:

- `nodes`
- `edges`
- `adminOptions`
- `controlledLanguageGlossary`
- `uiJourneySnapshotPresets`

## 3) Persistence and Migration Strategy

Persistence flow was corrected and hardened without migration changes:

- `latestDataRef.current = data` continues to hold the freshest serialized project payload
- debounced save now schedules on explicit change signal (`changeCounter`) rather than `data` object dependency
- `updateProject(projectId, { data: latestDataRef.current })` remains the Supabase write path

No storage-key or migration-path updates were required.

## 4) Ordering Model and Project Sequence ID

No ordering logic changed.

- `computeFlowOrdering(...)` unchanged
- `computeProjectSequenceId(...)` unchanged

This session affected save triggering semantics only, not graph ordering computation.

## 5) Node Rendering and Shape System

No node/edge rendering contracts changed.

All node shape, handle, and edge visual behavior remains as previously implemented. The fix was strictly in autosave orchestration and mutation signaling.

## 6) Editor Interaction Model

Auto-save trigger behavior is now mutation-driven:

- added `autoSaveChangeCounter` state in `app/page.tsx`
- added `markProjectDirty()` to increment the counter
- wired dirty signaling into real mutation paths:
  - `queueUndoSnapshot()` (broad edit coverage)
  - `handleUndo()` (state mutation outside normal edit callback paths)

`useAutoSave` now:

- tracks project changes with internal refs
- ignores unchanged counter values
- resets baseline on project switch
- debounces save for 2s only after real edit signals

## 7) Refactor Outcomes

Concrete outcomes from this session:

1. Removed loop-prone `data` dependency from autosave debounce effect.
2. Introduced explicit change-trigger API (`changeCounter`) for autosave scheduling.
3. Preserved latest-payload correctness through `latestDataRef` usage.
4. Connected edit/undo flows to autosave signaling so real edits still persist reliably.

## 8) Validation and Operational Notes

Validation completed successfully:

- `npx tsc --noEmit` ✅
- `npm run lint -- app/page.tsx app/hooks/useAutoSave.ts` ✅ (warnings only, no errors)

Operational note:

- local `next dev` startup in this environment reported `.next/dev/lock` contention from another running instance; unrelated to compile/type correctness.

## 9) Recommended Next Steps

1. Add focused tests for `useAutoSave` trigger semantics (no save on idle re-render, save on counter increment).
2. Add regression tests for project-switch behavior to ensure baseline counter reset is stable.
3. Consider centralizing mutation signaling into a dedicated editor “dirty tracker” utility to reduce missed save triggers.

##03-11-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session completed the dashboard data-source cutover from legacy local project lists to Supabase-backed project records.

The dashboard now treats Supabase as the source of truth for project listing and dashboard CRUD operations, eliminating the old ID mismatch where UI rows could still come from `flowcopy.store.v1` (`PRJ-...`) while rename/delete attempted UUID-based Supabase mutations.

## 2) Core Data Model

No project schema contracts changed, but dashboard list typing is now consistently DB-shaped in runtime usage:

- `DbProjectListItem` (`id`, `title`, `created_at`, `updated_at`, `node_count`) is the active dashboard list model.
- Dashboard card rendering now reads `title`, `node_count`, and `updated_at` (instead of local project `name` / `canvas.nodes.length` / `updatedAt`).

The existing DB mapping helpers remain the bridge between DB and editor models:

- `mapDbProjectToDashboardProject(...)`
- `mapDbProjectToAppProject(...)`

## 3) Persistence and Migration Strategy

Persistence is now intentionally split by surface responsibility:

- **Dashboard list + dashboard CRUD:** Supabase (`listProjects`, `createProject`, `updateProject`, `deleteProject`, `getProject`)
- **In-editor local working state/session shell:** existing local store flow remains unchanged

The old local dashboard source (`activeAccount?.projects`) is no longer used for dashboard card population, so legacy `PRJ-...` rows in localStorage no longer interfere with dashboard rename/delete behavior.

## 4) Ordering Model and Project Sequence ID

No ordering logic changed.

- `computeFlowOrdering(...)` unchanged
- `computeProjectSequenceId(...)` unchanged

This session was dashboard-data-source and CRUD-wiring focused.

## 5) Node Rendering and Shape System

Canvas node/edge rendering is unchanged.

Dashboard rendering was updated to reflect Supabase list semantics:

- cards display DB-backed `title`
- node count uses `node_count`
- last updated uses `updated_at`
- loading state now has explicit dashboard messaging (`Loading projects...`)

## 6) Editor Interaction Model

Dashboard interaction flow now consistently runs against Supabase UUID IDs:

- project list loads via `loadDashboardProjects()` calling `listProjects()`
- load trigger remains mount/view-driven through `useEffect` when `store.session.view === "dashboard"`
- create action calls `createProjectInDb(...)` and appends returned DB record to dashboard state
- rename/delete/open actions operate on selected `dashboardProjects` rows (UUID IDs)

Create UX was also tightened:

- create input/button disable while create is pending
- create action button shows `Creating...` pending label

## 7) Refactor Outcomes

Concrete outcomes from this session:

1. Replaced dashboard project-card source from local account projects to `dashboardProjects` Supabase state.
2. Ensured dashboard card fields use DB list item properties (`title`, `node_count`, `updated_at`).
3. Added explicit dashboard loading-state branch before empty-state rendering.
4. Kept dashboard create/open/rename/delete actions consistently keyed by Supabase UUID IDs.
5. Removed the practical failure mode where delete/rename could silently target non-DB `PRJ-...` IDs.

## 8) Validation and Operational Notes

Validation run this session:

- `npm run lint -- app/page.tsx`

Result:

- no lint errors
- existing baseline warnings in `app/page.tsx` remain (pre-existing unused-symbol warnings unrelated to this dashboard change)

## 9) Recommended Next Steps

1. Complete the same source-of-truth migration for editor project persistence (reduce hybrid local-store vs Supabase behavior).
2. Add dashboard integration tests for UUID-based create/open/rename/delete flows.
3. Add a lightweight dashboard refresh action after destructive operations for extra resilience.
4. Remove stale unused imports/constants in `app/page.tsx` during a cleanup pass to reduce lint noise.

##03-09-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session finalized the auth email-confirmation callback route for the App Router flow.

FlowCopy now has a concrete server route at:

- `app/auth/confirm/route.ts`

that receives Supabase confirmation callback parameters, verifies the OTP token, and redirects users to the intended next destination or a login error path.

## 2) Core Data Model

No project/editor schema contracts changed (`AppStore`, node/edge types, persisted canvas state).

The route introduced/uses strongly typed callback parsing semantics:

- `token_hash: string | null`
- `type: "email" | "recovery" | null`
- `next: string` (defaults to `/`)

## 3) Persistence and Migration Strategy

No localStorage keys, migration paths, or project serialization contracts were modified.

Auth verification continues to rely on the existing Supabase SSR server client (`@/lib/supabase/server`) with cookie-backed session handling already defined in `lib/supabase/server.ts`.

## 4) Ordering Model and Project Sequence ID

No ordering behavior changed.

- `computeFlowOrdering(...)` unchanged
- `computeProjectSequenceId(...)` unchanged

Auth callback handling is orthogonal to graph sequencing.

## 5) Node Rendering and Shape System

No canvas/node/edge rendering contracts changed in this session.

The update was route-level only and does not impact node visuals, frame/menu/ribbon behavior, or edge styling.

## 6) Editor Interaction Model

The confirmation callback flow is now explicit in `GET /auth/confirm`:

1. Parse `token_hash`, `type`, and optional `next` from `request.url`.
2. If `token_hash` and `type` are present, call:
   - `supabase.auth.verifyOtp({ type, token_hash })`
3. On successful verification, redirect to `next` relative to the current request URL.
4. On missing/invalid params or verification failure, redirect to:
   - `/login?error=confirmation_failed`

## 7) Refactor Outcomes

Concrete outcomes from this session:

1. Added/verified `app/auth/confirm/route.ts` with typed `GET` handler.
2. Wired OTP verification to Supabase server client usage (`createClient`).
3. Standardized failure handling to a deterministic login error redirect.

## 8) Validation and Operational Notes

Operational verification confirmed callback behavior and route-level typing against the existing Supabase SSR utility setup.

No package, storage, or migration changes were required for this route implementation.

## 9) Recommended Next Steps

1. Add integration coverage for `/auth/confirm` success/failure branches.
2. Add user-facing login-page messaging for `error=confirmation_failed` to improve recovery guidance.
3. Add explicit allowlist/guarding for external `next` targets if cross-origin redirects should be restricted.

##03-09-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session added dedicated email/password auth entry pages for users before they reach the protected app surface:

- `/login`
- `/signup`

The protected editor/dashboard flow remains middleware-guarded, and these pages now provide the direct sign-in/sign-up UX path.

## 2) Core Data Model

No persisted project/store schema contracts changed.

This session added client-side form state only:

- login: `email`, `password`, `errorMessage`, `isSubmitting`
- signup: `email`, `password`, `confirmPassword`, `errorMessage`, `successMessage`, `isSubmitting`

Both pages use the existing browser auth client factory: `createClient` from `@/lib/supabase/client`.

## 3) Persistence and Migration Strategy

No local storage keys, project payloads, or migration paths were changed.

Authentication persistence remains Supabase cookie/session based through the existing server + middleware utilities. The new pages only trigger auth API calls and do not alter editor persistence contracts.

## 4) Ordering Model and Project Sequence ID

No ordering or project-sequence logic changed.

- `computeFlowOrdering(...)` unchanged
- `computeProjectSequenceId(...)` unchanged

Auth page additions are orthogonal to graph sequencing behavior.

## 5) Node Rendering and Shape System

No canvas node/edge rendering contracts changed.

This session introduced minimal Tailwind-based auth card layouts in `app/login/page.tsx` and `app/signup/page.tsx`, with consistent form spacing, button styles, and inline success/error message blocks.

## 6) Editor Interaction Model

Interaction changes were auth-route scoped:

- Login form submits with `supabase.auth.signInWithPassword({ email, password })`.
- Login success redirects using `router.push("/")` + `router.refresh()`.
- Login failures render Supabase error messages inline.
- `Forgot password?` is visibly present and currently a no-op (`preventDefault`).
- Signup form submits with `supabase.auth.signUp({ email, password })`.
- Signup enforces client validation: password match + minimum 8 characters.
- Signup success displays: `Check your email for a confirmation link`.
- Cross-links are in place between `/login` and `/signup`.

## 7) Refactor Outcomes

Concrete outcomes from this session:

1. Added `app/login/page.tsx` client auth page with email/password sign-in flow.
2. Added `app/signup/page.tsx` client auth page with confirm-password validation.
3. Standardized minimal styling approach across both auth pages.
4. Kept auth UI additions isolated from editor graph/state modules.

## 8) Validation and Operational Notes

Validation commands run:

- `npx eslint app/login/page.tsx` ✅
- `npx eslint app/signup/page.tsx` ✅

Operational note: a prior `next dev` attempt reported an existing `.next/dev/lock` from another running instance; unrelated to these auth page changes.

## 9) Recommended Next Steps

1. Implement full forgot-password/reset flow behind the existing placeholder link.
2. Add user-facing confirmation/redirect messaging after `/auth/confirm` outcomes.
3. Add integration tests for login/signup success, Supabase error handling, and signup validation rules.
4. Consider extracting shared auth form primitives to avoid duplication between `/login` and `/signup`.

##03-09-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session introduced Supabase email/password authentication using the SSR App Router pattern.

FlowCopy is now split into a protected app surface plus dedicated auth routes:

- `/login`
- `/signup`
- `/auth/confirm`
- `/auth/signout`

The previous placeholder account-code gate was removed from user-facing login flow, while local project editing behavior remains intact after authentication.

## 2) Core Data Model

No project/schema database model changes were introduced.

The main model-layer additions are auth client utilities and session boundaries:

- `lib/supabase/client.ts` (browser client)
- `lib/supabase/server.ts` (server client with cookie adapter)
- `lib/supabase/middleware.ts` (`updateSession` refresh/guard helper)

`AppStore` and project canvas contracts remain local-first and unchanged for now.

## 3) Persistence and Migration Strategy

Authentication persistence now uses Supabase cookie-based sessions managed through SSR helpers and middleware.

- `updateSession(request)` forwards cookie reads/writes and refreshes auth state.
- Middleware redirect rules enforce login routing for unauthenticated access.

Editor/project persistence remains localStorage-based (`flowcopy.store.v1`) with no migration-key or payload-format changes in this session.

## 4) Ordering Model and Project Sequence ID

No ordering or project-sequence changes were made.

- `computeFlowOrdering(...)` unchanged
- `computeProjectSequenceId(...)` unchanged

Auth integration is orthogonal to graph sequencing behavior.

## 5) Node Rendering and Shape System

No node/edge shape rendering contracts were changed in this session.

Canvas rendering, inspector rendering, and visual sequence/highlight systems remain as previously implemented.

## 6) Editor Interaction Model

Auth and routing interaction behavior now includes:

- `middleware.ts` at project root calling `updateSession(request)`.
- Route matcher excludes static assets and Next internals.
- Unauthenticated requests to app pages redirect to `/login`.
- Login form uses `supabase.auth.signInWithPassword(...)`.
- Signup form uses `supabase.auth.signUp(...)` with password confirmation checks.
- Email confirmation route verifies OTP via `supabase.auth.verifyOtp(...)`.
- Sign-out is handled through `POST /auth/signout`, then redirected to `/login`.
- Dashboard signout action now posts to `/auth/signout`.

## 7) Refactor Outcomes

Concrete outcomes from this session:

1. Installed auth dependencies: `@supabase/supabase-js`, `@supabase/ssr`.
2. Added root-level Supabase client utilities (`lib/supabase/client.ts`, `server.ts`).
3. Added root-level middleware utilities (`lib/supabase/middleware.ts`, `middleware.ts`).
4. Added auth route/pages (`app/login`, `app/signup`, `app/auth/confirm`, `app/auth/signout`).
5. Kept feedback API route untouched (service-role path unchanged).

## 8) Validation and Operational Notes

Validation commands run during implementation:

- `npx eslint lib/supabase/client.ts lib/supabase/server.ts` ✅
- `npx eslint middleware.ts lib/supabase/middleware.ts` ✅

Operationally, auth session refresh uses `getUser()` in middleware (not `getSession()`), aligning with current Supabase SSR guidance.

## 9) Recommended Next Steps

1. Add auth-state UX handling for login/signup query errors and confirmation states.
2. Add password-reset flow (`forgot password`) and matching route handlers.
3. Add integration tests for middleware redirects and auth callback/signout routes.
4. Map authenticated Supabase user identity to local project/account ownership strategy before database persistence rollout.

##03-09-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session focused on help-surface discoverability for an already-implemented editor capability.

The in-app **Get Help** modal now explicitly documents node copy/paste behavior so users can find and trust the workflow quickly:

- `Ctrl/Cmd + C` for copying selected nodes
- `Ctrl/Cmd + V` for pasting non-destructive duplicates

## 2) Core Data Model

No runtime or persisted schema contracts changed.

This was a documentation/UI-copy update in `app/page.tsx` only (help shortcut text + workflow guidance), with no new data fields or type changes.

## 3) Persistence and Migration Strategy

No persistence or migration paths changed.

- no localStorage key changes
- no project payload changes
- no migration updates

## 4) Ordering Model and Project Sequence ID

No ordering behavior changed.

- `computeFlowOrdering(...)` unchanged
- `computeProjectSequenceId(...)` unchanged

Copy/paste help-text improvements are orthogonal to graph sequencing logic.

## 5) Node Rendering and Shape System

No node/edge rendering geometry changed.

The only rendering delta was Help modal content text:

- clarified canvas shortcut descriptions for copy/paste
- added an explicit **Core workflows** bullet for Copy & Paste nodes

## 6) Editor Interaction Model

Interaction semantics were preserved and now better documented in the modal:

- copy targets selected canvas nodes (including frame-member expansion)
- paste creates safe duplicates with new IDs
- internal edges between copied nodes are preserved
- pasted nodes are offset on each invocation
- shortcuts are ignored while typing in editable controls

## 7) Refactor Outcomes

Concrete outcomes from this session:

1. Updated `HELP_CANVAS_SHORTCUTS` wording for `Ctrl/Cmd + C` and `Ctrl/Cmd + V`.
2. Added a dedicated **Copy & paste nodes** item in the Help modal’s Core workflows list.
3. Kept copy/paste execution logic unchanged (this was a docs/help UX clarity pass).

## 8) Validation and Operational Notes

Validation run:

- `npx tsc --noEmit` ✅
- `npx eslint app/page.tsx` ✅ (existing baseline warnings only; no new errors)

Operationally, this session improves feature discoverability without modifying transfer or graph logic.

## 9) Recommended Next Steps

1. Add a short “Copied N nodes” / “Pasted N nodes” help hint in the modal for extra clarity.
2. Consider a tooltip near top actions linking directly to copy/paste guidance.
3. Keep architecture log entries aligned with UX-discoverability updates, not only algorithmic changes.

##03-09-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

Delta from the previous entry: the prior session was a visual rollback pass; this session added a serialization **safety-net test layer**.

FlowCopy now has an automated round-trip contract test that verifies project data survives export/import across transfer formats (`csv`, `xml`, `json`) instead of relying on manual checks.

## 2) Core Data Model

No runtime/persisted product schema was changed for editor execution.

Test-only contract modeling was introduced in `app/lib/__tests__/round-trip.test.ts`:

- canonical fixture builder with one node of each type (`default`, `menu`, `frame`, `ribbon`)
- typed contract-shape extraction for deep comparisons
- explicit coverage of ribbon cells, menu terms, frame membership, edges, sequence IDs, glossary, and admin options

## 3) Persistence and Migration Strategy

No storage-key or migration-path changes were introduced.

This session’s persistence delta is validation coverage:

- export/import paths are exercised in-memory for all three transfer formats
- imported payloads are normalized via existing sanitizers before comparison
- drift now fails fast during test execution

## 4) Ordering Model and Project Sequence ID

Ordering algorithms remain unchanged.

The new test explicitly reuses ordering logic (`computeFlowOrdering(...)`, `computeProjectSequenceId(...)`) in both expected/imported paths and asserts sequence/order parity after round-trip.

## 5) Node Rendering and Shape System

No node/edge rendering behavior changed in this session.

Delta here is indirect quality protection: the test now guards node-type-specific data contracts (especially ribbon/menu/frame structures) that rendering depends on.

## 6) Editor Interaction Model

No end-user editor interaction changes were introduced.

Developer interaction model changed by adding a stable test command path:

- `npm test` now runs `vitest run`
- format-parametrized round-trip contract checks execute as part of standard test workflow

## 7) Refactor Outcomes

Concrete outcomes from this session:

1. Added test tooling and script wiring in `package.json` (`test: vitest run`).
2. Added `app/lib/__tests__/round-trip.test.ts` with canonical project fixture + format-parametrized contract assertions.
3. Added deep-comparison checks for:
   - node count/type preservation
   - ribbon cell configuration preservation
   - menu terms and frame membership
   - edge source/target validity + edge payload parity
   - sequence/order stability
   - controlled-language glossary parity
4. Stabilized local Vitest execution by using `vitest@2.1.9` (environment-compatible in this workspace).

## 8) Validation and Operational Notes

Validation run:

- `npm test`

Current result:

- `json` round-trip passes
- `csv` and `xml` round-trip fail on ribbon drift:
  - expected `ribbon_style: "compact"`
  - received `ribbon_style: ""`

This is the intended safety-net behavior when flat-format ribbon transfer is incomplete, and confirms the new contract test is detecting real serialization drift.

## 9) Recommended Next Steps

1. Complete flat transfer parity for ribbon style (`csv/xml`) so `ribbon_style` round-trips correctly.
2. Re-run `npm test` and require full pass in CI before merge.
3. Keep this contract test as a release gate for export/import changes.
4. Add targeted micro-tests around ribbon field transfer to shorten triage time for future drift.

##03-09-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session was a corrective rollback pass.

An earlier node-handle visual tweak (parallel corner handle offsets and default-node left sequential handle sizing) was intentionally reverted at user request, returning the editor to the prior stable look/feel.

## 2) Core Data Model

No data contracts or schema were changed.

- no `app/types/index.ts` model changes
- no node/edge payload shape updates
- no new constants persisted into project data

## 3) Persistence and Migration Strategy

No persistence or migration behavior changed.

- no localStorage key updates
- no project-record/canvas-schema updates
- no migration-path changes

## 4) Ordering Model and Project Sequence ID

No ordering logic changed.

- `computeFlowOrdering(...)` unchanged
- `computeProjectSequenceId(...)` unchanged

The rollback was purely visual and did not touch graph sequencing semantics.

## 5) Node Rendering and Shape System

Net rendering outcome: unchanged from pre-session behavior.

Temporary edits in `app/components/FlowCopyNode.tsx` (parallel left-handle inset and default sequential left-handle size alignment) were removed by restoring the file to `HEAD`.

## 6) Editor Interaction Model

No net interaction-model changes were retained.

All keyboard/mouse editing flows remain as previously shipped because the temporary handle-style edits were fully reverted.

## 7) Refactor Outcomes

Concrete outcomes from this session:

1. Confirmed uncommitted scope was isolated to `app/components/FlowCopyNode.tsx`.
2. Reverted the file using `git restore -- app/components/FlowCopyNode.tsx`.
3. Verified post-revert state with `git status --short` (clean working tree).

## 8) Validation and Operational Notes

Operational validation for this rollback:

- `git restore -- app/components/FlowCopyNode.tsx` ✅
- `git status --short` ✅ (no pending changes)

This confirms the temporary handle-style modifications were removed completely.

## 9) Recommended Next Steps

1. If handle styling is revisited, apply changes behind explicit per-node-type constants so tweaks are easier to tune/revert.
2. Use a short visual sign-off loop (before/after screenshots) before finalizing geometry adjustments.
3. Keep rollback-friendly commits small and isolated when doing look/feel experiments.

##03-08-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session added a new in-editor help surface and refined feedback intake wording/validation.

Two user-facing outcomes shipped:

- A red **Get Help** action was added beside **Send Feedback**, opening a dedicated Help modal.
- Feedback contact input was broadened from email-only wording to **Name or email (optional)**.

## 2) Core Data Model

No persisted app schema changed.

Runtime/UI contracts added in `app/page.tsx`:

- `HelpShortcutDefinition`
- `HELP_CANVAS_SHORTCUTS`
- `HELP_CONTEXT_SHORTCUTS`

Feedback payload shape remains compatible (`feedbackType`, `email`, `message`, `context`), but `email` now semantically accepts either:

- plain name/contact text, or
- a valid email address.

## 3) Persistence and Migration Strategy

No storage/migration changes were required:

- no localStorage key updates
- no project payload changes
- no migration-path updates

Feedback transport remains `POST /api/feedback` to Supabase. Validation was aligned client/server to only enforce email regex when the input includes `@`.

## 4) Ordering Model and Project Sequence ID

No ordering behavior changed.

- `computeFlowOrdering(...)` unchanged
- `computeProjectSequenceId(...)` unchanged

Help/feedback UX changes are orthogonal to graph sequencing.

## 5) Node Rendering and Shape System

Canvas node/edge shape rendering was unchanged.

UI rendering additions were modal/action-bar scoped:

- new red **Get Help** button in top actions
- new Help modal overlay with shortcut/workflow/tool reference sections

## 6) Editor Interaction Model

### Help modal behavior

- Open via **Get Help** button.
- Close via backdrop click, `Escape`, **Close**, or **Got it**.

### Feedback modal behavior

- Label updated to **Name or email (optional)**.
- Input changed from `type="email"` to `type="text"`.
- Placeholder updated to `Jane Doe or you@example.com`.
- Client-side validation now treats non-`@` values as valid names; only `@` values are email-validated.
- API route now mirrors this rule so server validation matches frontend behavior.

## 7) Refactor Outcomes

Concrete outcomes from this session:

1. Added help modal state/handlers and keyboard/backdrop close behavior.
2. Added red **Get Help** button adjacent to **Send Feedback**.
3. Added structured help content for shortcuts, context behavior, workflows, and panel map.
4. Updated feedback contact wording and validation semantics to support name-or-email input.
5. Updated `/api/feedback` validation message/rule for contact compatibility.

## 8) Validation and Operational Notes

Validation run this session:

- `npx eslint app/page.tsx app/api/feedback/route.ts`

Result:

- 0 errors
- existing baseline warnings remain in `app/page.tsx` (unused imports/vars), unchanged by this feature behavior.

## 9) Recommended Next Steps

1. Rename internal variable/API naming from `email` to `contact` (or split into `name` + `email`) for clearer semantics.
2. Add focused tests for feedback validation parity (name-only, valid email, invalid email-like input).
3. Extract Help/Feedback modals into dedicated components to reduce `app/page.tsx` size.
4. Consider adding Help modal deep-links/anchors for faster navigation as help content grows.

##03-07-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session hardened node-type transitions in the inspector to prevent destructive retyping of specialized nodes.

The main product behavior change is:

- nodes created as `menu`, `frame`, or `ribbon` are now type-locked in the inspector
- `default` remains the only type that can transition to any other type

This keeps specialized configuration (menu terms, frame membership/bounds, ribbon cell config) from being unintentionally invalidated by type switching.

## 2) Core Data Model

No persisted schema or type contract changed.

The implementation formalized a transition policy using the existing `node_type` model:

- from `default` -> any type is allowed
- from `menu`/`frame`/`ribbon` -> only same-type selection is allowed

No new fields were added to node data.

## 3) Persistence and Migration Strategy

Persistence behavior remains unchanged:

- node edits still flow through existing `setNodes(...)` and autosave/persist pathways
- no storage-key updates
- no migration/version updates

Locking is enforced at interaction/runtime level, not through migration.

## 4) Ordering Model and Project Sequence ID

No ordering logic changed in this session.

- `computeFlowOrdering(...)` unchanged
- `computeProjectSequenceId(...)` unchanged

Sequence generation behavior is unaffected by node-type lock controls.

## 5) Node Rendering and Shape System

Inspector node-type UI in `app/page.tsx` was changed from a `<select>` dropdown to a 4-button type group:

- Default
- Menu
- Frame
- Ribbon

Rendering behavior now communicates lock state directly:

- active/current type appears selected
- disallowed transitions render disabled (grayed out, not clickable)

## 6) Editor Interaction Model

Two layers now enforce type-lock behavior:

1. **UI gating** in the inspector node-type button group:
   - `isEnabled = selectedNode.data.node_type === "default" || isActive`
   - disabled buttons are non-interactive and visibly muted
2. **Defensive guard** in `updateNodeTypeById(...)`:
   - early return when attempting non-default -> different-type transitions

Additionally, Shift+F frame creation shortcut behavior was re-verified as already present:

- guarded by `isEditableEventTarget(...)` in keyboard handler
- invokes `createFrameFromSelectionRef.current()`
- frame creation requires at least 2 selected non-frame nodes

## 7) Refactor Outcomes

Concrete outcomes from this session:

1. Replaced inspector node-type dropdown with explicit type buttons.
2. Added visual/interaction disabled states for non-active specialized type options.
3. Added transition guard in `updateNodeTypeById(...)` to prevent unsafe type mutation.
4. Confirmed existing Shift+F frame shortcut already satisfied required behavior.

## 8) Validation and Operational Notes

Validation completed successfully:

- `npx tsc --noEmit` ✅

Operational note observed during session:

- local `next dev` startup can fail when a prior dev instance still holds `.next/dev/lock`; this did not affect compile validation.

## 9) Recommended Next Steps

1. Add focused tests for `updateNodeTypeById(...)` transition rules (default vs specialized).
2. Add UI interaction tests for disabled node-type buttons in inspector.
3. Consider adding a small inspector hint text explaining why specialized types are locked.
4. Optionally centralize transition policy in a reusable helper for future editor surfaces.

##03-07-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session expanded the Controlled Language inspector panel into a full glossary transfer surface.

Users can now both export and import glossary terms directly from the same panel controls:

- Export JSON / Export CSV
- Import JSON / Import CSV

The implementation stayed scoped to the inspector flow in `app/page.tsx` and preserved existing editor behavior.

## 2) Core Data Model

No persistent schema contracts were changed, but glossary transfer contracts were clarified:

- Export payload is now built from `controlledLanguageAuditRows` and maps to:
  - `fieldType`
  - `term`
  - `include`
- JSON import expects array entries with `fieldType` and `term` (optional `include` ignored).
- CSV import expects `Field Type` and `Term` columns (optional `Include` ignored).
- Imported terms are always written as `include: true`.

Duplicate detection uses the existing glossary identity key:

- `buildControlledLanguageGlossaryKey(fieldType, term)`

## 3) Persistence and Migration Strategy

Persistence behavior remained compatible with current project storage:

- imports update glossary state through `updateControlledLanguageGlossaryEntries(...)`
- existing autosave/persist pipeline continues writing glossary changes to project canvas state
- no migration key, storage key, or payload-version changes were introduced

## 4) Ordering Model and Project Sequence ID

No ordering or project-sequence logic changed in this session.

- `computeFlowOrdering(...)` unchanged
- `computeProjectSequenceId(...)` unchanged

Glossary transfer changes are orthogonal to graph sequencing.

## 5) Node Rendering and Shape System

Canvas node/edge rendering contracts were unchanged.

Inspector UI rendering in `app/page.tsx` was extended with:

- new **Import JSON** and **Import CSV** buttons beside glossary export controls
- two hidden file inputs (JSON/CSV) using the same pattern as project import pickers

## 6) Editor Interaction Model

Controlled Language panel interaction now supports file-based glossary ingestion:

- clicking import buttons opens hidden file pickers
- selected files are read client-side
- JSON/CSV parsers normalize field type + term values
- invalid/missing values are ignored
- duplicates are skipped by glossary key

Feedback behavior is surfaced through existing transfer feedback UI:

- `Imported {count} glossary terms.` when new terms are added
- `No new terms to import.` when all terms are duplicates/invalid

## 7) Refactor Outcomes

Concrete outcomes from this session:

1. Updated glossary export source to `controlledLanguageAuditRows` for Field Type/Term/Include parity.
2. Added glossary JSON import flow with duplicate-skipping key logic.
3. Added glossary CSV import flow with required column validation.
4. Added dedicated hidden file inputs and trigger callbacks for glossary imports.
5. Reused existing `transferFeedback` surface for success/info/error messaging.

## 8) Validation and Operational Notes

Validation completed successfully:

- `npx tsc --noEmit` ✅

Operational note:

- import parsing is intentionally tolerant of optional `include` fields/columns and enforces `include: true` on accepted new entries.

## 9) Recommended Next Steps

1. Add unit tests for glossary import normalization and duplicate-skipping behavior.
2. Add tests for CSV header variants/whitespace handling.
3. Add optional glossary import preview before commit for large files.
4. Consider extracting glossary transfer handlers from `app/page.tsx` into a dedicated utility module.

##03-07-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session finalized UI Journey Conversation correctness for ribbon-driven flows.

Two conversation-facing fixes were delivered:

- Ribbon cell entries are now emitted only when they actually connect to nodes included in the active conversation scope.
- Conversation modal section keys are now truly unique for ribbon header + ribbon cell rows, eliminating duplicate-key rendering risks.

## 2) Core Data Model

No persisted schema/type contracts were changed.

The implementation reused existing models and identifiers:

- `FlowEdge` + sequential edge-kind semantics
- `includedNodeIds` conversation scope set
- ribbon source-handle naming via `RIBBON_SOURCE_HANDLE_PREFIX`
- unique conversation-entry identity via `entry.entryId`

## 3) Persistence and Migration Strategy

Persistence and migration behavior were unchanged:

- no storage key updates
- no project payload/schema updates
- no migration-path changes

All changes were runtime conversation-generation and modal-rendering corrections.

## 4) Ordering Model and Project Sequence ID

No ordering algorithms changed.

- `computeFlowOrdering(...)` unchanged
- `computeProjectSequenceId(...)` unchanged

Conversation filtering now applies an additional inclusion guard for ribbon cells: an outgoing **sequential** edge must target a node in the current included-node set.

## 5) Node Rendering and Shape System

`app/page.tsx` UI Journey Conversation modal rendering was updated so section keys now use entry identity instead of node identity:

- from: ``ui-journey-conversation:${entry.nodeId}``
- to: ``ui-journey-conversation:${entry.entryId}``

This removes duplicate React keys when a ribbon contributes multiple entries that share the same `nodeId`.

## 6) Editor Interaction Model

`app/lib/ui-journey.ts` ribbon cell conversation generation now filters cells by actual conversation-relevant connectivity.

A ribbon cell entry is only created when an edge exists such that:

- `edge.source === ribbonNodeId`
- edge is sequential (`isSequentialEdge(edge)`)
- `edge.sourceHandle` starts with `${RIBBON_SOURCE_HANDLE_PREFIX}${cell.id}`
- `edge.target` is in `includedNodeIds`

Result: UI Journey Conversation now includes only ribbon cells that lead to nodes inside the current selected conversation path.

## 7) Refactor Outcomes

Concrete outcomes from this session:

1. Added ribbon-cell edge-target inclusion filtering in `buildUiJourneyConversationEntries(...)`.
2. Imported and used `isSequentialEdge` + `RIBBON_SOURCE_HANDLE_PREFIX` in the conversation builder.
3. Updated both modal section key call sites in `app/page.tsx` to `entry.entryId`.
4. Eliminated duplicate-key risk for ribbon header/cell mixed conversation rows.

## 8) Validation and Operational Notes

Validation completed successfully:

- `npx tsc --noEmit` ✅

Operationally, the conversation output is now stricter about included-path relevance for ribbon cells and safer for React list rendering.

## 9) Recommended Next Steps

1. Add focused tests for ribbon-cell inclusion filtering against included-node targets.
2. Add modal rendering regression tests to assert unique keys for multi-entry ribbon nodes.
3. Add a small snapshot fixture covering ribbon header + multiple cell entries + mixed included/excluded targets.

##03-06-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session expanded Table View so node-type-specific data is visible in dedicated trailing columns instead of being shoehorned into default text fields.

The table now supports dynamic column groups for:

- Menu terms (`Menu Term 1..N`)
- Ribbon cells (`Ribbon Label N`, `Ribbon Key Command N`, `Ribbon Tool Tip N`)

where `N` is computed from the current project’s data.

## 2) Core Data Model

No schema/type contracts changed.

The implementation uses existing node data contracts:

- `node.data.node_type`
- `node.data.menu_config.terms[]`
- `node.data.ribbon_config.cells[]` (`label`, `key_command`, `tool_tip`)

and computes dynamic table width from normalized runtime values rather than adding new persisted fields.

## 3) Persistence and Migration Strategy

Persistence and migration behavior were unchanged:

- no localStorage key changes
- no project payload/schema changes
- no migration updates

This was a presentation-layer/table-rendering update only.

## 4) Ordering Model and Project Sequence ID

No ordering behavior changed.

- `computeFlowOrdering(...)` unchanged
- `computeProjectSequenceId(...)` unchanged

Dynamic columns are derived from already ordered `projectTableRows` and do not affect sequence computation.

## 5) Node Rendering and Shape System

`app/page.tsx` table rendering now computes dynamic column counts:

- `maxMenuTermColumnCount` + `menuTermColumnIndexes`
- `maxRibbonCellColumnCount` + `ribbonCellColumnIndexes`

Header rendering appends:

- one header per menu term index
- three headers per ribbon cell index (label/key command/tool tip)

Row rendering fills values by index for matching node types and leaves non-applicable cells empty.

## 6) Editor Interaction Model

Table interaction behavior now reflects node-type-specific data placement:

- Menu nodes populate `Menu Term 1..N` columns by term index.
- Ribbon nodes populate grouped ribbon columns by cell index.
- Non-menu nodes leave menu-term columns blank.
- Non-ribbon nodes leave ribbon grouped columns blank.

Empty-state table `colSpan` now includes both dynamic menu and ribbon column counts.

## 7) Refactor Outcomes

Concrete outcomes from this session:

1. Added dynamic max-count scanning for menu terms across current project rows.
2. Added dynamic max-count scanning for ribbon cells across current project rows.
3. Appended dynamic menu-term headers and row cells.
4. Appended dynamic ribbon header triplets and row cells.
5. Updated empty-state `colSpan` to stay aligned with dynamic table width.

## 8) Validation and Operational Notes

Validation completed successfully:

- `npx tsc --noEmit` ✅

Operationally, this keeps table output adaptive to mixed project data without changing persisted node contracts.

## 9) Recommended Next Steps

1. Add focused tests for dynamic menu/ribbon column count computation.
2. Add table rendering tests for mixed node types (menu, ribbon, default, frame).
3. Consider aligning flat export columns with these dynamic table-only projections for analyst workflows.

##03-06-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session delivered two targeted editor UX improvements:

1. Ribbon nodes now visibly show their sequence number on-canvas.
2. Table view now includes a dedicated `Ribbon Cells` column with per-node ribbon summaries.

The goal was consistency: ribbon nodes now surface sequence/order information the same way users expect from other node types, and ribbon-specific metadata is visible in tabular editing/export-review workflows.

## 2) Core Data Model

No schema/type contracts changed.

The updates rely on existing fields:

- `node_type === "ribbon"`
- `sequence_index`
- `ribbon_config.cells[]` (`label`, `key_command`)

For table rendering, ribbon summaries are computed from normalized ribbon config and display labels first, with key-command fallback when labels are empty.

## 3) Persistence and Migration Strategy

Persistence/migration behavior was unchanged:

- no localStorage key changes
- no project payload shape changes
- no migration-path changes

This session was presentation-layer/UI-wiring only.

## 4) Ordering Model and Project Sequence ID

No ordering logic changed.

- `computeFlowOrdering(...)` unchanged
- `computeProjectSequenceId(...)` unchanged

Sequence display improvements are consumer/UI updates of existing ordering outputs.

## 5) Node Rendering and Shape System

`app/components/FlowCopyNode.tsx` ribbon rendering was updated so the ribbon header shows:

- a sequence badge (`#{data.sequence_index ?? "-"}`)
- the ribbon title beside it in the same header row

No new node shapes or geometry systems were introduced.

## 6) Editor Interaction Model

`app/page.tsx` table mode now includes a trailing `Ribbon Cells` column:

- added header cell `Ribbon Cells`
- added row-level summary cell at end of each row
- for ribbon nodes: renders summaries like `3 cells: Bold, Italic, Underline`
- for non-ribbon nodes: renders empty value
- empty-state `colSpan` updated to account for the new column

This improves data visibility in table workflows without changing edit semantics for other fields.

## 7) Refactor Outcomes

Concrete outcomes from this session:

1. Updated ribbon node header in `app/components/FlowCopyNode.tsx` to display sequence index.
2. Added `Ribbon Cells` table column in `app/page.tsx`.
3. Implemented ribbon summary formatting with label-first, key-command fallback behavior.
4. Kept unrelated table/editor behavior unchanged.

## 8) Validation and Operational Notes

Validation completed successfully:

- `npx tsc --noEmit` ✅

Operational note:

- the session included recovery from interrupted edits; final diffs were constrained to requested ribbon-sequence and ribbon-table-summary updates.

## 9) Recommended Next Steps

1. Add focused tests for ribbon sequence-badge rendering in `FlowCopyNode`.
2. Add table-view tests for ribbon summary output (labels, key-command fallback, non-ribbon empty cell).
3. Consider reusing ribbon-summary formatting in export previews to keep cross-surface wording consistent.

##03-06-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session was a transfer-path verification pass focused on ribbon data completeness.

The project JSON envelope export/import path was re-checked end-to-end to ensure ribbon node configuration remains included and recoverable, alongside previously validated flat-export ribbon cell behavior.

## 2) Core Data Model

No schema/type contracts changed.

The existing model remains authoritative:

- `MicrocopyNodeData.ribbon_config: RibbonNodeConfig | null`
- persisted node payload includes `menu_config`, `frame_config`, and `ribbon_config`
- flat export keeps `ribbon_cells_json` as the ribbon-specific tabular projection

## 3) Persistence and Migration Strategy

Persistence/migration paths were verified without structural changes.

Export verification:

- `app/page.tsx` `exportProjectData("json")` builds the full envelope payload using `serializeNodesForStorage(...)`
- `app/lib/node-utils.ts` `serializeNodesForStorage(...)` includes `ribbon_config` for `node_type === "ribbon"` (normalized), otherwise `null`

Import verification:

- `app/lib/import.ts` `parseProjectRecordFromJsonText(...)` validates full-envelope format/schema and passes payload project through `sanitizeProjectRecord(...)`
- hydration continues through `sanitizePersistedNodes(...)` → `normalizeNode(...)`, where ribbon nodes rehydrate via `normalizeRibbonNodeConfig(...)`

No migration keys or storage formats were changed.

## 4) Ordering Model and Project Sequence ID

No ordering behavior changed.

- `computeFlowOrdering(...)` unchanged
- `computeProjectSequenceId(...)` unchanged

Ribbon export/import verification is orthogonal to sequence computation.

## 5) Node Rendering and Shape System

No renderer/shape updates were required.

Ribbon rendering contracts remain unchanged and continue to consume normalized `ribbon_config` after import hydration.

## 6) Editor Interaction Model

No new interaction flows were introduced.

Existing import/export actions were verified to preserve ribbon configuration in full-project JSON transfer and maintain expected editor hydration behavior.

## 7) Refactor Outcomes

Concrete outcomes from this session:

1. Verified full-project JSON export already includes `ribbon_config` through `serializeNodesForStorage(...)`.
2. Verified full-project JSON import already preserves ribbon data through sanitize + normalize hydration.
3. Confirmed no additional code changes were required for ribbon JSON envelope compatibility.

## 8) Validation and Operational Notes

Validation completed successfully:

- `npx tsc --noEmit` ✅

Operational note:

- this session was verification-focused; implementation code remained unchanged while confirming correctness of existing export/import pathways.

## 9) Recommended Next Steps

1. Add targeted tests for JSON envelope round-trip fidelity of `ribbon_config`.
2. Add focused tests for flat-export `ribbon_cells_json` behavior (ribbon vs non-ribbon rows).
3. Add a transfer regression suite covering JSON + CSV/XML consistency for ribbon-heavy projects.

##03-05-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session delivered a focused flat-export correctness update for ribbon nodes.

The export pipeline now writes ribbon cell payloads only for ribbon nodes, while keeping non-ribbon rows blank for the ribbon-specific column.

## 2) Core Data Model

No schema/type contracts changed.

The existing flat export column `ribbon_cells_json` continues to be used, with conditional value assignment in `createFlatExportRows(...)` based on `node_type`.

## 3) Persistence and Migration Strategy

Persistence and migration behavior were unchanged:

- no localStorage key changes
- no project schema changes
- no migration-path updates

This session changed export-row value shaping only.

## 4) Ordering Model and Project Sequence ID

No ordering behavior changed.

- `computeFlowOrdering(...)` unchanged
- `computeProjectSequenceId(...)` unchanged

The export fix is orthogonal to sequence computation.

## 5) Node Rendering and Shape System

No node/canvas rendering changes were required for the requested task.

The implementation remained scoped to the export-layer row builder.

## 6) Editor Interaction Model

No interaction behavior changed in this session.

This was a data-export pipeline adjustment only.

## 7) Refactor Outcomes

Concrete implementation outcome:

1. Updated `app/lib/export.ts` in `createFlatExportRows(...)` so:
   - ribbon nodes export `JSON.stringify(node.data.ribbon_config?.cells ?? [])`
   - non-ribbon nodes export `""` for `ribbon_cells_json`
2. Kept all other row fields unchanged.

## 8) Validation and Operational Notes

Validation completed successfully:

- `npx tsc --noEmit` ✅

## 9) Recommended Next Steps

1. Add a focused unit test for `createFlatExportRows(...)` covering ribbon vs non-ribbon `ribbon_cells_json` behavior.
2. Add CSV/XML round-trip coverage to ensure `ribbon_cells_json` fidelity through export/import paths.

##03-05-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session finalized/verified ribbon-inspector glossary parity with menu-term glossary behavior.

In the **Ribbon Cells** inspector cards, both **Label** and **Key Command** now follow the same toggle-picker workflow style as menu terms (button + contextual dropdown + click-to-apply), while **Tool Tip** remains a plain textarea with no glossary picker.

## 2) Core Data Model

No persisted schema contracts were changed in this session.

The implementation uses existing ribbon and controlled-language structures:

- ribbon cell fields: `label`, `key_command`, `tool_tip`
- controlled language buckets: `cell_label`, `key_command`
- scoped open-state shape in inspector: `{ cellId, field: "label" | "key_command" }`

## 3) Persistence and Migration Strategy

Persistence and migration behavior were unchanged:

- no storage key changes
- no project payload/schema changes
- no migration path updates

Ribbon glossary application still flows through existing node-state updates and autosave.

## 4) Ordering Model and Project Sequence ID

No ordering logic changed.

- `computeFlowOrdering(...)` unchanged
- `computeProjectSequenceId(...)` unchanged

Inspector glossary selection updates copy fields only and does not affect graph topology.

## 5) Node Rendering and Shape System

Rendering behavior in `app/page.tsx` ribbon inspector cards is now aligned to the requested menu-term glossary pattern:

- Label row has `Glossary ▾` toggle button beside the input.
- Key Command row has `Glossary ▾` toggle button beside the input.
- Button active styling matches the menu-term glossary toggle treatment (`#dbeafe`/`#93c5fd` when open).
- Label dropdown terms are sourced from `controlledLanguageTermsByField.cell_label`.
- Key Command dropdown terms are sourced from `controlledLanguageTermsByField.key_command`.
- Tool Tip remains textarea-only (no glossary dropdown).

## 6) Editor Interaction Model

Ribbon glossary interaction behavior uses the same open/apply pattern already used by menu terms:

- `toggleInspectorRibbonCellGlossary(cellId, field)` toggles per-cell/per-field dropdown visibility.
- `applyGlossaryTermToInspectorRibbonCell(cellId, field, glossaryTerm)` writes the selected term into the target ribbon cell field and closes the dropdown.
- Visibility is guarded through `visibleInspectorRibbonCellGlossary` so stale cell references do not stay open if ribbon config changes.

## 7) Refactor Outcomes

Concrete outcomes for this session:

1. Confirmed ribbon inspector glossary behavior is wired for both Label and Key Command with correct field filters.
2. Confirmed Tool Tip remains plain textarea-only.
3. Confirmed menu-term and ribbon-cell glossary UX patterns are aligned in the inspector.

## 8) Validation and Operational Notes

Validation run this session:

- `npx tsc --noEmit` ✅ (passes)

Operational note:

- A transient parse error was observed once in generated `.next/dev/types/routes.d.ts`; rerunning typecheck after regeneration completed successfully.

## 9) Recommended Next Steps

1. Add focused UI regression coverage for ribbon glossary toggle/open/apply behavior per cell.
2. Add tests ensuring field-filter correctness (`cell_label` for Label, `key_command` for Key Command).
3. Consider extracting repeated glossary-toggle/dropdown JSX into a shared inspector helper component.

##03-05-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session expanded the Ribbon inspector so ribbon-cell metadata can be edited directly in one place.

After the existing **Ribbon Cells** heading and column controls, the inspector now renders a full list of cells from the selected ribbon node, making label/shortcut/tooltip editing explicit and batch-friendly.

## 2) Core Data Model

No schema contracts changed.

The session uses the existing ribbon cell fields already present in `RibbonNodeConfig.cells`:

- `label`
- `key_command`
- `tool_tip`

Updates are applied immutably to the selected node’s `ribbon_config` in `app/page.tsx`.

## 3) Persistence and Migration Strategy

Persistence and migration behavior were unchanged:

- no storage key changes
- no project payload changes
- no migration-path changes

Because edits go through normal `setNodes(...)` updates, existing autosave behavior continues to persist ribbon cell field changes.

## 4) Ordering Model and Project Sequence ID

No ordering logic changed.

- `computeFlowOrdering(...)` unchanged
- `computeProjectSequenceId(...)` unchanged

Ribbon inspector field editing is metadata-level and does not affect graph topology.

## 5) Node Rendering and Shape System

The rendering update was inspector-side in `app/page.tsx`:

- cells are rendered as small bordered cards (`1px solid #e2e8f0`, radius `6`, padding `6px 8px`, `marginBottom: 6`)
- cards are sorted by column (then row for stability)
- each card header shows `Cell {column + 1}` with compact muted styling
- each card includes stacked inputs for:
  - Label (`input`, placeholder `Label`)
  - Key Command (`input`, monospace, `maxLength={24}`, placeholder `Key Command`)
  - Tool Tip (`textarea`, `rows={2}`, placeholder `Tool Tip`)

## 6) Editor Interaction Model

Added `updateRibbonCellField` as a dedicated `useCallback` for ribbon-cell metadata edits.

Behavior implemented:

1. Read current config via `normalizeRibbonNodeConfig(selectedNode.data.ribbon_config)`.
2. Validate target cell exists by `cellId`.
3. Build next config by mapping cells and updating `[fieldName]: value` for the matching cell.
4. Update nodes using the same immutable update pattern used in menu-term editing:
   - find target node in `nodes`
   - set updated `ribbon_config`
   - call `setNodes(...)`

## 7) Refactor Outcomes

Concrete outcomes from this session:

1. Added list-based ribbon cell editor cards to the inspector.
2. Added `updateRibbonCellField(cellId, fieldName, value)` callback for per-cell metadata updates.
3. Wired all three input controls to live ribbon cell field updates.
4. Kept unrelated formatting-only edge-utils changes out of the final implementation scope.

## 8) Validation and Operational Notes

Validation completed successfully:

- `npx tsc --noEmit` passed (exit code `0`).

Operational note:

- a prior attempt to run `npm run dev` reported an existing Next dev lock (`.next/dev/lock`), indicating another dev instance was active.

## 9) Recommended Next Steps

1. Add focused tests for `updateRibbonCellField` to ensure cell-id-targeted updates only mutate one cell.
2. Add UI regression coverage for ribbon inspector card ordering and field placeholders.
3. Consider extracting ribbon inspector card rendering into a small component to reduce `app/page.tsx` complexity.

##03-05-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session was a focused inspector UX adjustment for ribbon nodes. In the Node Data Panel, ribbon nodes no longer expose controls that are not applicable to ribbon behavior: the Node shape selector and the Title "Show" toggle.

The result is a cleaner ribbon editing experience and less chance of users interacting with controls that do not apply to ribbon nodes.

## 2) Core Data Model

No data model or schema contracts changed in this session.

- `node_type`, `node_shape`, `title`, and related node fields remain unchanged.
- The implementation uses existing `selectedNode.data.node_type` checks in inspector rendering logic.

## 3) Persistence and Migration Strategy

Persistence and migration behavior were unchanged:

- no localStorage key changes
- no project serialization changes
- no migration-path updates

This was a presentation-layer change only.

## 4) Ordering Model and Project Sequence ID

No ordering logic changed.

- `computeFlowOrdering(...)` unchanged
- `computeProjectSequenceId(...)` unchanged

## 5) Node Rendering and Shape System

Canvas rendering and node-shape drawing logic were unchanged.

Inspector rendering in `app/page.tsx` was updated in the default-node inspector branch:

- The **Node shape** control now renders only when `selectedNode.data.node_type !== "ribbon"`.
- The Title-row **Show** checkbox (`showDefaultNodeTitleOnCanvas`) now renders only when `selectedNode.data.node_type !== "ribbon"`.
- The Title text input remains visible for ribbon nodes.

## 6) Editor Interaction Model

Interaction behavior now differs by node type in the inspector:

- For **ribbon** nodes: shape selector and Show checkbox are hidden.
- For **non-ribbon** nodes: existing behavior remains unchanged.

This keeps ribbon editing focused while preserving prior controls for other node types.

## 7) Refactor Outcomes

Concrete outcomes from this session:

1. Wrapped Node shape dropdown JSX in a ribbon-exclusion conditional.
2. Wrapped Title "Show" checkbox JSX in a ribbon-exclusion conditional.
3. Kept all existing handlers and surrounding inspector structure intact.

## 8) Validation and Operational Notes

Validation completed successfully:

- `npx tsc --noEmit` passed (exit code `0`).

No package/config changes were required.

## 9) Recommended Next Steps

1. Add a regression test for ribbon inspector visibility rules.
2. Consider extracting node-type-specific inspector visibility into reusable helper predicates.
3. Review other ribbon-inapplicable inspector controls for consistency.

##03-05-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session was a targeted ribbon-grid correctness fix. The product issue was that ribbon handle rail labels showed the first row as `R2`, caused by one-based cell coordinates leaking into a view that expects zero-based storage and `+1` display formatting.

The result is now consistent behavior: first row/column are stored as `0/0`, and the UI labels correctly render as `R1C1` for the first cell.

## 2) Core Data Model

No type contract changes were introduced. Existing ribbon contracts remain:

- `RibbonNodeCell` (`row`, `column`, `label`, `key_command`, `tool_tip`)
- `RibbonNodeConfig` (`rows`, `columns`, `cells`, `ribbon_style`)

What changed was coordinate semantics enforcement in runtime normalization and generation:

- internal row/column coordinates are now consistently treated as zero-based (`0..rows-1`, `0..columns-1`).

## 3) Persistence and Migration Strategy

Storage keys and schema were unchanged, but normalization behavior was hardened for compatibility:

- `normalizeRibbonNodeConfig(...)` now validates/fills cells using zero-based bounds.
- It also includes a legacy-safe conversion path: when incoming saved cells appear strictly one-based, rows/columns are shifted to zero-based during normalization.

This preserves backward compatibility for older persisted ribbon cell coordinates without requiring a storage migration.

## 4) Ordering Model and Project Sequence ID

No ordering or sequence-ID logic changed.

- `computeFlowOrdering(...)` unchanged
- `computeProjectSequenceId(...)` unchanged

Ribbon coordinate fixes affect cell layout/handles only, not graph sequencing.

## 5) Node Rendering and Shape System

Ribbon rendering in `FlowCopyNode` was aligned to zero-based row iteration:

- row grouping loop now iterates `row = 0; row < rows`.
- grouped row filtering now correctly matches zero-based `cell.row`.
- rail labels remain `R${cell.row + 1}C${cell.column + 1}`, which now displays correctly with zero-based storage.

No non-ribbon shape rendering changes were made.

## 6) Editor Interaction Model

Ribbon inspector row/column controls now create/remove cells with zero-based coordinates:

- `updateRibbonRows(...)`
  - add path creates rows starting at current `rows` index
  - remove path filters with `cell.row < nextRows`
- `updateRibbonColumns(...)`
  - add path creates columns starting at current `columns` index
  - remove path filters with `cell.column < nextColumns`

This keeps add/remove behavior consistent with ribbon label/handle generation.

## 7) Refactor Outcomes

Concrete outcomes from this session:

1. Corrected `normalizeRibbonNodeConfig(...)` bounds and grid-filling loops to zero-based indexing.
2. Added one-based-to-zero-based compatibility conversion in ribbon normalization for legacy persisted cells.
3. Corrected ribbon inspector row/column add-remove callback generation/filter logic in `app/page.tsx`.
4. Corrected ribbon row grouping iteration in `app/components/FlowCopyNode.tsx`.

## 8) Validation and Operational Notes

Validation completed successfully:

- `npx tsc --noEmit` passed (exit code `0`).

Operationally, this resolves the previously observed off-by-one display issue where the first ribbon row appeared as `R2`.

## 9) Recommended Next Steps

1. Add regression tests for ribbon coordinate normalization (zero-based and legacy one-based inputs).
2. Add UI tests for row/column add-remove ensuring labels start at `R1C1`.
3. Consider centralizing ribbon coordinate constants/helpers to avoid future mixed-index regressions.

##03-04-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session delivered the ribbon-node handle-rail refinement: ribbon cell connection points are now rendered in a dedicated right-side rail with per-cell labels, instead of inside each cell tile.

At the product level, this makes ribbon connections easier to distinguish vertically (especially in multi-cell ribbons) while keeping tab-order top/bottom handles and cell editing behavior intact.

## 2) Core Data Model

No persisted schema/type contract changes were introduced.

The implementation uses existing ribbon contracts and IDs:

- `RibbonNodeConfig`
- `RibbonNodeCell`
- `buildRibbonSourceHandleId(...)`
- `RIBBON_TOP_HANDLE_ID` / `RIBBON_BOTTOM_HANDLE_ID`

Render-time derived values were added in the ribbon branch:

- `sortedCells` (row-first then column)
- `totalCells`
- `existingHeight`
- `minNodeHeight`

## 3) Persistence and Migration Strategy

Persistence and migration behavior were unchanged:

- no storage key changes
- no payload/schema changes
- no migration-path changes

This was a rendering/layout pass only.

## 4) Ordering Model and Project Sequence ID

No graph ordering or sequence-ID logic changed:

- `computeFlowOrdering(...)` unchanged
- `computeProjectSequenceId(...)` unchanged

Cell sorting added here is strictly local UI ordering for rail handle placement (row/column reading order), not flow sequencing.

## 5) Node Rendering and Shape System

`app/components/FlowCopyNode.tsx` ribbon rendering was updated as follows:

- right rail now renders one label + one source `Handle` per ribbon cell
- rail labels render as `R{row+1}C{column+1}`
- rail handle vertical placement follows exact formula: `8 + (index * 18) + 9`
- handle style uses compact circular blue dots with white border and `zIndex: 5`
- outer ribbon flex container now applies `minHeight: Math.max(existingHeight, (totalCells * 18) + 16)`
- in-cell ribbon source handles remain removed (all cell handles are rail-only)

Top and bottom ribbon handles remain on the outer container and were not moved.

## 6) Editor Interaction Model

Connection interaction behavior for ribbon cells now routes through the rail:

- dragging from a cell-specific rail handle uses `buildRibbonSourceHandleId(cell.id)`
- vertical separation between handles is deterministic by sorted index
- existing ribbon cell popup editing flow (label/key command/tool tip) remains unchanged

No inspector JSX behavior was modified in this session.

## 7) Refactor Outcomes

Concrete outcomes from this session:

1. Reintroduced `buildRibbonSourceHandleId` import in `FlowCopyNode` for rail handles.
2. Added sorted ribbon-cell iteration for deterministic rail render order.
3. Implemented per-cell rail label + handle rendering with required absolute positioning/styling.
4. Added outer ribbon min-height guard based on handle-count spacing requirement.
5. Preserved existing top/bottom ribbon handles and existing cell text/edit popup behavior.

## 8) Validation and Operational Notes

Validation completed successfully:

- `npx tsc --noEmit` passed with exit code `0`.

Ground-rule compliance notes:

- no package installation
- no `tsconfig` changes
- no `package.json` edits
- no inspector panel JSX edits in `app/page.tsx`

## 9) Recommended Next Steps

1. Add a small visual regression check for rail label/handle alignment across different row/column counts.
2. Add interaction tests confirming unique edge origins from top/middle/bottom rail handles.
3. Consider extracting ribbon-rail constants (`18`, `8`, `16`) into named constants for easier future tuning.

##03-04-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session delivered the **Ribbon Node — Add Cell Label Field** enhancement.

At the product level, ribbon cells now support a dedicated `Label` value that takes display priority over `Key Command` on the canvas. Editing remains inline through the existing ribbon-cell popup, with no layout or package/config changes.

## 2) Core Data Model

Ribbon cell typing was expanded:

- `RibbonNodeCell` now includes `label: string` (positioned before `key_command` in the type contract).

Controlled-language typing was also expanded:

- `ControlledLanguageFieldType` now includes `"cell_label"`.

This keeps ribbon labels as first-class typed data in both node config and controlled-language workflows.

## 3) Persistence and Migration Strategy

Persistence contracts were updated in a backward-compatible way:

- `createRibbonNodeCell(...)` now initializes `label: ""`.
- `normalizeRibbonNodeConfig(...)` now normalizes `label` on every cell and defaults missing persisted values to `""`.

No storage keys or migration keys changed; this is a safe additive field with normalization fallback for older saved data.

## 4) Ordering Model and Project Sequence ID

No ordering or sequence-ID algorithms changed in this session.

- `computeFlowOrdering(...)` unchanged
- `computeProjectSequenceId(...)` unchanged

Ribbon label behavior is presentation/content-layer only and does not alter graph sequencing semantics.

## 5) Node Rendering and Shape System

Ribbon cell canvas rendering now follows explicit text-priority rules:

- display `cell.label` when present
- else display `cell.key_command`
- else display `"—"`

Typography behavior was aligned to the spec:

- `label` renders in regular font
- `key_command` renders monospace only when label is absent
- dash placeholder remains muted/italic as empty-state affordance

No frame/default/menu shape geometry or global node layout rules were changed.

## 6) Editor Interaction Model

Ribbon cell popup editing now includes three fields in this order:

1. `Label` (text input, regular font, no max length)
2. `Key Command` (text input, monospace, `RIBBON_CELL_MAX_KEY_COMMAND_LENGTH` enforced)
3. `Tool Tip` (textarea, 2 rows)

Ribbon cell update handlers were widened to support editing `label` in the same immutable update flow as existing ribbon cell fields.

## 7) Refactor Outcomes

Concrete implementation outcomes from this session:

1. Updated `app/types/index.ts` for `RibbonNodeCell.label` and `ControlledLanguageFieldType` `"cell_label"`.
2. Updated `app/lib/node-utils.ts` ribbon cell creation + normalization defaults for `label`.
3. Updated `app/components/FlowCopyNode.tsx` cell display priority logic and popup field ordering.
4. Updated `app/constants/index.ts` controlled-language field list/labels/order to include `cell_label`.
5. Updated `app/lib/controlled-language.ts` to collect ribbon labels under `field_type: "cell_label"` and include it in field guards/maps.

## 8) Validation and Operational Notes

Validation completed successfully:

- `npx tsc --noEmit` passed with exit code `0`.

Ground rules were respected:

- no package installation
- no `tsconfig` changes
- no `package.json` edits

## 9) Recommended Next Steps

1. Add targeted tests for ribbon cell display precedence (`label` > `key_command` > dash).
2. Add regression coverage for ribbon config hydration when persisted cells are missing `label`.
3. Add controlled-language audit tests that verify `cell_label` term collection and ordering.

##03-04-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session implemented **Ribbon Node — Task 3: Canvas Rendering**.

At the product level, ribbon nodes now render as table-like cards directly on the canvas, with:

- a ribbon title bar (tab name)
- a row/column cell grid
- per-cell right-side source handles
- top/bottom ribbon handles for tab-order linking
- in-canvas click-to-edit popup for `key_command` and `tool_tip`

Default/menu/frame node behavior remains intact.

## 2) Core Data Model

No persisted type/schema contracts changed this session.

Implementation uses existing ribbon contracts/constants:

- `RibbonNodeConfig`
- `RibbonNodeCell`
- `RIBBON_TOP_HANDLE_ID`, `RIBBON_BOTTOM_HANDLE_ID`
- `RIBBON_CELL_MAX_KEY_COMMAND_LENGTH`
- `buildRibbonSourceHandleId(...)`
- `normalizeRibbonNodeConfig(...)`

Ribbon cell editing updates are applied in-node via `setNodes(...)` by replacing `node.data.ribbon_config` immutably.

## 3) Persistence and Migration Strategy

Persistence format was unchanged.

- no localStorage key changes
- no project schema changes
- no migration changes

Ribbon popup edits write through the existing autosave path because they mutate node data through normal graph state updates.

## 4) Ordering Model and Project Sequence ID

No ordering algorithm changes were made.

- `computeFlowOrdering(...)` unchanged
- `computeProjectSequenceId(...)` unchanged

This session added new ribbon connection endpoints in rendering (top/bottom tab-order handles and per-cell source handles), but did not modify ordering computation rules.

## 5) Node Rendering and Shape System

`FlowCopyNode` gained a dedicated `ribbon` rendering branch with:

- ribbon card background + rounded border styling
- muted title bar (`#e2e8f0`)
- grid rows built from normalized ribbon config
- bordered white cells (`1px solid #cbd5e1`, compact monospace text)
- right-side per-cell handle at vertical center (natural row staggering)
- top target handle (`ribbon-top`) and bottom source handle (`ribbon-bottom`)
- existing left sequential target and parallel handles retained

Node sizing remains auto-measured by React Flow (no fixed node width/height set in the ribbon renderer).

## 6) Editor Interaction Model

Ribbon cell inline editing was added to canvas interaction:

- state: `editingCellId`, `cellPopupPosition`
- click cell to open popup near pointer/cell
- popup fields:
  - `key_command` (`maxLength` enforced)
  - `tool_tip` (textarea)
- close paths:
  - **Done** button
  - click outside popup
  - `Escape`
- clicking another cell switches popup target instead of hard-closing first

Renderer internals refresh was expanded so React Flow updates handle measurements when ribbon config shape changes.

## 7) Refactor Outcomes

Concrete outcomes from this session:

1. Added ribbon-specific imports, state, and helpers in `app/components/FlowCopyNode.tsx`.
2. Added full ribbon canvas rendering branch with cell grid + connection handles.
3. Added in-canvas ribbon cell popup editing wired to node data updates.
4. Added ribbon fallback size in `app/lib/node-utils.ts` (`{ width: 300, height: 120 }`).
5. Added explicit ribbon fallback path in `getNodeVisualSize(...)` when measured size is unavailable.

## 8) Validation and Operational Notes

Validation completed successfully:

- `npx tsc --noEmit` passed with zero errors.

Operational note:

- `next dev` in this environment reported an existing `.next/dev/lock` from another running instance; this did not affect TypeScript validation.

## 9) Recommended Next Steps

1. Implement Task 4 ribbon inspector controls (rows/columns/cell management) if planned.
2. Add focused tests for ribbon popup editing and per-cell handle behavior.
3. Add regression tests to ensure non-ribbon node rendering paths remain unaffected.

##03-04-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session introduced the **Ribbon node utility foundation** (Task 2) without adding ribbon canvas rendering yet.

At the product level:

- users can switch a node to `Ribbon` from the inspector node-type dropdown
- app behavior remains stable and non-crashing when switching between `Default`, `Menu`, `Frame`, and `Ribbon`
- ribbon nodes intentionally remain visually minimal until the rendering-focused follow-up task

## 2) Core Data Model

Core node contracts now have full utility support for `ribbon_config` handling:

- ribbon cell identity helper: `createRibbonCellId()`
- ribbon cell constructor: `createRibbonNodeCell(row, column)`
- ribbon config normalization: `normalizeRibbonNodeConfig(value)`
- ribbon handle helpers:
  - `buildRibbonSourceHandleId(cellId)`
  - `buildRibbonSourceHandleIds(config)`
  - `isRibbonSourceHandleId(handleId)`
- ribbon data application helper: `applyRibbonConfigToNodeData(nodeData, config)`

Normalization guarantees:

- `rows` clamped to `1..RIBBON_NODE_MAX_ROWS`
- `columns` clamped to `>= RIBBON_NODE_MIN_COLUMNS`
- invalid/out-of-range cells are removed
- missing row/column positions are filled with generated cells
- each cell has unique ID + valid `row`, `column`, `key_command`, and `tool_tip`

## 3) Persistence and Migration Strategy

Ribbon persistence is now wired end-to-end through existing project storage paths:

- `createDefaultNodeData(...)` now initializes `ribbon_config: null`
- `normalizeNode(...)` sets:
  - normalized ribbon config when `node_type === "ribbon"`
  - `null` otherwise
- `serializeNodesForStorage(...)` now serializes ribbon config using normalization when node type is ribbon

`sanitizeProjectRecord(...)` did not need direct ribbon-specific logic changes because node-level ribbon normalization remains correctly enforced via the existing hydration pipeline (`sanitizePersistedNodes(...)` + `normalizeNode(...)`).

## 4) Ordering Model and Project Sequence ID

No ordering or sequence-ID algorithm changes were introduced.

- `computeFlowOrdering(...)` unchanged
- `computeProjectSequenceId(...)` unchanged

Ribbon utility additions are orthogonal to sequence computation.

## 5) Node Rendering and Shape System

No ribbon visual rendering work was added in this session (by design).

- `app/components/FlowCopyNode.tsx` rendering code was not modified
- no JSX rendering expansion for ribbon cards was introduced

A non-visual node-type transition path was added so switching to ribbon is state-safe and prepares normalized ribbon data for future rendering tasks.

## 6) Editor Interaction Model

Node-type switching logic was extended so inspector-driven type transitions include ribbon handling:

- when switching to `ribbon`, node data now receives normalized `ribbon_config`
- existing menu-to-default handle remapping behavior remains intact
- switching back from ribbon to other types remains stable

Edge utility behavior was expanded for ribbon handles:

- `syncSequentialEdgesForRibbonNode(...)` removes stale sequential edges whose ribbon source handles no longer exist
- `isRibbonSequentialConnectionAllowed(...)` enforces one outgoing sequential edge per valid ribbon cell handle

## 7) Refactor Outcomes

Concrete outcomes from this session:

1. Added and exported all requested ribbon helpers in `app/lib/node-utils.ts`.
2. Wired ribbon through node normalization/default/serialization paths.
3. Added ribbon sequential-edge utility helpers in `app/lib/edge-utils.ts`.
4. Extended controlled-language collection to include ribbon `key_command` and `tool_tip` terms.
5. Added inspector node-type transition support for `ribbon` in `app/page.tsx` logic (without rendering changes).

## 8) Validation and Operational Notes

Validation completed successfully:

- `npx tsc --noEmit` passed (`EXITCODE:0`)

Operational note:

- local `next dev` startup in this environment reported an existing `.next/dev/lock` from another running instance; this did not affect TypeScript validation.

## 9) Recommended Next Steps

1. Implement ribbon-specific canvas rendering in `FlowCopyNode` (next task scope).
2. Add inspector editing controls for ribbon rows/columns/cells if required by product flow.
3. Add tests for ribbon config normalization edge cases (invalid cells, duplicate IDs, bounds filtering).
4. Add edge-behavior tests for ribbon-handle pruning and connection-allowance rules.

##03-03-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session finalized the Task 5 cleanup stage of the monolith refactor by tightening `app/page.tsx` to only directly-owned imports and moving any node-renderer-specific dependencies out of the page surface.

Product behavior remains unchanged, but the editor entrypoint is now cleaner and safer for the next auth/database layering work.

## 2) Core Data Model

No type/schema contracts changed in this session.

The cleanup was import-boundary only:

- no changes to `app/types/index.ts` model definitions
- no changes to graph/store/journey/export record shapes
- no changes to persisted payload structure

## 3) Persistence and Migration Strategy

Persistence and migration behavior were unchanged:

- local storage keys remain the same
- project serialization format is unchanged
- migration utilities in `app/lib/store.ts` were not modified

This session did not alter save/load behavior.

## 4) Ordering Model and Project Sequence ID

No ordering changes were introduced:

- `computeFlowOrdering(...)` unchanged
- `computeParallelGroups(...)` unchanged
- `computeProjectSequenceId(...)` unchanged

Import cleanup did not affect sequence semantics.

## 5) Node Rendering and Shape System

Rendering ownership boundaries were reinforced:

- `ReactMarkdown` and `remarkGfm` were removed from `app/page.tsx`
- markdown/rendering concerns remain owned by `app/components/FlowCopyNode.tsx` (`BodyTextPreview` path)

No visual behavior changes were made to node/edge rendering.

## 6) Editor Interaction Model

Editor interactions remained behaviorally identical. The update only removed direct `page.tsx` dependency on node/edge implementation imports that are now module-owned.

Specifically removed from `@xyflow/react` import in `page.tsx`:

- `Handle`
- `Position`
- `useReactFlow`
- `useUpdateNodeInternals`
- `MarkerType`

Also removed clearly unused page-level types:

- `type Edge`
- `type Node`

## 7) Refactor Outcomes

Concrete outcomes from this session:

1. Completed Task 5 import cleanup in `app/page.tsx`.
2. Removed node-renderer-only imports from the page entrypoint.
3. Kept `"use client"`, React hooks, required xyflow imports, and existing module import structure intact.
4. Preserved move-and-export refactor discipline (no logic rewrite, no behavior change).

## 8) Validation and Operational Notes

Validation completed successfully:

- `npm run build` passed with zero errors
- no TypeScript circular import issues were reported

Operationally, this confirms the import-boundary cleanup is stable and runtime-equivalent.

## 9) Recommended Next Steps

1. Continue session-by-session architecture logging with newest-first dated entries.
2. Keep `page.tsx` focused on orchestration and avoid reintroducing renderer-specific imports.
3. Proceed to the next planned integration phase (auth/persistent backend) against the extracted module boundaries.

##03-03-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session was a documentation-maintenance checkpoint after the completed modularization tasks. The product surface remains the same (account → dashboard → editor with canvas/table, controlled language, journey snapshots, and transfer tools), while architecture ownership remains split across dedicated modules instead of a single monolith.

No end-user behavior changed in this session; the work focused on keeping the architecture log current and chronologically correct.

## 2) Core Data Model

Core contracts remain centralized in `app/types/index.ts`, with shared usage across `app/page.tsx`, `app/components/FlowCopyNode.tsx`, and `app/lib/*` modules.

This session introduced no schema/type mutations. Key model groupings remain:

- graph + node/edge contracts (`FlowNode`, `FlowEdge`, `MicrocopyNodeData`, `FlowEdgeData`)
- store/project contracts (`AppStore`, `AccountRecord`, `ProjectRecord`, `PersistedCanvasState`)
- journey + transfer contracts (`UiJourneyConversationEntry`, `UiJourneySnapshotPreset`, `FlatExportRow`, `FullProjectExportEnvelope`)

## 3) Persistence and Migration Strategy

Persistence architecture is unchanged and still local-first:

- app store key: `flowcopy.store.v1`
- legacy migration key: `flowcopy.canvas.v2`
- migration/bootstrap and sanitization remain in `app/lib/store.ts`

No migration-path changes or storage-key changes were made in this session.

## 4) Ordering Model and Project Sequence ID

Ordering remains unchanged and continues to be sourced from extracted ordering utilities:

- `computeFlowOrdering(...)`
- `computeParallelGroups(...)`
- `computeProjectSequenceId(...)`

No ordering rules or sequence-ID behavior were modified in this session.

## 5) Node Rendering and Shape System

Renderer architecture remains as established in prior extraction work:

- `FlowCopyNode` and `BodyTextPreview` live in `app/components/FlowCopyNode.tsx`
- shape/layout helper behavior remains in `app/lib/node-utils.ts`
- visual constants remain in `app/constants/index.ts`

No rendering or shape-system behavior changed in this session.

## 6) Editor Interaction Model

Interaction orchestration remains in `app/page.tsx`, with helper responsibilities split across libs (`edge-utils`, `controlled-language`, `ui-journey`, `import/export`, `store`).

This session did not alter keyboard shortcuts, selection/delete flows, undo behavior, journey modal interactions, or import/export actions.

## 7) Refactor Outcomes

Concrete outcomes from this session:

1. Added a **new top architecture entry** for today using the required date-marker format.
2. Preserved reverse-chronological ordering (newest first).
3. Kept all prior session entries intact as historical context.
4. Recorded current modular architecture state without changing runtime code.

## 8) Validation and Operational Notes

Validation in this session was documentation-focused:

- reviewed `docs/architecture.md` structure and confirmed the new entry is at the top of **Session Entries**
- confirmed historical entries were not deleted

No code/build validation was required because no application code changed.

## 9) Recommended Next Steps

1. Continue adding one new top entry per working session with `##MM-DD-YYYY##` markers.
2. Keep architecture summaries aligned to actual implementation deltas (code vs docs-only sessions).
3. As refactoring proceeds, document module-boundary shifts early to reduce onboarding and review overhead.

##03-03-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session completed Task 4 of the monolith breakup by extracting the custom node renderer surface out of `app/page.tsx` into a dedicated component module.

Product behavior remains unchanged, but architectural boundaries are cleaner:

- `app/page.tsx` now orchestrates editor state and wiring.
- `app/components/FlowCopyNode.tsx` now owns node-card rendering logic.

The extraction was strictly move-and-export (no logic rewrite, no behavior change).

## 2) Core Data Model

No persisted schema changes were introduced.

The component-level type surface is now modularized via:

- `FlowCopyNodeProps` exported from `app/components/FlowCopyNode.tsx`
- existing shared graph/data contracts still imported from `app/types/index.ts` (`FlowNode`, `FlowEdge`, `MenuNodeConfig`, `PersistableMicrocopyNodeData`, etc.)

This session changed ownership of renderer types, not data contracts.

## 3) Persistence and Migration Strategy

Persistence and migration behavior were unchanged:

- no localStorage key changes
- no store schema changes
- no migration-path updates

All persistence remains in the existing store/module pipeline (`app/lib/store.ts` + page-level autosave orchestration).

## 4) Ordering Model and Project Sequence ID

No ordering logic changed in this session.

- `computeFlowOrdering(...)` unchanged
- `computeParallelGroups(...)` unchanged
- `computeProjectSequenceId(...)` unchanged

Renderer extraction is orthogonal to sequence/ordering semantics.

## 5) Node Rendering and Shape System

Rendering responsibilities moved to `app/components/FlowCopyNode.tsx`:

- moved `BodyTextPreview`
- moved `FlowCopyNodeProps`
- moved `FlowCopyNode`

The extracted component continues to use the same constants and node-utils helpers for:

- frame rendering and title-tab inline editing
- menu term editing/handles/glossary interactions
- default-node shape/card rendering (including diamond layering helpers)
- highlight/recalled visual state resolution

`"use client"` is preserved both in `app/page.tsx` and the new component module.

## 6) Editor Interaction Model

Interaction behavior is preserved with the same callback wiring from `Page` into `FlowCopyNode` props:

- `onBeforeChange`
- `onMenuNodeConfigChange`
- `onMenuTermDeleteBlocked`
- display toggles and glossary-term inputs

In `page.tsx`, `nodeTypes.flowcopyNode` now renders the imported `FlowCopyNode` component instead of an in-file implementation.

## 7) Refactor Outcomes

Concrete outcomes from this session:

1. Created `app/components/FlowCopyNode.tsx` with named exports.
2. Moved renderer/helper/type block out of `app/page.tsx` without renaming symbols.
3. Added `import { FlowCopyNode, BodyTextPreview } from "./components/FlowCopyNode";` in `app/page.tsx`.
4. Removed temporary extraction script after completion to keep repo clean.

## 8) Validation and Operational Notes

Validation completed successfully after extraction:

- `npx tsc --noEmit`
- `npm run build`

Both checks passed with zero errors, and no TypeScript circular import warnings were reported.

## 9) Recommended Next Steps

1. Continue extracting remaining `page.tsx` orchestration blocks into focused components/hooks.
2. Add focused tests around `FlowCopyNode` interaction paths (menu term add/delete, frame title editing, glossary insertion).
3. Preserve move-and-export discipline for next refactor tasks to keep behavior parity stable.

##03-03-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session completed the modularization phase that turns the prior monolithic editor implementation into a structured feature shell composed of typed modules. `app/page.tsx` now acts as the orchestration surface, while core behaviors are delegated to dedicated files in `app/constants`, `app/lib`, `app/types`, and `app/components`.

At the product level, visible functionality remains the same (account gate, dashboard, canvas/table editor, controlled language, snapshots, import/export), but maintainability and future integration readiness (auth/persistent backend layering) are materially improved by reducing single-file coupling.

## 2) Core Data Model

The canonical type layer now lives in `app/types/index.ts` and is consumed via named type imports from `page.tsx` and other modules. Centralized contracts include:

- graph primitives (`FlowNode`, `FlowEdge`, `FlowEdgeData`, `NodeType`, `FrameNodeConfig`, `MenuNodeConfig`)
- persistence/store records (`PersistedCanvasState`, `ProjectRecord`, `AccountRecord`, `AppStore`)
- controlled-language structures (`ControlledLanguageGlossaryEntry`, `ControlledLanguageAuditRow`, `ControlledLanguageDraftRow`)
- transfer and journey models (`FlatExportRow`, `ParsedTabularPayload`, `UiJourneyConversationEntry`, `UiJourneySnapshotPreset`, `FullProjectExportEnvelope`)

During this session line, `UiJourneyConversationEntry` now explicitly carries `bodyText` and `notes` in the shared type contract, which is reflected through `app/lib/ui-journey.ts`, modal rendering in `app/page.tsx`, and text/markdown/html/rtf builders in `app/lib/export.ts`.

## 3) Persistence and Migration Strategy

Persistence logic has been extracted to `app/lib/store.ts`, preserving current local-first behavior while isolating migration and sanitization responsibilities:

- storage keys remain unchanged (`flowcopy.store.v1`, legacy `flowcopy.canvas.v2`)
- store bootstrap and migration remain in `readAppStore()` + `migrateLegacyCanvasToStore()`
- project/canvas normalization remains explicit (`sanitizeProjectRecord`, `sanitizeAppStore`, `normalizeGlobalOptionConfig`)
- UI state persistence for panel width remains bounded and local (`clampSidePanelWidth`, `readInitialSidePanelWidth`)

No schema or key changes were introduced; this is a structural extraction with parity behavior.

## 4) Ordering Model and Project Sequence ID

Ordering and sequence generation are now isolated in `app/lib/flow-ordering.ts` and consumed as pure functions by `page.tsx`:

- `computeFlowOrdering(...)` still governs deterministic node sequence
- `computeParallelGroups(...)` still governs parallel component membership/group IDs
- `computeProjectSequenceId(...)` still derives stable project sequence identity

No algorithmic behavior changes were introduced in this session; extraction preserved existing topological + tie-break semantics and project-sequence ID computation.

## 5) Node Rendering and Shape System

Node rendering has been extracted into `app/components/FlowCopyNode.tsx`, which now owns canvas card rendering details while receiving controlled callbacks/props from `page.tsx`.

Shape and frame/menu rendering systems remain intact:

- rectangle/rounded/pill/diamond visual paths still rely on node-utils helpers
- frame title-tab, shade variants, and membership visuals are preserved
- menu term editing and per-term handle behavior are preserved

Styling constants and display toggles are centralized in `app/constants/index.ts`, reducing inline duplication and making renderer behavior easier to reason about.

## 6) Editor Interaction Model

Interaction logic is now split by responsibility across dedicated libs while `page.tsx` coordinates state transitions:

- edge semantics and guardrails in `app/lib/edge-utils.ts` (kind inference, visuals, reconnect/connect constraints)
- node normalization/membership/layout helpers in `app/lib/node-utils.ts`
- controlled-language term audit/glossary logic in `app/lib/controlled-language.ts`
- UI journey capture/snapshot sanitization/building in `app/lib/ui-journey.ts`
- transfer build/parsing split into `app/lib/export.ts` and `app/lib/import.ts`

The user interaction model remains behaviorally equivalent (keyboard shortcuts, selection flows, undo stack, modal flows, import/export actions), but dependency boundaries are significantly cleaner.

## 7) Refactor Outcomes

This session chain (through Task 5) delivered the architectural breakup of the original monolith:

1. extracted all shared type definitions into `app/types/index.ts`
2. extracted constants/UI config maps into `app/constants/index.ts`
3. extracted pure logic into `app/lib/*` (store, ordering, node, edge, import/export, UI journey, controlled language)
4. extracted node renderer into `app/components/FlowCopyNode.tsx`
5. cleaned/normalized `app/page.tsx` imports and orchestration boundaries

Recent commit trail confirms progression:

- `4094840` task-1 extract types
- `b5ee851` task-2 extract constants
- `6ec1573` task-3 extract pure functions
- `29b8247` task-4 extract FlowCopyNode
- `ee659cd` task-5 page import cleanup

## 8) Validation and Operational Notes

Operationally, this refactor preserved runtime behavior while reducing change risk for upcoming auth/database integration work.

Session verification notes:

- repository history indicates completed incremental extraction commits up to task-5
- architecture source files now physically present and referenced (`app/types`, `app/constants`, `app/lib`, `app/components`)
- no package, tsconfig, or dependency-surface changes were required for this phase

As with prior sessions, shell output in this environment may include spinner/control artifacts during commands; use explicit success markers or follow-up commands where needed.

## 9) Recommended Next Steps

1. Begin the next planned extraction tranche by decomposing `page.tsx` orchestration into smaller feature hooks/controllers (selection, undo, transfer, snapshot state machines).
2. Add focused unit coverage around extracted pure modules (`flow-ordering`, `edge-utils`, `import/export`, `ui-journey`) to lock parity before auth/database integration.
3. Add integration tests for cross-surface parity (canvas ↔ table ↔ export/import roundtrip) now that module seams are stable.
4. Proceed with auth (Supabase/Clerk) and persistent backend layering against the new module boundaries rather than directly against page-level state.

##03-02-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session was a focused UI Journey Conversation behavior correction. The product-level goal was to stop mixed selections from collapsing to orphan-only output when an orphaned node is selected alongside connected nodes.

## 2) Core Data Model

No new schema or types were introduced. The fix used existing journey contracts:

- `UiJourneyConversationEntry`
- `UiJourneyConversationConnectionMeta`
- `connectionMeta.isOrphan`

The implementation corrected how connection metadata is computed by ensuring the connection-meta builder receives node context needed for accurate orphan classification.

## 3) Persistence and Migration Strategy

Persistence and migration were unchanged:

- no `localStorage` key changes
- no project payload changes
- no migration-path updates

The fix is runtime-only in conversation generation/rendering.

## 4) Ordering Model and Project Sequence ID

Ordering and sequence identity algorithms were unchanged:

- `computeFlowOrdering(...)` unchanged
- `computeProjectSequenceId(...)` unchanged

Conversation ordering continues to rely on existing `ordering` outputs; this session only corrected mixed-selection conversation inclusion behavior.

## 5) Node Rendering and Shape System

Canvas node/edge rendering and shape geometry were unchanged. UI Journey Conversation modal rendering behavior remains:

- orphaned entries shown with red styling
- small `(Orphaned)` label retained

What changed is inclusion behavior: orphaned entries are now a visual state, not a filter that hides connected entries in mixed selections.

## 6) Editor Interaction Model

The conversation builder path was corrected so mixed selections are preserved end-to-end:

- `buildUiJourneyConversationEntries(...)` now calls `buildUiJourneyConversationConnectionMetaByNodeId(...)` with `nodes` included
- orphan detection now evaluates each selected entry in full node context

Result: selecting orphaned + connected nodes together now produces a single combined conversation list.

## 7) Refactor Outcomes

Concrete outcomes from this session:

1. Patched the conversation metadata call site to pass `nodes` into the connection-meta builder.
2. Restored correct mixed-selection behavior so connected entries are no longer dropped when an orphan is included.
3. Preserved orphan visual signaling (red styling + `(Orphaned)` badge) without collapsing list output.

## 8) Validation and Operational Notes

Validation run this session:

- `npm run lint`

Lint completed without reported diagnostics in command output (shell spinner/control artifacts were present in this environment).

## 9) Recommended Next Steps

1. Add a regression test for mixed selections containing connected + orphaned nodes.
2. Add focused unit coverage around conversation connection-metadata construction inputs.
3. Add export-format parity checks to ensure orphan labeling stays consistent across modal and exported conversation outputs.

##03-01-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session was a targeted UI Journey Conversation behavior fix focused on mixed selections containing orphaned and connected nodes. The product goal was to stop orphaned selection from overriding the rest of the selected journey and to make orphan status explicit in the conversation UI.

## 2) Core Data Model

No schema contracts changed. Existing conversation data was reused, with rendering and selection behavior now explicitly driven by existing connection metadata:

- `UiJourneyConversationEntry`
- `connectionMeta.isOrphan`

The session relied on runtime selection resolution and display logic rather than introducing new persisted fields.

## 3) Persistence and Migration Strategy

Persistence and migration behavior were unchanged:

- no localStorage key changes
- no project/canvas payload shape updates
- no migration-step additions

All fixes were implemented in UI interaction and modal rendering paths.

## 4) Ordering Model and Project Sequence ID

No changes were made to ordering or sequence identity algorithms:

- `computeFlowOrdering(...)` unchanged
- `computeProjectSequenceId(...)` unchanged

Conversation ordering still follows existing ordering outputs; this session only corrected selection-source behavior and orphan row presentation.

## 5) Node Rendering and Shape System

Canvas node/edge shape rendering was unchanged. Rendering updates were scoped to UI Journey Conversation modal rows:

- orphaned entries are now visibly red-accented
- orphaned headings include a small `(Orphaned)` label
- connected entries remain visible in the same conversation output

This replaced the prior behavior where mixed selections could collapse to orphan-only display.

## 6) Editor Interaction Model

Selection behavior feeding conversation generation was tightened:

- `onNodeClick` no longer force-overwrites selection to a single node
- conversation input IDs are derived first from live React Flow selected-node state (`node.selected`)
- local selected-node fallback remains in place when needed

Result: selecting an orphaned node along with connected nodes now preserves mixed selection in the conversation modal.

## 7) Refactor Outcomes

Concrete implementation outcomes from this session:

1. Removed single-node selection overwrite in the node click path.
2. Updated conversation selected-ID derivation to prefer live graph selection state.
3. Added red orphan row styling and explicit `(Orphaned)` badge rendering.
4. Preserved combined rendering of connected + orphaned entries in one modal list.

## 8) Validation and Operational Notes

Validation executed during this session:

- `npm run lint`
- `cmd /c "npm run lint && echo LINT_OK"`

Lint completed successfully with `LINT_OK`, confirming no lint regressions from this fix.

## 9) Recommended Next Steps

1. Add a regression test for mixed selection (connected + orphaned) conversation output.
2. Add a tiny legend/help note in the modal explaining orphaned row semantics.
3. Ensure export paths (TXT/MD/HTML/RTF) optionally preserve orphaned labeling for parity with modal display.
4. Consider extracting selection-resolution logic into a shared helper for both conversation and snapshot flows.

##03-01-2026##
# FlowCopy Architecture (Session Summary)
This document captures the architecture and refactors for this session.

## 1) High-Level Product Shape

This session was a recovery/stabilization pass after a partial UI Journey refactor left the editor in a compile-broken state. The goal was to restore a consistent conversation/snapshot pipeline without changing the product surface area.

## 2) Core Data Model

`UiJourneyConversationEntry` production is now consistent across builders and sanitizers, including all required fields:

- `entryId`
- `nodeInstanceId`
- `titleFieldId`
- `connectionMeta` (`groupId`, `groupIndex`, `connectorIds`, `connectedNodeIds`, `isOrphan`)

`UiJourneyConversationField` normalization now guarantees `id` and `sourceKey`. Legacy/missing values are backfilled deterministically from node/label context.

## 3) Persistence and Migration Strategy

No storage keys or top-level store schema changed. The migration hardening happened at value-normalization time:

- `sanitizeUiJourneyConversationEntries(...)` now backfills missing IDs and connection metadata
- existing stored snapshot conversations with partial/older shapes can still load safely

This preserves backward compatibility while enforcing current runtime typing.

## 4) Ordering Model and Project Sequence ID

Ordering and project-sequence algorithms were not changed:

- `computeFlowOrdering(...)` unchanged
- `computeProjectSequenceId(...)` unchanged

Conversation entry generation now explicitly receives `edges` so connection metadata can be computed from selected/included graph topology while sequence values still come from `ordering.sequenceByNodeId`.

## 5) Node Rendering and Shape System

No node/edge shape-system changes were introduced in this session. The fixes were data-pipeline and typing-level for journey conversation/snapshot capture.

## 6) Editor Interaction Model

UI Journey conversation opening now uses the full builder signature:

- `buildUiJourneyConversationEntries({ nodes, edges, ordering, selectedNodeIds })`

Frame-selection expansion behavior is retained, and the selected-frame filter was tightened with explicit undefined narrowing (`node !== undefined`) for strict TypeScript safety.

## 7) Refactor Outcomes

Concrete outcomes from this session:

1. Repaired the `UiJourneyConversationEntry` type-shape mismatch that broke `next build`.
2. Restored builder/sanitizer parity for conversation and snapshot generation paths.
3. Added deterministic fallback generation for missing conversation/field identifiers.
4. Reintroduced connection metadata construction from selected-path edges.
5. Fixed callback wiring/dependencies for conversation-open flow after adding the `edges` parameter.

## 8) Validation and Operational Notes

Validation commands run:

- `npm run lint -- --no-cache`
- `npm run build`

Results:

- Build now passes fully (Next build + TypeScript).
- Lint reports one non-blocking warning: unused `getUiJourneyConversationGroupScheme`.

Operationally, the previous blocking build failure caused by missing required conversation-entry fields is resolved.

## 9) Recommended Next Steps

1. Remove or wire `getUiJourneyConversationGroupScheme` to clear the remaining lint warning.
2. Add focused tests for legacy conversation-entry sanitization/backfill behavior.
3. Add snapshot round-trip tests to verify IDs/connection metadata survive save/recall.
4. Extract UI Journey helper functions from `app/page.tsx` into dedicated modules to reduce partial-refactor risk.

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
