import type {
  AppStore,
  ProjectRecord,
  AccountRecord,
  PersistedCanvasState,
  GlobalOptionConfig,
  GlobalOptionField,
  EditorSurfaceMode,
  FlowNode,
} from "../types";
import {
  APP_STORAGE_KEY,
  LEGACY_STORAGE_KEY,
  SINGLE_ACCOUNT_CODE,
  DEFAULT_GLOBAL_OPTIONS,
  GLOBAL_OPTION_FIELDS,
  GLOBAL_OPTION_TO_NODE_FIELD,
  SIDE_PANEL_MIN_WIDTH,
  SIDE_PANEL_MAX_WIDTH,
  SIDE_PANEL_WIDTH_STORAGE_KEY,
} from "../constants";
import { sanitizeControlledLanguageGlossary } from "./controlled-language";
import { sanitizeEdgesForStorage } from "./edge-utils";
import { cleanedOptions, sanitizeSerializableFlowNodes } from "./node-utils";
import { sanitizeUiJourneySnapshotPresets } from "./ui-journey";

export const clampSidePanelWidth = (value: number): number => {
  const runtimePanelMaxWidth =
    typeof window === "undefined"
      ? SIDE_PANEL_MAX_WIDTH
      : Math.round(window.innerWidth * 0.75);

  const effectiveMaxWidth = Math.max(
    SIDE_PANEL_MIN_WIDTH,
    Math.min(SIDE_PANEL_MAX_WIDTH, runtimePanelMaxWidth)
  );

  return Math.min(effectiveMaxWidth, Math.max(SIDE_PANEL_MIN_WIDTH, Math.round(value)));
};

export const readInitialSidePanelWidth = (): number => {
  if (typeof window === "undefined") {
    return SIDE_PANEL_MIN_WIDTH;
  }

  const rawWidth = window.localStorage.getItem(SIDE_PANEL_WIDTH_STORAGE_KEY);
  if (!rawWidth) {
    return SIDE_PANEL_MIN_WIDTH;
  }

  const parsedWidth = Number(rawWidth);
  if (!Number.isFinite(parsedWidth)) {
    return SIDE_PANEL_MIN_WIDTH;
  }

  return clampSidePanelWidth(parsedWidth);
};

export const isEditorSurfaceMode = (value: unknown): value is EditorSurfaceMode =>
  value === "canvas" || value === "table";

export const uniqueTrimmedStrings = (values: string[]): string[] =>
  Array.from(new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)));

export const mergeAdminOptionConfigs = (
  base: GlobalOptionConfig,
  incoming: GlobalOptionConfig
): GlobalOptionConfig => ({
  tone: uniqueTrimmedStrings([...base.tone, ...incoming.tone]),
  polarity: uniqueTrimmedStrings([...base.polarity, ...incoming.polarity]),
  reversibility: uniqueTrimmedStrings([...base.reversibility, ...incoming.reversibility]),
  concept: uniqueTrimmedStrings([...base.concept, ...incoming.concept]),
  action_type_name: uniqueTrimmedStrings([
    ...base.action_type_name,
    ...incoming.action_type_name,
  ]),
  action_type_color: uniqueTrimmedStrings([
    ...base.action_type_color,
    ...incoming.action_type_color,
  ]),
  card_style: uniqueTrimmedStrings([...base.card_style, ...incoming.card_style]),
});

export const syncAdminOptionsWithNodes = (
  base: GlobalOptionConfig,
  nodes: FlowNode[]
): GlobalOptionConfig => {
  const merged = cloneGlobalOptions(base);

  GLOBAL_OPTION_FIELDS.forEach((field) => {
    const nodeField = GLOBAL_OPTION_TO_NODE_FIELD[field];

    nodes.forEach((node) => {
      const value = node.data[nodeField];
      if (typeof value !== "string") {
        return;
      }

      const next = value.trim();
      if (!next || merged[field].includes(next)) {
        return;
      }

      merged[field].push(next);
    });
  });

  return normalizeGlobalOptionConfig(merged);
};

export const createEmptyPendingOptionInputs = (): Record<GlobalOptionField, string> => ({
  tone: "",
  polarity: "",
  reversibility: "",
  concept: "",
  action_type_name: "",
  action_type_color: "",
  card_style: "",
});

