// Централизованные настройки — меняются в одном месте.
// Важно: не храните Telegram Bot Token в браузерном JS. Для заявок используем Apps Script endpoint.

export const CONTACTS = {
  phoneDisplay: "+7 (495) 136‑82‑73",
  phoneTel: "+74951368273",
  email: "Venogear@gmail.com",
  // Telegram менеджера (обычный контакт). Можно указать "username", "@username" или полный URL https://t.me/username
  telegramManager: "@Venogear",
  // Telegram-бот (если хотите показывать отдельно в контактах)
  telegramBot: "@StroyTechMSK_bot",
};

export const PREFILL = {
  telegramText: "Здравствуйте! Нужна консультация по технике. Подскажите, пожалуйста.",
  emailSubject: "Заявка с сайта Норд Вест",
  emailBody: "Здравствуйте!\n\nХочу получить консультацию по технике.\n\nТелефон: \nГород/объект: \nСроки: \n\nСпасибо.",
};

export const ENDPOINTS = {
  // Каталог из Google Apps Script (Web App), который возвращает JSON формата equipment.json.
  // Пример: https://script.google.com/macros/s/AKfycb.../exec?action=catalog
  catalogJson:
    "https://script.google.com/macros/s/AKfycbxOKXn0mZc9vVoDkRgHe-QWIhEa8nX5UyMV-76rRoRcEqaVQ9VzYWUzPs4rl8bpbsTZqQ/exec?action=catalog",

  // Запчасти (Parts): Apps Script endpoint, который возвращает структуру категорий/брендов.
  // Пример: https://script.google.com/macros/s/AKfycb.../exec?action=parts
  // Если захотите подключить Google Sheet — вставьте сюда URL Web App с `?action=parts`.
  partsJson: "",

  // Заявки: Apps Script endpoint, который принимает POST JSON и отправляет в Telegram/Email.
  // Пример: https://script.google.com/macros/s/AKfycb.../exec?action=lead
  leadSubmit:
    "https://script.google.com/macros/s/AKfycbxOKXn0mZc9vVoDkRgHe-QWIhEa8nX5UyMV-76rRoRcEqaVQ9VzYWUzPs4rl8bpbsTZqQ/exec?action=lead",
};

export const CACHE = {
  equipmentKey: "stroytech_equipment_cache_v1",
  equipmentTtlMs: 60 * 60 * 1000, // 1 час
  // v2: чтобы сбросить старый кэш после добавления chips на бренд-плитки
  // v3: сброс кэша после отключения remote parts endpoint
  partsKey: "stroytech_parts_cache_v4",
};

// Картинки категорий для плиток в каталоге
// Положите файлы в `images/categories/`
export const CATEGORY_TILE_IMAGES = {
  all: "images/categories/all.jpg",
  excavators: "images/categories/excavators.jpg",
  bulldozers: "images/categories/bulldozers.jpg",
  tires: "images/categories/tires.jpg",
};


