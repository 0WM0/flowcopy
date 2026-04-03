import type {
  FlowNode,
  FlowEdge,
  FlowOrderingResult,
  AppStore,
  AccountRecord,
  ProjectRecord,
  GlobalOptionConfig,
  ControlledLanguageGlossaryEntry,
  TermRegistryEntry,
  FlatExportRow,
  UiJourneyConversationEntry,
  DownloadTextExtension,
} from "../types";
import { FLAT_EXPORT_COLUMNS } from "../constants";
import { sanitizeControlledLanguageGlossary } from "./controlled-language";
import { sanitizeEdgesForStorage } from "./edge-utils";

type UiJourneyConversationHtmlBuildOptions = {
  includeDocumentWrapper?: boolean;
};

const UI_JOURNEY_SEQUENCE_START_MARKER = "Sequence Start";
const UI_JOURNEY_SEQUENCE_END_MARKER = "Sequence End";

type UiJourneyConversationExportEntry = {
  entry: UiJourneyConversationEntry;
  stepIndex: number;
  stepLabel: string;
  visibleFields: Array<{
    label: string;
    sourceKey: string;
    value: string;
  }>;
  bodyText: string | null;
  notes: string | null;
};

export const normalizeMultilineText = (value: string): string =>
  value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

const hasNonEmptyConversationValue = (
  value: string | null | undefined
): value is string => typeof value === "string" && value.trim().length > 0;

const normalizeUiJourneyConversationExportEntries = (
  entries: UiJourneyConversationEntry[]
): UiJourneyConversationExportEntry[] => {
  const totalCount = entries.length;

  return entries.map((entry, entryIndex) => {
    const visibleFields = entry.fields
      .filter((field) => hasNonEmptyConversationValue(field.value))
      .map((field) => ({
        label: field.label,
        sourceKey: field.sourceKey,
        value: normalizeMultilineText(field.value).trim(),
      }));

    return {
      entry,
      stepIndex: entryIndex + 1,
      stepLabel: `${entryIndex + 1} of ${totalCount}`,
      visibleFields,
      bodyText: hasNonEmptyConversationValue(entry.bodyText)
        ? normalizeMultilineText(entry.bodyText).trim()
        : null,
      notes: hasNonEmptyConversationValue(entry.notes)
        ? normalizeMultilineText(entry.notes).trim()
        : null,
    };
  });
};

export const buildUiJourneyConversationHeading = (
  entry: UiJourneyConversationEntry
): string => `${entry.sequence ?? "-"} - ${entry.title || "Untitled"}`;

export const buildUiJourneyConversationPlainText = (
  entries: UiJourneyConversationEntry[],
  generatedAtLabel: string
): string => {
  const lines: string[] = [
    "UI Journey Conversation",
    `Generated: ${generatedAtLabel}`,
    "",
  ];

  if (entries.length === 0) {
    lines.push("No nodes found in the current selection.");
    return lines.join("\n");
  }

  entries.forEach((entry, entryIndex) => {
    lines.push(buildUiJourneyConversationHeading(entry));

    if (entry.fields.length === 0) {
      lines.push("No copy fields provided.");
    } else {
      entry.fields.forEach((field) => {
        const normalizedValue = normalizeMultilineText(field.value);
        const [firstLine, ...remainingLines] = normalizedValue.split("\n");

        lines.push(`${field.label}: ${firstLine ?? ""}`);
        remainingLines.forEach((line) => {
          lines.push(`  ${line}`);
        });
      });
    }

    if (entry.bodyText) {
      lines.push(`Body Text: ${normalizeMultilineText(entry.bodyText)}`);
    }
    if (entry.notes) {
      lines.push(`Notes: ${normalizeMultilineText(entry.notes)}`);
    }

    if (entryIndex < entries.length - 1) {
      lines.push("");
    }
  });

  return lines.join("\n");
};

