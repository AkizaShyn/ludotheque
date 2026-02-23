const statusMessage = document.getElementById("statusMessage");
const statTotal = document.getElementById("statTotal");
const statCompleted = document.getElementById("statCompleted");
const statRemaining = document.getElementById("statRemaining");
const topbarStats = document.querySelector(".topbar-stats");
const toast = document.getElementById("toast");

const viewPlatforms = document.getElementById("viewPlatforms");
const viewPlatformGames = document.getElementById("viewPlatformGames");
const viewGameSheet = document.getElementById("viewGameSheet");

const platformGrid = document.getElementById("platformGrid");
const newPlatformInput = document.getElementById("newPlatformInput");
const addPlatformBtn = document.getElementById("addPlatformBtn");

const backToPlatformsBtn = document.getElementById("backToPlatformsBtn");
const platformTitle = document.getElementById("platformTitle");
const platformSubtitle = document.getElementById("platformSubtitle");
const completedFilter = document.getElementById("completedFilter");
const gameSort = document.getElementById("gameSort");
const collectionCount = document.getElementById("collectionCount");
const gamesGrid = document.getElementById("gamesGrid");
const toggleAddGameBtn = document.getElementById("toggleAddGameBtn");
const addGameModal = document.getElementById("addGameModal");
const closeAddGameBtn = document.getElementById("closeAddGameBtn");
const toggleMetadataSearchBtn = document.getElementById("toggleMetadataSearchBtn");
const metadataSearchControls = document.getElementById("metadataSearchControls");

const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const clearSearchBtn = document.getElementById("clearSearchBtn");
const searchResults = document.getElementById("searchResults");
const librarySearchInput = document.getElementById("librarySearchInput");
const librarySearchBtn = document.getElementById("librarySearchBtn");
const librarySearchClearBtn = document.getElementById("librarySearchClearBtn");
const librarySearchResults = document.getElementById("librarySearchResults");
const librarySearchHistory = document.getElementById("librarySearchHistory");
const toggleLibrarySearchBtn = document.getElementById("toggleLibrarySearchBtn");
const librarySearchControls = document.getElementById("librarySearchControls");

const gameForm = document.getElementById("gameForm");
const submitBtn = document.getElementById("submitBtn");
const titleInput = document.getElementById("title");
const genreInput = document.getElementById("genre");
const releaseDateInput = document.getElementById("releaseDate");
const coverUrlInput = document.getElementById("coverUrl");
const ownershipTypeInput = document.getElementById("ownershipType");
const descriptionInput = document.getElementById("description");
const completedInput = document.getElementById("completed");

const backToGamesBtn = document.getElementById("backToGamesBtn");
const sheetCover = document.getElementById("sheetCover");
const sheetTitle = document.getElementById("sheetTitle");
const sheetMetaLine = document.getElementById("sheetMetaLine");
const sheetStatus = document.getElementById("sheetStatus");
const sheetOwnership = document.getElementById("sheetOwnership");
const sheetEditBtn = document.getElementById("sheetEditBtn");
const sheetDescriptionFr = document.getElementById("sheetDescriptionFr");
const sheetDescriptionEn = document.getElementById("sheetDescriptionEn");
const sheetImages = document.getElementById("sheetImages");
const sheetVideos = document.getElementById("sheetVideos");

