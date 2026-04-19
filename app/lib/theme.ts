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

import { activePalette } from "./palettes";

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

const roles = {
  surface: {
    canvas: activePalette.canvas,
    frame: activePalette.frame,
    card: activePalette.card,
    panel: activePalette.panel,
    tier1: activePalette.tier1,
  },
  border: {
    default: activePalette.borderDefault,
    strong: activePalette.borderStrong,
  },
  text: {
    primary: activePalette.textPrimary,
    secondary: activePalette.textSecondary,
    tertiary: activePalette.textTertiary,
  },
  accent: {
    primary: activePalette.accentPrimary,
    primarySubtle: activePalette.accentSubtle,
  },
  interactive: {
    hover: activePalette.surfaceHover,
    pressed: activePalette.surfacePressed,
    focus: activePalette.borderFocus,
    disabled: activePalette.surfaceDisabled,
  },
  danger: {
    primary: activePalette.dangerPrimary,
    subtle: activePalette.dangerSubtle,
    hover: activePalette.dangerHover,
    text: activePalette.dangerText,
  },
  warning: {
    primary: activePalette.warningPrimary,
    subtle: activePalette.warningSubtle,
    hover: activePalette.warningHover,
    text: activePalette.warningText,
  },
  success: {
    primary: activePalette.successPrimary,
    subtle: activePalette.successSubtle,
    hover: activePalette.successHover,
    text: activePalette.successText,
  },
  info: {
    primary: activePalette.infoPrimary,
    subtle: activePalette.infoSubtle,
    hover: activePalette.infoHover,
    text: activePalette.infoText,
  },
  dotGrid: activePalette.dotGrid,
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
    bg: roles.surface.canvas,
    // TODO(roles): accent-alpha tint not yet in palette — value derived from accent indigo at 12% opacity
    dropActiveOverlay: "rgba(67,56,202,0.12)",
    dropActiveBorder: `inset 0 0 0 2px ${roles.accent.primary}`,
  },

  // ── Node (shared across Default, VC, HC) ───────────────────
  node: {
    bg: roles.surface.card,
    border: border2(roles.border.default),
    borderColor: roles.border.default,
    borderSelected: border2(roles.accent.primary),
    selectedBg: roles.accent.primarySubtle,
    selectedShadow: "0 0 0 1px rgba(67,56,202,0.28)",
    shadow: "0 1px 4px rgba(0,0,0,0.14)",
    highlightShadow: "0 3px 10px rgba(0,0,0,0.12)",
    radius: radii.lg,
    sequenceLabel: roles.accent.primary,
    sequenceLabelFontSize: fontSizes.caption,
    dropdownArrowFontSize: fontSizes.xs,
    handleBg: roles.accent.primary,
    handleBorder: border2(roles.surface.card),
    resizeDot: roles.text.primary,
    typeBadge: {
      bg: roles.surface.tier1,
      border: border(roles.border.default),
      borderColor: roles.border.default,
      text: roles.text.secondary,
      radius: radii.pill,
    },
    header: {
      bg: roles.surface.tier1,
      border: border(roles.border.default),
      borderColor: roles.border.default,
    },
    field: {
      label: roles.text.secondary,
      labelWeight: weights.semibold,
      labelFontSize: fontSizes.caption,
      value: roles.text.primary,
      inputFontSize: fontSizes.body,
      placeholder: roles.text.tertiary,
      termType: roles.text.tertiary,
      termTypeIcon: roles.text.tertiary,
    },
    slot: {
      bg: roles.surface.card,
      border: border(roles.border.default),
      borderColor: roles.border.default,
      dropActiveBg: roles.accent.primarySubtle,
      dropActiveBorder: border(roles.accent.primary),
      dropActiveBorderColor: roles.accent.primary,
      dropActiveShadow: "0 0 0 1px rgba(67,56,202,0.28)",
      removeDisabledOpacity: opacities.subtle,
      radius: radii.md,
    },
    popup: {
      bg: roles.surface.card,
      border: border(roles.border.default),
      shadow: "0 4px 12px rgba(0,0,0,0.15)",
      radius: radii.lg,
      termBadge: {
        bg: roles.accent.primarySubtle,
        border: border(roles.accent.primary),
        borderColor: roles.accent.primary,
        text: roles.accent.primary,
        detail: roles.text.secondary,
        radius: radii.md,
      },
      fieldText: roles.text.secondary,
      fieldFontSize: fontSizes.caption,
      bodyFontSize: fontSizes.body,
    },
    group: {
      bg: roles.surface.tier1,
      border: border(roles.border.default),
      slotCount: roles.text.tertiary,
      radius: radii.md,
    },
  },

  // ── Frame ──────────────────────────────────────────────────
  frame: {
    radius: radii.xl,
    shade0: {
      border: border2(roles.border.default),
      borderColor: roles.border.default,
      // TODO(palette): frame tint colors use raw zinc rgba values — consider alpha-variant palette keys for true palette portability
      bg: "rgba(228, 228, 231, 0.40)",
      tabBg: roles.surface.tier1,
      tabText: roles.text.secondary,
      tabBorder: border(roles.border.default),
    },
    shade1: {
      border: border2(roles.border.default),
      borderColor: roles.border.default,
      bg: "rgba(212, 212, 216, 0.55)",
      tabBg: roles.surface.frame,
      tabText: roles.text.primary,
      tabBorder: border(roles.border.default),
    },
    shade2: {
      border: border2(roles.border.strong),
      borderColor: roles.border.strong,
      bg: "rgba(161, 161, 170, 0.50)",
      tabBg: roles.surface.frame,
      tabText: roles.text.primary,
      tabBorder: border(roles.border.strong),
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
    bg: roles.surface.panel,
    border: border(roles.border.default),
    shadow: shadows.md,
    radius: radii.xl,
    separator: roles.border.default,
    dragHandle: roles.border.strong,
    dragHandleOpacity: 0.6,
    button: {
      bg: roles.surface.tier1,
      border: border(roles.border.default),
      text: roles.text.secondary,
      radius: radii.md,
      labelWeight: weights.semibold,
      labelFontSize: fontSizes.caption,
    },
    activeButton: {
      bg: roles.accent.primarySubtle,
      text: roles.accent.primary,
    },
  },

  // ── Top Bar (fixed top-left) ───────────────────────────────
  topBar: {
    bg: roles.surface.panel,
    border: border(roles.border.default),
    shadow: shadows.md,
    radius: radii.xl,
    separator: roles.border.default,
    disabledOpacity: opacities.disabled,
    text: roles.text.secondary,
    statusTextFontSize: fontSizes.body,
  },

  // ── Inspector Panel ────────────────────────────────────────
  inspector: {
    bg: roles.surface.panel,
    resizeHandle: roles.border.strong,
    resizeHandleOpacity: 0.4,
    resizeHandleActiveOpacity: opacities.full,
    sectionDivider: border2(roles.border.default),
    sectionTitle: roles.text.primary,
    sectionTitleWeight: weights.bold,
    card: {
      sectionHeaderFontSize: fontSizes.caption,
      fieldLabel: roles.text.primary,
      fieldLabelWeight: weights.semibold,
      fieldLabelFontSize: fontSizes.label,
      inputFontSize: fontSizes.body,
      emptyText: roles.text.secondary,
      emptyTextFontSize: fontSizes.body,
      emptyTextAlt: roles.text.secondary,
      emptyTextAltFontSize: fontSizes.subheading,
      bannerFontSize: fontSizes.body,
      blockBg: roles.surface.tier1,
      blockBorder: border(roles.border.default),
      blockRadius: radii.lg,
    },
    edge: {
      titleFontSize: fontSizes.heading,
      fieldLabelFontSize: fontSizes.label,
      blockBg: roles.surface.tier1,
      blockBorder: border(roles.border.default),
      blockRadius: radii.lg,
      infoText: roles.accent.primary,
      infoTextFontSize: fontSizes.label,
    },
    admin: {
      filterBtn: {
        active: {
          bg: roles.interactive.pressed,
          border: border(roles.border.strong),
          borderColor: roles.border.strong,
          text: roles.text.primary,
          weight: weights.bold,
        },
        inactive: {
          bg: roles.surface.tier1,
          border: border(roles.border.default),
          borderColor: roles.border.default,
          text: roles.text.secondary,
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
      bg: roles.surface.tier1,
      border: border(roles.border.default),
      title: roles.accent.primary,
      titleWeight: weights.bold,
      radius: radii.lg,
    },
    description: roles.text.secondary,
    tab: {
      active: {
        bg: roles.accent.primary,
        // TODO(roles): accent-on-accent text not in palette
        text: roles.surface.card,
      },
      inactive: { bg: roles.surface.tier1, text: roles.accent.primary },
      border: border(roles.border.default),
      borderColor: roles.border.default,
      radius: radii.md,
      weight: weights.bold,
    },
    audit: {
      tableBg: roles.surface.card,
      tableBorder: border(roles.border.default),
      headerBg: roles.surface.tier1,
      cellBorder: border(roles.border.default),
      emptyText: roles.text.tertiary,
      fieldText: roles.text.secondary,
      occurrenceBadge: {
        bg: roles.surface.card,
        border: border(roles.border.default),
        borderColor: roles.border.default,
        text: roles.text.primary,
        zeroOpacity: opacities.muted,
      },
      highlight: {
        border: border(roles.warning.primary),
        borderColor: roles.warning.primary,
        bg: roles.warning.subtle,
        text: roles.warning.text,
      },
      warning: {
        border: border(roles.warning.primary),
        bg: roles.warning.subtle,
        text: roles.warning.text,
      },
      occurrenceDetail: roles.text.tertiary,
    },
    registry: {
      entryBg: roles.surface.card,
      entryDraftBg: roles.warning.subtle,
      entryBorder: border(roles.border.default),
      entryBorderColor: roles.border.default,
      entryRadius: radii.md,
      entryHighlight: {
        border: border(roles.warning.primary),
        bg: roles.warning.subtle,
        shadow: "0 0 0 1px rgba(245,158,11,0.18) inset",
      },
      fieldLabel: roles.text.tertiary,
      fieldText: roles.text.secondary,
      input: {
        bg: roles.surface.card,
        border: border(roles.border.default),
        text: roles.text.secondary,
        radius: radii.sm,
      },
      termType: {
        text: roles.accent.primary,
        fallback: roles.text.tertiary,
        readOnly: {
          bg: roles.surface.tier1,
          border: border(roles.border.default),
          radius: radii.sm,
        },
      },
      draftBadge: {
        bg: roles.warning.subtle,
        border: border(roles.warning.primary),
        text: roles.warning.text,
        radius: radii.pill,
        weight: weights.bold,
      },
      unassignBadge: {
        bg: roles.surface.card,
        border: border(primitives.red300),
        borderColor: primitives.red300,
        text: primitives.red700,
        radius: radii.pill,
      },
      assignedCard: {
        bg: roles.accent.primarySubtle,
        border: border(roles.accent.primary),
        borderColor: roles.accent.primary,
        text: roles.accent.primary,
      },
      addBtn: {
        bg: roles.accent.primarySubtle,
        text: roles.accent.primary,
        weight: weights.bold,
      },
      filterBadge: {
        bg: roles.accent.primarySubtle,
        text: roles.accent.primary,
        border: border(roles.accent.primary),
        borderColor: roles.accent.primary,
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
    bg: roles.surface.canvas,
    emptyText: roles.text.secondary,
    emptyTextFontSize: fontSizes.heading,
    card: {
      bg: roles.surface.card,
      border: border2(roles.border.default),
      // TODO(roles): accent-alpha shadow not yet in palette
      shadow: "0 3px 10px rgba(67,56,202,0.10)",
      radius: radii.xxl,
      title: roles.text.primary,
      titleWeight: weights.bold,
      titleFontSize: fontSizes.subheading,
      meta: roles.text.secondary,
      metaFontSize: fontSizes.body,
      id: roles.text.tertiary,
      idFontSize: fontSizes.caption,
      deleteBtn: {
        border: border(roles.danger.primary),
        borderColor: roles.danger.primary,
        text: roles.danger.text,
        bg: roles.danger.subtle,
      },
    },
    alertBorder: border2(roles.danger.primary),
    heroTitle: roles.text.primary,
    heroTitleWeight: weights.black,
    heroTitleFontSize: fontSizes.hero,
    heroSubtitle: roles.text.secondary,
    heroSubtitleFontSize: fontSizes.sectionTitle,
    projectFieldFontSize: fontSizes.label,
    btn: {
      primary: {
        bg: roles.accent.primary,
        text: roles.surface.card,
        // TODO(roles): accent-alpha shadow not yet in palette
        shadow: "0 4px 12px rgba(67,56,202,0.28)",
        weight: weights.bold,
      },
      secondary: {
        bg: roles.surface.tier1,
        border: border(roles.border.strong),
        borderColor: roles.border.strong,
        text: roles.text.primary,
        weight: weights.bold,
        radius: radii.lg,
      },
    },
    loadingBorder: borderDashed(roles.border.default),
    loadingText: roles.text.secondary,
  },

  // ── Modal (shared) ─────────────────────────────────────────
  modal: {
    overlay: "rgba(15,23,42,0.56)",
    bg: roles.surface.panel,
    border: border(roles.border.default),
    borderColor: roles.border.default,
    shadow: shadows.xl,
    radius: radii.xxl,
    title: roles.text.primary,
    titleFontSize: fontSizes.modalTitle,
    sectionBg: roles.surface.tier1,
    sectionBorder: border(roles.border.default),
    sectionRadius: radii.lg,
    fieldLabel: roles.text.secondary,
    fieldLabelWeight: weights.bold,
    fieldLabelFontSize: fontSizes.label,
    fieldText: roles.text.secondary,
    inputFontSize: fontSizes.label,
    hint: roles.text.secondary,
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

export { roles };

export type Theme = typeof theme;