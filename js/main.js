import { initRevealAnimations } from "./scroll-animations.js";
import { initFab } from "./fab.js";
import { initForms } from "./form-handler.js";
import { CONTACTS } from "./config.js";

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
  // Частая причина "пустых страниц": открыли через file:// и fetch() не работает.
  if (location.protocol === "file:") {
    showRuntimeBanner("Откройте сайт через локальный сервер (например, http://localhost:8080/), а не через file:// — иначе скрипты могут не загрузиться.");
  }

  window.addEventListener("error", (e) => {
    const msg = e?.message ? String(e.message) : "Ошибка выполнения скрипта";
    showRuntimeBanner(`Ошибка на странице: ${msg}. Откройте DevTools → Console для деталей.`);
  });

  window.addEventListener("unhandledrejection", (e) => {
    const msg = e?.reason?.message ? String(e.reason.message) : String(e.reason || "Ошибка запроса");
    showRuntimeBanner(`Ошибка запроса: ${msg}. Проверьте, что сайт открыт через http:// и что доступны endpoints/файлы.`);
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