const editGameModal = document.getElementById("editGameModal");
const editGameForm = document.getElementById("editGameForm");
const editTitleInput = document.getElementById("editTitle");
const editGenreInput = document.getElementById("editGenre");
const editReleaseDateInput = document.getElementById("editReleaseDate");
const editCoverUrlInput = document.getElementById("editCoverUrl");
const editDescriptionInput = document.getElementById("editDescription");
const editCompletedInput = document.getElementById("editCompleted");
const editOwnershipTypeInput = document.getElementById("editOwnershipType");
const saveEditBtn = document.getElementById("saveEditBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

let toastTimer;
let selectedPlatform = "";
let gamesForPlatform = [];
let allGames = [];
let editingGameId = null;
let currentSheetGameId = null;
let librarySearchTimer;
const ALL_PLATFORMS_VIEW = "__all_platforms__";
const sheetPayloadCache = new Map();
const SHEET_SEARCH_HISTORY_KEY = "librarySearchHistory";
const prefetchingSheetIds = new Set();

const BUILTIN_PLATFORMS = {
  "3DO": "/static/platforms/photos/3do.jpg",
  "Atari 2600": "/static/platforms/photos/atari-2600.png",
  "Atari Jaguar": "/static/platforms/photos/atari-jaguar.png",
  "Dreamcast": "/static/platforms/photos/dreamcast.png",
  GameCube: "/static/platforms/photos/gamecube.png",
  "Game Boy": "/static/platforms/photos/game-boy.jpg",
  "Game Boy Advance": "/static/platforms/photos/game-boy-advance.jpg",
  "Mega Drive": "/static/platforms/photos/mega-drive.jpg",
  "Master System": "/static/platforms/photos/master-system.jpg",
  NES: "/static/platforms/photos/nes.png",
  "Nintendo 64": "/static/platforms/photos/nintendo-64.png",
  "Nintendo DS": "/static/platforms/photos/nintendo-ds.png",
  "Nintendo Switch": "/static/platforms/photos/nintendo-switch.png",
  PC: "/static/platforms/photos/pc.jpg",
  "PlayStation": "/static/platforms/photos/playstation.png",
  "PlayStation 2": "/static/platforms/photos/playstation-2.png",
  "PlayStation 3": "/static/platforms/photos/playstation-3.png",
  "PlayStation 4": "/static/platforms/photos/playstation-4.jpg",
  "PlayStation 5": "/static/platforms/photos/playstation-5.png",
  PSP: "/static/platforms/photos/psp.jpg",
  PSVita: "/static/platforms/photos/psvita.jpg",
  Saturn: "/static/platforms/photos/saturn.png",
  SNES: "/static/platforms/photos/snes.jpg",
  Steam: "/static/platforms/photos/steam.png",
  Wii: "/static/platforms/photos/wii.png",
  "Wii U": "/static/platforms/photos/wii-u.png",
  Xbox: "/static/platforms/photos/xbox.jpg",
  "Xbox 360": "/static/platforms/photos/xbox-360.jpg",
  "Xbox One": "/static/platforms/photos/xbox-one.png",
  "Xbox Series X": "/static/platforms/photos/xbox-series-x.png",
};

const GENERIC_PLATFORM_IMAGE = "/static/platforms/generic.svg";

const PLATFORM_ALIASES = {
  nes: "NES",
  nintendoentertainmentsystem: "NES",
  famicom: "NES",
  snes: "SNES",
  supernintendo: "SNES",
  supernintendosystem: "SNES",
  supernintendoeuropeanversion: "SNES",
  n64: "Nintendo 64",
  nintendo64: "Nintendo 64",
  gamecube: "GameCube",
  ngc: "GameCube",
  gameboy: "Game Boy",
  gb: "Game Boy",
  gba: "Game Boy Advance",
  gameboyadvance: "Game Boy Advance",
  nds: "Nintendo DS",
  nintendods: "Nintendo DS",
  switch: "Nintendo Switch",
  nintendoswitch: "Nintendo Switch",
  wiiu: "Wii U",
  "3do": "3DO",
  megadrive: "Mega Drive",
  genesis: "Mega Drive",
  segagenesis: "Mega Drive",
  mastersystem: "Master System",
  segasaturn: "Saturn",
  segadreamcast: "Dreamcast",
  dreamcast: "Dreamcast",
  playstation: "PlayStation",
  psx: "PlayStation",
  ps1: "PlayStation",
  playstation1: "PlayStation",
  ps2: "PlayStation 2",
  playstation2: "PlayStation 2",
  ps3: "PlayStation 3",
  playstation3: "PlayStation 3",
  ps4: "PlayStation 4",
  playstation4: "PlayStation 4",
  ps5: "PlayStation 5",
  playstation5: "PlayStation 5",
  psp: "PSP",
  psvita: "PSVita",
  vita: "PSVita",
  xbox: "Xbox",
  xboxclassic: "Xbox",
  xbox360: "Xbox 360",
  xboxone: "Xbox One",
  xboxseriesx: "Xbox Series X",
  xboxseriess: "Xbox Series X",
  steamdeck: "Steam",
  steam: "Steam",
  pc: "PC",
  windows: "PC",
  ordinateur: "PC",
};

function normalizePlatformName(value = "") {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function canonicalPlatformName(platformName = "") {
  const trimmed = platformName.trim();
  if (!trimmed) return "";

  if (BUILTIN_PLATFORMS[trimmed]) return trimmed;

  const normalized = normalizePlatformName(trimmed);
  if (PLATFORM_ALIASES[normalized]) return PLATFORM_ALIASES[normalized];

  for (const key of Object.keys(BUILTIN_PLATFORMS)) {
    if (normalizePlatformName(key) === normalized) return key;
  }

  return trimmed;
}

function builtinPlatformImage(platformName) {
  if (BUILTIN_PLATFORMS[platformName]) return BUILTIN_PLATFORMS[platformName];

  const normalized = normalizePlatformName(platformName);
  if (PLATFORM_ALIASES[normalized]) {
    return BUILTIN_PLATFORMS[PLATFORM_ALIASES[normalized]] || GENERIC_PLATFORM_IMAGE;
  }

  for (const [alias, canonical] of Object.entries(PLATFORM_ALIASES)) {
    if (normalized.includes(alias)) {
      return BUILTIN_PLATFORMS[canonical] || GENERIC_PLATFORM_IMAGE;
    }
  }

  for (const [key, imageUrl] of Object.entries(BUILTIN_PLATFORMS)) {
    const probe = normalizePlatformName(key);
    if (normalized.includes(probe) || probe.includes(normalized)) {
      return imageUrl;
    }
  }
  return GENERIC_PLATFORM_IMAGE;
}

function showView(name) {
  const map = {
    platforms: viewPlatforms,
    games: viewPlatformGames,
    sheet: viewGameSheet,
  };
  Object.entries(map).forEach(([key, node]) => {
    const active = key === name;
    node.classList.toggle("hidden", !active);
    if (active) {
      node.classList.remove("view-animate");
      // restart animation
      void node.offsetWidth;
      node.classList.add("view-animate");
    }
  });
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  if (!response.ok) {
    let message = "Erreur API";
    try {
      const payload = await response.json();
      if (payload?.error) message = payload.error;
    } catch {
      const text = await response.text();
      if (text) message = text;
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

function escapeHtml(value = "") {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function normalizeText(value = "") {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function getStoredSearchHistory() {
  try {
    const raw = localStorage.getItem(SHEET_SEARCH_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setStoredSearchHistory(values) {
  localStorage.setItem(SHEET_SEARCH_HISTORY_KEY, JSON.stringify(values.slice(0, 8)));
}

function pushSearchHistory(value) {
  const normalized = value.trim();
  if (!normalized) return;
  const current = getStoredSearchHistory().filter((v) => normalizeText(v) !== normalizeText(normalized));
  current.unshift(normalized);
  setStoredSearchHistory(current);
}

function renderSearchHistory() {
  const history = getStoredSearchHistory();
  if (!librarySearchHistory) return;
  if (!history.length) {
    librarySearchHistory.innerHTML = "";
    return;
  }
  librarySearchHistory.innerHTML = history
    .map((term) => `<button type="button" class="history-chip" data-history-term="${escapeHtml(term)}">${escapeHtml(term)}</button>`)
    .join("");
}

function applyGameSort(games) {
  const data = [...games];
  const mode = gameSort?.value || "az";
  if (mode === "za") {
    data.sort((a, b) => b.title.localeCompare(a.title));
    return data;
  }
  if (mode === "newest") {
    data.sort((a, b) => (b.release_date || "").localeCompare(a.release_date || ""));
    return data;
  }
  if (mode === "completed") {
    data.sort((a, b) => Number(Boolean(b.completed)) - Number(Boolean(a.completed)) || a.title.localeCompare(b.title));
    return data;
  }
  data.sort((a, b) => a.title.localeCompare(b.title));
  return data;
}

async function fetchSheetPayload(gameId, forceRefresh = false) {
  if (!forceRefresh && sheetPayloadCache.has(String(gameId))) {
    return sheetPayloadCache.get(String(gameId));
  }
  const payload = await api(`/api/games/${gameId}/sheet`);
  sheetPayloadCache.set(String(gameId), payload);
  return payload;
}

function setStatus(message = "") {
  statusMessage.textContent = message;
}

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2500);
}

function setBusy(button, busyText, normalText, busy) {
  button.disabled = busy;
  button.textContent = busy ? busyText : normalText;
}

function ownershipLabel(type) {
  if (type === "physical") return "Physique";
  if (type === "digital") return "Numérique";
  return "Non précisé";
}

function ownershipClass(type) {
  if (type === "physical") return "physical";
  if (type === "digital") return "digital";
  return "unknown";
}

function computeGlobalStats(games) {
  const total = games.length;
  const completed = games.filter((g) => g.completed).length;
  statTotal.textContent = `${total} jeux`;
  statCompleted.textContent = `${completed} terminés`;
  statRemaining.textContent = `${total - completed} à finir`;
}

function getStoredCustomPlatforms() {
  try {
    const raw = localStorage.getItem("customPlatforms");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setStoredCustomPlatforms(platforms) {
  localStorage.setItem("customPlatforms", JSON.stringify(platforms));
}

function platformTileBackground(platformName, firstCoverUrl) {
  if (firstCoverUrl) {
    return `background-image:url('${firstCoverUrl.replaceAll("'", "") }')`;
  }

  const n = platformName.toLowerCase();
  if (n.includes("playstation") || n.includes("ps")) {
    return "background:linear-gradient(160deg,#2b5cff,#182e6f)";
  }
  if (n.includes("xbox")) {
    return "background:linear-gradient(160deg,#2fb46e,#124b34)";
  }
  if (n.includes("switch") || n.includes("nintendo")) {
    return "background:linear-gradient(160deg,#ff5d5d,#8f1f1f)";
  }
  if (n.includes("pc") || n.includes("steam")) {
    return "background:linear-gradient(160deg,#39c2ff,#0d3c67)";
  }
  return "background:linear-gradient(160deg,#3d5e90,#273854)";
}

function renderPlatforms() {
  const fromDb = allGames.map((g) => g.platform).filter(Boolean);
  const custom = getStoredCustomPlatforms();
  const builtin = Object.keys(BUILTIN_PLATFORMS);

  const platformMap = new Map();
  [...builtin, ...fromDb, ...custom].forEach((platform) => {
    const canonical = canonicalPlatformName(platform);
    if (!canonical) return;
    if (!platformMap.has(canonical)) {
      platformMap.set(canonical, canonical);
    }
  });

  const platforms = [...platformMap.values()].sort((a, b) => a.localeCompare(b));

  if (!platforms.length) {
    platformGrid.innerHTML = "<p>Aucune plateforme. Ajoute-en une pour commencer.</p>";
    return;
  }

  platformGrid.innerHTML = platforms
    .map((platform) => {
      const games = allGames.filter((g) => canonicalPlatformName(g.platform) === platform);
      const cover = builtinPlatformImage(platform) || games.find((g) => g.cover_url)?.cover_url;
      return `
        <article class="platform-tile" data-platform="${escapeHtml(platform)}">
          <div class="platform-bg" style="${platformTileBackground(platform, cover)}"></div>
          <div class="platform-overlay"></div>
          <div class="platform-content">
            <div class="platform-title">${escapeHtml(platform)}</div>
            <div class="platform-count">${games.length} jeu(x)</div>
          </div>
        </article>
      `;
    })
    .join("");
}

async function loadAllGames() {
  allGames = await api("/api/games");
  computeGlobalStats(allGames);
  renderPlatforms();
  if (librarySearchInput?.value?.trim()) {
    renderLibrarySearchResults();
  }
}

function renderLibrarySearchResults() {
  const q = (librarySearchInput?.value || "").trim();
  if (!librarySearchResults) return;

  if (!q) {
    librarySearchResults.innerHTML = "";
    return;
  }

  const nq = normalizeText(q);
  const sortedMatches = allGames
    .map((g) => {
      const nt = normalizeText(g.title || "");
      let score = 0;
      if (nt === nq) score = 3;
      else if (nt.startsWith(nq)) score = 2;
      else if (nt.includes(nq)) score = 1;
      return { game: g, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.game.title.localeCompare(b.game.title))
    .slice(0, 12)
    .map((entry) => entry.game);

  if (!sortedMatches.length) {
    librarySearchResults.innerHTML = `
      <article class="search-card">
        <strong>Non trouvé</strong>
        <p class="meta">Ce jeu n'est pas dans ta ludothèque.</p>
      </article>
    `;
    return;
  }

  librarySearchResults.innerHTML = sortedMatches
    .map(
      (g) => `
        <article class="search-card">
          <div class="search-card-row">
            ${
              g.cover_url
                ? `<img class="search-card-cover" src="${escapeHtml(g.cover_url)}" alt="cover ${escapeHtml(g.title || "jeu")}" loading="lazy" />`
                : '<div class="search-card-cover-fallback">No cover</div>'
            }
            <div class="search-card-content">
              <strong>${escapeHtml(g.title || "Sans titre")}</strong>
              <p class="meta">Possédé sur ${escapeHtml(canonicalPlatformName(g.platform) || g.platform || "Plateforme inconnue")}</p>
              <button type="button" data-open-library-game-id="${g.id}">Ouvrir la fiche</button>
            </div>
          </div>
        </article>
      `,
    )
    .join("");
}

async function openGameFromLibrary(gameId) {
  const game = allGames.find((g) => String(g.id) === String(gameId));
  if (!game) {
    showToast("Jeu introuvable.");
    return;
  }

  selectedPlatform = canonicalPlatformName(game.platform) || game.platform;
  showView("games");
  closeAddGameModal();
  await loadPlatformGames();
  await openGameSheet(game.id);
}

function renderGameCards(games) {
  if (!games.length) {
    gamesGrid.innerHTML = "<p>Aucun jeu dans cette plateforme.</p>";
    return;
  }

  gamesGrid.innerHTML = games
    .map((g) => {
      const cover = g.cover_url
        ? `<img class="game-cover" src="${escapeHtml(g.cover_url)}" alt="cover ${escapeHtml(g.title)}" loading="lazy" />`
        : '<div class="game-cover-fallback">Aucune image</div>';

      return `
        <article class="game-tile" data-game-id="${g.id}">
          ${cover}
          <div class="game-meta">
            <p class="game-title">${escapeHtml(g.title)}</p>
            <span class="badge ${g.completed ? "done" : "todo"}">${g.completed ? "Terminé" : "Non terminé"}</span>
            <span class="badge ownership-badge ${ownershipClass(g.ownership_type)}">${ownershipLabel(g.ownership_type)}</span>
            <div class="game-actions">
              <button type="button" class="button is-small is-light btn-secondary" data-edit-id="${g.id}">Modifier</button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

async function loadPlatformGames() {
  if (!selectedPlatform) return;
  const isAllPlatformsView = selectedPlatform === ALL_PLATFORMS_VIEW;
  const canonicalSelected = canonicalPlatformName(selectedPlatform);
  let data = isAllPlatformsView
    ? [...allGames]
    : allGames.filter((g) => canonicalPlatformName(g.platform) === canonicalSelected);

  if (completedFilter.value === "true") {
    data = data.filter((g) => g.completed);
  } else if (completedFilter.value === "false") {
    data = data.filter((g) => !g.completed);
  }
  gamesForPlatform = applyGameSort(data);

  platformTitle.textContent = isAllPlatformsView ? "Toutes les plateformes" : selectedPlatform;
  platformSubtitle.textContent = isAllPlatformsView
    ? `${gamesForPlatform.length} jeu(x) dans toutes les plateformes`
    : `${gamesForPlatform.length} jeu(x) dans cette vue`;
  collectionCount.textContent = `${gamesForPlatform.length} affiché(s)`;
  renderGameCards(gamesForPlatform);
}

function goToPlatform(platform) {
  selectedPlatform = platform;
  showView("games");
  closeAddGameModal();
  setStatus(`Plateforme active: ${platform}`);
  loadPlatformGames();
}

function openGlobalGamesView(statFilter = "") {
  selectedPlatform = ALL_PLATFORMS_VIEW;
  completedFilter.value = statFilter;
  showView("games");
  closeAddGameModal();
  setStatus("Vue globale des jeux.");
  loadPlatformGames();
}

function fillFormFromMetadata(item) {
  titleInput.value = item.title || "";
  genreInput.value = (item.genres || []).join(", ");
  releaseDateInput.value = item.release_date || "";
  coverUrlInput.value = item.cover_url || "";
  descriptionInput.value = item.description_fr || "";
}

async function loadSearchResults() {
  const q = searchInput.value.trim();
  if (!q) return showToast("Saisis un titre.");

  setBusy(searchBtn, "Recherche...", "Rechercher", true);
  searchResults.innerHTML = '<p class="meta">Recherche en cours...</p>';

  try {
    const params = new URLSearchParams({ query: q });
    const results = await api(`/api/metadata/search?${params.toString()}`);
    if (!results.length) {
      searchResults.innerHTML = "<p>Aucun résultat.</p>";
      return;
    }

    searchResults.innerHTML = results
      .map(
        (r) => `
          <article class="search-card">
            <div class="search-card-row">
              ${
                r.cover_url
                  ? `<img class="search-card-cover" src="${escapeHtml(r.cover_url)}" alt="cover ${escapeHtml(r.title || "jeu")}" loading="lazy" />`
                  : '<div class="search-card-cover-fallback">No cover</div>'
              }
              <div class="search-card-content">
                <strong>${escapeHtml(r.title || "Sans titre")}</strong>
                <p class="meta">${escapeHtml((r.platforms || []).join(", ") || "N/A")}</p>
                ${
                  allGames.some((g) => normalizeText(g.title || "") === normalizeText(r.title || ""))
                    ? '<span class="badge done">Déjà possédé</span>'
                    : ""
                }
                <button type="button" class="button is-small is-primary" data-add-igdb-id="${r.igdb_id}">Ajouter ce jeu</button>
              </div>
            </div>
          </article>
        `,
      )
      .join("");
  } catch (err) {
    searchResults.innerHTML = `<p>Erreur de recherche: ${escapeHtml(err.message)}. Vérifie ta connexion et réessaie.</p>`;
  } finally {
    setBusy(searchBtn, "Recherche...", "Rechercher", false);
  }
}

async function openGameSheet(gameId) {
  const game = gamesForPlatform.find((g) => String(g.id) === String(gameId));
  if (!game) return;

  showView("sheet");
  currentSheetGameId = game.id;
  viewGameSheet.classList.add("is-loading");
  sheetTitle.textContent = game.title;
  sheetMetaLine.textContent = "Chargement de la fiche...";
  sheetStatus.textContent = "";
  sheetDescriptionFr.textContent = "";
  sheetDescriptionEn.textContent = "";
  sheetImages.innerHTML = "";
  sheetVideos.innerHTML = "";

  try {
    const sheet = await fetchSheetPayload(game.id);
    sheetTitle.textContent = sheet.title || game.title;
    sheetMetaLine.textContent = `${sheet.platform || game.platform} • ${sheet.release_year || "Année inconnue"} • ${sheet.publisher || "Éditeur inconnu"}`;

    sheetStatus.className = `sheet-status ${sheet.completed ? "done" : "todo"}`;
    sheetStatus.textContent = sheet.completed ? "Statut: Terminé" : "Statut: Non terminé";
    const ownType = sheet.ownership_type || game.ownership_type;
    sheetOwnership.className = `badge ownership-badge ${ownershipClass(ownType)}`;
    sheetOwnership.textContent = `Format: ${ownershipLabel(ownType)}`;

    if (sheet.cover_url) {
      sheetCover.src = sheet.cover_url;
      sheetCover.alt = `cover ${sheet.title || game.title}`;
    } else {
      sheetCover.removeAttribute("src");
      sheetCover.alt = "Aucune image";
    }

    sheetDescriptionFr.textContent = sheet.description_fr || "Description française non disponible pour ce jeu.";
    sheetDescriptionEn.textContent = sheet.description || "English description not available for this game.";

    const images = sheet.images || [];
    sheetImages.innerHTML = images.length
      ? images.map((url) => `<img src="${escapeHtml(url)}" alt="image ${escapeHtml(sheet.title || game.title)}" loading="lazy" />`).join("")
      : "<p class='meta'>Aucune image disponible.</p>";

    const videos = sheet.videos || [];
    sheetVideos.innerHTML = videos.length
      ? videos
          .map(
            (v) => `
              <div>
                <iframe src="${escapeHtml(v.embed_url)}" title="${escapeHtml(v.name || "Vidéo")}" loading="lazy" allowfullscreen></iframe>
                <p class="meta">${escapeHtml(v.name || "Vidéo")}</p>
              </div>
            `,
          )
          .join("")
      : "<p class='meta'>Aucune vidéo disponible.</p>";
  } catch (err) {
    sheetMetaLine.textContent = `Erreur: ${err.message}`;
    sheetOwnership.className = `badge ownership-badge ${ownershipClass(game.ownership_type)}`;
    sheetOwnership.textContent = `Format: ${ownershipLabel(game.ownership_type)}`;
    sheetDescriptionFr.textContent = "Description française non disponible.";
    sheetDescriptionEn.textContent = "English description not available.";
  } finally {
    viewGameSheet.classList.remove("is-loading");
  }
}

function openEditModal(gameId) {
  const game = gamesForPlatform.find((g) => String(g.id) === String(gameId)) || allGames.find((g) => String(g.id) === String(gameId));
  if (!game) return;

  editingGameId = game.id;
  editTitleInput.value = game.title || "";
  editGenreInput.value = game.genre || "";
  editReleaseDateInput.value = game.release_date || "";
  editCoverUrlInput.value = game.cover_url || "";
  editDescriptionInput.value = game.description || "";
  editCompletedInput.checked = !!game.completed;
  editOwnershipTypeInput.value = game.ownership_type || "unknown";
  editGameModal.classList.remove("hidden");
  editGameModal.setAttribute("aria-hidden", "false");
  editTitleInput.focus();
}

function closeEditModal() {
  editingGameId = null;
  editGameModal.classList.add("hidden");
  editGameModal.setAttribute("aria-hidden", "true");
}

function openAddGameModal() {
  if (!selectedPlatform || selectedPlatform === ALL_PLATFORMS_VIEW) {
    showToast("Choisis une plateforme d'abord.");
    return;
  }
  addGameModal.classList.remove("hidden");
  addGameModal.setAttribute("aria-hidden", "false");
  titleInput.focus();
}

function closeAddGameModal() {
  addGameModal.classList.add("hidden");
  addGameModal.setAttribute("aria-hidden", "true");
  searchResults.innerHTML = "";
  searchInput.value = "";
  metadataSearchControls.classList.add("hidden");
  gameForm.reset();
}

platformGrid.addEventListener("click", (event) => {
  const tile = event.target.closest("[data-platform]");
  if (!tile) return;
  goToPlatform(tile.dataset.platform);
});

addPlatformBtn.addEventListener("click", () => {
  const value = newPlatformInput.value.trim();
  if (!value) return showToast("Entre un nom de plateforme.");

  const stored = getStoredCustomPlatforms();
  if (!stored.some((p) => p.toLowerCase() === value.toLowerCase())) {
    stored.push(value);
    setStoredCustomPlatforms(stored);
  }

  newPlatformInput.value = "";
  renderPlatforms();
  goToPlatform(value);
});

backToPlatformsBtn.addEventListener("click", () => {
  closeAddGameModal();
  showView("platforms");
  loadAllGames();
});

topbarStats.addEventListener("click", (event) => {
  const chip = event.target.closest("[data-stat]");
  if (!chip) return;

  const stat = chip.dataset.stat;
  if (stat === "completed") {
    openGlobalGamesView("true");
  } else if (stat === "remaining") {
    openGlobalGamesView("false");
  } else {
    openGlobalGamesView("");
  }
});

toggleAddGameBtn.addEventListener("click", () => {
  openAddGameModal();
});

backToGamesBtn.addEventListener("click", () => {
  showView("games");
});

completedFilter.addEventListener("change", loadPlatformGames);
gameSort.addEventListener("change", loadPlatformGames);

searchBtn.addEventListener("click", loadSearchResults);
searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    loadSearchResults();
  }
});

clearSearchBtn.addEventListener("click", () => {
  searchInput.value = "";
  searchResults.innerHTML = "";
});

searchResults.addEventListener("click", async (event) => {
  const igdbId = event.target?.dataset?.addIgdbId;
  if (!igdbId) return;

  const button = event.target;
  button.disabled = true;
  button.textContent = "Ajout...";

  try {
    const details = await api(`/api/metadata/details/${igdbId}`);
    const payload = {
      title: (details.title || "").trim(),
      platform: selectedPlatform,
      completed: false,
      ownership_type: "unknown",
      genre: (details.genres || []).join(", ").trim(),
      release_date: (details.release_date || "").trim(),
      cover_url: (details.cover_url || "").trim(),
      description: (details.description_fr || details.description || "").trim(),
    };

    if (!payload.title) {
      showToast("Impossible d'ajouter: titre introuvable.");
      return;
    }

    await api("/api/games", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    sheetPayloadCache.clear();
    await loadAllGames();
    await loadPlatformGames();
    showToast("Jeu ajouté depuis IGDB.");
  } catch (err) {
    showToast(`Erreur: ${err.message}`);
  } finally {
    button.disabled = false;
    button.textContent = "Ajouter ce jeu";
  }
});

toggleMetadataSearchBtn.addEventListener("click", () => {
  const hidden = metadataSearchControls.classList.contains("hidden");
  metadataSearchControls.classList.toggle("hidden", !hidden);
  if (hidden) searchInput.focus();
});

closeAddGameBtn.addEventListener("click", closeAddGameModal);
addGameModal.addEventListener("click", (event) => {
  if (event.target?.dataset?.closeAdd) closeAddGameModal();
});

toggleLibrarySearchBtn.addEventListener("click", () => {
  const hidden = librarySearchControls.classList.contains("hidden");
  librarySearchControls.classList.toggle("hidden", !hidden);
  if (hidden) {
    renderSearchHistory();
    librarySearchInput.focus();
  }
});

librarySearchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    pushSearchHistory(librarySearchInput.value);
    renderLibrarySearchResults();
  }
});

librarySearchInput.addEventListener("input", () => {
  const value = librarySearchInput.value.trim();
  clearTimeout(librarySearchTimer);
  if (!value) {
    librarySearchResults.innerHTML = "";
    renderSearchHistory();
    return;
  }
  librarySearchTimer = setTimeout(() => {
    renderLibrarySearchResults();
  }, 180);
});

librarySearchClearBtn.addEventListener("click", () => {
  librarySearchInput.value = "";
  librarySearchResults.innerHTML = "";
  librarySearchControls.classList.add("hidden");
  renderSearchHistory();
});

librarySearchBtn.addEventListener("click", () => {
  pushSearchHistory(librarySearchInput.value);
  renderSearchHistory();
});

librarySearchHistory.addEventListener("click", (event) => {
  const chip = event.target.closest("[data-history-term]");
  if (!chip) return;
  librarySearchInput.value = chip.dataset.historyTerm || "";
  librarySearchControls.classList.remove("hidden");
  pushSearchHistory(librarySearchInput.value);
  renderSearchHistory();
  renderLibrarySearchResults();
});

librarySearchResults.addEventListener("click", async (event) => {
  const openBtn = event.target.closest("[data-open-library-game-id]");
  if (!openBtn) return;
  await openGameFromLibrary(openBtn.dataset.openLibraryGameId);
});

gameForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!selectedPlatform || selectedPlatform === ALL_PLATFORMS_VIEW) {
    return showToast("Choisis une plateforme d'abord.");
  }

  const releaseDate = releaseDateInput.value.trim();
  if (releaseDate && !/^\d{4}-\d{2}-\d{2}$/.test(releaseDate)) {
    return showToast("Date attendue: YYYY-MM-DD");
  }

  const payload = {
    title: titleInput.value.trim(),
    platform: selectedPlatform,
    completed: completedInput.checked,
    ownership_type: ownershipTypeInput.value,
    genre: genreInput.value.trim(),
    release_date: releaseDate,
    cover_url: coverUrlInput.value.trim(),
    description: descriptionInput.value.trim(),
  };

  setBusy(submitBtn, "Ajout...", "Ajouter le jeu", true);

  try {
    await api("/api/games", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    gameForm.reset();
    closeAddGameModal();
    sheetPayloadCache.clear();
    await loadAllGames();
    await loadPlatformGames();
    showToast("Jeu ajouté.");
  } catch (err) {
    showToast(`Erreur: ${err.message}`);
  } finally {
    setBusy(submitBtn, "Ajout...", "Ajouter le jeu", false);
  }
});

gamesGrid.addEventListener("click", (event) => {
  const editBtn = event.target.closest("[data-edit-id]");
  if (editBtn) {
    event.stopPropagation();
    openEditModal(editBtn.dataset.editId);
    return;
  }

  const card = event.target.closest("[data-game-id]");
  if (!card) return;
  openGameSheet(card.dataset.gameId);
});

gamesGrid.addEventListener("mouseover", (event) => {
  const card = event.target.closest("[data-game-id]");
  if (!card) return;
  const gameId = card.dataset.gameId;
  if (!gameId || sheetPayloadCache.has(String(gameId)) || prefetchingSheetIds.has(String(gameId))) return;
  prefetchingSheetIds.add(String(gameId));
  fetchSheetPayload(gameId)
    .catch(() => null)
    .finally(() => prefetchingSheetIds.delete(String(gameId)));
});

sheetEditBtn.addEventListener("click", () => {
  if (!currentSheetGameId) return;
  openEditModal(currentSheetGameId);
});

cancelEditBtn.addEventListener("click", closeEditModal);
editGameModal.addEventListener("click", (event) => {
  if (event.target?.dataset?.closeEdit) closeEditModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !addGameModal.classList.contains("hidden")) {
    closeAddGameModal();
    return;
  }
  if (event.key === "Escape" && !editGameModal.classList.contains("hidden")) {
    closeEditModal();
  }
});

editGameForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!editingGameId) return;

  const releaseDate = editReleaseDateInput.value.trim();
  if (releaseDate && !/^\d{4}-\d{2}-\d{2}$/.test(releaseDate)) {
    return showToast("Date attendue: YYYY-MM-DD");
  }

  setBusy(saveEditBtn, "Enregistrement...", "Enregistrer", true);
  try {
    await api(`/api/games/${editingGameId}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: editTitleInput.value.trim(),
        genre: editGenreInput.value.trim(),
        release_date: releaseDate,
        cover_url: editCoverUrlInput.value.trim(),
        description: editDescriptionInput.value.trim(),
        completed: editCompletedInput.checked,
        ownership_type: editOwnershipTypeInput.value,
      }),
    });
    sheetPayloadCache.delete(String(editingGameId));
    closeEditModal();
    await loadAllGames();
    await loadPlatformGames();
    if (currentSheetGameId && String(currentSheetGameId) === String(editingGameId)) {
      await fetchSheetPayload(currentSheetGameId, true).catch(() => null);
      await openGameSheet(currentSheetGameId);
    }
    showToast("Jeu modifié.");
  } catch (err) {
    showToast(`Erreur: ${err.message}`);
  } finally {
    setBusy(saveEditBtn, "Enregistrement...", "Enregistrer", false);
  }
});

(async function init() {
  try {
    setStatus("Chargement...");
    renderSearchHistory();
    await loadAllGames();
    showView("platforms");
    setStatus("Choisis une plateforme pour continuer.");
  } catch (err) {
    setStatus(`Erreur: ${err.message}`);
  }
})();
