# Как менять контент (тексты/контакты/изображения)

## Контакты и тексты для кнопки связи

Файл: `js/config.js`

- `CONTACTS.email`, `CONTACTS.telegramManager`, `CONTACTS.phoneTel/phoneDisplay`
- `PREFILL.telegramText`, `PREFILL.emailSubject`, `PREFILL.emailBody`

## Каталог запчастей

Категории и бренды для каталога запчастей задаются локально в файле `js/parts-pages.js`:

- `LOCAL_PARTS_CATEGORIES_BY_DOMAIN` — категории для дорожно-строительной и складской техники
- `CATEGORY_TILE_TEXT_BY_ID` — тексты для плиток категорий
- Изображения категорий — в `resolveCategoryImage()` и `CATALOG_CATEGORY_IMAGE_BY_NAME`

## Изображения категорий

Папка: `images/categories/`

Используются для фоновых изображений плиток категорий в каталоге запчастей.


