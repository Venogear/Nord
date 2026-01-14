function qs(sel, root = document) {
  return root.querySelector(sel);
}

function applyTileMediaBackground(media, image) {
  if (!image) {
    media.classList.add("tile-media--placeholder");
    return;
  }
  media.style.backgroundImage = `url("${image}")`;
}

// Desired tile labels (override auto "Запчасти для ...").
// Keys must match CategoryId from the Google Sheet (Parts).
const CATEGORY_TILE_TEXT_BY_ID = {
  // Road
  front_loaders: "ЗАПЧАСТИ ДЛЯ ФРОНТАЛЬНЫХ ПОГРУЗЧИКОВ",
  bulldozers: "ЗАПЧАСТИ ДЛЯ БУЛЬДОЗЕРОВ",
  excavators: "ЗАПЧАСТИ ДЛЯ ЭКСКАВАТОРОВ",
  asphalt_pavers: "ЗАПЧАСТИ ДЛЯ АСФАЛЬТОУКЛАДЧИКОВ",
  autograders: "ЗАПЧАСТИ ДЛЯ АВТОГРЕЙДЕРОВ",
  engines: "ЗАПЧАСТИ ДЛЯ ДВИГАТЕЛЕЙ",
  filters: "ФИЛЬТРЫ",
  tires: "ШИНЫ",
  oils: "МАСЛА, СМАЗКИ, ОХЛАЖДАЮЩАЯ ЖИДКОСТЬ",
  pneumo_cylinders: "ПНЕВМОЦИЛИНДРЫ",
  compressor_stations: "КОМПРЕССОРНЫЕ СТАНЦИИ",

  // Warehouse
  forklifts: "ЗАПЧАСТИ ДЛЯ ВИЛОЧНЫХ ПОГРУЗЧИКОВ",
};

// Preferred ordering (items not listed will be appended afterwards).
const CATEGORY_ORDER_BY_DOMAIN = {
  road: [
    "front_loaders",
    "bulldozers",
    "excavators",
    "asphalt_pavers",
    "autograders",
    "engines",
    "filters",
    "tires",
    "oils",
    "pneumo_cylinders",
    "compressor_stations",
  ],
  warehouse: ["forklifts"],
};

// Local source of categories (no endpoint / no fallback JSON file).
const LOCAL_PARTS_CATEGORIES_BY_DOMAIN = {
  road: [
    { id: "front_loaders", name: "Фронтальные погрузчики" },
    { id: "bulldozers", name: "Бульдозеры" },
    { id: "excavators", name: "Экскаваторы" },
    { id: "asphalt_pavers", name: "Асфальтоукладчики" },
    { id: "autograders", name: "Автогрейдеры" },
    { id: "engines", name: "Двигатели" },
    { id: "filters", name: "Фильтры" },
    { id: "tires", name: "Шины" },
    { id: "oils", name: "Масла, смазки, охлаждающая жидкость" },
    { id: "pneumo_cylinders", name: "Пневмоцилиндры" },
    { id: "compressor_stations", name: "Компрессорные станции" },
  ],
  warehouse: [{ id: "forklifts", name: "Вилочные погрузчики" }],
};

function resolveCategoryImage(categoryId, fallbackFromData) {
  const fromData = String(fallbackFromData || "").trim();
  if (fromData) return fromData;

  // Default local images by CategoryId (so you don't need to fill CategoryImage in the sheet)
  const map = {
    front_loaders: "images/categories/front-loaders.png",
    bulldozers: "images/categories/bulldozers.jpg",
    excavators: "images/categories/excavators.png",
    engines: "images/categories/engines.jpg",
    forklifts: "",
    asphalt_pavers: "images/categories/large_asfaltoukladchik-min.jpg",
    autograders: "images/categories/large_autograder.jpg",
    compressor_stations: "images/categories/large_compressor.jpg",
    pneumo_cylinders: "images/categories/pneumo_cylinders.jpg",
    filters: "images/categories/filters.jpg",
    tires: "images/categories/tires.jpg",
    oils: "images/categories/oils.jpg",
  };
  return map[String(categoryId || "").trim()] || "";
}

function splitChips(raw) {
  const s = String(raw || "").trim();
  if (!s) return [];
  return s
    .split(/[,;|]/g)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 6);
}

