import { initRevealAnimations } from "./scroll-animations.js";
import { initFab } from "./fab.js";
import { initForms } from "./form-handler.js";
import { createEquipmentCard, initEquipmentModal, loadEquipmentData } from "./catalog-loader.js";
import { CATEGORY_TILE_IMAGES, CONTACTS, ENDPOINTS } from "./config.js";

function qs(sel, root = document) {
  return root.querySelector(sel);
}

function qsa(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

function initYear() {
  const el = document.getElementById("year");
  if (el) el.textContent = String(new Date().getFullYear());
}

function showRuntimeBanner(message) {
  const existing = document.getElementById("runtime-warning");
  if (existing) {
    existing.textContent = message;
    existing.hidden = false;
    return;
  }
  const banner = document.createElement("div");
  banner.id = "runtime-warning";
  banner.className = "runtime-warning";
  banner.textContent = message;
  document.body.prepend(banner);
}

function initRuntimeGuards() {
  // Частая причина “пустых страниц”: открыли через file:// и fetch() не работает.
  if (location.protocol === "file:") {
    showRuntimeBanner("Откройте сайт через локальный сервер (например, http://localhost:8080/), а не через file:// — иначе каталог и скрипты могут не загрузиться.");
  }

  // Если каталогный endpoint не задан, честно говорим, что будет использоваться локальный fallback.
  const hasEquipmentUI = Boolean(document.getElementById("catalog-grid") || document.getElementById("main-equipment-grid"));
  if (hasEquipmentUI && !ENDPOINTS.catalogJson) {
    showRuntimeBanner("Каталог из Google Таблицы еще не подключен (ENDPOINTS.catalogJson пустой). Сейчас используется резервный файл data/equipment.json.");
  }

  window.addEventListener("error", (e) => {
    const msg = e?.message ? String(e.message) : "Ошибка выполнения скрипта";
    showRuntimeBanner(`Ошибка на странице: ${msg}. Откройте DevTools → Console для деталей.`);
  });

  window.addEventListener("unhandledrejection", (e) => {
    const msg = e?.reason?.message ? String(e.reason.message) : String(e.reason || "Ошибка запроса");
    showRuntimeBanner(`Ошибка запроса: ${msg}. Проверьте, что сайт открыт через http:// и что доступны endpoints/файлы.`);
  });

  window.addEventListener("equipmentSource", (e) => {
    const source = e?.detail?.source;
    if (!source) return;
    if (source === "local") {
      showRuntimeBanner("Каталог загружен из локального data/equipment.json (fallback). Проверьте ENDPOINTS.catalogJson и доступ Web App (Anyone).");
    }
    if (source === "remote_failed") {
      showRuntimeBanner(`Не удалось загрузить каталог из Google (fallback на локальный). Причина: ${e?.detail?.message || "ошибка запроса"}`);
    }
  });
}

function initThemeToggle() {
  const key = "stroytech_theme_v1";
  const root = document.documentElement;
  const btn = document.querySelector("[data-theme-toggle]");

  const apply = (theme) => {
    if (theme === "dark") root.setAttribute("data-theme", "dark");
    else root.removeAttribute("data-theme");
  };

  // Load saved theme, else use system preference
  const saved = localStorage.getItem(key);
  if (saved === "dark" || saved === "light") {
    apply(saved);
  } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    apply("dark");
  }

  if (!btn) return;
  btn.addEventListener("click", () => {
    const isDark = root.getAttribute("data-theme") === "dark";
    const next = isDark ? "light" : "dark";
    apply(next);
    localStorage.setItem(key, next);
  });
}

