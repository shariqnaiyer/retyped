import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

let errors = 0;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  errors++;
}

function pass(msg) {
  console.log(`OK:   ${msg}`);
}

// 1. manifest.json is valid JSON with required fields
const manifestPath = join(root, "manifest.json");
let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
  pass("manifest.json is valid JSON");
} catch (e) {
  fail(`manifest.json is not valid JSON: ${e.message}`);
  process.exit(1);
}

for (const field of [
  "manifest_version",
  "name",
  "version",
  "permissions",
  "action",
  "background",
]) {
  if (manifest[field]) {
    pass(`manifest.json has "${field}"`);
  } else {
    fail(`manifest.json missing "${field}"`);
  }
}

// 2. All files referenced in manifest exist
const filesToCheck = [
  manifest.background?.service_worker,
  manifest.action?.default_popup,
  ...Object.values(manifest.action?.default_icon || {}),
  ...Object.values(manifest.icons || {}),
];

for (const file of filesToCheck) {
  if (!file) continue;
  const fullPath = join(root, file);
  if (existsSync(fullPath)) {
    pass(`referenced file exists: ${file}`);
  } else {
    fail(`referenced file missing: ${file}`);
  }
}

// 3. Bundled font files referenced in content.js exist
const contentJs = readFileSync(join(root, "content.js"), "utf-8");
const fontPathMatches = contentJs.matchAll(/"(fonts\/[^"]+)"/g);
for (const match of fontPathMatches) {
  const fontFile = match[1];
  const fullPath = join(root, fontFile);
  if (existsSync(fullPath)) {
    pass(`bundled font exists: ${fontFile}`);
  } else {
    fail(`bundled font missing: ${fontFile}`);
  }
}

// 4. Bundled font lists are in sync across files
const bgJs = readFileSync(join(root, "background.js"), "utf-8");
const popupJs = readFileSync(join(root, "popup", "popup.js"), "utf-8");

function extractArray(src) {
  const match = src.match(/BUNDLED_FONTS\s*=\s*\[([^\]]+)\]/);
  if (!match) return null;
  return match[1].match(/"([^"]+)"/g)?.map((s) => s.replace(/"/g, "")) || [];
}

function extractObjectKeys(src) {
  const match = src.match(/BUNDLED_FONTS\s*=\s*\{([^}]+)\}/s);
  if (!match) return null;
  return (
    match[1].match(/(?:"([^"]+)"|(\w+))\s*:/g)?.map((s) => {
      const quoted = s.match(/"([^"]+)"/);
      return quoted ? quoted[1] : s.replace(/\s*:$/, "");
    }) || []
  );
}

const contentFonts = extractObjectKeys(contentJs);
const bgFonts = extractArray(bgJs);
const popupFonts = extractArray(popupJs);

if (contentFonts && bgFonts && popupFonts) {
  const contentSet = JSON.stringify(contentFonts.sort());
  const bgSet = JSON.stringify(bgFonts.sort());
  const popupSet = JSON.stringify(popupFonts.sort());

  if (contentSet === bgSet && bgSet === popupSet) {
    pass("BUNDLED_FONTS lists are in sync across all files");
  } else {
    fail("BUNDLED_FONTS lists are out of sync");
    console.error(`  content.js: ${contentFonts}`);
    console.error(`  background.js: ${bgFonts}`);
    console.error(`  popup.js: ${popupFonts}`);
  }
} else {
  fail("could not parse BUNDLED_FONTS from one or more files");
}

// 5. popup.html references existing CSS and JS
const popupHtml = readFileSync(join(root, "popup", "popup.html"), "utf-8");
const popupRefs = [...popupHtml.matchAll(/(?:src|href)="([^"]+)"/g)].map(
  (m) => m[1],
);

for (const ref of popupRefs) {
  if (ref.startsWith("http")) continue;
  const fullPath = join(root, "popup", ref);
  if (existsSync(fullPath)) {
    pass(`popup.html reference exists: ${ref}`);
  } else {
    fail(`popup.html reference missing: ${ref}`);
  }
}

console.log(
  `\n${errors === 0 ? "All checks passed." : `${errors} check(s) failed.`}`,
);
process.exit(errors > 0 ? 1 : 0);
