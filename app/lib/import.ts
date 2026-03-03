import type { ParsedTabularPayload, ProjectTransferFormat, ProjectRecord } from "../types";
import { FULL_PROJECT_EXPORT_FORMAT, FULL_PROJECT_EXPORT_SCHEMA_VERSION } from "../constants";
import { sanitizeProjectRecord } from "./store";

export const parseCsvText = (text: string): ParsedTabularPayload => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let index = 0;
  let inQuotes = false;

  while (index < text.length) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          currentCell += '"';
          index += 2;
          continue;
        }

        inQuotes = false;
        index += 1;
        continue;
      }

      currentCell += char;
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      index += 1;
      continue;
    }

    if (char === ",") {
      currentRow.push(currentCell);
      currentCell = "";
      index += 1;
      continue;
    }

    if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") {
        index += 1;
      }

      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      index += 1;
      continue;
    }

    currentCell += char;
    index += 1;
  }

  currentRow.push(currentCell);
  rows.push(currentRow);

  if (rows.length === 0) {
    return { rows: [], headers: [] };
  }

  const [rawHeaders, ...bodyRows] = rows;
  const headers = rawHeaders.map((header, headerIndex) =>
    headerIndex === 0 ? header.replace(/^\uFEFF/, "").trim() : header.trim()
  );

  const parsedRows = bodyRows
    .filter((row) => row.some((cell) => cell.trim().length > 0))
    .map((row) => {
      const record: Record<string, string> = {};
      headers.forEach((header, headerIndex) => {
        if (!header) {
          return;
        }

        record[header] = row[headerIndex] ?? "";
      });

      return record;
    });

  return {
    rows: parsedRows,
    headers,
  };
};

export const parseXmlText = (text: string): ParsedTabularPayload => {
  const parser = new DOMParser();
  const document = parser.parseFromString(text, "application/xml");
  const parserError = document.querySelector("parsererror");

  if (parserError) {
    throw new Error("Invalid XML file.");
  }

  const rowElements = Array.from(document.getElementsByTagName("row"));
  const headers = new Set<string>();

  const rows = rowElements.map((rowElement) => {
    const rowRecord: Record<string, string> = {};

    Array.from(rowElement.children).forEach((cellElement) => {
      const key = cellElement.tagName.trim();
      if (!key) {
        return;
      }

      headers.add(key);
      rowRecord[key] = cellElement.textContent ?? "";
    });

    return rowRecord;
  });

  return {
    rows,
    headers: Array.from(headers),
  };
};

export const detectProjectTransferFormat = (
  fileName: string,
  text: string
): ProjectTransferFormat | null => {
  const loweredFileName = fileName.toLowerCase();

  if (loweredFileName.endsWith(".csv")) {
    return "csv";
  }

  if (loweredFileName.endsWith(".xml")) {
    return "xml";
  }

  if (loweredFileName.endsWith(".json")) {
    return "json";
  }

  const trimmed = text.trimStart();
  if (trimmed.startsWith("<")) {
    return "xml";
  }

  if (trimmed.startsWith("{")) {
    return "json";
  }

  if (trimmed.includes(",")) {
    return "csv";
  }

  return null;
};

export const normalizeFlatRowKeys = (rawRow: Record<string, string>): Record<string, string> => {
  const normalizedRow: Record<string, string> = {};

  Object.entries(rawRow).forEach(([key, value], index) => {
    const normalizedKey = index === 0 ? key.replace(/^\uFEFF/, "").trim() : key.trim();
    if (!normalizedKey) {
      return;
    }

    normalizedRow[normalizedKey] = value;
  });

  return normalizedRow;
};

export const selectFlatImportRowsForProject = ({
  rows,
  preferredProjectId,
}: {
  rows: Record<string, string>[];
  preferredProjectId: string;
}): {
  projectId: string;
  projectRows: Record<string, string>[];
} => {
  const rowsByProjectId = new Map<string, Record<string, string>[]>();
  const rowsWithoutProjectId: Record<string, string>[] = [];

  rows.forEach((row) => {
    const projectId = (row.project_id ?? "").trim();
    if (!projectId) {
      rowsWithoutProjectId.push(row);
      return;
    }

    const existing = rowsByProjectId.get(projectId);
    if (existing) {
      existing.push(row);
      return;
    }

    rowsByProjectId.set(projectId, [row]);
  });

  if (rowsByProjectId.has(preferredProjectId)) {
    return {
      projectId: preferredProjectId,
      projectRows: [
        ...(rowsByProjectId.get(preferredProjectId) ?? []),
        ...rowsWithoutProjectId,
      ],
    };
  }

  if (rowsByProjectId.size === 1) {
    const [projectId, projectRows] = Array.from(rowsByProjectId.entries())[0];
    return {
      projectId,
      projectRows: [...projectRows, ...rowsWithoutProjectId],
    };
  }

  if (rowsByProjectId.size > 1) {
    const listedProjectIds = Array.from(rowsByProjectId.keys()).sort((a, b) =>
      a.localeCompare(b)
    );
    throw new Error(
      `Import file contains multiple project IDs (${listedProjectIds.join(", ")}). Import one project per file.`
    );
  }

  if (rowsWithoutProjectId.length > 0) {
    return {
      projectId: preferredProjectId,
      projectRows: rowsWithoutProjectId,
    };
  }

  throw new Error("Import file has no project rows.");
};

export const safeJsonParse = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export const parseProjectRecordFromJsonText = (text: string): ProjectRecord => {
  const parsed = safeJsonParse(text);

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid JSON file.");
  }

  const source = parsed as Record<string, unknown>;

  if (source.format === FULL_PROJECT_EXPORT_FORMAT) {
    if (source.schemaVersion !== FULL_PROJECT_EXPORT_SCHEMA_VERSION) {
      throw new Error(
        `Unsupported JSON schema version. Expected ${FULL_PROJECT_EXPORT_SCHEMA_VERSION}.`
      );
    }

    const payload =
      source.payload && typeof source.payload === "object"
        ? (source.payload as { project?: unknown })
        : null;

    const envelopeProject = sanitizeProjectRecord(payload?.project);
    if (!envelopeProject) {
      throw new Error("JSON payload is missing a valid project.");
    }

    return envelopeProject;
  }

  const directProject = sanitizeProjectRecord(parsed);
  if (directProject) {
    return directProject;
  }

  throw new Error(
    `Unsupported JSON format. Expected ${FULL_PROJECT_EXPORT_FORMAT} v${FULL_PROJECT_EXPORT_SCHEMA_VERSION}.`
  );
};

export const toNumeric = (value: string | undefined): number | null => {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