// Преобразует название категории в родительный падеж для фразы "Запчасти для..."
function toGenitiveCase(name) {
  const s = String(name || "").trim();
  if (!s) return s;
  
  // Если уже содержит "Запчасти для", возвращаем как есть
  if (s.toLowerCase().startsWith("запчасти для")) {
    return s;
  }
  
  // Словарь склонений для основных категорий
  const declensions = {
    "Фронтальные погрузчики": "фронтальных погрузчиков",
    "фронтальные погрузчики": "фронтальных погрузчиков",
    "Бульдозеры": "бульдозеров",
    "бульдозеры": "бульдозеров",
    "Экскаваторы": "экскаваторов",
    "экскаваторы": "экскаваторов",
    "Двигатели": "двигателей",
    "двигатели": "двигателей",
    "Фильтры": "фильтров",
    "фильтры": "фильтров",
    "Шины": "шин",
    "шины": "шин",
    "Гидравлика": "гидравлики",
    "гидравлика": "гидравлики",
    "Трансмиссии": "трансмиссий",
    "трансмиссии": "трансмиссий",
    "Навесное оборудование": "навесного оборудования",
    "навесное оборудование": "навесного оборудования",
    "Вилочные погрузчики": "вилочных погрузчиков",
    "вилочные погрузчики": "вилочных погрузчиков",
    "Стеллажи": "стеллажей",
    "стеллажи": "стеллажей",
    "Аккумуляторы": "аккумуляторов",
    "аккумуляторы": "аккумуляторов",
    "Шины для погрузчиков": "шин для погрузчиков",
    "шины для погрузчиков": "шин для погрузчиков",
    "Безопасность": "безопасности",
    "безопасность": "безопасности",
  };
  
  // Проверяем точное совпадение
  if (declensions[s]) {
    return declensions[s];
  }
  
  // Общие правила склонения (для множественного числа)
  // Если заканчивается на "ы" или "и" (мн.ч.), заменяем на родительный падеж
  if (s.endsWith("ы")) {
    return s.slice(0, -1) + "ов";
  }
  if (s.endsWith("и")) {
    // Для слов на "и" может быть "ий" или "ей" в родительном падеже
    // Используем более общее правило
    return s + "й";
  }
  
  // Если не найдено правило, возвращаем как есть (данные должны быть уже в правильном падеже)
  return s;
}

function getCategoryTileText({ id, name }) {
  const key = String(id || "").trim();
  if (CATEGORY_TILE_TEXT_BY_ID[key]) return CATEGORY_TILE_TEXT_BY_ID[key];

  // Fallback to previous behavior
  const genitiveName = toGenitiveCase(name);
  return genitiveName.toLowerCase().startsWith("запчасти для") ? genitiveName : `Запчасти для ${genitiveName}`;
}

function sortCategoriesForDomain(domain, categories) {
  const d = String(domain || "").trim();
  const order = CATEGORY_ORDER_BY_DOMAIN[d] || [];
  if (!order.length) return categories;

  const byId = new Map(categories.map((c) => [String(c.id || "").trim(), c]));
  const out = [];
  for (const id of order) {
    const hit = byId.get(id);
    if (hit) out.push(hit);
  }
  for (const c of categories) {
    const id = String(c.id || "").trim();
    if (!order.includes(id)) out.push(c);
  }
  return out;
}

function makeTile({ title, subtitle, href, image, chips, linkText }) {
  const isLink = Boolean(href);
  const root = document.createElement(isLink ? "a" : "div");
  root.className = "tile";
  if (isLink) root.href = href;
  else root.setAttribute("role", "group");
  if (linkText) root.classList.add("tile--category");

  const media = document.createElement("div");
  media.className = "tile-media";
  applyTileMediaBackground(media, image);
  root.appendChild(media);

  const body = document.createElement("div");
  body.className = "tile-body";
  const chipItems = splitChips(chips);
  if (linkText) {
    body.innerHTML = `<div class="tile-linklike">${linkText}</div>`;
  } else {
    body.innerHTML = `<div class="tile-title">${title}</div>${subtitle ? `<div class="tile-subtitle">${subtitle}</div>` : ""}${
      chipItems.length
        ? `<div class="tile-chips" aria-label="Теги">${chipItems.map((c) => `<span class="chip">${c}</span>`).join("")}</div>`
        : ""
    }`;
  }
  root.appendChild(body);
  return root;
}

function isCatalogPage() {
  // We treat catalog as "no navigation" page for tiles until requirements are confirmed.
  // Prefer DOM signal (more robust than pathname in local dev environments).
  return Boolean(qs("#catalog-brands") || qs("#catalog-categories"));
}

function getTileLabel(tileEl) {
  if (!tileEl) return "";
  const a = tileEl.querySelector(".tile-title");
  if (a && a.textContent) return a.textContent;
  const b = tileEl.querySelector(".tile-linklike");
  if (b && b.textContent) return b.textContent;
  const tt = tileEl.getAttribute("data-tooltip");
  if (tt) return tt;
  return tileEl.textContent || "";
}