function initMobileNav() {
  const btn = qs(".nav-toggle");
  const nav = qs(".site-nav");
  if (!btn || !nav) return;

  const setOpen = (open) => {
    if (open) {
      // Вычисляем позицию кнопки и позиционируем меню справа от неё
      const btnRect = btn.getBoundingClientRect();
      if (btnRect) {
        nav.style.top = `${btnRect.bottom + 8}px`;
        nav.style.right = `${window.innerWidth - btnRect.right}px`;
      }
    }
    nav.classList.toggle("is-open", open);
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  };

  btn.addEventListener("click", () => {
    const open = !nav.classList.contains("is-open");
    setOpen(open);
  });

  document.addEventListener("click", (e) => {
    if (!nav.classList.contains("is-open")) return;
    if (nav.contains(e.target) || btn.contains(e.target)) return;
    setOpen(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });
  
  // Обновляем позицию при изменении размера окна
  window.addEventListener("resize", () => {
    if (nav.classList.contains("is-open")) {
      const btnRect = btn.getBoundingClientRect();
      if (btnRect) {
        nav.style.top = `${btnRect.bottom + 8}px`;
        nav.style.right = `${window.innerWidth - btnRect.right}px`;
      }
    }
  });
}

function initBackToTop() {
  const btn = qs("[data-back-to-top]");
  if (!btn) return;

  const onScroll = () => {
    const show = window.scrollY > 500;
    btn.hidden = !show;
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

function forceRevealFallback() {
  // If reveal animations didn't run (or IO stalls), make sure content shows.
  const isCatalog = /catalog\.html$/i.test(location.pathname) || document.getElementById("catalog-brands");
  if (!isCatalog) return;
  setTimeout(() => {
    document.querySelectorAll(".reveal:not(.is-visible)").forEach((el) => el.classList.add("is-visible"));
  }, 800);
}

function initContactBindings() {
  const links = qsa("[data-contact-link]");
  if (links.length === 0) return;

  const normalizeTg = (raw) => {
    const v = String(raw || "").trim();
    if (!v) return { href: "", label: "" };
    const noAt = v.startsWith("@") ? v.slice(1) : v;
    if (/^https?:\/\//i.test(noAt)) return { href: noAt, label: noAt };
    return { href: `https://t.me/${noAt}`, label: `@${noAt}` };
  };

  const tgPrimary = CONTACTS.telegramManager || CONTACTS.telegramBot || "";
  const tgManager = CONTACTS.telegramManager || "";
  const tgBot = CONTACTS.telegramBot || "";

  for (const a of links) {
    const kind = a.getAttribute("data-contact-link");
    if (kind === "email" && CONTACTS.email) {
      const current = a.getAttribute("href") || "";
      const q = current.includes("?") ? current.slice(current.indexOf("?")) : "";
      a.setAttribute("href", `mailto:${CONTACTS.email}${q}`);
      if (a.textContent.includes("@")) a.textContent = CONTACTS.email;
    }

    if (kind === "telegram" && tgPrimary) {
      const { href, label } = normalizeTg(tgPrimary);
      if (href) a.setAttribute("href", href);
      if (a.textContent.trim().startsWith("@") && label) a.textContent = label;
    }

    if (kind === "telegram-manager") {
      if (!tgManager) {
        a.closest("li")?.remove();
      } else {
        const { href, label } = normalizeTg(tgManager);
        if (href) a.setAttribute("href", href);
        if (a.textContent.trim().startsWith("@") && label) a.textContent = label;
      }
    }

    if (kind === "telegram-bot") {
      if (!tgBot) {
        a.closest("li")?.remove();
      } else {
        const { href, label } = normalizeTg(tgBot);
        if (href) a.setAttribute("href", href);
        if (a.textContent.trim().startsWith("@") && label) a.textContent = label;
      }
    }

    if (kind === "phone" && CONTACTS.phoneTel) {
      a.setAttribute("href", `tel:${CONTACTS.phoneTel}`);
      if (CONTACTS.phoneDisplay) {
        // Header phone has custom markup: "Телефон:" + bold number
        if (a.classList.contains("header-phone")) {
          const num = a.querySelector(".header-phone-number");
          if (num) num.textContent = CONTACTS.phoneDisplay;
        } else {
          a.textContent = CONTACTS.phoneDisplay;
        }
      }
    }
  }
}

async function initIndexFeatured() {
  const grid = document.getElementById("main-equipment-grid");
  if (!grid) return;

  let byId = new Map();
  const modal = initEquipmentModal((id) => byId.get(String(id)));

  const render = async () => {
    const data = await loadEquipmentData();
    const all = (data.items || []).filter((x) => x);
    // Если в источнике нет колонки “На главной”, showOnMain будет false и блок окажется пустым.
    // В этом случае показываем первые позиции, чтобы главная не выглядела “пустой”.
    const marked = all.filter((x) => x.showOnMain);
    const items = (marked.length ? marked : all).slice(0, 8);
    byId = new Map(items.map((x) => [String(x.id), x]));
    grid.innerHTML = "";
    if (items.length === 0) {
      grid.innerHTML = `<div class="empty-state">Каталог пуст. Проверьте источник данных (Google Apps Script) или заполните fallback JSON.</div>`;
      return;
    }
    items.forEach((it) => grid.appendChild(createEquipmentCard(it)));
    initRevealAnimations();
  };

  try {
    await render();

    window.addEventListener("equipmentUpdated", () => {
      render().catch(() => {});
    });

    const open = (id) => modal?.openById(String(id));

    grid.addEventListener("click", (e) => {
      const card = e.target.closest?.(".equipment-card");
      if (!card) return;
      open(card.dataset.itemId);
    });

    grid.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const card = e.target.closest?.(".equipment-card");
      if (!card) return;
      e.preventDefault();
      open(card.dataset.itemId);
    });
  } catch (e) {
    grid.innerHTML = `<div class="empty-state">Не удалось загрузить каталог. Проверьте настройки или попробуйте позже.</div>`;
    console.warn(e);
  }
}

function renderCategoryFilters(container, categories) {
  container.innerHTML = "";

  const makeTile = ({ id, name }) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "category-tile";
    b.dataset.filter = id;

    const imgSrc = CATEGORY_TILE_IMAGES[id] || "";
    b.innerHTML = `
      <span class="category-tile-thumb" aria-hidden="true">
        ${imgSrc ? `<img src="${imgSrc}" alt="" loading="lazy" onerror="this.remove()" />` : ""}
      </span>
      <span class="category-tile-name">${escapeText(name)}</span>
    `;

    return b;
  };

  container.appendChild(makeTile({ id: "all", name: "Все" }));
  for (const cat of categories) {
    container.appendChild(makeTile({ id: cat.id, name: cat.name }));
  }
}

function escapeText(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function initCatalogPage() {
  const grid = document.getElementById("catalog-grid");
  const filters = document.getElementById("category-filters");
  const search = document.getElementById("search");
  const empty = document.getElementById("empty-state");
  if (!grid || !filters) return;

  try {
    let items = [];
    let categories = [];
    let byId = new Map();
    const modal = initEquipmentModal((id) => byId.get(String(id)));

    let activeFilter = "all";
    let query = "";

    const apply = () => {
      const q = query.trim().toLowerCase();
      const visible = items.filter((it) => {
        if (!it) return false;
        if (activeFilter !== "all" && it.category !== activeFilter) return false;
        if (q && !String(it.name || "").toLowerCase().includes(q)) return false;
        return true;
      });

      grid.innerHTML = "";
      visible.forEach((it) => grid.appendChild(createEquipmentCard(it)));
      initRevealAnimations();

      if (empty) empty.hidden = visible.length > 0;
    };

    const loadAndRender = async () => {
      const data = await loadEquipmentData();
      items = Array.isArray(data.items) ? data.items : [];
      categories = Array.isArray(data.categories) ? data.categories : [];
      byId = new Map(items.map((x) => [String(x.id), x]));
      renderCategoryFilters(filters, categories);

      // Если текущий фильтр больше не существует — сбрасываем на all
      const validFilters = new Set(["all", ...categories.map((c) => c.id)]);
      if (!validFilters.has(activeFilter)) activeFilter = "all";
      const activeBtn =
        filters.querySelector(`button[data-filter="${activeFilter}"]`) ||
        filters.querySelector(`button[data-filter="all"]`);
      if (activeBtn) qsa("button[data-filter]", filters).forEach((b) => b.classList.toggle("is-active", b === activeBtn));

      apply();
    };

    filters.addEventListener("click", (e) => {
      const btn = e.target.closest?.("button[data-filter]");
      if (!btn) return;
      activeFilter = btn.dataset.filter || "all";
      qsa("button[data-filter]", filters).forEach((b) => b.classList.toggle("is-active", b === btn));
      apply();
    });

    if (search) {
      search.addEventListener("input", () => {
        query = search.value || "";
        apply();
      });
    }

    const open = (id) => modal?.openById(String(id));

    grid.addEventListener("click", (e) => {
      const card = e.target.closest?.(".equipment-card");
      if (!card) return;
      open(card.dataset.itemId);
    });

    grid.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const card = e.target.closest?.(".equipment-card");
      if (!card) return;
      e.preventDefault();
      open(card.dataset.itemId);
    });

    await loadAndRender();

    window.addEventListener("equipmentUpdated", () => {
      loadAndRender().catch(() => {});
    });
  } catch (e) {
    grid.innerHTML = `<div class="empty-state">Не удалось загрузить каталог. Проверьте настройки endpoint.</div>`;
    if (empty) empty.hidden = true;
    console.warn(e);
  }
}

initYear();
initRuntimeGuards();
initThemeToggle();
initMobileNav();
initBackToTop();
initRevealAnimations();
forceRevealFallback();
initContactBindings();
initFab();
initForms();

// Page-specific init
initIndexFeatured();
initCatalogPage();


