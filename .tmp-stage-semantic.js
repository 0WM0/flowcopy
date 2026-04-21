const cp = require("child_process");

function runGit(args, input) {
  const result = cp.spawnSync("git", args, {
    input,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    const error = (result.stderr || result.stdout || "git command failed").trim();
    throw new Error(`git ${args.join(" ")} failed: ${error}`);
  }

  return result.stdout;
}

function getHeadFile(path) {
  return runGit(["show", `HEAD:${path}`]);
}

function stageBlob(path, content) {
  const hash = runGit(["hash-object", "-w", "--stdin"], content).trim();
  runGit(["update-index", "--cacheinfo", `100644,${hash},${path}`]);
}

const indexPath = "app/lib/palettes/index.ts";
const zincLightPath = "app/lib/palettes/zinc-light.ts";
const zincDarkPath = "app/lib/palettes/zinc-dark.ts";
const themePath = "app/lib/theme.ts";

const indexHead = getHeadFile(indexPath);
const zincLightHead = getHeadFile(zincLightPath);
const zincDarkHead = getHeadFile(zincDarkPath);
const themeHead = getHeadFile(themePath);

const indexInsert = `  dangerPrimary: string;
  dangerSubtle: string;
  dangerHover: string;
  dangerText: string;
  warningPrimary: string;
  warningSubtle: string;
  warningHover: string;
  warningText: string;
  successPrimary: string;
  successSubtle: string;
  successHover: string;
  successText: string;
  infoPrimary: string;
  infoSubtle: string;
  infoHover: string;
  infoText: string;
`;

const zincLightInsert = `  dangerPrimary: "#DC2626",
  dangerSubtle: "#FEE2E2",
  dangerHover: "#B91C1C",
  dangerText: "#991B1B",
  warningPrimary: "#D97706",
  warningSubtle: "#FEF3C7",
  warningHover: "#B45309",
  warningText: "#92400E",
  successPrimary: "#16A34A",
  successSubtle: "#DCFCE7",
  successHover: "#15803D",
  successText: "#166534",
  infoPrimary: "#0891B2",
  infoSubtle: "#CFFAFE",
  infoHover: "#0E7490",
  infoText: "#155E75",
`;

const zincDarkInsert = `  dangerPrimary: "#F87171",
  dangerSubtle: "#7F1D1D",
  dangerHover: "#FCA5A5",
  dangerText: "#FECACA",
  warningPrimary: "#FBBF24",
  warningSubtle: "#78350F",
  warningHover: "#FCD34D",
  warningText: "#FDE68A",
  successPrimary: "#4ADE80",
  successSubtle: "#14532D",
  successHover: "#86EFAC",
  successText: "#BBF7D0",
  infoPrimary: "#22D3EE",
  infoSubtle: "#164E63",
  infoHover: "#67E8F9",
  infoText: "#A5F3FC",
`;

const themeInsert = `  danger: {
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
`;

const indexDesired = indexHead.replace(
  "  surfaceDisabled: string;\n",
  `  surfaceDisabled: string;\n${indexInsert}`,
);

const zincLightDesired = zincLightHead.replace(
  "  surfaceDisabled: \"#F4F4F5\",\n",
  `  surfaceDisabled: \"#F4F4F5\",\n${zincLightInsert}`,
);

const zincDarkDesired = zincDarkHead.replace(
  "  surfaceDisabled: \"#18181B\",\n",
  `  surfaceDisabled: \"#18181B\",\n${zincDarkInsert}`,
);

const themeDesired = themeHead.replace(
  `  interactive: {
    hover: activePalette.surfaceHover,
    pressed: activePalette.surfacePressed,
    focus: activePalette.borderFocus,
    disabled: activePalette.surfaceDisabled,
  },
`,
  `  interactive: {
    hover: activePalette.surfaceHover,
    pressed: activePalette.surfacePressed,
    focus: activePalette.borderFocus,
    disabled: activePalette.surfaceDisabled,
  },
${themeInsert}`,
);

stageBlob(indexPath, indexDesired);
stageBlob(zincLightPath, zincLightDesired);
stageBlob(zincDarkPath, zincDarkDesired);
stageBlob(themePath, themeDesired);

console.log("Staged semantic-role additions only for target files.");