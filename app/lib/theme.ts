// app/lib/theme.ts
// Centralized design tokens — every visual value in the app references this file.
// To change the look and feel, edit values here. Components never hardcode visuals.
//
// RULES FOR CONTRIBUTORS:
// - Every property must be a FINAL CSS-ready value (string or number).
// - Components assign theme values directly: style={{ border: theme.modal.border }}
// - Components NEVER compose or concatenate theme values.
// - To change border width globally, edit the defaultBorder width parameter below.
// - To go flat, set all radius values to 0.
// - To remove shadows, set all shadow values to "none".

// ── Primitives (internal only — components reference semantic tokens, not these) ──

const primitives = {
  slate950: "#0f172a",
  slate900: "#1e293b",
  slate800: "#1e3a8a",
  slate700: "#334155",
  slate600: "#475569",
  slate500: "#64748b",
  slate400: "#94a3b8",
  slate300: "#cbd5e1",
  slate200: "#e2e8f0",
  slate100: "#f1f5f9",
  slate50: "#f8fafc",

  blue900: "#1e3a8a",
  blue800: "#1e40af",
  blue700: "#1d4ed8",
  blue600: "#2563eb",
  blue500: "#3b82f6",
  blue400: "#60a5fa",
  blue300: "#93c5fd",
  blue200: "#bfdbfe",
  blue100: "#dbeafe",
  blue50: "#eff6ff",

  zinc700: "#3f3f46",
  zinc600: "#52525b",
  zinc500: "#71717a",
  zinc400: "#a1a1aa",
  zinc300: "#d4d4d8",
  zinc200: "#e4e4e7",
  zinc100: "#f4f4f5",

  red900: "#7f1d1d",
  red800: "#991b1b",
  red700: "#b91c1c",
  red500: "#ef4444",
  red300: "#fca5a5",
  red200: "#fecaca",
  red100: "#fee2e2",
  red50: "#fef2f2",

  amber900: "#78350f",
  amber800: "#92400e",
  amber700: "#b45309",
  amber600: "#d97706",
  amber500: "#f59e0b",
  amber200: "#fde68a",
  amber100: "#fef3c7",
  amber50: "#fffbeb",

  indigo900: "#312e81",
  indigo800: "#3730a3",
  indigo700: "#4338ca",
  indigo600: "#4f46e5",
  indigo500: "#6366f1",
  indigo400: "#818cf8",
  indigo200: "#c7d2fe",
  indigo100: "#e0e7ff",
  indigo50: "#eef2ff",

  violet900: "#4c1d95",
  violet700: "#7c3aed",
  violet600: "#a855f7",
  violet100: "#f5f3ff",
  violet50: "#faf5ff",

  green900: "#14532d",
  green200: "#bbf7d0",
  green50: "#f0fdf4",

  orange800: "#9a3412",
  orange50: "#fff7ed",

  white: "#ffffff",
  black: "#000000",
} as const;

// ── Internal helpers (not exported — used to compose final values) ──

const border = (color: string, width = "1px", style = "solid") =>
  `${width} ${style} ${color}`;

const border2 = (color: string) => border(color, "2px");

const borderDashed = (color: string) => border(color, "1px", "dashed");

// ── Radii (internal — assigned to section properties below) ──

const radii = {
  none: 0,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 10,
  xxl: 12,
  pill: 999,
} as const;

// ── Shadows (internal — assigned to section properties below) ──

const shadows = {
  none: "none",
  sm: "0 1px 3px rgba(0,0,0,0.08)",
  md: "0 2px 8px rgba(0,0,0,0.12)",
  lg: "0 8px 20px rgba(15,23,42,0.05)",
  xl: "0 22px 45px rgba(15,23,42,0.24)",
} as const;

// ── Shared weights (internal — assigned to section properties below) ──

const weights = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  black: 900,
} as const;

// ── Shared font sizes (internal — assigned to section properties below) ──

const fontSizes = {
  xs: 8,
  sm: 9,
  caption: 10,
  body: 11,
  label: 12,
  subheading: 13,
  heading: 14,
  sectionTitle: 16,
  modalTitle: 18,
  hero: 46,
} as const;

