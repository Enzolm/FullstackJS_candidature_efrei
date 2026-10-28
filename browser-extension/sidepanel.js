const API_URL = "http://localhost:3000/api";
const loginView = document.querySelector("#login-view");
const documentsView = document.querySelector("#documents-view");
const documentsElement = document.querySelector("#documents");
const statusElement = document.querySelector("#status");
const searchElement = document.querySelector("#search");
const indeedPreviewElement = document.querySelector("#indeed-preview");
const previewDetailsElement = document.querySelector("#preview-details");
const previewEmptyElement = document.querySelector("#preview-empty");
const previewPositionElement = document.querySelector("#preview-position");
const previewCompanyElement = document.querySelector("#preview-company");
const saveIndeedButton = document.querySelector("#save-indeed");
const refreshIndeedButton = document.querySelector("#refresh-indeed");
let documents = [];
let loadedFiles = new Map();

notifyActiveTab("sidepanel-open");

document.querySelector("#connect-site").addEventListener("click", connectFromSite);
document.querySelector("#open-site").addEventListener("click", () => {
  chrome.tabs.create({ url: "http://localhost:5173/" });
});

async function connectFromSite() {
  setStatus("Connexion...");
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
    if (!tab?.url?.startsWith("http://localhost:5173/")) {
      throw new Error("Ouvre TrackMyApply dans un onglet puis réessaie.");
    }

    const session = await chrome.tabs.sendMessage(tab.id, {
      type: "get-site-session",
    });
    if (!session?.token) {
      throw new Error("Connecte-toi d’abord sur TrackMyApply.");
    }
    await chrome.storage.local.set({
      token: session.token,
      user: session.user || null,
    });
    await loadDocuments();
  } catch (error) {
    setStatus(
      error instanceof Error ? error.message : "Synchronisation impossible.",
      true,
    );
  }
}

document.querySelector("#refresh").addEventListener("click", loadDocuments);
saveIndeedButton.addEventListener("click", saveIndeedApplication);
refreshIndeedButton.addEventListener("click", refreshIndeedOffer);
document.querySelector("#logout").addEventListener("click", async () => {
  await chrome.storage.local.remove("token");
  documents = [];
  loadedFiles.clear();
  showLogin();
});

async function saveIndeedApplication() {
  const button = saveIndeedButton;
  button.disabled = true;
  setStatus("Lecture de l’offre Indeed...");
  try {
    const offerResult = await chrome.runtime.sendMessage({
      type: "get-indeed-offer",
    });
    if (offerResult?.error) throw new Error(offerResult.error);
    showIndeedPreview(offerResult.offer);

    setStatus("Enregistrement de la candidature...");
    const result = await chrome.runtime.sendMessage({
      type: "create-application",
      application: offerResult.offer,
    });
    if (result?.error) throw new Error(result.error);
    setStatus("Candidature Indeed ajoutée à TrackMyApply.");
  } catch (error) {
    setStatus(
      error instanceof Error
        ? error.message
        : "Impossible d’enregistrer la candidature.",
      true,
    );
  } finally {
    button.disabled = false;
  }
}

function showIndeedPreview(offer) {
  previewPositionElement.textContent = offer.position;
  previewCompanyElement.textContent = offer.company;
  previewDetailsElement.hidden = false;
  previewEmptyElement.hidden = true;
  saveIndeedButton.hidden = false;
}

function showNoIndeedOffer() {
  previewDetailsElement.hidden = true;
  previewEmptyElement.hidden = false;
  saveIndeedButton.hidden = true;
}

async function refreshIndeedPreview() {
  const result = await chrome.runtime.sendMessage({
    type: "get-indeed-offer",
  });
  if (result?.offer) {
    showIndeedPreview(result.offer);
  } else {
    showNoIndeedOffer();
  }
}

async function refreshIndeedOffer() {
  refreshIndeedButton.disabled = true;
  refreshIndeedButton.textContent = "Actualisation...";
  try {
    await refreshIndeedPreview();
    setStatus("");
  } catch {
    showNoIndeedOffer();
    setStatus("Impossible de lire l’offre Indeed.", true);
  } finally {
    refreshIndeedButton.disabled = false;
    refreshIndeedButton.textContent = "Rafraîchir";
  }
}
searchElement.addEventListener("input", renderDocuments);

