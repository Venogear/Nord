# Как менять контент (тексты/контакты/каталог)

## Контакты и тексты для кнопки связи

Файл: `js/config.js`

- `CONTACTS.email`, `CONTACTS.telegramUsername`, `CONTACTS.phoneTel/phoneDisplay`
- `PREFILL.telegramText`, `PREFILL.emailSubject`, `PREFILL.emailBody`

## Каталог техники

Основной источник: Google Таблица (см. `docs/GOOGLE_SHEET_CATALOG.md`).

Fallback (если Google недоступен): `data/equipment.json`.

## Изображения техники

Папка: `images/equipment/`

В таблице/JSON поле `image` — это имя файла (например `excavator-1.jpg`).


