const STYLE_ID = "retyped-font-override";
const BUNDLED_FONTS = {
  "JetBrains Mono Nerd Font": "fonts/JetBrainsMonoNerdFont-Regular.woff2",
  "Fira Code": "fonts/FiraCode-Regular.woff2",
  "Open Sans": "fonts/OpenSans-Regular.woff2",
  "Literata": "fonts/Literata-Regular.woff2",
  "Charter": "fonts/Charter-Regular.woff2",
  "Source Sans 3": "fonts/SourceSans3-Regular.woff2",
};

function getDomain() {
  return location.hostname;
}

function removeOverride() {
  const el = document.getElementById(STYLE_ID);
  if (el) el.remove();
}

function applyOverride(fontName, fontSrc) {
  removeOverride();

  const style = document.createElement("style");
  style.id = STYLE_ID;

  let fontFaceRule;
  if (fontSrc) {
    // Custom font with base64 data URI
    fontFaceRule = `
      @font-face {
        font-family: "${fontName}";
        src: url("${fontSrc}");
        font-display: swap;
      }
    `;
  } else {
    // Bundled font — use extension URL
    const fontPath = BUNDLED_FONTS[fontName];
    const fontUrl = chrome.runtime.getURL(fontPath);
    fontFaceRule = `
      @font-face {
        font-family: "${fontName}";
        src: url("${fontUrl}") format("woff2");
        font-display: swap;
      }
    `;
  }

  style.textContent = `
    ${fontFaceRule}
    * {
      font-family: "${fontName}" !important;
    }
  `;

  document.head.appendChild(style);
}

async function checkAndApply() {
  const domain = getDomain();
  if (!domain) return;

  const { siteSettings = {}, customFonts = {} } =
    await chrome.storage.local.get(["siteSettings", "customFonts"]);

  const settings = siteSettings[domain];
  if (!settings || !settings.enabled) {
    removeOverride();
    return;
  }

  const fontName = settings.font;
  const fontSrc = fontName in BUNDLED_FONTS ? null : customFonts[fontName];
  applyOverride(fontName, fontSrc);
}

// Apply on load
checkAndApply();

// Listen for messages from popup/background to apply or remove immediately
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "applyFont") {
    applyOverride(msg.font, msg.fontSrc);
  } else if (msg.type === "removeFont") {
    removeOverride();
  } else if (msg.type === "refresh") {
    checkAndApply();
  }
});
