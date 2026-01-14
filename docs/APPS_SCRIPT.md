# Google Apps Script (Web App): каталог + заявки

ВАЖНО:
- Параметры **Telegram** (`TG_BOT_TOKEN`, `TG_CHAT_ID`) и (опционально) **Email** (`LEADS_EMAIL_TO`) задаются **внутри Google Apps Script** (в вашей таблице: **Extensions → Apps Script** → файл `Code.gs`).
- Эти значения являются **секретами** (особенно `TG_BOT_TOKEN`). Их **нельзя** публиковать в GitHub, пересылать в чат, вставлять в публичные документы/инструкции.
- В репозитории/документации должны оставаться **пустые значения** (пример: `const TG_BOT_TOKEN = "";`).

Ниже — минимальный шаблон Apps Script, который:

- по `GET ?action=catalog` возвращает JSON каталога (как `data/equipment.json`)
- по `GET ?action=parts` возвращает JSON запчастей (категории/бренды) для страниц **Запчасти для дорожно‑строительной техники** / **Запчасти для складской техники**
- по `POST ?action=lead` принимает заявку и (опционально) отправляет в Telegram и/или на email

## 1) Создание

1. Создайте Google Таблицу по структуре `docs/GOOGLE_SHEET_CATALOG.md`.
2. Откройте **Extensions → Apps Script**.
3. Вставьте код ниже в `Code.gs`.
4. **Deploy → New deployment → Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Скопируйте URL деплоя и подставьте в `js/config.js`:
   - `ENDPOINTS.catalogJson = "<URL>?action=catalog"`
   - `ENDPOINTS.partsJson = "<URL>?action=parts"`
   - `ENDPOINTS.leadSubmit = "<URL>?action=lead"`

Важно про тип скрипта:
- Если вы открыли Apps Script **через таблицу** (Extensions → Apps Script), скрипт “container‑bound”, и `SpreadsheetApp.getActiveSpreadsheet()` работает.
- Если вы создали Apps Script как **отдельный проект** (не из таблицы), то `getActiveSpreadsheet()` может быть `null`.
  В этом случае замените строку в `buildCatalog()`:
  - `const ss = SpreadsheetApp.getActiveSpreadsheet();`
  на:
  - `const ss = SpreadsheetApp.openById("ВАШ_SPREADSHEET_ID");`
  где `SPREADSHEET_ID` — это часть URL таблицы между `/d/` и `/edit`.

## 2) Code.gs (пример)

Важно: в Apps Script вставляйте **только код**, без строк ```javascript / ``` и без Markdown-форматирования.
Если копируете из этой инструкции — копируйте содержимое **внутри** блока кода (не включая тройные кавычки).

