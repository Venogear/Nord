import { ENDPOINTS } from "./config.js";

async function postJson(url, payload, { timeoutMs = 15000 } = {}) {
  // Важно: Apps Script Web App часто не поддерживает CORS-preflight (OPTIONS).
  // Поэтому отправляем "simple request" без application/json (text/plain),
  // чтобы браузер не делал preflight и запрос доходил до doPost.
  const body = JSON.stringify(payload);

  try {
    const controller = "AbortController" in window ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    const res = await fetch(url, {
      method: "POST",
      body,
      redirect: "follow",
      // НЕ добавляем headers: application/json -> иначе будет preflight
      ...(controller ? { signal: controller.signal } : {}),
    });
    if (timer) clearTimeout(timer);

    const text = await res.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      // non-JSON response
    }

    if (!res.ok) {
      const msg = (data && (data.error || data.message)) || `HTTP ${res.status}`;
      throw new Error(msg);
    }

    return data || { ok: true };
  } catch (err) {
    // Если браузер всё равно блокирует CORS (TypeError: Failed to fetch),
    // делаем fallback no-cors. Мы не можем прочитать ответ, но запрос уйдёт.
    if (err?.name === "AbortError") {
      throw new Error("Превышено время ожидания ответа (таймаут)");
    }
    if (String(err?.message || "").toLowerCase().includes("failed to fetch")) {
      const controller = "AbortController" in window ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
      await fetch(url, {
        method: "POST",
        mode: "no-cors",
        body,
        redirect: "follow",
        ...(controller ? { signal: controller.signal } : {}),
      });
      if (timer) clearTimeout(timer);
      return { ok: true, opaque: true };
    }
    throw err;
  }
}

export async function sendLead(lead) {
  if (!ENDPOINTS.leadSubmit) {
    // В dev режиме лучше явно сообщить, что endpoint не настроен.
    throw new Error("Lead endpoint is not configured (ENDPOINTS.leadSubmit).");
  }

  return await postJson(ENDPOINTS.leadSubmit, {
    ...lead,
    meta: {
      url: location.href,
      referrer: document.referrer || "",
      userAgent: navigator.userAgent,
      ts: new Date().toISOString(),
    },
  });
}


