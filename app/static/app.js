const statusMessage = document.getElementById("statusMessage");
const statTotal = document.getElementById("statTotal");
const statCompleted = document.getElementById("statCompleted");
const statRemaining = document.getElementById("statRemaining");
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
const collectionCount = document.getElementById("collectionCount");
const gamesGrid = document.getElementById("gamesGrid");
const toggleAddGameBtn = document.getElementById("toggleAddGameBtn");
const addGamePanel = document.getElementById("addGamePanel");

const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const clearSearchBtn = document.getElementById("clearSearchBtn");
const searchResults = document.getElementById("searchResults");

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
const sheetImages = document.getElementById("sheetImages");
const sheetVideos = document.getElementById("sheetVideos");

const editGameModal = document.getElementById("editGameModal");
const editGameForm = document.getElementById("editGameForm");
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

function showView(name) {
  viewPlatforms.classList.toggle("hidden", name !== "platforms");
  viewPlatformGames.classList.toggle("hidden", name !== "games");
  viewGameSheet.classList.toggle("hidden", name !== "sheet");
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
  const fromDb = [...new Set(allGames.map((g) => g.platform).filter(Boolean))];
  const custom = getStoredCustomPlatforms();
  const platforms = [...new Set([...fromDb, ...custom])].sort((a, b) => a.localeCompare(b));

  if (!platforms.length) {
    platformGrid.innerHTML = "<p>Aucune plateforme. Ajoute-en une pour commencer.</p>";
    return;
  }

  platformGrid.innerHTML = platforms
    .map((platform) => {
      const games = allGames.filter((g) => g.platform === platform);
      const cover = games.find((g) => g.cover_url)?.cover_url;
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
              <button type="button" class="btn-secondary" data-edit-id="${g.id}">Modifier</button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

async function loadPlatformGames() {
  if (!selectedPlatform) return;

  const params = new URLSearchParams({ platform: selectedPlatform });
  if (completedFilter.value) params.set("completed", completedFilter.value);

  gamesGrid.innerHTML = '<p class="meta">Chargement...</p>';
  const data = await api(`/api/games?${params.toString()}`);
  gamesForPlatform = data;

  platformTitle.textContent = selectedPlatform;
  platformSubtitle.textContent = `${data.length} jeu(x) dans cette vue`;
  collectionCount.textContent = `${data.length} affiché(s)`;
  renderGameCards(data);
}

function goToPlatform(platform) {
  selectedPlatform = platform;
  showView("games");
  addGamePanel.classList.add("hidden");
  toggleAddGameBtn.textContent = "Ajouter un jeu";
  setStatus(`Plateforme active: ${platform}`);
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
    const results = await api(`/api/metadata/search?query=${encodeURIComponent(q)}`);
    if (!results.length) {
      searchResults.innerHTML = "<p>Aucun résultat.</p>";
      return;
    }

    searchResults.innerHTML = results
      .map(
        (r) => `
          <article class="search-card">
            <strong>${escapeHtml(r.title || "Sans titre")}</strong>
            <p class="meta">${escapeHtml((r.platforms || []).join(", ") || "N/A")}</p>
            <button type="button" data-igdb-id="${r.igdb_id}">Utiliser ces métadonnées</button>
          </article>
        `,
      )
      .join("");
  } catch (err) {
    searchResults.innerHTML = `<p>Erreur: ${escapeHtml(err.message)}</p>`;
  } finally {
    setBusy(searchBtn, "Recherche...", "Rechercher", false);
  }
}

async function openGameSheet(gameId) {
  const game = gamesForPlatform.find((g) => String(g.id) === String(gameId));
  if (!game) return;

  showView("sheet");
  currentSheetGameId = game.id;
  sheetTitle.textContent = game.title;
  sheetMetaLine.textContent = "Chargement de la fiche...";
  sheetStatus.textContent = "";
  sheetDescriptionFr.textContent = "";
  sheetImages.innerHTML = "";
  sheetVideos.innerHTML = "";

  try {
    const sheet = await api(`/api/games/${game.id}/sheet`);
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
  }
}

function openEditModal(gameId) {
  const game = gamesForPlatform.find((g) => String(g.id) === String(gameId)) || allGames.find((g) => String(g.id) === String(gameId));
  if (!game) return;

  editingGameId = game.id;
  editCompletedInput.checked = !!game.completed;
  editOwnershipTypeInput.value = game.ownership_type || "unknown";
  editGameModal.classList.remove("hidden");
  editGameModal.setAttribute("aria-hidden", "false");
}

function closeEditModal() {
  editingGameId = null;
  editGameModal.classList.add("hidden");
  editGameModal.setAttribute("aria-hidden", "true");
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
  showView("platforms");
  loadAllGames();
});

toggleAddGameBtn.addEventListener("click", () => {
  const hidden = addGamePanel.classList.contains("hidden");
  addGamePanel.classList.toggle("hidden", !hidden);
  toggleAddGameBtn.textContent = hidden ? "Fermer l'ajout" : "Ajouter un jeu";
});

backToGamesBtn.addEventListener("click", () => {
  showView("games");
});

completedFilter.addEventListener("change", loadPlatformGames);

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
  const igdbId = event.target?.dataset?.igdbId;
  if (!igdbId) return;

  event.target.disabled = true;
  event.target.textContent = "Chargement...";

  try {
    const details = await api(`/api/metadata/details/${igdbId}`);
    fillFormFromMetadata(details);
    addGamePanel.classList.remove("hidden");
    toggleAddGameBtn.textContent = "Fermer l'ajout";
    showToast("Métadonnées appliquées.");
  } catch (err) {
    showToast(`Erreur: ${err.message}`);
  } finally {
    event.target.disabled = false;
    event.target.textContent = "Utiliser ces métadonnées";
  }
});

gameForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!selectedPlatform) return showToast("Choisis une plateforme d'abord.");

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

sheetEditBtn.addEventListener("click", () => {
  if (!currentSheetGameId) return;
  openEditModal(currentSheetGameId);
});

cancelEditBtn.addEventListener("click", closeEditModal);
editGameModal.addEventListener("click", (event) => {
  if (event.target?.dataset?.closeEdit) closeEditModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !editGameModal.classList.contains("hidden")) {
    closeEditModal();
  }
});

editGameForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!editingGameId) return;

  setBusy(saveEditBtn, "Enregistrement...", "Enregistrer", true);
  try {
    await api(`/api/games/${editingGameId}`, {
      method: "PATCH",
      body: JSON.stringify({
        completed: editCompletedInput.checked,
        ownership_type: editOwnershipTypeInput.value,
      }),
    });
    closeEditModal();
    await loadAllGames();
    await loadPlatformGames();
    if (currentSheetGameId && String(currentSheetGameId) === String(editingGameId)) {
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
    await loadAllGames();
    showView("platforms");
    setStatus("Choisis une plateforme pour continuer.");
  } catch (err) {
    setStatus(`Erreur: ${err.message}`);
  }
})();
