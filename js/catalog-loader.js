import { CACHE, ENDPOINTS } from "./config.js";

function now() {
  return Date.now();
}

function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function readCache() {
  const raw = localStorage.getItem(CACHE.equipmentKey);
  if (!raw) return null;
  const parsed = safeJsonParse(raw);
  if (!parsed || typeof parsed !== "object") return null;
  if (!parsed.fetchedAt || !parsed.payload) return null;
  parsed.source = localStorage.getItem(`${CACHE.equipmentKey}:source`) || "cache";
  return parsed;
}

function writeCache(payload) {
  localStorage.setItem(
    CACHE.equipmentKey,
    JSON.stringify({
      fetchedAt: now(),
      payload,
    })
  );
}

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

function emitSource(source, extra = {}) {
  try {
    window.dispatchEvent(new CustomEvent("equipmentSource", { detail: { source, ...extra } }));
  } catch {
    // ignore
  }
}

export async function loadEquipmentData({ forceRefresh = false } = {}) {
  const cached = readCache();
  const isFresh = cached && now() - cached.fetchedAt < CACHE.equipmentTtlMs;

  if (!forceRefresh && isFresh) {
    // Stale-while-revalidate: если endpoint настроен, тихо обновляем в фоне
    // и сигнализируем страницам, что данные могли измениться.
    if (ENDPOINTS.catalogJson) {
      refreshCatalogInBackground(cached.payload).catch(() => {});
    }
    emitSource(cached.source || "cache");
    return cached.payload;
  }

  // 1) Remote (Google Apps Script)
  if (ENDPOINTS.catalogJson) {
    try {
      const payload = await fetchJson(ENDPOINTS.catalogJson);
      if (payload && payload.items && payload.categories) {
        writeCache(payload);
        localStorage.setItem(`${CACHE.equipmentKey}:source`, "remote");
        emitSource("remote");
        return payload;
      }
      // если структура другая — просто не кэшируем
      console.warn("Catalog payload format is unexpected; falling back.");
    } catch (e) {
      console.warn("Remote catalog fetch failed; falling back.", e);
      emitSource("remote_failed", { message: String(e?.message || e) });
    }
  }

  // 2) Local fallback
  const local = await fetchJson("data/equipment.json");
  writeCache(local);
  localStorage.setItem(`${CACHE.equipmentKey}:source`, "local");
  emitSource("local");
  return local;
}

async function refreshCatalogInBackground(previousPayload) {
  try {
    const payload = await fetchJson(ENDPOINTS.catalogJson);
    if (!payload || !payload.items || !payload.categories) return;
    const prevUpdated = previousPayload?.lastUpdated || "";
    const nextUpdated = payload?.lastUpdated || "";
    writeCache(payload);
    localStorage.setItem(`${CACHE.equipmentKey}:source`, "remote");
    emitSource("remote");
    if (String(prevUpdated) !== String(nextUpdated)) {
      window.dispatchEvent(new CustomEvent("equipmentUpdated"));
    }
  } catch {
    // ignore
  }
}

export function createEquipmentCard(item) {
  const el = document.createElement("article");
  el.className = "equipment-card reveal";
  el.tabIndex = 0;
  el.setAttribute("role", "button");
  el.setAttribute("aria-label", `${item.name}. Открыть детали`);
  el.dataset.itemId = String(item.id);

  const images = parseImages(item.image);
  const coverSrc = images.length ? resolveImageSrc(images[0]) : "";
  const img = coverSrc
    ? `<img loading="lazy" alt="${escapeHtml(item.name)}" src="${coverSrc}" onerror="this.remove()" />`
    : "";

  el.innerHTML = `
    <div class="equipment-thumb">${img}</div>
    <h3 class="equipment-name">${escapeHtml(item.name)}</h3>
    <p class="equipment-desc">${escapeHtml(item.shortDesc || "")}</p>
    <div class="price-row">
      ${item.priceRent ? `<span class="pill"><strong>Аренда:</strong> ${escapeHtml(item.priceRent)}</span>` : ""}
      ${item.priceBuy ? `<span class="pill"><strong>Покупка:</strong> ${escapeHtml(item.priceBuy)}</span>` : ""}
    </div>
  `;

  return el;
}

function parseImages(value) {
  const s = String(value || "").trim();
  if (!s) return [];
  // Для одной колонки используем разделитель "|" (можно и "," / ";" для удобства).
  return s
    .split(/[|,;]+/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

function resolveImageSrc(token) {
  const t = String(token || "").trim();
  if (!t) return "";
  // Поддержка абсолютных ссылок (на будущее)
  if (/^(https?:\/\/|data:)/i.test(t)) return t;
  return `images/equipment/${t}`;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function initEquipmentModal(getItemById) {
  const overlay = document.getElementById("equipment-modal");
  const body = document.getElementById("modal-body");
  if (!overlay || !body) return;

  const closeButtons = overlay.querySelectorAll("[data-modal-close]");
  const setOpen = (open) => {
    overlay.hidden = !open;
    document.body.style.overflow = open ? "hidden" : "";
  };

  const openById = (id) => {
    const item = getItemById(id);
    if (!item) return;

    const images = parseImages(item.image).map(resolveImageSrc);
    const primary = images[0] || "";

    body.innerHTML = `
      <h3 id="modal-title">${escapeHtml(item.name)}</h3>
      ${
        primary
          ? `<div class="modal-gallery">
              <div class="modal-image-wrap">
                <img class="modal-image" alt="${escapeHtml(item.name)}" src="${primary}" onerror="this.closest('.modal-image-wrap').classList.add('is-fallback')" />
              </div>
              ${
                images.length > 1
                  ? `<div class="modal-thumbs" role="list" aria-label="Фотографии">
                      ${images
                        .map(
                          (src, i) => `
                            <button class="thumb ${i === 0 ? "is-active" : ""}" type="button" data-thumb-src="${escapeHtml(src)}" aria-label="Фото ${i + 1}">
                              <img alt="" src="${src}" loading="lazy" onerror="this.remove()" />
                            </button>
                          `
                        )
                        .join("")}
                    </div>`
                  : ""
              }
            </div>`
          : ""
      }
      ${item.fullDesc ? `<p>${escapeHtml(item.fullDesc)}</p>` : ""}
      <div class="price-row">
        ${item.priceRent ? `<span class="pill"><strong>Аренда:</strong> ${escapeHtml(item.priceRent)}</span>` : ""}
        ${item.priceBuy ? `<span class="pill"><strong>Покупка:</strong> ${escapeHtml(item.priceBuy)}</span>` : ""}
      </div>
      ${
        Array.isArray(item.specs) && item.specs.length
          ? `<ul class="specs">${item.specs.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>`
          : ""
      }
    `;

    // Переключение миниатюр
    if (images.length > 1) {
      const mainImg = body.querySelector(".modal-image");
      const mainWrap = body.querySelector(".modal-image-wrap");
      const thumbs = Array.from(body.querySelectorAll(".thumb[data-thumb-src]"));
      thumbs.forEach((btn) => {
        btn.addEventListener("click", () => {
          const src = btn.getAttribute("data-thumb-src") || "";
          if (mainImg && src) {
            mainImg.setAttribute("src", src);
            if (mainWrap) mainWrap.classList.remove("is-fallback");
          }
          thumbs.forEach((b) => b.classList.toggle("is-active", b === btn));
        });
      });
    }

    setOpen(true);
  };

  closeButtons.forEach((btn) => btn.addEventListener("click", () => setOpen(false)));

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) setOpen(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hidden) setOpen(false);
  });

  return { openById, close: () => setOpen(false) };
}


