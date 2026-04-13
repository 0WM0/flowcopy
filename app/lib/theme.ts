// app/lib/theme.ts
// Centralized design tokens — every visual value in the app references this file.
// To change the look and feel, edit values here. Components never hardcode colors.

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

export const theme = {
  primitives,

  // ── Surface (flat/elevated knobs) ──────────────────────────
  surface: {
    shadow: {
      none: "none",
      sm: "0 1px 3px rgba(0,0,0,0.08)",
      md: "0 2px 8px rgba(0,0,0,0.12)",
      lg: "0 8px 20px rgba(15,23,42,0.05)",
      xl: "0 22px 45px rgba(15,23,42,0.24)",
    },
    radius: { sm: 4, md: 6, lg: 8, xl: 10, xxl: 12, pill: 999 },
    borderWidth: "1px",
  },

  // ── Canvas ─────────────────────────────────────────────────
  canvas: {
    bg: primitives.white,
    dropActiveOverlay: "rgba(191,219,254,0.18)",
    dropActiveBorder: "rgba(37,99,235,0.42)",
  },

  // ── Node (shared across Default, VC, HC) ───────────────────
  node: {
    bg: primitives.slate100,
    border: primitives.slate400,
    borderSelected: primitives.blue400,
    selectedBg: primitives.blue50,
    selectedShadow: "0 0 0 1px rgba(37,99,235,0.28)",
    shadow: "0 1px 3px rgba(0,0,0,0.08)",
    highlightShadow: "0 3px 10px rgba(0,0,0,0.12)",
    sequenceLabel: primitives.blue700,
    handleBg: primitives.blue600,
    handleBorder: primitives.white,
    resizeDot: primitives.slate900,
    typeBadge: {
      bg: primitives.slate50,
      border: primitives.slate300,
      text: primitives.slate600,
    },
    header: {
      bg: primitives.slate200,
      border: primitives.slate400,
    },
    field: {
      label: primitives.slate700,
      labelWeight: 600,
      value: primitives.slate900,
      placeholder: primitives.slate400,
      termType: primitives.slate500,
      termTypeIcon: primitives.slate400,
    },
    slot: {
      bg: primitives.white,
      border: primitives.slate300,
      dropActiveBg: primitives.blue50,
      dropActiveBorder: primitives.blue400,
      dropActiveShadow: "0 0 0 1px rgba(37,99,235,0.28)",
      removeDisabledOpacity: 0.35,
    },
    popup: {
      bg: primitives.white,
      border: primitives.slate400,
      shadow: "0 4px 12px rgba(0,0,0,0.15)",
      termBadge: {
        bg: primitives.blue50,
        border: primitives.blue200,
        text: primitives.blue900,
        detail: primitives.slate600,
      },
      fieldText: primitives.slate700,
    },
    group: {
      bg: primitives.slate100,
      border: primitives.slate300,
      slotCount: primitives.zinc500,
    },
  },

  // ── Frame ──────────────────────────────────────────────────
  frame: {
    shade0: {
      border: primitives.slate300,
      bg: "rgba(248,250,252,0.88)",
      tabBg: primitives.slate100,
      tabText: primitives.slate600,
    },
    shade1: {
      border: primitives.slate400,
      bg: "rgba(241,245,249,0.72)",
      tabBg: primitives.slate200,
      tabText: primitives.slate700,
    },
    shade2: {
      border: primitives.slate500,
      bg: "rgba(226,232,240,0.58)",
      tabBg: primitives.slate300,
      tabText: primitives.slate900,
    },
    collapseBtn: {
      text: primitives.blue700,
      border: primitives.blue200,
      bg: "rgba(255,255,255,0.9)",
    },
  },

  // ── Edge ───────────────────────────────────────────────────
  edge: {
    sequential: { stroke: primitives.blue700, selectedStroke: primitives.slate950 },
    parallel: { stroke: primitives.slate500, selectedStroke: primitives.slate700 },
    labelBg: { sequential: primitives.blue50, parallel: primitives.slate100 },
    labelBgOpacity: 0.95,
    journey: { highlight: primitives.indigo500, recalled: primitives.violet700 },
  },

  // ── Toolbar (floating, bottom center) ──────────────────────
  toolbar: {
    bg: primitives.white,
    border: primitives.slate300,
    shadow: "0 2px 8px rgba(0,0,0,0.12)",
    separator: primitives.slate200,
    dragHandle: primitives.slate400,
    dragHandleOpacity: 0.6,
    button: {
      bg: primitives.slate50,
      border: primitives.slate200,
      text: primitives.slate700,
    },
    activeButton: {
      bg: primitives.blue100,
      text: primitives.blue700,
    },
    label: { text: primitives.slate700, weight: 600 },
  },

  // ── Top Bar (fixed top-left) ───────────────────────────────
  topBar: {
    bg: primitives.white,
    border: primitives.slate300,
    shadow: "0 2px 8px rgba(0,0,0,0.12)",
    separator: primitives.slate200,
    disabledOpacity: 0.5,
    text: primitives.slate500,
  },

  // ── Inspector Panel ────────────────────────────────────────
  inspector: {
    bg: primitives.white,
    resizeHandle: primitives.slate400,
    resizeHandleOpacity: 0.4,
    resizeHandleActiveOpacity: 1,
    sectionDivider: primitives.slate300,
    sectionDividerWidth: "2px",
    sectionTitle: primitives.slate500,
    sectionTitleWeight: 700,
    card: {
      fieldLabel: primitives.slate700,
      fieldLabelWeight: 600,
      emptyText: primitives.slate500,
      emptyTextAlt: primitives.zinc500,
      blockBg: primitives.slate50,
      blockBorder: primitives.slate300,
    },
    edge: {
      blockBg: primitives.slate50,
      blockBorder: primitives.slate300,
      infoText: primitives.blue900,
    },
    admin: {
      filterBtn: {
        active: {
          bg: primitives.slate200,
          border: primitives.slate500,
          text: primitives.slate950,
          weight: 700,
        },
        inactive: {
          bg: primitives.slate50,
          border: primitives.slate300,
          text: primitives.slate700,
          weight: 600,
        },
      },
    },
  },

  // ── CLP ────────────────────────────────────────────────────
  clp: {
    header: {
      bg: primitives.blue50,
      border: primitives.blue200,
      title: primitives.blue900,
      titleWeight: 700,
    },
    description: primitives.slate600,
    tab: {
      active: { bg: primitives.blue900, text: primitives.white },
      inactive: { bg: primitives.blue50, text: primitives.blue900 },
      border: primitives.blue200,
    },
    audit: {
      tableBg: primitives.white,
      tableBorder: primitives.blue100,
      headerBg: primitives.blue50,
      cellBorder: primitives.slate200,
      emptyText: primitives.slate500,
      fieldText: primitives.slate700,
      occurrenceBadge: {
        bg: primitives.white,
        border: primitives.zinc300,
        text: primitives.slate950,
        zeroOpacity: 0.55,
      },
      highlight: {
        border: primitives.amber500,
        bg: primitives.amber100,
        text: primitives.amber800,
      },
      warning: {
        border: primitives.amber500,
        bg: primitives.orange50,
        text: primitives.orange800,
      },
      occurrenceDetail: primitives.slate500,
    },
    registry: {
      entryBg: primitives.white,
      entryDraftBg: primitives.amber50,
      entryBorder: primitives.slate200,
      entryHighlight: {
        border: primitives.amber500,
        bg: primitives.amber100,
        shadow: "0 0 0 1px rgba(245,158,11,0.18) inset",
      },
      fieldLabel: primitives.slate500,
      fieldText: primitives.slate700,
      input: {
        bg: primitives.white,
        border: primitives.zinc300,
        text: primitives.slate700,
      },
      termType: {
        text: primitives.blue900,
        fallback: primitives.slate500,
        readOnly: {
          bg: primitives.slate50,
          border: primitives.slate200,
        },
      },
      draftBadge: {
        bg: primitives.orange50,
        border: primitives.amber500,
        text: primitives.amber800,
      },
      unassignBadge: {
        bg: primitives.white,
        border: primitives.red300,
        text: primitives.red700,
      },
      assignedCard: {
        bg: primitives.blue100,
        border: primitives.blue300,
        text: primitives.blue900,
      },
      addBtn: { bg: primitives.blue50, text: primitives.blue900 },
      filterBadge: {
        bg: primitives.blue100,
        text: primitives.blue700,
        border: primitives.blue300,
      },
    },
  },

  // ── Journey ────────────────────────────────────────────────
  journey: {
    blockBg: primitives.indigo50,
    blockBorder: primitives.indigo200,
    title: primitives.indigo800,
    titleWeight: 700,
    description: primitives.violet900,
    btn: {
      bg: primitives.indigo50,
      border: primitives.indigo400,
      text: primitives.indigo800,
    },
    selected: {
      bg: primitives.indigo50,
      border: primitives.indigo400,
      title: primitives.indigo900,
      meta: primitives.indigo700,
    },
    unselectedMeta: primitives.slate500,
    openBtn: {
      bg: primitives.blue50,
      border: primitives.blue300,
      text: primitives.blue900,
    },
  },

  // ── Conversation View ──────────────────────────────────────
  cv: {
    bg: primitives.slate100,
    gridLine: "rgba(29,78,216,0.08)",
    gridBorder: "rgba(29,78,216,0.22)",
    shadow: "0 24px 48px rgba(15,23,42,0.22)",
    headerBg: "rgba(255,255,255,0.78)",
    headerBorder: "rgba(29,78,216,0.2)",
    headerTitle: primitives.slate950,
    headerMeta: primitives.slate500,
    accent: primitives.blue700,
    node: {
      bg: primitives.white,
      border: "rgba(29,78,216,0.15)",
      multiTermBorder: "rgba(29,78,216,0.25)",
      multiTermBg: primitives.blue50,
      title: primitives.slate950,
      emptyField: primitives.slate400,
      fieldLabel: primitives.slate500,
      fieldValue: primitives.slate950,
    },
    sequenceCircle: { bg: primitives.blue700, text: primitives.white },
    connector: primitives.blue700,
    termBubble: {
      bg: primitives.blue700,
      text: primitives.white,
      subtext: "rgba(255,255,255,0.6)",
    },
    sectionLabel: primitives.slate500,
    orphan: {
      border: primitives.red200,
      bg: primitives.red50,
      text: primitives.red700,
    },
    pageOutline: primitives.blue700,
  },

  // ── Dashboard ──────────────────────────────────────────────
  dashboard: {
    bg: primitives.slate50,
    emptyText: primitives.slate600,
    card: {
      bg: primitives.white,
      border: primitives.blue200,
      shadow: "0 3px 10px rgba(37,99,235,0.1)",
      title: primitives.slate900,
      meta: primitives.slate600,
      id: primitives.slate400,
      deleteBtn: {
        border: primitives.red300,
        text: primitives.red700,
        bg: primitives.red50,
      },
    },
    heroTitle: primitives.slate900,
    heroTitleWeight: 900,
    heroSubtitle: primitives.slate600,
    btn: {
      primary: {
        bg: primitives.blue700,
        text: primitives.white,
        shadow: "0 4px 12px rgba(29,78,216,0.28)",
      },
      secondary: {
        bg: primitives.slate50,
        border: primitives.slate500,
        text: primitives.slate950,
      },
    },
  },

  // ── Modal (shared) ─────────────────────────────────────────
  modal: {
    overlay: "rgba(15,23,42,0.56)",
    bg: primitives.white,
    border: primitives.slate300,
    shadow: "0 22px 45px rgba(15,23,42,0.24)",
    title: primitives.slate950,
    sectionBg: primitives.slate50,
    sectionBorder: primitives.slate200,
    fieldLabel: primitives.slate700,
    fieldLabelWeight: 700,
    fieldText: primitives.slate700,
    hint: primitives.slate600,
  },

  // ── Status badges ──────────────────────────────────────────
  status: {
    error: { bg: primitives.red50, border: primitives.red200, text: primitives.red800 },
    success: { bg: primitives.green50, border: primitives.green200, text: primitives.green900 },
    info: { bg: primitives.blue50, border: primitives.blue200, text: primitives.blue900 },
    warning: { bg: primitives.amber100, border: primitives.amber500, text: primitives.amber800 },
  },

  // ── Buttons (shared) ──────────────────────────────────────
  button: {
    primary: {
      bg: primitives.blue700,
      text: primitives.white,
      weight: 700,
      shadow: "0 4px 12px rgba(29,78,216,0.28)",
      disabled: {
        bg: primitives.slate200,
        border: primitives.slate300,
        text: primitives.slate500,
      },
    },
    danger: {
      border: primitives.red300,
      text: primitives.red700,
      bg: primitives.white,
    },
  },

  // ── Tables ─────────────────────────────────────────────────
  table: {
    bg: primitives.white,
    border: primitives.zinc300,
    cellBorder: primitives.zinc200,
  },

  // ── Toast ──────────────────────────────────────────────────
  toast: {
    bg: "rgba(15,23,42,0.78)",
    border: "rgba(148,163,184,0.8)",
    text: primitives.white,
    shadow: "0 8px 20px rgba(15,23,42,0.25)",
  },
} as const;

export type Theme = typeof theme;