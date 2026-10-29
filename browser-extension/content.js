(function () {
  const injectionVersion = "0.1.2";
  if (window.__trackMyApplyInjected === injectionVersion) return;
  window.__trackMyApplyInjected = injectionVersion;

  const DRAG_MIME = "application/x-trackmyapply-document";
  const inTopFrame = window === window.top;

  /* ---------- styles injectés ---------- */
  const style = document.createElement("style");
  style.textContent = `
    .__tma-highlight { outline: 3px dashed #d96c4a !important; outline-offset: 3px !important; transition: outline-color .15s ease; }
    .__tma-pulse { animation: __tmaPulse 1.1s ease-out 1; }
    @keyframes __tmaPulse {
      0%   { box-shadow: 0 0 0 0 rgba(43,122,120,.55); }
      100% { box-shadow: 0 0 0 14px rgba(43,122,120,0); }
    }
    .__tma-toast {
      position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%);
      z-index: 2147483647; padding: 10px 16px; border-radius: 999px;
      background: #1e463e; color: #f7f5f0; font: 600 13px/1.2 "DM Sans", sans-serif;
      box-shadow: 0 8px 30px rgba(30,70,62,.25); opacity: 0; transition: opacity .2s;
      pointer-events: none;
    }
    .__tma-toast.visible { opacity: 1; }
    .__tma-toast.error { background: #d96c4a; }
  `;
  (document.head || document.documentElement).appendChild(style);

  /* ---------- bouton flottant (top frame only) ---------- */
  let floatingButton = null;
  if (inTopFrame) {
    const button = document.createElement("button");
    floatingButton = button;
    button.textContent = "TrackMyApply";
    button.type = "button";
    button.style.cssText =
      "position:fixed;right:16px;bottom:16px;z-index:2147483647;padding:10px 14px;border:0;border-radius:999px;background:#1e463e;color:#fff;font:600 13px sans-serif;box-shadow:0 4px 16px #0003;cursor:pointer;";
    button.addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "open-side-panel" });
    });
    document.documentElement.appendChild(button);
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (!floatingButton) return;
    if (message.type === "sidepanel-open") floatingButton.hidden = true;
    if (message.type === "sidepanel-closed") floatingButton.hidden = false;
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type !== "get-indeed-offer") return false;
    try {
      sendResponse({ success: true, offer: extractIndeedOffer() });
    } catch (error) {
      sendResponse({ error: error.message || "Offre Indeed illisible." });
    }
    return true;
  });

  /* ---------- utilitaires ---------- */

  // Toast de feedback dans la page
  function showToast(message, { error = false, duration = 2200 } = {}) {
    if (!inTopFrame) return;
    const toast = document.createElement("div");
    toast.className = `__tma-toast${error ? " error" : ""}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("visible"));
    setTimeout(() => {
      toast.classList.remove("visible");
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }

  function textFromSelectors(selectors) {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      const value = element?.textContent?.trim();
      if (value) return value.replace(/\s+/g, " ");
    }
    return "";
  }

  function cleanText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function findIndeedMetadata() {
    return document.querySelector("[data-testid='company-info-metadata']");
  }

  function findIndeedLocation(metadata, company) {
    const directLocation = textFromSelectors([
      "[data-testid='job-location']",
      "[data-testid='jobsearch-JobInfoHeader-subtitle']",
      "[data-testid='inlineHeader-companyLocation']",
      "#jobLocationText",
      ".jobsearch-JobInfoHeader-subtitle",
    ]);
    if (directLocation) return directLocation;

    if (!metadata) return "";

    const candidates = [...metadata.querySelectorAll("div, span")]
      .map((element) => cleanText(element.textContent))
      .filter((value, index, values) => value && values.indexOf(value) === index)
      .filter((value) => value !== company)
      .filter((value) => !/^\d+(?:[.,]\d+)?\s*(?:étoile|star)/i.test(value))
      .filter((value) => !/^(?:[-·]|CDI|CDD|Intérim|Stage|Alternance)$/i.test(value))
      .filter((value) => !/^\d[\d\s.,€]*\s*(?:€|euros?)?/i.test(value));

    return (
      candidates
        .filter((value) =>
          /(?:\b\d{5}\b|rue|avenue|boulevard|chemin|place|route|allée|impasse|quai)\b/i.test(
            value,
          ),
        )
        .sort((left, right) => left.length - right.length)[0] || ""
    );
  }

  function findIndeedOfferDetails(metadata) {
    const details = cleanText(metadata?.textContent);
    const salary =
      details.match(
        /(?:De\s+)?\d[\d\s.,]*\s*(?:€|euros?)(?:\s*(?:à|-)\s*\d[\d\s.,]*\s*(?:€|euros?))?(?:\s+par\s+\w+)?/i,
      )?.[0] || "";
    const contractType =
      details.match(/\b(CDI|CDD|Intérim|Stage|Alternance)\b/i)?.[1] || "";

    return { salary, contractType };
  }

  function extractIndeedOffer() {
    const position =
      textFromSelectors([
        "[data-testid='vj-job-title']",
        "h1[data-testid='jobsearch-JobInfoHeader-title']",
        "h1[data-testid='jobsearch-JobInfoHeader-title'] span",
        "h1.jobsearch-JobInfoHeader-title",
        "h1",
      ]) ||
      document.title
        .replace(/\s*-\s*Indeed.*$/i, "")
        .replace(/\s*\|\s*Indeed.*$/i, "")
        .trim();
    const company = textFromSelectors([
      "[data-testid='company-info-title-row'] + [data-testid='company-info-metadata'] a",
      "[data-testid='company-info-metadata'] a[href*='/cmp/']",
      "[data-testid='company-info-metadata'] a",
      "[data-testid='company-info-title-row'] + div a",
      "[data-testid='inlineHeader-companyName']",
      "[data-testid='jobsearch-JobInfoHeader-companyName']",
      "[data-testid='companyName']",
      ".jobsearch-JobInfoHeader-companyName",
    ]);
    const metadata = findIndeedMetadata();
    const location = findIndeedLocation(metadata, company);
    const { salary, contractType } = findIndeedOfferDetails(metadata);
    const locationParts = location.match(/^(?:\d{5}\s+)?(.+)$/);
    const city = locationParts?.[1]?.trim() || location;

    if (!position || !company) {
      throw new Error(
        "Impossible de lire le titre ou l’entreprise de cette offre Indeed.",
      );
    }

    return {
      position,
      company,
      city,
      address: location,
      salary,
      contractType,
      jobUrl: window.location.href,
    };
  }

  // Trouve tous les input[type=file], y compris dans les Shadow DOM
  function findAllFileInputs(root = document) {
    const results = [];
    const walk = (node) => {
      if (!node) return;
      if (node.querySelectorAll) {
        node.querySelectorAll('input[type="file"]').forEach((input) =>
          results.push(input),
        );
      }
      // Shadow roots
      const treeWalker = document.createTreeWalker(
        node,
        NodeFilter.SHOW_ELEMENT,
        null,
      );
      let current = treeWalker.currentNode;
      while (current) {
        if (current.shadowRoot) walk(current.shadowRoot);
        current = treeWalker.nextNode();
      }
    };
    walk(root);
    return results;
  }

  // Vrai si l'input est actuellement visible (hors écran = ignoré)
  function isVisible(input) {
    const rect = input.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      // Beaucoup d'ATS cachent l'input sous un bouton stylisé — on l'accepte quand même
      // s'il est "visuellement caché" mais présent dans l'arbre.
      const styles = getComputedStyle(input);
      return styles.display !== "none" || input.offsetParent !== null;
    }
    return (
      rect.bottom >= 0 &&
      rect.right >= 0 &&
      rect.top <= window.innerHeight &&
      rect.left <= window.innerWidth
    );
  }

  // Choix du "meilleur" input : d'abord ceux dans le viewport, puis le premier
  function pickBestInput(inputs) {
    if (inputs.length === 0) return null;
    const visible = inputs.filter(isVisible);
    return visible[0] || inputs[0];
  }

  // Highlight temporaire pour indiquer les zones droppables pendant un drag
  const highlighted = new Set();
  function highlightDropZones() {
    const inputs = findAllFileInputs();
    inputs.forEach((input) => {
      const target =
        input.closest('[data-tma-drop], label, .dropzone, [class*="drop"]') ||
        input;
      target.classList.add("__tma-highlight");
      highlighted.add(target);
    });
  }
  function clearHighlights() {
    highlighted.forEach((el) => el.classList.remove("__tma-highlight"));
    highlighted.clear();
  }

  // Pulse de confirmation sur un input après injection
  function pulse(input) {
    const el = input.closest("label") || input.parentElement || input;
    el.classList.add("__tma-pulse");
    setTimeout(() => el.classList.remove("__tma-pulse"), 1200);
  }

  // Pose un File dans un input et dispatche les events qui vont bien
  function attachFileToInput(input, file) {
    const transfer = new DataTransfer();
    transfer.items.add(file);
    try {
      input.files = transfer.files;
    } catch {
      // Certains inputs sont en readonly — on tombe sur l'event drop natif
      return false;
    }
    input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    input.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    return true;
  }

  function buildFile(result) {
    return new File(
      [new Uint8Array(result.bytes)],
      result.fileName || "trackmyapply-document",
      { type: result.mimeType },
    );
  }

  /* ---------- flux "Utiliser sur la page" ---------- */

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type !== "inject-document") return false;

    chrome.runtime.sendMessage(
      { type: "download-document", documentId: message.documentId },
      (result) => {
        if (chrome.runtime.lastError) {
          const err = chrome.runtime.lastError.message;
          sendResponse({ error: err });
          showToast(err, { error: true });
          return;
        }
        if (result?.error) {
          sendResponse({ error: result.error });
          showToast(result.error, { error: true });
          return;
        }

        const input = pickBestInput(findAllFileInputs());
        if (!input) {
          const msg =
            "Aucun champ de fichier détecté. Clique d'abord sur la zone d'upload du site.";
          sendResponse({ error: msg });
          showToast(msg, { error: true });
          return;
        }

        const file = buildFile(result);
        const attached = attachFileToInput(input, file);
        if (!attached) {
          const msg = "Impossible d'écrire dans le champ. Essaie le drag-and-drop.";
          sendResponse({ error: msg });
          showToast(msg, { error: true });
          return;
        }

        input.scrollIntoView({ behavior: "smooth", block: "center" });
        pulse(input);
        showToast(`Fichier déposé : ${file.name}`);
        sendResponse({ success: true });
      },
    );
    return true;
  });

  /* ---------- flux drag-and-drop depuis le side panel ---------- */

  document.addEventListener(
    "dragenter",
    (event) => {
      if (event.dataTransfer?.types.includes(DRAG_MIME)) {
        event.preventDefault();
        if (highlighted.size === 0) highlightDropZones();
      }
    },
    true,
  );

  document.addEventListener(
    "dragover",
    (event) => {
      if (event.dataTransfer?.types.includes(DRAG_MIME)) {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }
    },
    true,
  );

  document.addEventListener("dragleave", (event) => {
    // Si on sort complètement du document
    if (event.relatedTarget === null) clearHighlights();
  });

  document.addEventListener(
    "drop",
    async (event) => {
      const documentId = event.dataTransfer?.getData(DRAG_MIME);
      if (!documentId || event.dataTransfer.files.length) {
        clearHighlights();
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      clearHighlights();

      let result;
      try {
        result = await chrome.runtime.sendMessage({
          type: "download-document",
          documentId,
        });
      } catch (error) {
        showToast(error.message || "Téléchargement impossible", { error: true });
        return;
      }
      if (result?.error) {
        showToast(result.error, { error: true });
        return;
      }

      const file = buildFile(result);

      // 1) priorité à l'input le plus proche du point de drop
      const path = event.composedPath();
      const dropped = path.find((el) => el instanceof Element);
      const nearest =
        dropped?.closest('input[type="file"]') ||
        dropped?.querySelector?.('input[type="file"]');

      // 2) sinon le "meilleur" input visible
      const target = nearest || pickBestInput(findAllFileInputs());

      if (target) {
        const ok = attachFileToInput(target, file);
        if (ok) {
          pulse(target);
          showToast(`Fichier déposé : ${file.name}`);
          return;
        }
      }

      // 3) fallback : dispatch un drop synthétique sur l'élément visé
      const transfer = new DataTransfer();
      transfer.items.add(file);
      const syntheticDrop = new DragEvent("drop", {
        bubbles: true,
        cancelable: true,
        dataTransfer: transfer,
      });
      (dropped || document.body).dispatchEvent(syntheticDrop);
      showToast(
        target ? `Fichier déposé : ${file.name}` : "Zone de dépôt custom détectée",
      );
    },
    true,
  );
})();