export const buildUiJourneyConversationMarkdown = (
  entries: UiJourneyConversationEntry[],
  generatedAtLabel: string
): string => {
  const lines: string[] = [
    "# UI Journey Conversation",
    "",
    `Generated: ${generatedAtLabel}`,
    "",
  ];

  if (entries.length === 0) {
    lines.push("No nodes found in the current selection.");
    return lines.join("\n");
  }

  entries.forEach((entry, entryIndex) => {
    lines.push(`## ${buildUiJourneyConversationHeading(entry)}`);

    if (entry.fields.length === 0) {
      lines.push("_No copy fields provided._");
    } else {
      entry.fields.forEach((field) => {
        const normalizedValue = normalizeMultilineText(field.value).trim();

        if (normalizedValue.includes("\n")) {
          lines.push(`- **${field.label}:**`);
          lines.push("```");
          lines.push(normalizedValue);
          lines.push("```");
          return;
        }

        lines.push(`- **${field.label}:** ${normalizedValue}`);
      });
    }

    if (entry.bodyText) {
      const normalizedBodyText = normalizeMultilineText(entry.bodyText).trim();
      if (normalizedBodyText.includes("\n")) {
        lines.push(`- **Body Text:**`);
        lines.push("```");
        lines.push(normalizedBodyText);
        lines.push("```");
      } else {
        lines.push(`- **Body Text:** ${normalizedBodyText}`);
      }
    }
    if (entry.notes) {
      const normalizedNotes = normalizeMultilineText(entry.notes).trim();
      if (normalizedNotes.includes("\n")) {
        lines.push(`- **Notes:**`);
        lines.push("```");
        lines.push(normalizedNotes);
        lines.push("```");
      } else {
        lines.push(`- **Notes:** ${normalizedNotes}`);
      }
    }

    if (entryIndex < entries.length - 1) {
      lines.push("");
    }
  });

  return lines.join("\n");
};

export const buildUiJourneyConversationHtml = (
  entries: UiJourneyConversationEntry[],
  generatedAtLabel: string,
  options: UiJourneyConversationHtmlBuildOptions = {}
): string => {
  const includeDocumentWrapper = options.includeDocumentWrapper ?? true;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.45;">
      <h1 style="margin: 0 0 8px; font-size: 24px;">UI Journey Conversation</h1>
      <p style="margin: 0 0 16px; font-size: 12px; color: #475569;">Generated: ${escapeXmlText(generatedAtLabel)}</p>
      ${
        entries.length === 0
          ? '<p style="margin: 0; font-size: 13px; color: #64748b;">No nodes found in the current selection.</p>'
          : entries
              .map((entry) => {
                const heading = escapeXmlText(buildUiJourneyConversationHeading(entry));
                const isFrameEntry = entry.nodeType === "frame";

                const renderedFields =
                  entry.fields.length === 0
                    ? `<p style="margin: 0; font-size: ${isFrameEntry ? 14 : 12}px; color: #94a3b8; font-style: italic; text-align: ${isFrameEntry ? "center" : "left"};">No copy fields provided.</p>`
                    : entry.fields
                        .map((field) => {
                          const escapedLabel = escapeXmlText(field.label);
                          const escapedValue = escapeXmlText(
                            normalizeMultilineText(field.value)
                          ).replace(/\n/g, "<br />");

                          return `<p style="margin: 0; font-size: ${isFrameEntry ? 14 : 12}px; color: #334155; text-align: ${isFrameEntry ? "center" : "left"};"><strong>${escapedLabel}:</strong> ${escapedValue}</p>`;
                        })
                        .join("");

                const bodyTextHtml = entry.bodyText
                  ? `<p style="margin: 0; font-size: 12px; color: #334155; text-align: left;"><strong>Body Text:</strong> ${escapeXmlText(normalizeMultilineText(entry.bodyText)).replace(/\n/g, "<br />")}</p>`
                  : "";
                const notesHtml = entry.notes
                  ? `<p style="margin: 0; font-size: 12px; color: #334155; text-align: left;"><strong>Notes:</strong> ${escapeXmlText(normalizeMultilineText(entry.notes)).replace(/\n/g, "<br />")}</p>`
                  : "";
                const frameNotesHtml = entry.notes
                  ? `<p style="margin: 0; font-size: 14px; color: #334155; text-align: center;"><strong>Notes:</strong> ${escapeXmlText(normalizeMultilineText(entry.notes)).replace(/\n/g, "<br />")}</p>`
                  : "";

                return `<section style="border: 1px solid #dbeafe; border-radius: 10px; background: ${
                  isFrameEntry ? "#f8fafc" : "#ffffff"
                }; padding: 10px 12px; display: grid; gap: 4px; margin-bottom: 10px;"><h2 style="margin: 0; font-size: ${
                  isFrameEntry ? 22 : 18
                }px; color: #0f172a; text-align: ${
                  isFrameEntry ? "center" : "left"
                }">${heading}</h2>${renderedFields}${
                  isFrameEntry ? frameNotesHtml : `${bodyTextHtml}${notesHtml}`
                }</section>`;
              })
              .join("")
      }
    </div>
  `.trim();

  if (!includeDocumentWrapper) {
    return htmlBody;
  }

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>UI Journey Conversation</title>
  </head>
  <body>
    ${htmlBody}
  </body>
</html>`;
};

