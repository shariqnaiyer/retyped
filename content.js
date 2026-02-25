const STYLE_ID = "retyped-font-override";
const BUNDLED_FONT = "JetBrains Mono Nerd Font";

function getDomain() {
  return location.hostname;
}

function removeOverride() {
  const el = document.getElementById(STYLE_ID);
  if (el) el.remove();
}

function applyOverride(fontName, fontSrc) {
  removeOverride();

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
    const fontUrl = chrome.runtime.getURL(
      "fonts/JetBrainsMonoNerdFont-Regular.ttf"
    );
    fontFaceRule = `
      @font-face {
        font-family: "${BUNDLED_FONT}";
        src: url("${fontUrl}") format("truetype");
        font-display: swap;
      }
    `;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
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
  const fontSrc = fontName === BUNDLED_FONT ? null : customFonts[fontName];
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
