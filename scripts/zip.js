import { execSync } from "child_process";
import { readFileSync, unlinkSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// Only include files the extension actually needs
const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf-8"));

const files = new Set();

// manifest itself
files.add("manifest.json");

// background script
if (manifest.background?.service_worker) {
  files.add(manifest.background.service_worker);
}

// popup
if (manifest.action?.default_popup) {
  const popupHtml = manifest.action.default_popup;
  files.add(popupHtml);

  // parse popup.html for css/js references
  const popupDir = dirname(popupHtml);
  const html = readFileSync(join(root, popupHtml), "utf-8");
  for (const [, ref] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (!ref.startsWith("http")) {
      files.add(join(popupDir, ref));
    }
  }
}

// icons
for (const icon of Object.values(manifest.action?.default_icon || {})) {
  files.add(icon);
}
for (const icon of Object.values(manifest.icons || {})) {
  files.add(icon);
}

// bundled fonts from content.js
const contentJs = readFileSync(join(root, "content.js"), "utf-8");
files.add("content.js");
for (const [, fontPath] of contentJs.matchAll(/"(fonts\/[^"]+)"/g)) {
  files.add(fontPath);
}

const outFile = join(root, "retyped.zip");
if (existsSync(outFile)) unlinkSync(outFile);

const fileList = [...files].sort();
console.log("Packing:\n  " + fileList.join("\n  "));

execSync(`zip -j9 "${outFile}" manifest.json`, { cwd: root });
// Add files preserving directory structure
execSync(`zip -9 "${outFile}" ${fileList.map((f) => `"${f}"`).join(" ")}`, {
  cwd: root,
});

const stat = readFileSync(outFile);
console.log(`\nCreated retyped.zip (${(stat.length / 1024).toFixed(1)} KB)`);
