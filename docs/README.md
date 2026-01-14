# Норд Вест — запчасти для строительной и спецтехники (статический хостинг)

Многостраничный сайт на чистом HTML/CSS/Vanilla JS:

- `index.html` — главная страница (лендинг)
- `catalog.html` — каталог запчастей (категории и бренды)
- `delivery.html` — информация о доставке
- `contacts.html` — контакты + форма заявки

Заявки отправляются через **Google Apps Script Web App** в Telegram и на email.

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
- `ENDPOINTS.leadSubmit` — URL Apps Script для приема заявок
- `CONTACTS` — ваши контакты (телефон, email, Telegram)
- `PREFILL` — предзаполненные тексты для форм

2) Настройка Google Apps Script для приема заявок — см. `docs/APPS_SCRIPT.md`.

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


