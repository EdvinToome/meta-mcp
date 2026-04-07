import fs from "fs";
import path from "path";

const COPY_SECTION_KEYS = ["brand", "voice", "audiences", "offers", "claims"];
const COPY_SECTION_KEY_SET = new Set(COPY_SECTION_KEYS);

export const DEFAULT_BRAND_DNA_COPY = `brand:
  name: ""
  category: ""
voice: []
audiences: []
offers: []
claims:
  allowed: []
  forbidden: []
`;

export const DEFAULT_BRAND_DNA_VISUAL = `visual:
  colors: []
  imagery: []
  style_notes: []
`;

function parseTopLevelSections(yamlSource) {
  const sections = new Map();
  const lines = yamlSource.replace(/\r/g, "").split("\n");
  let activeKey = "";
  let activeLines = [];

  const flush = () => {
    if (!activeKey) {
      return;
    }
    const content = activeLines.join("\n").trimEnd();
    if (content) {
      sections.set(activeKey, content);
    }
  };

  for (const line of lines) {
    const keyMatch = line.match(/^([A-Za-z0-9_-]+):.*$/);
    if (!keyMatch) {
      if (activeKey) {
        activeLines.push(line);
      }
      continue;
    }

    flush();
    activeKey = keyMatch[1];
    activeLines = [line];
  }

  flush();
  return sections;
}

function renderSectionsInOrder(keys, sectionMap) {
  const blocks = [];
  for (const key of keys) {
    const section = sectionMap.get(key);
    if (section) {
      blocks.push(section);
    }
  }
  return blocks.length > 0 ? `${blocks.join("\n")}\n` : "";
}

function writeIfMissing(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (fs.existsSync(filePath)) {
    return false;
  }
  fs.writeFileSync(filePath, content);
  return true;
}

export function ensureSplitBrandDnaFiles(rootDir) {
  const legacyPath = path.join(rootDir, "brand_dna.yaml");
  const copyPath = path.join(rootDir, "brand_dna_copy.yaml");
  const visualPath = path.join(rootDir, "brand_dna_visual.yaml");

  let migratedCopyFromLegacy = false;
  let migratedVisualFromLegacy = false;

  if (fs.existsSync(legacyPath)) {
    const legacySource = fs.readFileSync(legacyPath, "utf8").trim();
    if (legacySource) {
      const sections = parseTopLevelSections(legacySource);
      const copySource = renderSectionsInOrder(COPY_SECTION_KEYS, sections);
      const visualKeys = [...sections.keys()].filter(
        (key) => !COPY_SECTION_KEY_SET.has(key)
      );
      const visualSource = renderSectionsInOrder(visualKeys, sections);

      if (!fs.existsSync(copyPath) && copySource) {
        fs.writeFileSync(copyPath, copySource);
        migratedCopyFromLegacy = true;
      }
      if (!fs.existsSync(visualPath) && visualSource) {
        fs.writeFileSync(visualPath, visualSource);
        migratedVisualFromLegacy = true;
      }
    }
  }

  const copyCreated = writeIfMissing(copyPath, DEFAULT_BRAND_DNA_COPY);
  const visualCreated = writeIfMissing(visualPath, DEFAULT_BRAND_DNA_VISUAL);

  return {
    copyPath,
    visualPath,
    copyCreated,
    visualCreated,
    migratedCopyFromLegacy,
    migratedVisualFromLegacy,
  };
}