document.addEventListener("visibilitychange", () => {
  notifyActiveTab(document.visibilityState === "visible" ? "sidepanel-open" : "sidepanel-closed");
});

window.addEventListener("beforeunload", () => notifyActiveTab("sidepanel-closed"));

async function notifyActiveTab(type) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tab?.id) await chrome.tabs.sendMessage(tab.id, { type });
  } catch {
    // The active tab may not be a permitted extension page.
  }
}

async function loadDocuments() {
  const { token } = await chrome.storage.local.get("token");
  if (!token) {
    showLogin();
    return;
  }

  setStatus("Chargement...");
  try {
    const response = await fetch(`${API_URL}/documents`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await response.json().catch(() => ({}));
    if (response.status === 401) {
      await chrome.storage.local.remove("token");
      showLogin();
      throw new Error("Session expirée. Reconnecte-toi.");
    }
    if (!response.ok || !Array.isArray(result.data)) {
      throw new Error(result.message || "Impossible de charger les documents.");
    }
    documents = result.data;
    showDocuments();
    renderDocuments();
    await preloadFiles(token);
    setStatus("");
  } catch (error) {
    setStatus(
      error instanceof TypeError
        ? "Backend inaccessible. Vérifie que le serveur est démarré."
        : error instanceof Error
          ? error.message
          : "Impossible de charger les documents.",
      true,
    );
  }
}

async function preloadFiles(token) {
  loadedFiles.clear();
  await Promise.all(documents.map(async (document) => {
    const response = await fetch(`${API_URL}/documents/${document.id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return;
    const blob = await response.blob();
    loadedFiles.set(document.id, new File([blob], document.originalName, { type: blob.type || document.mimeType }));
  }));
}

function renderDocuments() {
  const query = searchElement.value.trim().toLowerCase();
  documentsElement.replaceChildren();
  documents
    .filter((doc) => [doc.displayName, doc.originalName].some((value) => value.toLowerCase().includes(query)))
    .forEach((doc) => {
      const element = window.document.createElement("article");
      element.className = "document";
      element.draggable = true;
      element.innerHTML = `<div class="document-head"><span class="document-name"></span><span>↗</span></div><p class="document-meta"></p><div class="document-actions"><span class="drag-hint">Glisse ou utilise ce fichier</span><button class="use-button" type="button">Utiliser sur la page</button></div>`;
      element.querySelector(".document-name").textContent = doc.displayName;
      element.querySelector(".document-meta").textContent = `${doc.originalName} · ${formatSize(doc.size)}`;
      element.querySelector(".use-button").addEventListener("click", async () => {
        setStatus("Injection du fichier...")
        const result = await chrome.runtime.sendMessage({
          type: "inject-document",
          documentId: doc.id,
        })
        setStatus(
          result?.error || "Fichier injecté dans la page.",
          Boolean(result?.error),
        )
      })
      element.addEventListener("dragstart", (event) => {
        event.dataTransfer.effectAllowed = "copy";
        event.dataTransfer.setData("application/x-trackmyapply-document", doc.id);
      });
      documentsElement.append(element);
    });
}

function showLogin() {
  loginView.hidden = false;
  documentsView.hidden = true;
}

function showDocuments() {
  loginView.hidden = true;
  documentsView.hidden = false;
}

function setStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.className = `status${isError ? " error" : ""}`;
}

function formatSize(size) {
  if (size < 1024) return `${size} octets`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} Ko`;
  return `${(size / (1024 * 1024)).toFixed(1)} Mo`;
}

loadDocuments();
refreshIndeedPreview().catch(showNoIndeedOffer);
const indeedPreviewTimer = window.setInterval(() => {
  refreshIndeedPreview().catch(showNoIndeedOffer);
}, 1500);
window.addEventListener("beforeunload", () => window.clearInterval(indeedPreviewTimer));
