# Stroytech — лендинг + каталог техники (статический хостинг)

Многостраничный сайт на чистом HTML/CSS/Vanilla JS:

- `index.html` — лендинг + форма
- `catalog.html` — каталог с фильтрами, поиском и модалкой
- `contacts.html` — контакты + форма

Каталог может загружаться из **Google Таблицы** через **Google Apps Script Web App**. Есть fallback на `data/equipment.json`.

## Быстрый старт локально

Важно: открывать через локальный сервер (иначе `fetch()` может не работать корректно из `file://`).

### Вариант A — Python

```bash
python -m http.server 8080
```

Открыть в браузере: `http://localhost:8080/`

### Вариант B — Node (если установлен)

```bash
npx http-server -p 8080
```

## Настройка (обязательное)

1) Откройте `js/config.js` и заполните:
- `ENDPOINTS.catalogJson` — URL Apps Script для каталога
- `ENDPOINTS.leadSubmit` — URL Apps Script для заявок
- `CONTACTS` и `PREFILL` — ваши контакты и тексты

2) Настройка Google Apps Script — см. `docs/APPS_SCRIPT.md`.

## Структура

```
/
  index.html
  catalog.html
  contacts.html
  css/
  js/
  data/
  docs/
```