export const escapeRtfText = (value: string): string => {
  const normalizedValue = normalizeMultilineText(value);
  let escapedValue = "";

  for (const character of normalizedValue) {
    if (character === "\\") {
      escapedValue += "\\\\";
      continue;
    }

    if (character === "{") {
      escapedValue += "\\{";
      continue;
    }

    if (character === "}") {
      escapedValue += "\\}";
      continue;
    }

    if (character === "\n") {
      escapedValue += "\\line ";
      continue;
    }

    const codePoint = character.codePointAt(0);
    if (typeof codePoint === "number" && (codePoint < 32 || codePoint > 126)) {
      escapedValue += `\\u${codePoint <= 32767 ? codePoint : 63}?`;
      continue;
    }

    escapedValue += character;
  }

  return escapedValue;
};

export const buildUiJourneyConversationRtf = (
  entries: UiJourneyConversationEntry[],
  generatedAtLabel: string
): string => {
  const lines: string[] = [
    "{\\rtf1\\ansi\\deff0",
    "{\\fonttbl{\\f0 Arial;}}",
    "\\viewkind4\\uc1",
    "\\pard\\sa180\\sl276\\slmult1\\f0\\fs36\\b UI Journey Conversation\\b0\\fs24\\par",
    `\\pard\\sa180\\sl276\\slmult1\\f0\\fs20 Generated: ${escapeRtfText(generatedAtLabel)}\\par`,
    "\\par",
  ];

  if (entries.length === 0) {
    lines.push(
      "\\pard\\ql\\sa120\\f0\\fs22\\i No nodes found in the current selection.\\i0\\par"
    );
    lines.push("}");
    return lines.join("\n");
  }

  entries.forEach((entry, entryIndex) => {
    const heading = escapeRtfText(buildUiJourneyConversationHeading(entry));
    const isFrameEntry = entry.nodeType === "frame";

    lines.push(
      `\\pard${isFrameEntry ? "\\qc" : "\\ql"}\\sa120\\f0\\${
        isFrameEntry ? "fs34" : "fs30"
      }\\b ${heading}\\b0\\par`
    );

    if (entry.fields.length === 0) {
      lines.push(
        `\\pard${isFrameEntry ? "\\qc" : "\\ql"}\\sa90\\f0\\fs22\\i No copy fields provided.\\i0\\par`
      );
    } else {
      entry.fields.forEach((field) => {
        const label = escapeRtfText(`${field.label}:`);
        const value = escapeRtfText(field.value);

        lines.push(
          `\\pard${isFrameEntry ? "\\qc" : "\\ql"}\\sa90\\f0\\fs22\\b ${label}\\b0 ${value}\\par`
        );
      });
    }

    if (entry.bodyText) {
      const label = escapeRtfText("Body Text:");
      const value = escapeRtfText(entry.bodyText);
      lines.push(
        `\\pard${isFrameEntry ? "\\qc" : "\\ql"}\\sa90\\f0\\fs22\\b ${label}\\b0 ${value}\\par`
      );
    }
    if (entry.notes) {
      const label = escapeRtfText("Notes:");
      const value = escapeRtfText(entry.notes);
      lines.push(
        `\\pard${isFrameEntry ? "\\qc" : "\\ql"}\\sa90\\f0\\fs22\\b ${label}\\b0 ${value}\\par`
      );
    }

    if (entryIndex < entries.length - 1) {
      lines.push("\\par");
    }
  });

  lines.push("}");

  return lines.join("\n");
};