```javascript
// === Stroytech: Apps Script Web App ===
// Endpoints:
// - GET  ?action=catalog  -> JSON каталога техники (как equipment.json)
// - GET  ?action=parts    -> JSON запчастей (категории/бренды) для parts-road/parts-warehouse
// - POST ?action=lead     -> прием заявки + запись в лист leads + (опц.) Telegram/email
//
// ВАЖНО: токен Telegram и chat_id храните ТОЛЬКО здесь (в Apps Script), не на сайте.

// --- Листы таблицы ---
// Каталог техники (вариант A: один лист с русскими колонками)
const SHEET_CATALOG_RU = "Catalog";
// Каталог техники (вариант B: два листа с англ. колонками)
const SHEET_CATEGORIES = "categories";
const SHEET_ITEMS = "items";
// Запчасти (новая структура)
const SHEET_PARTS = "Parts";
// Заявки
const SHEET_LEADS = "leads";

// --- Настройки уведомлений (опционально) ---
const LEADS_EMAIL_TO = ""; // например: "you@company.ru"
const TG_BOT_TOKEN = "";   // пример: "123456:ABC..." (секрет)
const TG_CHAT_ID = "";     // пример: "123456789" или "-1001234567890"

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || "";
  if (action === "catalog") return jsonResponse(buildCatalog());
  if (action === "parts") return jsonResponse(buildParts());
  return jsonResponse({ ok: false, error: "Unknown action", available: ["catalog", "parts"] }, 400);
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

// === 1) Каталог техники ===
function buildCatalog() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Вариант A: один лист "Catalog" (русские колонки)
  const ruSheet = ss.getSheetByName(SHEET_CATALOG_RU);
  if (ruSheet) {
    const rows = sheetToObjects(ruSheet);

    const categoryIdByName = {
      "экскаваторы": "excavators",
      "бульдозеры": "bulldozers",
      "итп": "itp"
    };

    const items = rows
      .map((r) => {
        const categoryName = String(r["Категория"] || "").trim();
        const catKey = categoryName.toLowerCase();
        const categoryId = categoryIdByName[catKey] || slugify(catKey) || catKey;

        const shortDesc = String(r["Краткое описание"] || "").trim();
        return {
          id: Number(r["ID"]),
          category: categoryId,
          name: String(r["Название"] || "").trim(),
          shortDesc: shortDesc,
          fullDesc: shortDesc,
          priceRent: String(r["Цена аренды"] || "").trim(),
          priceBuy: String(r["Цена покупки"] || "").trim(),
          image: String(r["Изображение"] || "").trim(),
          specs: parseSpecs(r["Характеристики"]),
          available: toBool(r["В наличии"]),
          featured: toBool(r["На главной"]),
          showOnMain: toBool(r["На главной"])
        };
      })
      .filter((x) => x.id && x.category && x.name);

    const nameById = {
      excavators: "Экскаваторы",
      bulldozers: "Бульдозеры",
      itp: "ИТП"
    };

    const cats = {};
    items.forEach((it) => (cats[it.category] = true));
    const categories = Object.keys(cats).map((id) => ({ id, name: nameById[id] || id }));

    return { lastUpdated: new Date().toISOString().slice(0, 10), categories, items };
  }

  // Вариант B: два листа categories/items (англ. колонки)
  const catSheet = ss.getSheetByName(SHEET_CATEGORIES);
  const itemsSheet = ss.getSheetByName(SHEET_ITEMS);
  if (!catSheet || !itemsSheet) {
    return { lastUpdated: new Date().toISOString().slice(0, 10), categories: [], items: [] };
  }

  const categories = sheetToObjects(catSheet)
    .map((c) => ({ id: String(c.id || "").trim(), name: String(c.name || "").trim() }))
    .filter((c) => c.id && c.name);

  const items = sheetToObjects(itemsSheet)
    .map((it) => ({
      id: Number(it.id),
      category: String(it.category || "").trim(),
      name: String(it.name || "").trim(),
      shortDesc: String(it.shortDesc || "").trim(),
      fullDesc: String(it.fullDesc || "").trim(),
      priceRent: String(it.priceRent || "").trim(),
      priceBuy: String(it.priceBuy || "").trim(),
      image: String(it.image || "").trim(),
      specs: parseSpecs(it.specs),
      available: toBool(it.available),
      featured: toBool(it.featured),
      showOnMain: toBool(it.showOnMain)
    }))
    .filter((x) => x.id && x.category && x.name);

  return { lastUpdated: new Date().toISOString().slice(0, 10), categories, items };
}

// === 2) Запчасти (Parts) ===
// Лист "Parts" со столбцами:
// Domain | CategoryId | CategoryName | BrandId | BrandName | BrandImage | BrandChips
// Domain: "road" или "warehouse"
function buildParts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET_PARTS);

  const out = {
    lastUpdated: new Date().toISOString().slice(0, 10),
    source: sh ? "Google Sheets" : "missing_sheet",
    domains: {
      road: { name: "Дорожно‑строительная техника", categories: [] },
      warehouse: { name: "Складская техника", categories: [] }
    },
    brandsByCategory: {}
  };

  if (!sh) return out;

  const rows = sheetToObjects(sh);
  const catSeenByDomain = { road: {}, warehouse: {} };
  const brandSeenByCat = {}; // {catId:{brandId:true}}

  rows.forEach((r) => {
    const domain = String(r["Domain"] || "").trim().toLowerCase();
    if (domain !== "road" && domain !== "warehouse") return;

    const categoryId = String(r["CategoryId"] || "").trim();
    const categoryName = String(r["CategoryName"] || "").trim();
    const brandId = String(r["BrandId"] || "").trim().toLowerCase();
    const brandName = String(r["BrandName"] || "").trim();
    const brandImage = String(r["BrandImage"] || "").trim();
    const brandChips = String(r["BrandChips"] || "").trim();

    if (!categoryId || !categoryName) return;

    // categories (unique)
    if (!catSeenByDomain[domain][categoryId]) {
      catSeenByDomain[domain][categoryId] = true;
      out.domains[domain].categories.push({ id: categoryId, name: categoryName, image: "" });
    }

    // brandsByCategory (unique)
    out.brandsByCategory[categoryId] = out.brandsByCategory[categoryId] || [];
    brandSeenByCat[categoryId] = brandSeenByCat[categoryId] || {};
    if (brandId && brandName && !brandSeenByCat[categoryId][brandId]) {
      brandSeenByCat[categoryId][brandId] = true;
      out.brandsByCategory[categoryId].push({ id: brandId, name: brandName, image: brandImage, chips: brandChips });
    }
  });

  return out;
}

// === 3) Заявки ===
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
function parseSpecs(value) {
  const s = String(value || "").trim();
  if (!s) return [];
  return s
    .split(/[,;|]/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

function toBool(v) {
  const s = String(v || "").trim().toLowerCase();
  if (s === "false" || s === "0" || s === "no" || s === "нет") return false;
  return s === "true" || s === "1" || s === "yes" || s === "да";
}

function slugify(s) {
  // простой слаг: латиница/цифры/- (для id)
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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