function makeBrandLogoTile({ name, image }) {
  const root = document.createElement("div");
  root.className = "tile tile--logo";
  root.setAttribute("role", "img");
  root.setAttribute("aria-label", name);
  root.setAttribute("title", name);
  root.setAttribute("data-tooltip", name);

  const media = document.createElement("div");
  media.className = "tile-media";
  applyTileMediaBackground(media, image);
  root.appendChild(media);

  return root;
}

function normalizeCatalogDuplicateKey(label) {
  let s = String(label || "")
    .replace(/\u00A0/g, " ") // NBSP
    .replace(/\u2011/g, "-") // non-breaking hyphen
    .replace(/\u2013|\u2014/g, "-") // en/em dash
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  if (!s) return "";

  // remove common "parts" prefixes to catch semantic duplicates
  s = s.replace(/^запчасти\s+(для|к|на)\s+/i, "").trim();

  // normalize frequent Russian genitive forms to nominative/plural
  // (minimal dictionary for "client visibility" on catalog)
  const RU_FORM_NORMALIZE = {
    // one-word
    двигателей: "двигатели",
    фильтров: "фильтры",
    шин: "шины",
    масел: "масла",
    смазок: "смазки",
    жидкостей: "жидкости",
    трансмиссий: "трансмиссии",
    экскаваторов: "экскаваторы",
    бульдозеров: "бульдозеры",
    автогрейдеров: "автогрейдеры",
    // multi-word
    "фронтальных погрузчиков": "фронтальные погрузчики",
    "вилочных погрузчиков": "вилочные погрузчики",
    "навесного оборудования": "навесное оборудование",
    "компрессорных станций": "компрессорные станции",
  };

  if (RU_FORM_NORMALIZE[s]) s = RU_FORM_NORMALIZE[s];

  return s;
}

function markDuplicateTilesInCatalog() {
  if (!isCatalogPage()) return;
  const scope = qs(".catalog-content") || document;
  const tiles = Array.from(scope.querySelectorAll(".tile"));
  if (!tiles.length) return;

  // reset
  tiles.forEach((t) => t.classList.remove("is-duplicate"));

  const map = new Map(); // label -> tiles
  for (const t of tiles) {
    const key = normalizeCatalogDuplicateKey(getTileLabel(t));
    if (!key) continue;
    const arr = map.get(key) || [];
    arr.push(t);
    map.set(key, arr);
  }

  for (const [, arr] of map) {
    if (arr.length > 1) arr.forEach((t) => t.classList.add("is-duplicate"));
  }
}

function slugifyAsciiId(input, fallback) {
  const s = String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return s || String(fallback || "").trim() || "item";
}

