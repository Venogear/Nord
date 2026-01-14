import { CONTACTS, PREFILL } from "./config.js";

function buildTelegramUrl() {
  const raw = (CONTACTS.telegramManager || CONTACTS.telegramBot || "").trim();
  if (!raw) return "";
  const u = raw.startsWith("@") ? raw.slice(1) : raw;
  // Если пользователь передал полный URL — используем как есть.
  if (/^https?:\/\//i.test(u)) return u;
  // Для бота/профиля самый надежный вариант — прямой t.me/<username>.
  // Prefill текста в личное сообщение боту стандартными ссылками работает ненадежно,
  // поэтому оставляем PREFILL для будущих расширений.
  void PREFILL;
  return `https://t.me/${encodeURIComponent(u)}`;
}

function buildMailtoUrl() {
  const email = CONTACTS.email?.trim();
  if (!email) return "";
  const subject = encodeURIComponent(PREFILL.emailSubject || "");
  const body = encodeURIComponent(PREFILL.emailBody || "");
  return `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`;
}

export function initFab() {
  const root = document.querySelector("[data-fab]");
  if (!root) return;

  const btn = root.querySelector(".fab-btn");
  const menu = root.querySelector(".fab-menu");
  if (!btn || !menu) return;

  const items = [
    {
      label: "Telegram",
      href: buildTelegramUrl(),
      dotColor: "var(--blue)",
    },
    {
      label: "Email",
      href: buildMailtoUrl(),
      dotColor: "var(--red)",
    },
  ].filter((x) => Boolean(x.href));

  menu.innerHTML = items
    .map(
      (it) => `
        <a class="fab-link" href="${it.href}" target="${it.href.startsWith("http") ? "_blank" : "_self"}" rel="noopener">
          <span class="fab-dot" style="background:${it.dotColor}"></span>
          <span>${it.label}</span>
        </a>
      `
    )
    .join("");

  const setOpen = (open) => {
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    menu.hidden = !open;
  };

  const toggle = () => setOpen(menu.hidden);

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    toggle();
  });

  document.addEventListener("click", (e) => {
    if (menu.hidden) return;
    if (root.contains(e.target)) return;
    setOpen(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });
}


