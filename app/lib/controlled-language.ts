import type {
  FlowNode,
  ControlledLanguageGlossaryEntry,
  ControlledLanguageFieldType,
  NodeControlledLanguageFieldType,
  ControlledLanguageAuditRow,
  ControlledLanguageDraftRow,
  ControlledLanguageAuditTermEntry,
} from "../types";
import {
  CONTROLLED_LANGUAGE_FIELDS,
  CONTROLLED_LANGUAGE_FIELD_ORDER,
  CONTROLLED_LANGUAGE_NODE_FIELDS,
} from "../constants";

export const isControlledLanguageFieldType = (
  value: unknown
): value is ControlledLanguageFieldType =>
  value === "primary_cta" ||
  value === "secondary_cta" ||
  value === "helper_text" ||
  value === "error_text" ||
  value === "menu_term" ||
  value === "key_command" ||
  value === "cell_label" ||
  value === "tool_tip";

export const normalizeControlledLanguageFieldType = (
  value: unknown
): ControlledLanguageFieldType | null => {
  if (value === "list_item") {
    return "menu_term";
  }

  return isControlledLanguageFieldType(value) ? value : null;
};

export const isNodeControlledLanguageFieldType = (
  value: unknown
): value is NodeControlledLanguageFieldType =>
  value === "primary_cta" ||
  value === "secondary_cta" ||
  value === "helper_text" ||
  value === "error_text";

export const collectControlledLanguageTermsFromNode = (
  node: FlowNode
): ControlledLanguageAuditTermEntry[] => {
  if (node.data.node_type === "menu") {
    const menuTerms = node.data.menu_config.terms.map((menuTerm) => ({
      field_type: "menu_term" as const,
      term: menuTerm.term,
    }));

    return menuTerms;
  }

  if (node.data.node_type === "ribbon") {
    const ribbonCells = node.data.ribbon_config?.cells ?? [];

    return ribbonCells.flatMap((cell) => [
      {
        field_type: "cell_label" as const,
        term: cell.label,
      },
      {
        field_type: "key_command" as const,
        term: cell.key_command,
      },
      {
        field_type: "tool_tip" as const,
        term: cell.tool_tip,
      },
    ]);
  }

  return CONTROLLED_LANGUAGE_NODE_FIELDS.map((fieldType) => ({
    field_type: fieldType,
    term: node.data[fieldType],
  }));
};

export const normalizeControlledLanguageTerm = (value: string): string => value.trim();

export const buildControlledLanguageGlossaryKey = (
  fieldType: ControlledLanguageFieldType,
  term: string
): string => `${fieldType}\u241F${term}`;

export const parseControlledLanguageGlossaryKey = (
  key: string
): { field_type: ControlledLanguageFieldType; term: string } | null => {
  const separatorIndex = key.indexOf("\u241F");
  if (separatorIndex <= 0) {
    return null;
  }

  const rawFieldType = key.slice(0, separatorIndex);
  const term = key.slice(separatorIndex + 1);
  const fieldType = normalizeControlledLanguageFieldType(rawFieldType);

  if (!fieldType) {
    return null;
  }

  return {
    field_type: fieldType,
    term,
  };
};

export const sortControlledLanguageEntries = <
  T extends Pick<ControlledLanguageGlossaryEntry, "field_type" | "term">
>(entries: T[]): T[] =>
  entries
    .slice()
    .sort((a, b) => {
      const fieldOrderDifference =
        CONTROLLED_LANGUAGE_FIELD_ORDER[a.field_type] -
        CONTROLLED_LANGUAGE_FIELD_ORDER[b.field_type];

      if (fieldOrderDifference !== 0) {
        return fieldOrderDifference;
      }

      return a.term.localeCompare(b.term);
    });

