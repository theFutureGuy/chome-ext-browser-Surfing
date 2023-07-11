let currentUrl = null;
let colDate = null;
let captureTime = null;

async function getCurrentTab() {
  const queryOptions = { active: true, lastFocusedWindow: true };
  const [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}

async function saveToLS(siteUrl) {
  if (siteUrl) {
    if (captureTime !== null) {
      clearInterval(captureTime);
    }
    captureTime = setInterval(captureTimeFunc(siteUrl), 1000);
  }
}

function captureTimeFunc(siteUrl) {
  return async () => {
    let localStore = await chrome.storage.local.get(["tracker"]);
    let sitesMap = new Map(Object.entries(localStore.tracker || {}));
    if (sitesMap.has(siteUrl)) {
      sitesMap.set(siteUrl, sitesMap.get(siteUrl) + 1);
    } else {
      sitesMap.set(siteUrl, 0);
    }
    await chrome.storage.local.set({ tracker: Object.fromEntries(sitesMap) });
  };
}

function extractUrl(tabInfo) {
  const fields = tabInfo.url.split("/");
  let urlExtracted = fields[0] === "https:" || fields[0] === "http:" ? fields[2] : fields[0];
  return urlExtracted.replace(":","");
}

async function updateTabInfo(tab) {
  const siteUrl = extractUrl(tab);
  if (currentUrl !== siteUrl) {
    currentUrl = siteUrl;
    await saveToLS(siteUrl);
  }
}

chrome.runtime.onInstalled.addListener(async function () {
  await initialize();
});

chrome.runtime.onStartup.addListener(async function () {
  await initialize();
});

chrome.tabs.onActivated.addListener(async function (activeInfo) {
  const [tab] = await chrome.tabs.query({ active: true, windowId: activeInfo.windowId });
  await updateTabInfo(tab);
});

chrome.tabs.onUpdated.addListener(async function (tabId, changeInfo, tab) {
  if (changeInfo.url) {
    await updateTabInfo(tab);
  }
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === -1) {
    if (captureTime !== null) {
      clearInterval(captureTime);
    }
  } else {
    const [tab] = await chrome.tabs.query({ active: true, windowId: windowId });
    await updateTabInfo(tab);
  }
});
async function initialize() {
  const d = new Date();
  colDate = `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
  await chrome.storage.local.clear();
  await chrome.storage.local.set({ tracker: {} });
  await chrome.storage.local.set({ collectionDate: colDate });
}

