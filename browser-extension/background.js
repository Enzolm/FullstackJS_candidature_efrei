const API_URL = "http://localhost:3000/api";

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "inject-document") {
    (async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        if (!tab?.id) throw new Error("Aucun onglet actif trouvé.");
        if (tab.url && /^(chrome|edge|about|chrome-extension):/.test(tab.url)) {
          throw new Error("Impossible d'injecter sur une page interne du navigateur.");
        }

        const result = await sendMessageWithInjection(tab.id, message);
        sendResponse(result);
      } catch (error) {
        sendResponse({ error: error.message });
      }
    })();
    return true;
  }

  if (message.type === "create-application") {
    createApplication(message.application)
      .then(sendResponse)
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }

  if (message.type === "get-indeed-offer") {
    (async () => {
      try {
        const [tab] = await chrome.tabs.query({
          active: true,
          lastFocusedWindow: true,
        });
        if (!tab?.id || !tab.url?.includes("indeed.")) {
          throw new Error("Ouvre une page d’offre Indeed dans l’onglet actif.");
        }
        const result = await sendMessageWithInjection(tab.id, message);
        sendResponse(result);
      } catch (error) {
        sendResponse({ error: error.message });
      }
    })();
    return true;
  }

  if (message.type !== "download-document") return false;

  downloadDocument(message.documentId)
    .then(sendResponse)
    .catch((error) => sendResponse({ error: error.message }));
  return true;
});

async function sendMessageWithInjection(tabId, payload) {
  try {
    return await chrome.tabs.sendMessage(tabId, payload);
  } catch (error) {
    const message = error?.message || "";
    const notLoaded =
      message.includes("Receiving end does not exist") ||
      message.includes("Could not establish connection");
    if (!notLoaded) throw error;

    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      files: ["content.js"],
    });

    return await chrome.tabs.sendMessage(tabId, payload);
  }
}

async function downloadDocument(documentId) {
  const { token } = await chrome.storage.local.get("token");
  if (!token) throw new Error("Connecte-toi à TrackMyApply.");

  const response = await fetch(
    `${API_URL}/documents/${encodeURIComponent(documentId)}/download`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) throw new Error("Impossible de télécharger le document.");

  const blob = await response.blob();
  return {
    bytes: Array.from(new Uint8Array(await blob.arrayBuffer())),
    mimeType: blob.type || "application/octet-stream",
    fileName:
      response.headers
        .get("Content-Disposition")
        ?.match(/filename="?([^"]+)"?/)?.[1] || "trackmyapply-document",
  };
}

async function createApplication(application) {
  const { token } = await chrome.storage.local.get("token");
  if (!token) throw new Error("Connecte-toi d’abord à TrackMyApply.");

  const response = await fetch(`${API_URL}/applications`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      company: application?.company,
      position: application?.position,
      city: application?.city || undefined,
      address: application?.address || undefined,
      salary: application?.salary || undefined,
      contractType: application?.contractType || undefined,
      channel: "Indeed",
      jobUrl: application?.jobUrl,
      status: "postulé",
      applicationDate: new Date().toISOString(),
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.message || "Impossible d’enregistrer la candidature.");
  }

  return { success: true, application: payload?.data };
}

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type !== "open-side-panel" || !sender.tab?.id) return;
  chrome.sidePanel.open({ tabId: sender.tab.id }).catch(() => {
    // Chrome requires a user gesture in some versions; the toolbar action remains available.
  });
});