export const sanitizeControlledLanguageGlossary = (
  value: unknown
): ControlledLanguageGlossaryEntry[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const byKey = new Map<string, ControlledLanguageGlossaryEntry>();

  value.forEach((item) => {
    if (!item || typeof item !== "object") {
      return;
    }

    const source = item as {
      field_type?: unknown;
      term?: unknown;
      include?: unknown;
    };
    const fieldType = normalizeControlledLanguageFieldType(source.field_type);
    if (!fieldType) {
      return;
    }

    const term =
      typeof source.term === "string"
        ? normalizeControlledLanguageTerm(source.term)
        : "";
    if (!term) {
      return;
    }

    const key = buildControlledLanguageGlossaryKey(fieldType, term);
    const existing = byKey.get(key);

    byKey.set(key, {
      field_type: fieldType,
      term,
      include:
        typeof source.include === "boolean"
          ? source.include
          : existing?.include ?? false,
    });
  });

  return sortControlledLanguageEntries(Array.from(byKey.values()));
};

export const cloneControlledLanguageGlossary = (
  entries: ControlledLanguageGlossaryEntry[]
): ControlledLanguageGlossaryEntry[] =>
  entries.map((entry) => ({
    field_type: entry.field_type,
    term: entry.term,
    include: entry.include,
  }));

export const createEmptyControlledLanguageDraftRow = (): ControlledLanguageDraftRow => ({
  field_type: "menu_term",
  term: "",
  include: true,
});

export const createEmptyControlledLanguageTermsByField = (): Record<
  ControlledLanguageFieldType,
  string[]
> => ({
  primary_cta: [],
  secondary_cta: [],
  helper_text: [],
  error_text: [],
  menu_term: [],
  key_command: [],
  cell_label: [],
  tool_tip: [],
});

export const buildControlledLanguageTermsByField = (
  glossary: ControlledLanguageGlossaryEntry[]
): Record<ControlledLanguageFieldType, string[]> => {
  const byField = createEmptyControlledLanguageTermsByField();

  sanitizeControlledLanguageGlossary(glossary)
    .filter((entry) => entry.include)
    .forEach((entry) => {
      if (!byField[entry.field_type].includes(entry.term)) {
        byField[entry.field_type].push(entry.term);
      }
    });

  CONTROLLED_LANGUAGE_FIELDS.forEach((fieldType) => {
    byField[fieldType].sort((a, b) => a.localeCompare(b));
  });

  return byField;
};

export const buildMenuTermSelectorTerms = (
  nodes: FlowNode[],
  glossary: ControlledLanguageGlossaryEntry[]
): string[] => {
  const terms = new Set<string>(buildControlledLanguageTermsByField(glossary).menu_term);

  nodes.forEach((node) => {
    collectControlledLanguageTermsFromNode(node)
      .filter((entry) => entry.field_type === "menu_term")
      .forEach(({ term: rawTerm }) => {
        const term = normalizeControlledLanguageTerm(rawTerm);
        if (term) {
          terms.add(term);
        }
      });
  });

  return Array.from(terms).sort((a, b) => a.localeCompare(b));
};

export const buildControlledLanguageAuditRows = (
  nodes: FlowNode[],
  glossary: ControlledLanguageGlossaryEntry[]
): ControlledLanguageAuditRow[] => {
  const rowByKey = new Map<string, ControlledLanguageAuditRow>();

  nodes.forEach((node) => {
    collectControlledLanguageTermsFromNode(node).forEach(({ field_type, term: rawTerm }) => {
      const term = normalizeControlledLanguageTerm(rawTerm);
      if (!term) {
        return;
      }

      const key = buildControlledLanguageGlossaryKey(field_type, term);
      const existing = rowByKey.get(key);

      if (existing) {
        rowByKey.set(key, {
          ...existing,
          occurrences: existing.occurrences + 1,
        });
        return;
      }

      rowByKey.set(key, {
        field_type,
        term,
        include: false,
        occurrences: 1,
      });
    });
  });

  sanitizeControlledLanguageGlossary(glossary).forEach((entry) => {
    const key = buildControlledLanguageGlossaryKey(entry.field_type, entry.term);
    const existing = rowByKey.get(key);

    rowByKey.set(key, {
      field_type: entry.field_type,
      term: entry.term,
      include: entry.include,
      occurrences: existing?.occurrences ?? 0,
    });
  });

  return sortControlledLanguageEntries(Array.from(rowByKey.values()));
};
