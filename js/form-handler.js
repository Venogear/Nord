import { sendLead } from "./lead-sender.js";

function normalizePhoneRu(input) {
  const digits = String(input || "").replace(/\D+/g, "");
  if (!digits) return "";
  // 8XXXXXXXXXX -> 7XXXXXXXXXX
  if (digits.length === 11 && digits.startsWith("8")) return `+7${digits.slice(1)}`;
  if (digits.length === 11 && digits.startsWith("7")) return `+${digits}`;
  // XXXXXXXXXX -> +7XXXXXXXXXX
  if (digits.length === 10) return `+7${digits}`;
  // already +7... typed with plus removed by replace
  if (digits.length === 12 && digits.startsWith("77")) return `+${digits.slice(1)}`;
  return `+${digits}`; // best-effort
}

function isValidPhoneRu(input) {
  const n = normalizePhoneRu(input);
  return /^\+7\d{10}$/.test(n);
}

function isValidEmail(input) {
  if (!input) return true; // optional
  const s = String(input).trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function getDraftKey(form) {
  const id = form.getAttribute("data-lead-form") || "lead";
  return `stroytech_lead_draft_v1:${location.pathname}:${id}`;
}

function setFieldError(fieldEl, msg) {
  const wrap = fieldEl.closest(".field") || fieldEl.parentElement;
  if (!wrap) return;
  wrap.classList.toggle("is-error", Boolean(msg));
  const name = fieldEl.name;
  const err = wrap.querySelector(`[data-error-for="${cssEscape(name)}"]`);
  if (err) err.textContent = msg || "";
}

function cssEscape(s) {
  // minimal escape for attribute selector usage
  return String(s).replaceAll('"', '\\"');
}

function validateField(form, fieldEl) {
  const name = fieldEl.name;
  const type = fieldEl.type;

  if (type === "checkbox" && name === "consent") {
    const ok = fieldEl.checked;
    setFieldError(fieldEl, ok ? "" : "Нужно согласие на обработку данных");
    return ok;
  }

  if (name === "name") {
    const ok = String(fieldEl.value || "").trim().length >= 2;
    setFieldError(fieldEl, ok ? "" : "Введите имя (минимум 2 символа)");
    return ok;
  }

  if (name === "phone") {
    const ok = isValidPhoneRu(fieldEl.value);
    setFieldError(fieldEl, ok ? "" : "Введите телефон в формате РФ (например, +7 999 123‑45‑67)");
    return ok;
  }

  if (name === "email") {
    const ok = isValidEmail(fieldEl.value);
    setFieldError(fieldEl, ok ? "" : "Проверьте email");
    return ok;
  }

  // default: respect required
  if (fieldEl.required) {
    const ok = String(fieldEl.value || "").trim().length > 0;
    setFieldError(fieldEl, ok ? "" : "Поле обязательно");
    return ok;
  }

  setFieldError(fieldEl, "");
  return true;
}

function validateForm(form) {
  const fields = Array.from(form.querySelectorAll("input,select,textarea")).filter((el) => el.name);
  let ok = true;
  for (const f of fields) ok = validateField(form, f) && ok;
  return ok;
}

function getLeadPayload(form) {
  const fd = new FormData(form);
  const payload = Object.fromEntries(fd.entries());
  payload.phoneNormalized = normalizePhoneRu(payload.phone);
  payload.name = String(payload.name || "").trim();
  payload.phone = String(payload.phone || "").trim();
  payload.email = String(payload.email || "").trim();
  payload.message = String(payload.message || "").trim();
  payload.service = String(payload.service || "").trim();
  payload.consent = fd.get("consent") ? true : false;
  payload.sourceForm = form.getAttribute("data-lead-form") || "";
  return payload;
}

function setSubmitting(form, submitting) {
  const btn = form.querySelector('button[type="submit"]');
  if (!btn) return;
  btn.disabled = submitting;
  btn.classList.toggle("is-loading", submitting);
}

function setStatus(form, { type, message }) {
  const box = form.querySelector(".form-status");
  if (!box) return;
  box.classList.remove("is-success", "is-error");
  if (type === "success") box.classList.add("is-success");
  if (type === "error") box.classList.add("is-error");
  box.textContent = message || "";
}

function saveDraft(form) {
  const key = getDraftKey(form);
  const payload = getLeadPayload(form);
  // Не сохраняем consent, чтобы не было “авто-согласия”.
  delete payload.consent;
  localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), payload }));
}

