import type {
  FlowNode,
  FlowEdge,
  FlowOrderingResult,
  AppStore,
  AccountRecord,
  ProjectRecord,
  GlobalOptionConfig,
  ControlledLanguageGlossaryEntry,
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

export const normalizeMultilineText = (value: string): string =>
  value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

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
      body_text: node?.data.body_text ?? "",
      primary_cta: node?.data.primary_cta ?? "",
      secondary_cta: node?.data.secondary_cta ?? "",
      helper_text: node?.data.helper_text ?? "",
      error_text: node?.data.error_text ?? "",
      display_term_field: node?.data.display_term_field ?? "",
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
      menu_config_json: node ? JSON.stringify(node.data.menu_config) : "",
      frame_config_json: node ? JSON.stringify(node.data.frame_config) : "",
      project_admin_options_json: adminOptionsJson,
      project_controlled_language_json: controlledLanguageJson,
      project_edges_json: edgesJson,
    };
  };

  if (orderedNodes.length === 0) {
    return [buildRow(null)];
  }

  return orderedNodes.map((node) => buildRow(node));
};
