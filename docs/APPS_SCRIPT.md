# Google Apps Script (Web App): прием заявок

ВАЖНО:
- Параметры **Telegram** (`TG_BOT_TOKEN`, `TG_CHAT_ID`) и (опционально) **Email** (`LEADS_EMAIL_TO`) задаются **внутри Google Apps Script** (в вашей таблице: **Extensions → Apps Script** → файл `Code.gs`).
- Эти значения являются **секретами** (особенно `TG_BOT_TOKEN`). Их **нельзя** публиковать в GitHub, пересылать в чат, вставлять в публичные документы/инструкции.
- В репозитории/документации должны оставаться **пустые значения** (пример: `const TG_BOT_TOKEN = "";`).

Ниже — минимальный шаблон Apps Script, который:

- по `POST ?action=lead` принимает заявку и записывает в Google Таблицу, отправляет в Telegram и/или на email

## 1) Создание

1. Создайте новую Google Таблицу для хранения заявок.
2. Откройте **Extensions → Apps Script**.
3. Вставьте код ниже в `Code.gs`.
4. Заполните настройки: `LEADS_EMAIL_TO`, `TG_BOT_TOKEN`, `TG_CHAT_ID`.
5. **Deploy → New deployment → Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Скопируйте URL деплоя и подставьте в `js/config.js`:
   - `ENDPOINTS.leadSubmit = "<URL>?action=lead"`

## 2) Code.gs (пример)

Важно: в Apps Script вставляйте **только код**, без строк ```javascript / ``` и без Markdown-форматирования.
Если копируете из этой инструкции — копируйте содержимое **внутри** блока кода (не включая тройные кавычки).

```javascript
// === Stroytech: Apps Script Web App ===
// Endpoints:
// - POST ?action=lead     -> прием заявки + запись в лист leads + (опц.) Telegram/email
//
// ВАЖНО: токен Telegram и chat_id храните ТОЛЬКО здесь (в Apps Script), не на сайте.

// --- Листы таблицы ---
// Заявки
const SHEET_LEADS = "leads";

// --- Настройки уведомлений (опционально) ---
const LEADS_EMAIL_TO = ""; // например: "you@company.ru"
const TG_BOT_TOKEN = "";   // пример: "123456:ABC..." (секрет)
const TG_CHAT_ID = "";     // пример: "123456789" или "-1001234567890"

function doGet(e) {
  return jsonResponse({ ok: false, error: "Only POST requests are supported for leads" }, 400);
}

function doPost(e) {
  const action = (e && e.parameter && e.parameter.action) || "";
  if (action !== "lead") return jsonResponse({ ok: false, error: "Unknown action" }, 400);

  let payload = {};
  try {
    payload = JSON.parse((e && e.postData && e.postData.contents) || "{}");
  } catch (err) {
    return jsonResponse({ ok: false, error: "Invalid JSON" }, 400);
  }

  // Серверная валидация (минимальная)
  if (!payload.name || String(payload.name).trim().length < 2) {
    return jsonResponse({ ok: false, error: "Name is required" }, 400);
  }
  if (!payload.phoneNormalized || !/^\+7\d{10}$/.test(String(payload.phoneNormalized))) {
    return jsonResponse({ ok: false, error: "Phone is invalid" }, 400);
  }
  if (!payload.consent) {
    return jsonResponse({ ok: false, error: "Consent is required" }, 400);
  }

  // 1) запись в таблицу
  saveLeadToSheet(payload);

  // 2) уведомления
  if (TG_BOT_TOKEN && TG_CHAT_ID) {
    sendTelegram(payload); // если будет ошибка — увидите в Executions
  }
  if (LEADS_EMAIL_TO) {
    sendEmail(payload);
  }

  return jsonResponse({ ok: true });
}

// === Заявки ===
function saveLeadToSheet(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_LEADS);
  if (!sh) {
    sh = ss.insertSheet(SHEET_LEADS);
    sh.appendRow(["ts", "name", "phone", "phoneNormalized", "email", "service", "message", "url"]);
  }
  const ts = new Date().toISOString();
  sh.appendRow([
    ts,
    payload.name || "",
    payload.phone || "",
    payload.phoneNormalized || "",
    payload.email || "",
    payload.service || "",
    payload.message || "",
    (payload.meta && payload.meta.url) || ""
  ]);
}

function sendTelegram(payload) {
  const text =
    "Новая заявка с сайта\n" +
    "Имя: " + (payload.name || "") + "\n" +
    "Телефон: " + (payload.phoneNormalized || payload.phone || "") + "\n" +
    "Email: " + (payload.email || "") + "\n" +
    "Услуга: " + (payload.service || "") + "\n" +
    "Сообщение: " + (payload.message || "") + "\n" +
    "URL: " + ((payload.meta && payload.meta.url) || "");

  const url = "https://api.telegram.org/bot" + TG_BOT_TOKEN + "/sendMessage";
  const res = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ chat_id: TG_CHAT_ID, text: text }),
    muteHttpExceptions: true
  });

  const body = res.getContentText();
  // Если Telegram вернул ошибку — пусть будет видно в Executions
  const obj = JSON.parse(body);
  if (!obj.ok) throw new Error(body);
  return body;
}

function sendEmail(payload) {
  const subject = "Заявка с сайта Stroytech";
  const body =
    "Новая заявка\n\n" +
    "Имя: " + (payload.name || "") + "\n" +
    "Телефон: " + (payload.phoneNormalized || payload.phone || "") + "\n" +
    "Email: " + (payload.email || "") + "\n" +
    "Услуга: " + (payload.service || "") + "\n\n" +
    "Сообщение:\n" + (payload.message || "") + "\n\n" +
    "URL: " + ((payload.meta && payload.meta.url) || "");

  MailApp.sendEmail(LEADS_EMAIL_TO, subject, body);
}

// === Helpers ===
function sheetToObjects(sheet) {
  const values = sheet.getDataRange().getValues();
  if (!values || values.length < 2) return [];
  const headers = values[0].map((h) => String(h || "").trim());
  const rows = values.slice(1);
  return rows.map((row) => {
    const obj = {};
    headers.forEach((h, i) => (obj[h] = row[i]));
    return obj;
  });
}

function jsonResponse(obj, code) {
  // Важно: ContentService не умеет setHeader() -> CORS заголовки здесь не ставим.
  // Для статического сайта это ок: мы используем отправку без preflight.
  const output = ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
  if (code) output.setContent(JSON.stringify({ ...obj, status: code }));
  return output;
}
```

## 3) Примечания по безопасности

- `TG_BOT_TOKEN` хранится **только** в Apps Script.
- Доступ Web App “Anyone” нужен, чтобы сайт со статического хостинга мог читать/отправлять без авторизации.
- Если хотите ограничить доступ — можно добавить простую проверку `?key=...` и проверять его в скрипте.