function restoreDraft(form) {
  const key = getDraftKey(form);
  const raw = localStorage.getItem(key);
  if (!raw) return;
  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return;
  }
  if (!parsed?.payload) return;
  const p = parsed.payload;
  for (const [k, v] of Object.entries(p)) {
    const el = form.elements.namedItem(k);
    if (!el) continue;
    // elements.namedItem может вернуть RadioNodeList
    if ("value" in el) el.value = String(v ?? "");
  }
}

function clearDraft(form) {
  localStorage.removeItem(getDraftKey(form));
}

export function initForms() {
  const forms = Array.from(document.querySelectorAll("form.lead-form[data-lead-form]"));
  if (forms.length === 0) return;

  // Prefill from query params (used by parts pages)
  // Example:
  // contacts.html?domain=road&cat=front_loaders&catName=...&brand=xcmg&brandName=XCMG#lead
  const prefill = new URLSearchParams(location.search || "");
  const preDomain = (prefill.get("domain") || "").trim();
  const preCat = (prefill.get("cat") || "").trim();
  const preCatName = (prefill.get("catName") || "").trim();
  const preBrand = (prefill.get("brand") || "").trim();
  const preBrandName = (prefill.get("brandName") || "").trim();

  for (const form of forms) {
    restoreDraft(form);
    setStatus(form, { type: "", message: "" });

    // Apply prefill (doesn't override existing user input/draft unless empty)
    if (preCat || preBrand) {
      const service = form.querySelector('select[name="service"]');
      if (service && !service.value) service.value = "Запчасти";

      const msg = form.querySelector('textarea[name="message"]');
      if (msg && !msg.value) {
        const domainLabel =
          preDomain === "warehouse" ? "Складская техника" : preDomain === "road" ? "Дорожно‑строительная техника" : "";
        const catLabel = preCatName || preCat;
        const brandLabel = preBrandName || preBrand;
        const lines = [
          "Запрос запчастей:",
          domainLabel ? `Направление: ${domainLabel}` : "",
          catLabel ? `Категория: ${catLabel}` : "",
          brandLabel ? `Бренд: ${brandLabel}` : "",
          "",
          "Укажите, пожалуйста, артикул/модель/кол-во и город доставки.",
        ].filter(Boolean);
        msg.value = lines.join("\n");
      }
    }

    const fields = Array.from(form.querySelectorAll("input,select,textarea")).filter((el) => el.name);
    for (const f of fields) {
      f.addEventListener("input", () => {
        validateField(form, f);
        saveDraft(form);
      });
      f.addEventListener("blur", () => validateField(form, f));
    }

    let dirty = false;
    form.addEventListener("input", () => (dirty = true));

    window.addEventListener("beforeunload", (e) => {
      if (!dirty) return;
      // если есть хоть что-то заполнено — предупреждаем
      const payload = getLeadPayload(form);
      const hasAny =
        payload.name ||
        payload.phone ||
        payload.email ||
        payload.message ||
        payload.service ||
        false;
      if (!hasAny) return;
      e.preventDefault();
      e.returnValue = "";
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      setStatus(form, { type: "", message: "" });

      const ok = validateForm(form);
      if (!ok) {
        setStatus(form, { type: "error", message: "Проверьте поля формы и попробуйте снова." });
        return;
      }

      const lead = getLeadPayload(form);
      setSubmitting(form, true);
      try {
        const result = await sendLead(lead);
        if (result && result.opaque) {
          setStatus(form, {
            type: "success",
            message:
              "Заявка отправлена. Если вы не получили сообщение в Telegram, проверьте Apps Script → Executions (возможно, ошибка отправки в Telegram).",
          });
        } else {
          setStatus(form, { type: "success", message: "Заявка отправлена. Мы скоро свяжемся!" });
        }
        clearDraft(form);
        form.reset();
        dirty = false;
      } catch (err) {
        setStatus(form, {
          type: "error",
          message: `Не удалось отправить заявку. ${err?.message ? String(err.message) : ""}`.trim(),
        });
      } finally {
        setSubmitting(form, false);
      }
    });
  }
}