// ── Shared opacity (internal — assigned to section properties below) ──

const opacities = {
  disabled: 0.5,
  muted: 0.55,
  subtle: 0.35,
  dimmed: 0.45,
  full: 1,
} as const;

// ══════════════════════════════════════════════════════════════════
// THEME — every value below is a final, CSS-ready value.
// Components assign directly: style={{ border: theme.modal.border }}
// ══════════════════════════════════════════════════════════════════

export const theme = {
  // Primitives exposed for edge cases (dynamic user-set colors, etc.)
  primitives,
  fontSizes,

  // ── Canvas ─────────────────────────────────────────────────
  canvas: {
    bg: primitives.white,
    dropActiveOverlay: "rgba(191,219,254,0.18)",
    dropActiveBorder: "inset 0 0 0 2px rgba(37,99,235,0.42)",
  },

  // ── Node (shared across Default, VC, HC) ───────────────────
  node: {
    bg: primitives.slate100,
    border: border2(primitives.slate400),
    borderColor: primitives.slate400,
    borderSelected: border2(primitives.blue400),
    selectedBg: primitives.blue50,
    selectedShadow: "0 0 0 1px rgba(37,99,235,0.28)",
    shadow: "0 1px 4px rgba(0,0,0,0.14)",
    highlightShadow: "0 3px 10px rgba(0,0,0,0.12)",
    radius: radii.lg,
    sequenceLabel: primitives.blue700,
    sequenceLabelFontSize: fontSizes.caption,
    dropdownArrowFontSize: fontSizes.xs,
    handleBg: primitives.blue600,
    handleBorder: border2(primitives.white),
    resizeDot: primitives.slate900,
    typeBadge: {
      bg: primitives.slate50,
      border: border(primitives.slate300),
      borderColor: primitives.slate300,
      text: primitives.slate600,
      radius: radii.pill,
    },
    header: {
      bg: primitives.slate200,
      border: border(primitives.slate400),
      borderColor: primitives.slate400,
    },
    field: {
      label: primitives.slate900,
      labelWeight: weights.semibold,
      labelFontSize: fontSizes.caption,
      value: primitives.slate900,
      inputFontSize: fontSizes.body,
      placeholder: primitives.slate400,
      termType: primitives.slate500,
      termTypeIcon: primitives.slate400,
    },
    slot: {
      bg: primitives.white,
      border: border(primitives.slate300),
      borderColor: primitives.slate300,
      dropActiveBg: primitives.blue50,
      dropActiveBorder: border(primitives.blue400),
      dropActiveBorderColor: primitives.blue400,
      dropActiveShadow: "0 0 0 1px rgba(37,99,235,0.28)",
      removeDisabledOpacity: opacities.subtle,
      radius: radii.md,
    },
    popup: {
      bg: primitives.white,
      border: border(primitives.slate400),
      shadow: "0 4px 12px rgba(0,0,0,0.15)",
      radius: radii.lg,
      termBadge: {
        bg: primitives.blue50,
        border: border(primitives.blue200),
        borderColor: primitives.blue200,
        text: primitives.blue900,
        detail: primitives.slate600,
        radius: radii.md,
      },
      fieldText: primitives.slate700,
      fieldFontSize: fontSizes.caption,
      bodyFontSize: fontSizes.body,
    },
    group: {
      bg: primitives.slate200,
      border: border(primitives.slate400),
      slotCount: primitives.zinc500,
      radius: radii.md,
    },
  },

  // ── Frame ──────────────────────────────────────────────────
  frame: {
    radius: radii.xl,
    shade0: {
      border: border2(primitives.slate300),
      borderColor: primitives.slate300,
      bg: "rgba(248,250,252,0.88)",
      tabBg: primitives.slate100,
      tabText: primitives.slate600,
      tabBorder: border(primitives.slate300),
    },
    shade1: {
      border: border2(primitives.slate400),
      borderColor: primitives.slate400,
      bg: "rgba(241,245,249,0.72)",
      tabBg: primitives.slate200,
      tabText: primitives.slate700,
      tabBorder: border(primitives.slate400),
    },
    shade2: {
      border: border2(primitives.slate500),
      borderColor: primitives.slate500,
      bg: "rgba(226,232,240,0.58)",
      tabBg: primitives.slate300,
      tabText: primitives.slate900,
      tabBorder: border(primitives.slate500),
    },
    collapseBtn: {
      text: primitives.blue700,
      border: border(primitives.blue200),
      bg: "rgba(255,255,255,0.9)",
      radius: radii.pill,
      weight: weights.semibold,
    },
  },

  // ── Edge ───────────────────────────────────────────────────
  edge: {
    sequential: { stroke: primitives.blue700, selectedStroke: primitives.slate950 },
    parallel: { stroke: primitives.slate500, selectedStroke: primitives.slate700 },
    labelBg: { sequential: primitives.blue50, parallel: primitives.slate100 },
    labelBgOpacity: 0.95,
    labelWeight: weights.bold,
    labelRadius: radii.sm,
    journey: { highlight: primitives.indigo500, recalled: primitives.violet700 },
  },

  // ── Toolbar (floating, bottom center) ──────────────────────
  toolbar: {
    bg: primitives.white,
    border: border(primitives.slate300),
    shadow: shadows.md,
    radius: radii.xl,
    separator: primitives.slate200,
    dragHandle: primitives.slate400,
    dragHandleOpacity: 0.6,
    button: {
      bg: primitives.slate50,
      border: border(primitives.slate200),
      text: primitives.slate700,
      radius: radii.md,
      labelWeight: weights.semibold,
      labelFontSize: fontSizes.caption,
    },
    activeButton: {
      bg: primitives.blue100,
      text: primitives.blue700,
    },
  },

  // ── Top Bar (fixed top-left) ───────────────────────────────
  topBar: {
    bg: primitives.white,
    border: border(primitives.slate300),
    shadow: shadows.md,
    radius: radii.xl,
    separator: primitives.slate200,
    disabledOpacity: opacities.disabled,
    text: primitives.slate500,
    statusTextFontSize: fontSizes.body,
  },

  // ── Inspector Panel ────────────────────────────────────────
  inspector: {
    bg: primitives.white,
    resizeHandle: primitives.slate400,
    resizeHandleOpacity: 0.4,
    resizeHandleActiveOpacity: opacities.full,
    sectionDivider: border2(primitives.slate300),
    sectionTitle: primitives.slate900,
    sectionTitleWeight: weights.bold,
    card: {
      sectionHeaderFontSize: fontSizes.caption,
      fieldLabel: primitives.slate900,
      fieldLabelWeight: weights.semibold,
      fieldLabelFontSize: fontSizes.label,
      inputFontSize: fontSizes.body,
      emptyText: primitives.slate600,
      emptyTextFontSize: fontSizes.body,
      emptyTextAlt: primitives.slate600,
      emptyTextAltFontSize: fontSizes.subheading,
      bannerFontSize: fontSizes.body,
      blockBg: primitives.slate100,
      blockBorder: border(primitives.slate400),
      blockRadius: radii.lg,
    },
    edge: {
      titleFontSize: fontSizes.heading,
      fieldLabelFontSize: fontSizes.label,
      blockBg: primitives.slate50,
      blockBorder: border(primitives.slate400),
      blockRadius: radii.lg,
      infoText: primitives.blue900,
      infoTextFontSize: fontSizes.label,
    },
    admin: {
      filterBtn: {
        active: {
          bg: primitives.slate200,
          border: border(primitives.slate500),
          borderColor: primitives.slate500,
          text: primitives.slate950,
          weight: weights.bold,
        },
        inactive: {
          bg: primitives.slate50,
          border: border(primitives.slate300),
          borderColor: primitives.slate300,
          text: primitives.slate700,
          weight: weights.semibold,
        },
      },
    },
  },

  // ── CLP ────────────────────────────────────────────────────
  clp: {
    sectionTitleFontSize: fontSizes.body,
    registryTitleFontSize: fontSizes.subheading,
    fieldLabelFontSize: fontSizes.caption,
    bodyFontSize: fontSizes.body,
    detailFontSize: fontSizes.label,
    header: {
      bg: primitives.blue50,
      border: border(primitives.blue200),
      title: primitives.blue900,
      titleWeight: weights.bold,
      radius: radii.lg,
    },
    description: primitives.slate600,
    tab: {
      active: { bg: primitives.blue900, text: primitives.white },
      inactive: { bg: primitives.blue50, text: primitives.blue900 },
      border: border(primitives.blue200),
      borderColor: primitives.blue200,
      radius: radii.md,
      weight: weights.bold,
    },
    audit: {
      tableBg: primitives.white,
      tableBorder: border(primitives.blue200),
      headerBg: primitives.blue50,
      cellBorder: border(primitives.slate300),
      emptyText: primitives.slate500,
      fieldText: primitives.slate700,
      occurrenceBadge: {
        bg: primitives.white,
        border: border(primitives.zinc300),
        borderColor: primitives.zinc300,
        text: primitives.slate950,
        zeroOpacity: opacities.muted,
      },
      highlight: {
        border: border(primitives.amber500),
        borderColor: primitives.amber500,
        bg: primitives.amber100,
        text: primitives.amber800,
      },
      warning: {
        border: border(primitives.amber500),
        bg: primitives.orange50,
        text: primitives.orange800,
      },
      occurrenceDetail: primitives.slate500,
    },
    registry: {
      entryBg: primitives.white,
      entryDraftBg: primitives.amber50,
      entryBorder: border(primitives.slate300),
      entryBorderColor: primitives.slate200,
      entryRadius: radii.md,
      entryHighlight: {
        border: border(primitives.amber500),
        bg: primitives.amber100,
        shadow: "0 0 0 1px rgba(245,158,11,0.18) inset",
      },
      fieldLabel: primitives.slate500,
      fieldText: primitives.slate700,
      input: {
        bg: primitives.white,
        border: border(primitives.zinc300),
        text: primitives.slate700,
        radius: radii.sm,
      },
      termType: {
        text: primitives.blue900,
        fallback: primitives.slate500,
        readOnly: {
          bg: primitives.slate50,
          border: border(primitives.slate200),
          radius: radii.sm,
        },
      },
      draftBadge: {
        bg: primitives.orange50,
        border: border(primitives.amber500),
        text: primitives.amber800,
        radius: radii.pill,
        weight: weights.bold,
      },
      unassignBadge: {
        bg: primitives.white,
        border: border(primitives.red300),
        borderColor: primitives.red300,
        text: primitives.red700,
        radius: radii.pill,
      },
      assignedCard: {
        bg: primitives.blue100,
        border: border(primitives.blue300),
        borderColor: primitives.blue300,
        text: primitives.blue900,
      },
      addBtn: { bg: primitives.blue50, text: primitives.blue900, weight: weights.bold },
      filterBadge: {
        bg: primitives.blue100,
        text: primitives.blue700,
        border: border(primitives.blue300),
        borderColor: primitives.blue300,
        weight: weights.bold,
      },
    },
  },

  // ── Journey ────────────────────────────────────────────────
  journey: {
    blockBg: primitives.indigo50,
    blockBorder: border(primitives.indigo200),
    blockRadius: radii.lg,
    title: primitives.indigo800,
    titleWeight: weights.bold,
    titleFontSize: fontSizes.label,
    description: primitives.violet900,
    descriptionFontSize: fontSizes.body,
    bodyFontSize: fontSizes.body,
    btn: {
      bg: primitives.indigo50,
      border: border(primitives.indigo400),
      borderColor: primitives.indigo400,
      text: primitives.indigo800,
      weight: weights.bold,
    },
    selected: {
      bg: primitives.indigo50,
      border: border(primitives.indigo400),
      borderColor: primitives.indigo400,
      title: primitives.indigo900,
      meta: primitives.indigo700,
      radius: radii.lg,
    },
    unselectedMeta: primitives.slate500,
    openBtn: {
      bg: primitives.blue50,
      border: border(primitives.blue300),
      borderColor: primitives.blue300,
      text: primitives.blue900,
      weight: weights.bold,
    },
  },

  // ── Conversation View ──────────────────────────────────────
  cv: {
    bg: primitives.slate100,
    gridLine: "rgba(29,78,216,0.08)",
    gridBorder: border("rgba(29,78,216,0.22)"),
    shadow: "0 24px 48px rgba(15,23,42,0.22)",
    radius: radii.xxl,
    headerBg: "rgba(255,255,255,0.78)",
    headerBorder: border("rgba(29,78,216,0.2)"),
    headerTitle: primitives.slate950,
    modalTitleFontSize: fontSizes.modalTitle,
    headerMeta: primitives.slate500,
    headerMetaFontSize: fontSizes.caption,
    headerTitleFontSize: fontSizes.subheading,
    headerTitleWeight: weights.bold,
    nodeTitleFontSize: fontSizes.heading,
    fieldLabelFontSize: fontSizes.body,
    fieldValueFontSize: fontSizes.heading,
    emptyFieldFontSize: fontSizes.label,
    sequenceCircleSmFontSize: fontSizes.body,
    sequenceCircleLgFontSize: fontSizes.label,
    termBubbleFontSize: fontSizes.subheading,
    termBubbleDetailFontSize: fontSizes.label,
    orphanBadgeFontSize: fontSizes.sm,
    accent: primitives.blue700,
    node: {
      bg: primitives.white,
      border: border("rgba(29,78,216,0.15)"),
      multiTermBorder: border("rgba(29,78,216,0.25)"),
      multiTermBg: primitives.blue50,
      title: primitives.slate950,
      titleWeight: weights.bold,
      titleFontSize: fontSizes.heading,
      emptyField: primitives.slate400,
      emptyFieldFontSize: fontSizes.label,
      fieldLabel: primitives.slate500,
      fieldLabelWeight: weights.semibold,
      fieldLabelFontSize: fontSizes.body,
      fieldValue: primitives.slate950,
      fieldValueWeight: weights.semibold,
      fieldValueFontSize: fontSizes.heading,
      radius: radii.xl,
    },
    sequenceCircle: {
      bg: primitives.blue700,
      text: primitives.white,
      weight: weights.bold,
      fontSizeSmall: fontSizes.body,
      fontSizeLarge: fontSizes.label,
    },
    connector: primitives.blue700,
    connectorWidth: 2,
    termBubble: {
      bg: primitives.blue700,
      text: primitives.white,
      subtext: "rgba(255,255,255,0.6)",
      radius: radii.lg,
      weight: weights.bold,
      fontSize: fontSizes.subheading,
      detailFontSize: fontSizes.label,
    },
    sectionLabel: primitives.slate500,
    sectionLabelWeight: weights.semibold,
    orphan: {
      border: border(primitives.red200),
      borderColor: primitives.red200,
      bg: primitives.red50,
      text: primitives.red700,
      badgeFontSize: fontSizes.sm,
    },
    pageOutline: border2(primitives.blue700),
    pageOutlineColor: primitives.blue700,
  },

  // ── Dashboard ──────────────────────────────────────────────
  dashboard: {
    bg: primitives.slate50,
    emptyText: primitives.slate600,
    emptyTextFontSize: fontSizes.heading,
    card: {
      bg: primitives.white,
      border: border2(primitives.blue200),
      shadow: "0 3px 10px rgba(37,99,235,0.1)",
      radius: radii.xxl,
      title: primitives.slate900,
      titleWeight: weights.bold,
      titleFontSize: fontSizes.subheading,
      meta: primitives.slate600,
      metaFontSize: fontSizes.body,
      id: primitives.slate400,
      idFontSize: fontSizes.caption,
      deleteBtn: {
        border: border(primitives.red300),
        borderColor: primitives.red300,
        text: primitives.red700,
        bg: primitives.red50,
      },
    },
    alertBorder: border2(primitives.red500),
    heroTitle: primitives.slate900,
    heroTitleWeight: weights.black,
    heroTitleFontSize: fontSizes.hero,
    heroSubtitle: primitives.slate600,
    heroSubtitleFontSize: fontSizes.sectionTitle,
    projectFieldFontSize: fontSizes.label,
    btn: {
      primary: {
        bg: primitives.blue700,
        text: primitives.white,
        shadow: "0 4px 12px rgba(29,78,216,0.28)",
        weight: weights.bold,
      },
      secondary: {
        bg: primitives.slate50,
        border: border(primitives.slate500),
        borderColor: primitives.slate500,
        text: primitives.slate950,
        weight: weights.bold,
        radius: radii.lg,
      },
    },
    loadingBorder: borderDashed(primitives.slate400),
    loadingText: primitives.slate600,
  },

  // ── Modal (shared) ─────────────────────────────────────────
  modal: {
    overlay: "rgba(15,23,42,0.56)",
    bg: primitives.white,
    border: border(primitives.slate300),
    borderColor: primitives.slate300,
    shadow: shadows.xl,
    radius: radii.xxl,
    title: primitives.slate950,
    titleFontSize: fontSizes.modalTitle,
    sectionBg: primitives.slate50,
    sectionBorder: border(primitives.slate200),
    sectionRadius: radii.lg,
    fieldLabel: primitives.slate700,
    fieldLabelWeight: weights.bold,
    fieldLabelFontSize: fontSizes.label,
    fieldText: primitives.slate700,
    inputFontSize: fontSizes.label,
    hint: primitives.slate600,
    hintFontSize: fontSizes.label,
    requiredFontSize: fontSizes.caption,
    fileInfoFontSize: fontSizes.body,
    previewLabelFontSize: fontSizes.body,
  },

  // ── Status badges ──────────────────────────────────────────
  status: {
    error: {
      bg: primitives.red50,
      border: border(primitives.red200),
      borderColor: primitives.red200,
      text: primitives.red800,
      radius: radii.md,
    },
    success: {
      bg: primitives.green50,
      border: border(primitives.green200),
      borderColor: primitives.green200,
      text: primitives.green900,
      radius: radii.md,
    },
    info: {
      bg: primitives.blue50,
      border: border(primitives.blue200),
      borderColor: primitives.blue200,
      text: primitives.blue900,
      radius: radii.md,
    },
    warning: {
      bg: primitives.amber100,
      border: border(primitives.amber500),
      borderColor: primitives.amber500,
      text: primitives.amber800,
      radius: radii.md,
    },
  },

  // ── Buttons (shared) ──────────────────────────────────────
  button: {
    labelFontSize: fontSizes.label,
    primary: {
      bg: primitives.blue700,
      border: border(primitives.blue700),
      text: primitives.white,
      weight: weights.bold,
      shadow: "0 4px 12px rgba(29,78,216,0.28)",
      radius: radii.md,
      disabled: {
        bg: primitives.slate200,
        border: border(primitives.slate300),
        borderColor: primitives.slate300,
        text: primitives.slate500,
      },
    },
    danger: {
      border: border(primitives.red300),
      borderColor: primitives.red300,
      text: primitives.red700,
      bg: primitives.white,
    },
  },

  // ── Tables ─────────────────────────────────────────────────
  table: {
    bg: primitives.white,
    border: border(primitives.zinc300),
    borderColor: primitives.zinc300,
    cellBorder: border(primitives.zinc200),
    cellBorderColor: primitives.zinc200,
    cellFontSize: fontSizes.label,
  },

  // ── Toast ──────────────────────────────────────────────────
  toast: {
    bg: "rgba(15,23,42,0.78)",
    border: border("rgba(148,163,184,0.8)"),
    text: primitives.white,
    shadow: "0 8px 20px rgba(15,23,42,0.25)",
    radius: radii.lg,
    weight: weights.bold,
    bodyFontSize: fontSizes.caption,
  },
} as const;

export type Theme = typeof theme;