function renderCatalogSidebarTiles() {
  const brandsMount = qs("#catalog-brands");
  const catsMount = qs("#catalog-categories");
  if (!brandsMount && !catsMount) return;

  const BRAND_IMAGE_BY_NAME = {
    SDLG: "images/brand/sdlg.jpg",
    XCMG: "images/brand/xcmg.jpg",
    XGMA: "images/brand/xgma.jpg",
    LIUGONG: "images/brand/liugong.jpg",
    LONKING: "images/brand/lonking.jpg",
    CHENGGONG: "images/brand/chenggong.jpg",
    ENSIGN: "images/brand/ensign.jpg",
    SHANTUI: "images/brand/shantui.jpg",
    CUMMINS: "images/brand/cummins.jpg",
    ZF: "images/brand/zf.jpg",
    HANGCHA: "images/brand/hangcha.png",
    DOOSAN: "images/brand/doosan.jpg",
    KOMATSU: "images/brand/komatsu.jpg",
    HYUNDAI: "images/brand/hyundai.jpg",
    WEICHAI: "images/brand/weichai.jpg",
    YUCHAI: "images/brand/yuchai.jpg",
    DEUTZ: "images/brand/deutz.jpg",
  };

  const BRANDS = [
    "SDLG",
    "XCMG",
    "XGMA",
    "LIUGONG",
    "LONKING",
    "CHENGGONG",
    "ENSIGN",
    "SHANTUI",
    "CUMMINS",
    "ZF",
    "HANGCHA",
    "DOOSAN",
    "KOMATSU",
    "HYUNDAI",
    "WEICHAI",
    "YUCHAI",
    "DEUTZ",
  ];

  const CATEGORIES = [
    "ДВИГАТЕЛИ",
    "ТРАНСМИССИИ КОРОБКИ ПЕРЕДАЧ",
    "ГИДРАВЛИЧЕСКИЕ УЗЛЫ И АГРЕГАТЫ",
    "КОРОНКИ",
    "ФИЛЬТРЫ",
    "ШИНЫ",
  ];

  // Images for "Категории" block on catalog page
  // - existing: use current files from images/categories/
  // - missing: prepared filenames (add these files to images/categories/)
  const CATALOG_CATEGORY_IMAGE_BY_NAME = {
    "ДВИГАТЕЛИ": "",
    "ФИЛЬТРЫ": "",
    "ШИНЫ": "",
    "ТРАНСМИССИИ КОРОБКИ ПЕРЕДАЧ": "images/categories/transmissions.jpg",
    "ГИДРАВЛИЧЕСКИЕ УЗЛЫ И АГРЕГАТЫ": "images/categories/hydraulics.jpg",
    "КОРОНКИ": "images/categories/crowns.jpg",
  };

  if (brandsMount) {
    brandsMount.innerHTML = "";
    BRANDS.forEach((name, idx) => {
      const brandId = slugifyAsciiId(name, `brand_${idx + 1}`);
      brandsMount.appendChild(makeBrandLogoTile({ name, image: BRAND_IMAGE_BY_NAME[name] || "" }));
    });
  }

  if (catsMount) {
    catsMount.innerHTML = "";
    CATEGORIES.forEach((name, idx) => {
      const catId = slugifyAsciiId(name, `cat_${idx + 1}`);
      catsMount.appendChild(
        makeTile({
          href: "", // no navigation on catalog
          title: "",
          subtitle: "",
          linkText: name, // match "parts road" category tiles style (tile--category + linklike text)
          image: CATALOG_CATEGORY_IMAGE_BY_NAME[name] || "",
          chips: "",
        })
      );
    });
  }

  markDuplicateTilesInCatalog();
}

async function renderDomainCategories({ domain, mountId }) {
  const mount = qs(`#${mountId}`);
  if (!mount) return;
  mount.innerHTML = "";

  const categoriesRaw = Array.isArray(LOCAL_PARTS_CATEGORIES_BY_DOMAIN[domain]) ? LOCAL_PARTS_CATEGORIES_BY_DOMAIN[domain] : [];
  const categories = sortCategoriesForDomain(domain, categoriesRaw);

  if (!categories.length) {
    mount.innerHTML = `<div class="empty-state">Пока нет категорий.</div>`;
    return;
  }

  categories.forEach((c, idx) => {
    const id = String(c.id || "").trim();
    const name = String(c.name || "").trim();
    if (!id || !name) return;

    const linkText = getCategoryTileText({ id, name });
    const href = ""; // no navigation (site simplified to 4 pages)
    mount.appendChild(
      makeTile({
        title: name,
        subtitle: "",
        href,
        linkText: linkText,
        image: resolveCategoryImage(id, c.image),
      })
    );
  });

  markDuplicateTilesInCatalog();
}

export function initPartsPages() {
  // Catalog page: sidebar tiles
  renderCatalogSidebarTiles();

  // Domain pages
  if (qs("#parts-road-categories")) renderDomainCategories({ domain: "road", mountId: "parts-road-categories" });
  if (qs("#parts-warehouse-categories")) renderDomainCategories({ domain: "warehouse", mountId: "parts-warehouse-categories" });

  // Catalog page domain switcher
  const switchBtns = Array.from(document.querySelectorAll("button[data-domain-switch]"));
  const sections = Array.from(document.querySelectorAll("[data-domain-section]"));
  if (switchBtns.length && sections.length) {
    const setActive = (domain) => {
      for (const s of sections) s.hidden = s.getAttribute("data-domain-section") !== domain;
      for (const b of switchBtns) {
        const isActive = b.getAttribute("data-domain-switch") === domain;
        b.classList.toggle("is-active", isActive);
        b.setAttribute("aria-selected", isActive ? "true" : "false");
      }
    };

    // Initial domain:
    // 1) ?domain=warehouse|road (preferred, doesn't scroll)
    // 2) legacy hash #warehouse (backward compatible)
    const params = new URLSearchParams(location.search || "");
    const fromQuery = String(params.get("domain") || "").trim().toLowerCase();
    const initial = fromQuery === "warehouse" || location.hash === "#warehouse" ? "warehouse" : "road";
    setActive(initial);
    switchBtns.forEach((b) => {
      b.addEventListener("click", () => setActive(b.getAttribute("data-domain-switch")));
    });
  }
}

initPartsPages();

