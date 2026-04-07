import fs from "fs";
import path from "path";

const COPY_SECTION_KEYS = ["brand", "voice", "audiences", "offers", "claims"];
const COPY_SECTION_KEY_SET = new Set(COPY_SECTION_KEYS);
const NESTED_COPY_SECTION_KEYS = ["shared_identity"];
const NESTED_COPY_SECTION_KEY_SET = new Set(NESTED_COPY_SECTION_KEYS);

export const DEFAULT_BRAND_DNA_COPY = `brand_dna:
  shared_identity:
    positioning: ""
    voice_adjectives: []
    voice_rules: []
    mission: ""
    differentiation: []
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

function parseNestedSections(parentBlock, indentSize = 2) {
  const nested = new Map();
  const lines = parentBlock.replace(/\r/g, "").split("\n");
  const childIndent = " ".repeat(indentSize);
  let activeKey = "";
  let activeLines = [];

  const flush = () => {
    if (!activeKey) {
      return;
    }
    const content = activeLines.join("\n").trimEnd();
    if (content) {
      nested.set(activeKey, content);
    }
  };

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    const keyMatch = line.match(new RegExp(`^${childIndent}([A-Za-z0-9_-]+):.*$`));
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
  return nested;
}

function renderNestedBrandDnaSection(keys, nestedSectionMap) {
  const body = renderSectionsInOrder(keys, nestedSectionMap).trimEnd();
  if (!body) {
    return "";
  }
  return `brand_dna:\n${body}\n`;
}

function splitLegacyBrandDna(legacySource) {
  const sections = parseTopLevelSections(legacySource);
  const brandDnaSection = sections.get("brand_dna");

  if (brandDnaSection) {
    const nestedSections = parseNestedSections(brandDnaSection);
    const nestedCopySource = renderNestedBrandDnaSection(
      NESTED_COPY_SECTION_KEYS,
      nestedSections
    );
    const nestedVisualKeys = [...nestedSections.keys()].filter(
      (key) => !NESTED_COPY_SECTION_KEY_SET.has(key)
    );
    const nestedVisualBrandDna = renderNestedBrandDnaSection(
      nestedVisualKeys,
      nestedSections
    );

    const visualTopLevelKeys = [...sections.keys()].filter((key) => key !== "brand_dna");
    const visualTopLevelSource = renderSectionsInOrder(visualTopLevelKeys, sections);
    return {
      copySource: nestedCopySource,
      visualSource: `${nestedVisualBrandDna}${visualTopLevelSource}`,
    };
  }

  const copySource = renderSectionsInOrder(COPY_SECTION_KEYS, sections);
  const visualKeys = [...sections.keys()].filter(
    (key) => !COPY_SECTION_KEY_SET.has(key)
  );
  const visualSource = renderSectionsInOrder(visualKeys, sections);
  return { copySource, visualSource };
}

function writeIfMissing(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (fs.existsSync(filePath)) {
    return false;
  }
  fs.writeFileSync(filePath, content);
  return true;
}

export function ensureBrandDnaFiles(rootDir) {
  const copyPath = path.join(rootDir, "brand_dna_copy.yaml");
  const visualPath = path.join(rootDir, "brand_dna_visual.yaml");
  const copyCreated = writeIfMissing(copyPath, DEFAULT_BRAND_DNA_COPY);
  const visualCreated = writeIfMissing(visualPath, DEFAULT_BRAND_DNA_VISUAL);

  return {
    copyPath,
    visualPath,
    copyCreated,
    visualCreated,
  };
}

export function migrateLegacyBrandDnaIfPresent(rootDir) {
  const legacyPath = path.join(rootDir, "brand_dna.yaml");
  const copyPath = path.join(rootDir, "brand_dna_copy.yaml");
  const visualPath = path.join(rootDir, "brand_dna_visual.yaml");

  if (!fs.existsSync(legacyPath)) {
    return {
      ranMigration: false,
      deletedLegacy: false,
      migratedCopyFromLegacy: false,
      migratedVisualFromLegacy: false,
    };
  }

  let migratedCopyFromLegacy = false;
  let migratedVisualFromLegacy = false;

  const legacySource = fs.readFileSync(legacyPath, "utf8").trim();
  if (legacySource) {
    const { copySource, visualSource } = splitLegacyBrandDna(legacySource);

    if (!fs.existsSync(copyPath) && copySource) {
      fs.writeFileSync(copyPath, copySource);
      migratedCopyFromLegacy = true;
    }
    if (!fs.existsSync(visualPath) && visualSource) {
      fs.writeFileSync(visualPath, visualSource);
      migratedVisualFromLegacy = true;
    }
  }
  fs.unlinkSync(legacyPath);

  return {
    ranMigration: true,
    deletedLegacy: true,
    migratedCopyFromLegacy,
    migratedVisualFromLegacy,
  };
}
