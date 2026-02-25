const BUNDLED_FONTS = ["JetBrains Mono Nerd Font", "Fira Code", "Open Sans"];

const domainEl = document.getElementById("domain");
const fontSelect = document.getElementById("fontSelect");
const fontUpload = document.getElementById("fontUpload");
const toggleBtn = document.getElementById("toggleBtn");
const removeCustomBtn = document.getElementById("removeCustomBtn");
const statusEl = document.getElementById("status");

let currentDomain = null;
let isEnabled = false;

async function init() {
  // Get active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) {
    domainEl.textContent = "No active page";
    return;
  }

  try {
    currentDomain = new URL(tab.url).hostname;
  } catch {
    domainEl.textContent = "Invalid page";
    return;
  }

  if (!currentDomain || tab.url.startsWith("chrome://")) {
    domainEl.textContent = "Cannot modify this page";
    return;
  }

  domainEl.textContent = currentDomain;
  toggleBtn.disabled = false;

  // Load fonts and settings
  const { siteSettings = {}, customFonts = {} } =
    await chrome.storage.local.get(["siteSettings", "customFonts"]);

  populateFontSelect(customFonts);

  const settings = siteSettings[currentDomain];
  if (settings) {
    fontSelect.value = settings.font || BUNDLED_FONTS[0];
    isEnabled = settings.enabled;
  }

  updateToggleButton();
  updateRemoveButton();
}

function populateFontSelect(customFonts) {
  fontSelect.innerHTML = "";

  // Bundled fonts
  for (const name of BUNDLED_FONTS) {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    fontSelect.appendChild(opt);
  }

  // Custom fonts
  for (const name of Object.keys(customFonts)) {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    fontSelect.appendChild(opt);
  }
}

function updateToggleButton() {
  if (isEnabled) {
    toggleBtn.textContent = "Remove";
    toggleBtn.classList.add("active");
  } else {
    toggleBtn.textContent = "Apply";
    toggleBtn.classList.remove("active");
  }
}

function updateRemoveButton() {
  const selected = fontSelect.value;
  removeCustomBtn.hidden = BUNDLED_FONTS.includes(selected);
}

function showStatus(text) {
  statusEl.textContent = text;
  setTimeout(() => {
    statusEl.textContent = "";
  }, 2000);
}

// Toggle font on/off
toggleBtn.addEventListener("click", async () => {
  if (!currentDomain) return;

  isEnabled = !isEnabled;
  const font = fontSelect.value;

  await chrome.runtime.sendMessage({
    type: "updateSettings",
    domain: currentDomain,
    font,
    enabled: isEnabled,
  });

  updateToggleButton();
  showStatus(isEnabled ? `Applied ${font}` : "Font removed");
});

// Font selection change — apply immediately if enabled
fontSelect.addEventListener("change", async () => {
  updateRemoveButton();
  if (!isEnabled || !currentDomain) return;

  const font = fontSelect.value;
  await chrome.runtime.sendMessage({
    type: "updateSettings",
    domain: currentDomain,
    font,
    enabled: true,
  });

  showStatus(`Switched to ${font}`);
});

// Upload custom font
fontUpload.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const name = file.name.replace(/\.(woff2|ttf)$/i, "");
  const reader = new FileReader();
  reader.onload = async () => {
    const base64 = reader.result; // already a data URI from readAsDataURL
    const { customFonts = {} } = await chrome.storage.local.get("customFonts");
    customFonts[name] = base64;
    await chrome.storage.local.set({ customFonts });

    populateFontSelect(customFonts);
    fontSelect.value = name;
    updateRemoveButton();
    showStatus(`Uploaded "${name}"`);

    // Auto-apply if already enabled
    if (isEnabled && currentDomain) {
      await chrome.runtime.sendMessage({
        type: "updateSettings",
        domain: currentDomain,
        font: name,
        enabled: true,
      });
    }
  };
  reader.readAsDataURL(file);
});

// Delete custom font
removeCustomBtn.addEventListener("click", async () => {
  const name = fontSelect.value;
  if (BUNDLED_FONTS.includes(name)) return;

  const { customFonts = {} } = await chrome.storage.local.get("customFonts");
  delete customFonts[name];
  await chrome.storage.local.set({ customFonts });

  populateFontSelect(customFonts);
  fontSelect.value = BUNDLED_FONTS[0];
  updateRemoveButton();
  showStatus(`Deleted "${name}"`);

  // If was enabled on this domain, switch to bundled
  if (isEnabled && currentDomain) {
    await chrome.runtime.sendMessage({
      type: "updateSettings",
      domain: currentDomain,
      font: BUNDLED_FONTS[0],
      enabled: true,
    });
  }
});

init();
