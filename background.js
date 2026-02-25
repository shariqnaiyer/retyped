const BUNDLED_FONT = "JetBrains Mono Nerd Font";

function getDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

async function updateBadge(tabId, domain) {
  if (!domain) {
    await chrome.action.setBadgeText({ tabId, text: "" });
    return;
  }

  const { siteSettings = {} } = await chrome.storage.local.get("siteSettings");
  const settings = siteSettings[domain];

  if (settings && settings.enabled) {
    await chrome.action.setBadgeText({ tabId, text: "ON" });
    await chrome.action.setBadgeBackgroundColor({ tabId, color: "#4CAF50" });
  } else {
    await chrome.action.setBadgeText({ tabId, text: "" });
  }
}

// Inject content script into a tab, ignoring errors if already injected
async function ensureContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });
  } catch {
    // Script may already be injected, or tab is a chrome:// page
  }
}

// On tab load, inject content script if the domain has saved settings
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") return;

  const domain = getDomain(tab.url);
  await updateBadge(tabId, domain);

  if (!domain) return;

  const { siteSettings = {} } = await chrome.storage.local.get("siteSettings");
  if (siteSettings[domain]?.enabled) {
    await ensureContentScript(tabId);
  }
});

// Update badge when a tab is activated
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    const domain = getDomain(tab.url);
    await updateBadge(tabId, domain);
  } catch {
    // Tab might not exist anymore
  }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "getActiveTab") {
    chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      sendResponse(tabs[0] || null);
    });
    return true;
  }

  if (msg.type === "updateSettings") {
    handleUpdateSettings(msg).then(sendResponse);
    return true;
  }
});

async function handleUpdateSettings({ domain, font, enabled }) {
  const { siteSettings = {} } = await chrome.storage.local.get("siteSettings");

  if (enabled && font) {
    siteSettings[domain] = { font, enabled: true };
  } else {
    siteSettings[domain] = { font: siteSettings[domain]?.font || font, enabled: false };
  }

  await chrome.storage.local.set({ siteSettings });

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return { ok: true };

  await updateBadge(tab.id, domain);

  // Inject content script first (may not be present yet)
  await ensureContentScript(tab.id);

  if (enabled && font) {
    let fontSrc = null;
    if (font !== BUNDLED_FONT) {
      const { customFonts = {} } = await chrome.storage.local.get("customFonts");
      fontSrc = customFonts[font] || null;
    }
    await chrome.tabs.sendMessage(tab.id, {
      type: "applyFont",
      font,
      fontSrc,
    });
  } else {
    await chrome.tabs.sendMessage(tab.id, { type: "removeFont" });
  }

  return { ok: true };
}
