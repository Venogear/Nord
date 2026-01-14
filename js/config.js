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
  // Заявки: Apps Script endpoint, который принимает POST JSON и отправляет в Telegram/Email.
  // Пример: https://script.google.com/macros/s/AKfycb.../exec?action=lead
  leadSubmit:
    "https://script.google.com/macros/s/AKfycbxOKXn0mZc9vVoDkRgHe-QWIhEa8nX5UyMV-76rRoRcEqaVQ9VzYWUzPs4rl8bpbsTZqQ/exec?action=lead",
};


