# Деплой на статический хостинг

## Вариант 1: Netlify (рекомендуется)

1. Создайте репозиторий и залейте проект.
2. В Netlify: **Add new site → Import an existing project**.
3. Build command: пусто (no build).
4. Publish directory: корень репозитория (`/`).
5. После деплоя:
   - обновите домен в `robots.txt` и `sitemap.xml`
   - заполните `js/config.js` (контакты + Apps Script endpoints)

## Вариант 2: Vercel

1. Import проект.
2. Framework preset: `Other`.
3. Output directory: `/` (по умолчанию).

## Вариант 3: GitHub Pages

1. Настройте Pages на ветку `main` и корневую папку `/`.
2. Убедитесь, что относительные пути работают (в проекте они относительные).