const buildCsvFromDynamicRows = (
  headers: string[],
  rows: Array<Record<string, string>>
): string => {
  const header = headers.map((column) => escapeCsvCell(column)).join(",");
  const lines = rows.map((row) =>
    headers.map((column) => escapeCsvCell(row[column] ?? "")).join(",")
  );

  return [header, ...lines].join("\n");
};

export const buildUiJourneyConversationCsv = (
  entries: UiJourneyConversationEntry[],
  generatedAtLabel: string
): string => {
  const normalizedEntries = normalizeUiJourneyConversationExportEntries(entries);
  const fieldColumns: string[] = [];
  const seenFieldColumns = new Set<string>();

  normalizedEntries.forEach(({ visibleFields }) => {
    visibleFields.forEach((field) => {
      if (seenFieldColumns.has(field.label)) {
        return;
      }

      seenFieldColumns.add(field.label);
      fieldColumns.push(field.label);
    });
  });

  const includeBodyTextColumn = normalizedEntries.some(
    ({ bodyText }) => bodyText !== null
  );
  const includeNotesColumn = normalizedEntries.some(({ notes }) => notes !== null);

  const headers = [
    "Marker",
    "Step",
    "Sequence",
    "Title",
    "Node Type",
    "Node ID",
    ...fieldColumns,
    ...(includeBodyTextColumn ? ["Body Text"] : []),
    ...(includeNotesColumn ? ["Entry Notes"] : []),
    "Generated At",
  ];

  const rows: Array<Record<string, string>> = [
    {
      Marker: UI_JOURNEY_SEQUENCE_START_MARKER,
      "Generated At": generatedAtLabel,
    },
    ...normalizedEntries.map(
      ({ entry, stepLabel, visibleFields, bodyText, notes }) => {
        const row: Record<string, string> = {
          Marker: "",
          Step: stepLabel,
          Sequence: entry.sequence !== null ? String(entry.sequence) : "",
          Title: entry.title.trim() || "Untitled",
          "Node Type": entry.nodeType,
          "Node ID": entry.nodeId,
        };

        visibleFields.forEach((field) => {
          row[field.label] = field.value;
        });

        if (bodyText !== null) {
          row["Body Text"] = bodyText;
        }

        if (notes !== null) {
          row["Entry Notes"] = notes;
        }

        return row;
      }
    ),
    {
      Marker: UI_JOURNEY_SEQUENCE_END_MARKER,
      "Generated At": generatedAtLabel,
    },
  ];

  return buildCsvFromDynamicRows(headers, rows);
};