export const createProjectId = (): string =>
  `PRJ-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

export const createAccountId = (code: string): string => `acct-${code}`;

export const cloneGlobalOptions = (options: GlobalOptionConfig): GlobalOptionConfig => ({
  tone: [...options.tone],
  polarity: [...options.polarity],
  reversibility: [...options.reversibility],
  concept: [...options.concept],
  action_type_name: [...options.action_type_name],
  action_type_color: [...options.action_type_color],
  card_style: [...options.card_style],
});

export const ensureArrayOfStrings = (value: unknown, fallback: string[]): string[] => {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  const validItems = value.filter((item): item is string => typeof item === "string");
  return validItems.length > 0 ? validItems : [...fallback];
};

export const normalizeGlobalOptionConfig = (value: unknown): GlobalOptionConfig => {
  const source =
    value && typeof value === "object"
      ? (value as Partial<GlobalOptionConfig>)
      : undefined;

  return {
    tone: ensureArrayOfStrings(source?.tone, DEFAULT_GLOBAL_OPTIONS.tone),
    polarity: ensureArrayOfStrings(source?.polarity, DEFAULT_GLOBAL_OPTIONS.polarity),
    reversibility: ensureArrayOfStrings(
      source?.reversibility,
      DEFAULT_GLOBAL_OPTIONS.reversibility
    ),
    concept: ensureArrayOfStrings(source?.concept, DEFAULT_GLOBAL_OPTIONS.concept),
    action_type_name: ensureArrayOfStrings(
      source?.action_type_name,
      DEFAULT_GLOBAL_OPTIONS.action_type_name
    ),
    action_type_color: ensureArrayOfStrings(
      source?.action_type_color,
      DEFAULT_GLOBAL_OPTIONS.action_type_color
    ),
    card_style: ensureArrayOfStrings(source?.card_style, DEFAULT_GLOBAL_OPTIONS.card_style),
  };
};

export const buildSelectOptions = (
  options: string[],
  currentValue: string,
  fallbackOptions: string[]
): string[] => {
  const cleaned = cleanedOptions(options);
  const withFallback = cleaned.length > 0 ? cleaned : fallbackOptions;
  const unique = Array.from(new Set(withFallback));

  if (currentValue && !unique.includes(currentValue)) {
    return [currentValue, ...unique];
  }

  return unique;
};

export const createEmptyCanvasState = (): PersistedCanvasState => ({
  nodes: [],
  edges: [],
  adminOptions: cloneGlobalOptions(DEFAULT_GLOBAL_OPTIONS),
  controlledLanguageGlossary: [],
  uiJourneySnapshotPresets: [],
  termRegistry: [],
});

export const readLegacyCanvasState = (): PersistedCanvasState | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as {
      nodes?: unknown;
      edges?: unknown;
      adminOptions?: unknown;
      controlledLanguageGlossary?: unknown;
      uiJourneySnapshotPresets?: unknown;
      termRegistry?: unknown;
    };

    return {
      nodes: sanitizeSerializableFlowNodes(parsed.nodes),
      edges: sanitizeEdgesForStorage(parsed.edges),
      adminOptions: normalizeGlobalOptionConfig(parsed.adminOptions),
      controlledLanguageGlossary: sanitizeControlledLanguageGlossary(
        parsed.controlledLanguageGlossary
      ),
      uiJourneySnapshotPresets: sanitizeUiJourneySnapshotPresets(
        parsed.uiJourneySnapshotPresets
      ),
      termRegistry: Array.isArray(parsed.termRegistry) ? parsed.termRegistry : [],
    };
  } catch (error) {
    console.error("Failed to parse legacy canvas state", error);
    return null;
  }
};

export const createProjectRecord = (
  name: string,
  canvas: PersistedCanvasState = createEmptyCanvasState()
): ProjectRecord => {
  const now = new Date().toISOString();

  return {
    id: createProjectId(),
    name: name.trim() || "Untitled Project",
    createdAt: now,
    updatedAt: now,
    canvas: {
      nodes: sanitizeSerializableFlowNodes(canvas.nodes),
      edges: sanitizeEdgesForStorage(canvas.edges),
      adminOptions: normalizeGlobalOptionConfig(canvas.adminOptions),
      controlledLanguageGlossary: sanitizeControlledLanguageGlossary(
        canvas.controlledLanguageGlossary
      ),
      uiJourneySnapshotPresets: sanitizeUiJourneySnapshotPresets(
        canvas.uiJourneySnapshotPresets
      ),
      termRegistry: Array.isArray(canvas.termRegistry) ? canvas.termRegistry : [],
    },
  };
};

export const createEmptyStore = (): AppStore => ({
  version: 1,
  accounts: [],
  session: {
    activeAccountId: null,
    activeProjectId: null,
    view: "account",
    editorMode: "canvas",
  },
});

export const sanitizeProjectRecord = (value: unknown): ProjectRecord | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const source = value as Partial<ProjectRecord> & {
    canvas?: Partial<PersistedCanvasState>;
  };

  const now = new Date().toISOString();
  const id =
    typeof source.id === "string" && source.id.trim().length > 0
      ? source.id.trim()
      : createProjectId();

  const name =
    typeof source.name === "string" && source.name.trim().length > 0
      ? source.name.trim()
      : "Untitled Project";

  const createdAt =
    typeof source.createdAt === "string" && source.createdAt.length > 0
      ? source.createdAt
      : now;

  const updatedAt =
    typeof source.updatedAt === "string" && source.updatedAt.length > 0
      ? source.updatedAt
      : createdAt;

  return {
    id,
    name,
    createdAt,
    updatedAt,
    canvas: {
      nodes: sanitizeSerializableFlowNodes(source.canvas?.nodes),
      edges: sanitizeEdgesForStorage(source.canvas?.edges),
      adminOptions: normalizeGlobalOptionConfig(source.canvas?.adminOptions),
      controlledLanguageGlossary: sanitizeControlledLanguageGlossary(
        source.canvas?.controlledLanguageGlossary
      ),
      uiJourneySnapshotPresets: sanitizeUiJourneySnapshotPresets(
        source.canvas?.uiJourneySnapshotPresets
      ),
      termRegistry: Array.isArray(source.canvas?.termRegistry)
        ? source.canvas.termRegistry
        : [],
    },
  };
};

export const sanitizeAccountRecord = (value: unknown): AccountRecord | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const source = value as Partial<AccountRecord>;

  const code =
    typeof source.code === "string" && /^\d{3}$/.test(source.code)
      ? source.code
      : SINGLE_ACCOUNT_CODE;

  const id =
    typeof source.id === "string" && source.id.trim().length > 0
      ? source.id.trim()
      : createAccountId(code);

  const projects = Array.isArray(source.projects)
    ? source.projects
        .map((project) => sanitizeProjectRecord(project))
        .filter((project): project is ProjectRecord => Boolean(project))
    : [];

  return {
    id,
    code,
    projects,
  };
};

export const sanitizeAppStore = (value: unknown): AppStore => {
  const emptyStore = createEmptyStore();

  if (!value || typeof value !== "object") {
    return emptyStore;
  }

  const source = value as Partial<AppStore>;

  const accounts = Array.isArray(source.accounts)
    ? source.accounts
        .map((account) => sanitizeAccountRecord(account))
        .filter((account): account is AccountRecord => Boolean(account))
    : [];

  const sessionSource =
    source.session && typeof source.session === "object" ? source.session : null;

  const requestedAccountId =
    sessionSource && typeof sessionSource.activeAccountId === "string"
      ? sessionSource.activeAccountId
      : null;

  const requestedEditorMode =
    sessionSource &&
    isEditorSurfaceMode(
      (sessionSource as {
        editorMode?: unknown;
      }).editorMode
    )
      ? (sessionSource as { editorMode: EditorSurfaceMode }).editorMode
      : "canvas";

  const fallbackAccountId = accounts.find((account) => account.code === SINGLE_ACCOUNT_CODE)?.id;

  const activeAccountId = accounts.some((account) => account.id === requestedAccountId)
    ? requestedAccountId
    : fallbackAccountId ?? null;

  return {
    version: 1,
    accounts,
    session: {
      activeAccountId,
      activeProjectId: null,
      view: activeAccountId ? "dashboard" : "account",
      editorMode: requestedEditorMode,
    },
  };
};

export const migrateLegacyCanvasToStore = (): AppStore | null => {
  const legacyCanvasState = readLegacyCanvasState();
  if (!legacyCanvasState) {
    return null;
  }

  const accountId = createAccountId(SINGLE_ACCOUNT_CODE);
  const migratedProject = createProjectRecord("Migrated Project", legacyCanvasState);

  return {
    version: 1,
    accounts: [
      {
        id: accountId,
        code: SINGLE_ACCOUNT_CODE,
        projects: [migratedProject],
      },
    ],
    session: {
      activeAccountId: accountId,
      activeProjectId: null,
      view: "dashboard",
      editorMode: "canvas",
    },
  };
};

export const readAppStore = (): AppStore => {
  if (typeof window === "undefined") {
    return createEmptyStore();
  }

  const rawStore = window.localStorage.getItem(APP_STORAGE_KEY);
  if (rawStore) {
    try {
      const parsed = JSON.parse(rawStore);
      return sanitizeAppStore(parsed);
    } catch (error) {
      console.error("Failed to parse app store", error);
    }
  }

  const migratedStore = migrateLegacyCanvasToStore();
  if (migratedStore) {
    window.localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(migratedStore));
    return migratedStore;
  }

  return createEmptyStore();
};

export const formatDateTime = (isoDate: string): string => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.valueOf())) {
    return isoDate;
  }

  return date.toLocaleString();
};