export const buildUiJourneyConversationXml = (
  entries: UiJourneyConversationEntry[],
  generatedAtLabel: string
): string => {
  const normalizedEntries = normalizeUiJourneyConversationExportEntries(entries);

  const stepXml = normalizedEntries
    .map(({ entry, stepIndex, stepLabel, visibleFields, bodyText, notes }) => {
      const attributes = [
        `index="${stepIndex}"`,
        `step="${escapeXmlText(stepLabel)}"`,
        `nodeId="${escapeXmlText(entry.nodeId)}"`,
        `nodeType="${escapeXmlText(entry.nodeType)}"`,
      ];

      if (entry.sequence !== null) {
        attributes.push(`sequence="${entry.sequence}"`);
      }

      const childElements: string[] = [
        `    <title>${escapeXmlText(entry.title.trim() || "Untitled")}</title>`,
      ];

      if (visibleFields.length > 0) {
        const fieldsXml = visibleFields
          .map(
            (field) =>
              `      <field label="${escapeXmlText(field.label)}" sourceKey="${escapeXmlText(field.sourceKey)}">${escapeXmlText(field.value)}</field>`
          )
          .join("\n");

        childElements.push(`    <fields>\n${fieldsXml}\n    </fields>`);
      }

      if (bodyText !== null) {
        childElements.push(`    <bodyText>${escapeXmlText(bodyText)}</bodyText>`);
      }

      if (notes !== null) {
        childElements.push(`    <notes>${escapeXmlText(notes)}</notes>`);
      }

      return `  <step ${attributes.join(" ")}>\n${childElements.join("\n")}\n  </step>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<uiJourneyConversation formatVersion="1">\n  <generatedAt>${escapeXmlText(generatedAtLabel)}</generatedAt>\n  <sequenceBoundary type="start">${UI_JOURNEY_SEQUENCE_START_MARKER}</sequenceBoundary>${
    stepXml.length > 0 ? `\n${stepXml}` : ""
  }\n  <sequenceBoundary type="end">${UI_JOURNEY_SEQUENCE_END_MARKER}</sequenceBoundary>\n</uiJourneyConversation>`;
};

export const buildUiJourneyConversationJson = (
  entries: UiJourneyConversationEntry[],
  generatedAtLabel: string
): string => {
  const normalizedEntries = normalizeUiJourneyConversationExportEntries(entries);
  const totalSteps = normalizedEntries.length;

  const payload = {
    format: "flowcopy.ui_journey_conversation",
    schemaVersion: 1,
    generatedAt: generatedAtLabel,
    items: [
      {
        type: "sequenceBoundary" as const,
        marker: UI_JOURNEY_SEQUENCE_START_MARKER,
      },
      ...normalizedEntries.map(
        ({ entry, stepIndex, stepLabel, visibleFields, bodyText, notes }) => {
          const normalizedEntry: Record<string, unknown> = {
            type: "entry",
            step: stepLabel,
            stepIndex,
            stepCount: totalSteps,
            nodeId: entry.nodeId,
            nodeType: entry.nodeType,
            title: entry.title.trim() || "Untitled",
          };

          if (entry.sequence !== null) {
            normalizedEntry.sequence = entry.sequence;
          }

          if (visibleFields.length > 0) {
            normalizedEntry.fields = visibleFields;
          }

          if (bodyText !== null) {
            normalizedEntry.bodyText = bodyText;
          }

          if (notes !== null) {
            normalizedEntry.notes = notes;
          }

          return normalizedEntry;
        }
      ),
      {
        type: "sequenceBoundary" as const,
        marker: UI_JOURNEY_SEQUENCE_END_MARKER,
      },
    ],
  };

  return JSON.stringify(payload, null, 2);
};

export const buildUiJourneyConversationHtmlExport = (
  entries: UiJourneyConversationEntry[],
  generatedAtLabel: string,
  options: UiJourneyConversationHtmlBuildOptions = {}
): string => {
  const includeDocumentWrapper = options.includeDocumentWrapper ?? true;
  const normalizedEntries = normalizeUiJourneyConversationExportEntries(entries);

  const renderValue = (value: string): string =>
    escapeXmlText(value).replace(/\n/g, "<br />");

  const markerHtml = (label: string): string =>
    `<div style="font-size: 10px; font-weight: 600; color: #64748b; opacity: 0.78; letter-spacing: 0.6px; text-transform: uppercase; text-align: center;">${escapeXmlText(
      label
    )}</div>`;

  const entriesHtml = normalizedEntries
    .map(({ entry, stepLabel, visibleFields, bodyText, notes }) => {
      const isCenteredEntry = entry.nodeType === "frame" || entry.nodeType === "horizontal_multi_term";
      const isOrphanEntry = entry.connectionMeta.isOrphan;
      const headingText = escapeXmlText(buildUiJourneyConversationHeading(entry));
      const headingColor = isOrphanEntry ? "#dc2626" : "#64748b";
      const contentColor = isOrphanEntry ? "#7f1d1d" : "#0f172a";
      const labelColor = isOrphanEntry ? "#b91c1c" : "#64748b";

      const fieldsHtml =
        visibleFields.length > 0
          ? visibleFields
              .map(
                (field) =>
                  `<div style="display: grid; gap: 2px; text-align: ${
                    isCenteredEntry ? "center" : "left"
                  };"><div style="font-size: 10px; font-weight: 600; color: ${labelColor}; opacity: 0.75; text-transform: uppercase; letter-spacing: 0.7px; line-height: 1.3;">${escapeXmlText(
                    field.label
                  )}</div><div style="font-size: ${
                    isCenteredEntry ? "15" : "14"
                  }px; font-weight: 500; color: ${contentColor}; line-height: 1.45; white-space: pre-wrap;">${renderValue(
                    field.value
                  )}</div></div>`
              )
              .join("")
          : `<div style="font-size: 12px; color: ${
              isOrphanEntry ? "#b91c1c" : "#94a3b8"
            }; font-style: italic; text-align: ${
              isCenteredEntry ? "center" : "left"
            }">No copy fields provided.</div>`;

      const orphanBadge = isOrphanEntry
        ? '<span style="font-size: 9px; font-weight: 700; color: #b91c1c; border: 1px solid #fecaca; border-radius: 999px; background: #fee2e2; padding: 1px 6px; line-height: 1.35;">(Orphaned)</span>'
        : "";

      if (isCenteredEntry) {
        return `<section style="border: 1px solid ${
          isOrphanEntry ? "#fecaca" : "#dbeafe"
        }; border-radius: 10px; background: ${
          isOrphanEntry ? "#fef2f2" : "#f8fafc"
        }; padding: 10px 12px; display: grid; gap: 4px; text-align: center;"><div style="font-size: 10px; color: ${labelColor}; opacity: 0.72; text-align: center;">${escapeXmlText(
          stepLabel
        )}</div><div style="display: inline-flex; justify-content: center; align-items: center; gap: 6px;"><span style="font-weight: 600; font-size: 12px; color: ${headingColor};">${headingText}</span>${orphanBadge}</div>${fieldsHtml}${
          notes !== null
            ? `<div style="display: grid; gap: 2px; justify-items: center; text-align: center;"><div style="font-size: 10px; font-weight: 600; color: ${labelColor}; opacity: 0.75; text-transform: uppercase; letter-spacing: 0.7px; line-height: 1.3;">Notes</div><div style="font-size: 15px; font-weight: 500; color: ${contentColor}; line-height: 1.45; white-space: pre-wrap;">${renderValue(
                notes
              )}</div></div>`
            : ""
        }</section>`;
      }

      const bodyTextHtml =
        bodyText !== null
          ? `<div style="display: grid; gap: 2px;"><div style="font-size: 10px; font-weight: 600; color: ${labelColor}; opacity: 0.75; text-transform: uppercase; letter-spacing: 0.7px; line-height: 1.3;">Body Text</div><div style="font-size: 14px; font-weight: 500; color: ${contentColor}; line-height: 1.45; white-space: pre-wrap;">${renderValue(
              bodyText
            )}</div></div>`
          : "";

      const notesHtml =
        notes !== null
          ? `<div style="display: grid; gap: 2px;"><div style="font-size: 10px; font-weight: 600; color: ${labelColor}; opacity: 0.75; text-transform: uppercase; letter-spacing: 0.7px; line-height: 1.3;">Notes</div><div style="font-size: 14px; font-weight: 500; color: ${contentColor}; line-height: 1.45; white-space: pre-wrap;">${renderValue(
              notes
            )}</div></div>`
          : "";

      return `<section style="border: 1px solid ${
        isOrphanEntry ? "#fecaca" : "#dbeafe"
      }; border-radius: 10px; background: ${
        isOrphanEntry ? "#fef2f2" : "#ffffff"
      }; padding: 10px 12px; display: grid; gap: 8px;"><div style="font-size: 10px; color: ${labelColor}; opacity: 0.72; text-align: right;">${escapeXmlText(
        stepLabel
      )}</div><div style="display: flex; align-items: center; justify-content: flex-start; flex-wrap: wrap; gap: 6px; text-align: left;"><span style="font-weight: 600; font-size: 11px; color: ${headingColor};">${headingText}</span>${orphanBadge}</div><div style="display: grid; gap: 6px;">${fieldsHtml}${bodyTextHtml}${notesHtml}</div></section>`;
    })
    .join("");

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.45;">
      <h1 style="margin: 0 0 8px; font-size: 24px;">UI Journey Conversation</h1>
      <p style="margin: 0 0 16px; font-size: 12px; color: #475569;">Generated: ${escapeXmlText(generatedAtLabel)}</p>
      ${
        normalizedEntries.length === 0
          ? '<p style="margin: 0; font-size: 13px; color: #64748b;">No nodes found in the current selection.</p>'
          : `${markerHtml(UI_JOURNEY_SEQUENCE_START_MARKER)}<div style="display: grid; gap: 10px; margin-top: 10px;">${entriesHtml}</div><div style="margin-top: 10px;">${markerHtml(
              UI_JOURNEY_SEQUENCE_END_MARKER
            )}</div>`
      }
    </div>
  `.trim();

  if (!includeDocumentWrapper) {
    return htmlBody;
  }

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>UI Journey Conversation</title>
  </head>
  <body>
    ${htmlBody}
  </body>
</html>`;
};

export const buildUiJourneyConversationRtfExport = (
  entries: UiJourneyConversationEntry[],
  generatedAtLabel: string
): string => {
  const normalizedEntries = normalizeUiJourneyConversationExportEntries(entries);

  const lines: string[] = [
    "{\\rtf1\\ansi\\deff0",
    "{\\fonttbl{\\f0 Arial;}}",
    "\\viewkind4\\uc1",
    "\\pard\\sa180\\sl276\\slmult1\\f0\\fs36\\b UI Journey Conversation\\b0\\fs24\\par",
    `\\pard\\sa180\\sl276\\slmult1\\f0\\fs20 Generated: ${escapeRtfText(generatedAtLabel)}\\par`,
    "\\par",
  ];

  if (normalizedEntries.length === 0) {
    lines.push(
      "\\pard\\ql\\sa120\\f0\\fs22\\i No nodes found in the current selection.\\i0\\par"
    );
    lines.push("}");
    return lines.join("\n");
  }

  lines.push(
    `\\pard\\qc\\sa80\\f0\\fs18\\i ${escapeRtfText(UI_JOURNEY_SEQUENCE_START_MARKER)}\\i0\\par`
  );
  lines.push("\\par");

  normalizedEntries.forEach(({ entry, stepLabel, visibleFields, bodyText, notes }, index) => {
    const isCenteredEntry = entry.nodeType === "frame" || entry.nodeType === "horizontal_multi_term";
    const heading = escapeRtfText(buildUiJourneyConversationHeading(entry));
    const headingWithOrphan = entry.connectionMeta.isOrphan ? `${heading} (Orphaned)` : heading;

    lines.push(
      `\\pard${isCenteredEntry ? "\\qc" : "\\qr"}\\sa60\\f0\\fs18 ${escapeRtfText(
        stepLabel
      )}\\par`
    );
    lines.push(
      `\\pard${isCenteredEntry ? "\\qc" : "\\ql"}\\sa80\\f0\\fs24\\b ${headingWithOrphan}\\b0\\par`
    );

    if (visibleFields.length === 0) {
      lines.push(
        `\\pard${isCenteredEntry ? "\\qc" : "\\ql"}\\sa70\\f0\\fs21\\i No copy fields provided.\\i0\\par`
      );
    } else {
      visibleFields.forEach((field) => {
        const label = escapeRtfText(`${field.label}:`);
        const value = escapeRtfText(field.value);

        lines.push(
          `\\pard${isCenteredEntry ? "\\qc" : "\\ql"}\\sa70\\f0\\fs21\\b ${label}\\b0 ${value}\\par`
        );
      });
    }

    if (!isCenteredEntry && bodyText !== null) {
      lines.push(
        `\\pard\\ql\\sa70\\f0\\fs21\\b ${escapeRtfText("Body Text:")}\\b0 ${escapeRtfText(
          bodyText
        )}\\par`
      );
    }

    if (notes !== null) {
      lines.push(
        `\\pard${isCenteredEntry ? "\\qc" : "\\ql"}\\sa70\\f0\\fs21\\b ${escapeRtfText(
          "Notes:"
        )}\\b0 ${escapeRtfText(notes)}\\par`
      );
    }

    if (index < normalizedEntries.length - 1) {
      lines.push("\\par");
    }
  });

  lines.push("\\par");
  lines.push(
    `\\pard\\qc\\sa80\\f0\\fs18\\i ${escapeRtfText(UI_JOURNEY_SEQUENCE_END_MARKER)}\\i0\\par`
  );
  lines.push("}");

  return lines.join("\n");
};

export const escapeCsvCell = (value: string): string => {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
};

export const buildCsvFromRows = (rows: FlatExportRow[]): string => {
  const header = FLAT_EXPORT_COLUMNS.join(",");
  const lines = rows.map((row) =>
    FLAT_EXPORT_COLUMNS.map((column) => escapeCsvCell(row[column] ?? "")).join(",")
  );

  return [header, ...lines].join("\n");
};

export const escapeXmlText = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");

export const buildXmlFromRows = (rows: FlatExportRow[]): string => {
  const rowXml = rows
    .map((row) => {
      const cells = FLAT_EXPORT_COLUMNS.map(
        (column) =>
          `    <${column}>${escapeXmlText(row[column] ?? "")}</${column}>`
      ).join("\n");

      return `  <row>\n${cells}\n  </row>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<flowcopyExport formatVersion="1">\n${rowXml}\n</flowcopyExport>`;
};

export const buildDownloadFileName = (
  projectId: string,
  extension: DownloadTextExtension
): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${projectId}-${timestamp}.${extension}`;
};

export const createFlatExportRows = ({
  session,
  account,
  project,
  projectSequenceId,
  nodes,
  ordering,
  adminOptions,
  controlledLanguageGlossary,
  termRegistry,
  edges,
}: {
  session: AppStore["session"];
  account: AccountRecord;
  project: ProjectRecord;
  projectSequenceId: string;
  nodes: FlowNode[];
  ordering: FlowOrderingResult;
  adminOptions: GlobalOptionConfig;
  controlledLanguageGlossary: ControlledLanguageGlossaryEntry[];
  termRegistry: TermRegistryEntry[];
  edges: FlowEdge[];
}): FlatExportRow[] => {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  const orderedNodes = ordering.orderedNodeIds
    .map((nodeId) => nodeById.get(nodeId))
    .filter((node): node is FlowNode => Boolean(node));

  const edgesJson = JSON.stringify(sanitizeEdgesForStorage(edges));
  const adminOptionsJson = JSON.stringify(adminOptions);
  const controlledLanguageJson = JSON.stringify(
    sanitizeControlledLanguageGlossary(controlledLanguageGlossary)
  );
  const termRegistryJson = JSON.stringify(termRegistry);

  const buildRow = (node: FlowNode | null): FlatExportRow => {
    const sequence = node ? ordering.sequenceByNodeId[node.id] ?? null : null;

    return {
      session_activeAccountId: session.activeAccountId ?? "",
      session_activeProjectId: session.activeProjectId ?? "",
      session_view: session.view,
      session_editorMode: session.editorMode,
      account_id: account.id,
      account_code: account.code,
      project_id: project.id,
      project_name: project.name,
      project_createdAt: project.createdAt,
      project_updatedAt: project.updatedAt,
      project_sequence_id: projectSequenceId,
      node_id: node?.id ?? "",
      node_order_id: sequence !== null ? String(sequence) : "",
      sequence_index: sequence !== null ? String(sequence) : "",
      parallel_group_id:
        node?.data.parallel_group_id ??
        (node ? ordering.parallelGroupByNodeId[node.id] ?? "" : ""),
      position_x: node ? String(node.position.x) : "",
      position_y: node ? String(node.position.y) : "",
      title: node?.data.title ?? "",
      content_config_json: node ? JSON.stringify(node.data.content_config) : "",
      tone: node?.data.tone ?? "",
      polarity: node?.data.polarity ?? "",
      reversibility: node?.data.reversibility ?? "",
      concept: node?.data.concept ?? "",
      notes: node?.data.notes ?? "",
      action_type_name: node?.data.action_type_name ?? "",
      action_type_color: node?.data.action_type_color ?? "",
      card_style: node?.data.card_style ?? "",
      node_shape: node?.data.node_shape ?? "",
      node_type: node?.data.node_type ?? "default",
      frame_config_json: node ? JSON.stringify(node.data.frame_config) : "",
      project_admin_options_json: adminOptionsJson,
      project_controlled_language_json: controlledLanguageJson,
      project_term_registry_json: termRegistryJson,
      project_edges_json: edgesJson,
    };
  };

  if (orderedNodes.length === 0) {
    return [buildRow(null)];
  }

  return orderedNodes.map((node) => buildRow(node));
};
