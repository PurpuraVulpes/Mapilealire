// ===== DONNÉES =====
let books = JSON.parse(localStorage.getItem('myBookPile')) || [];
let wishlist = JSON.parse(localStorage.getItem('myBookWishlist')) || [];
let currentFilter = 'all';
let wishlistFilter = 'all';
let sagaFilter = 'all';
let ratingBookId = null;
let selectedRating = 0;
let transferBookId = null;
let editSagaKey = null;

let settings = JSON.parse(localStorage.getItem('myBookPileSettings')) || {
    theme: 'purple', particles: true, animations: true
};

// Stockage des infos complémentaires de sagas (totalTomes)
let sagasMeta = JSON.parse(localStorage.getItem('myBookSagasMeta')) || {};

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    applySettings();
    createParticles();
    renderAll();
    document.getElementById('addBookForm').addEventListener('submit', addBook);
    document.getElementById('addWishlistForm').addEventListener('submit', addWishlistItem);
});

function renderAll() {
    renderBooks(); renderSagas(); renderAuthors(); renderWishlist();
    updateStats(); updateRandomGenreFilter();
}

// ===== SETTINGS =====
function applySettings() {
    document.documentElement.setAttribute('data-theme', settings.theme);
    updateActiveThemeCard();
    document.getElementById('toggleParticles').checked = settings.particles;
    document.getElementById('particles').classList.toggle('hidden', !settings.particles);
    document.getElementById('toggleAnimations').checked = settings.animations;
    document.body.classList.toggle('no-animations', !settings.animations);
}
function saveSettings() { localStorage.setItem('myBookPileSettings', JSON.stringify(settings)); }
function switchTab(tab, btn) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('page-' + tab).classList.add('active');
    btn.classList.add('active');
    if (tab === 'authors') renderAuthors();
    if (tab === 'sagas') renderSagas();
}
function setTheme(t) { settings.theme = t; document.documentElement.setAttribute('data-theme', t); updateActiveThemeCard(); saveSettings(); showToast(`🎨 Thème "${t}" appliqué !`); }
function updateActiveThemeCard() { document.querySelectorAll('.theme-card').forEach(c => c.classList.toggle('active', c.getAttribute('data-theme-btn') === settings.theme)); }
function toggleParticlesF() { settings.particles = document.getElementById('toggleParticles').checked; document.getElementById('particles').classList.toggle('hidden', !settings.particles); saveSettings(); }
function toggleAnimationsF() { settings.animations = document.getElementById('toggleAnimations').checked; document.body.classList.toggle('no-animations', !settings.animations); saveSettings(); }

// ===== EXPORT/IMPORT =====
function exportData() {
    const data = { books, wishlist, sagasMeta, settings };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'ma-pile-a-livres.json'; a.click();
    showToast('📤 Exporté !');
}
function importData(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.books) { books = data.books; saveBooks(); }
            if (data.wishlist) { wishlist = data.wishlist; saveWishlist(); }
            if (data.sagasMeta) { sagasMeta = data.sagasMeta; saveSagasMeta(); }
            if (data.settings) { settings = { ...settings, ...data.settings }; saveSettings(); applySettings(); }
            renderAll(); showToast('📥 Importé !');
        } catch { showToast('❌ Fichier invalide !'); }
    };
    reader.readAsText(file); event.target.value = '';
}
function clearAllData() {
    if (confirm('⚠️ Tout supprimer ? Irréversible.')) {
        books = []; wishlist = []; sagasMeta = {};
        saveBooks(); saveWishlist(); saveSagasMeta();
        renderAll(); showToast('🗑️ Tout supprimé.');
    }
}

// ===== PARTICULES =====
function createParticles() {
    const c = document.getElementById('particles');
    for (let i = 0; i < 50; i++) {
        const p = document.createElement('div'); p.classList.add('particle');
        const s = Math.random() * 6 + 2;
        p.style.cssText = `width:${s}px;height:${s}px;left:${Math.random()*100}%;animation-duration:${Math.random()*15+10}s;animation-delay:${Math.random()*10}s`;
        c.appendChild(p);
    }
}

// ===== SERIES HELPERS =====
function getSeriesKey(name) {
    return name.trim().toLowerCase();
}

function getAllSeries() {
    const seriesMap = {};
    books.forEach(b => {
        if (b.series && b.series.trim()) {
            const key = getSeriesKey(b.series);
            if (!seriesMap[key]) {
                seriesMap[key] = {
                    key,
                    name: b.series.trim(),
                    author: b.author,
                    genre: b.genre,
                    books: []
                };
            }
            seriesMap[key].books.push(b);
        }
    });

    // Ajouter les meta infos
    Object.keys(seriesMap).forEach(key => {
        const meta = sagasMeta[key] || {};
        seriesMap[key].totalTomes = meta.totalTomes || seriesMap[key].books.length;
        seriesMap[key].books.sort((a, b) => (a.tome || 999) - (b.tome || 999));
        const readCount = seriesMap[key].books.filter(b => b.status === 'read').length;
        seriesMap[key].readCount = readCount;
        seriesMap[key].ownedCount = seriesMap[key].books.length;
        seriesMap[key].progress = seriesMap[key].totalTomes > 0 ? Math.round((readCount / seriesMap[key].totalTomes) * 100) : 0;
        seriesMap[key].isCompleted = readCount >= seriesMap[key].totalTomes && seriesMap[key].totalTomes > 0;
        seriesMap[key].isStarted = readCount > 0;
    });

    return seriesMap;
}

function updateSeriesSuggestions() {
    const input = document.getElementById('bookSeries').value.trim().toLowerCase();
    const datalist = document.getElementById('seriesSuggestions');
    const allSeries = getAllSeries();
    const names = [...new Set(Object.values(allSeries).map(s => s.name))];

    datalist.innerHTML = '';
    names.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        datalist.appendChild(opt);
    });

    // Auto-fill total tomes si la série existe
    if (input) {
        const key = getSeriesKey(input);
        const meta = sagasMeta[key];
        if (meta && meta.totalTomes) {
            document.getElementById('bookTotalTomes').value = meta.totalTomes;
        }
    }
}

// ============================================================
//  BIBLIOTHÈQUE
// ============================================================
function addBook(e) {
    e.preventDefault();
    const title = document.getElementById('bookTitle').value.trim();
    const author = document.getElementById('bookAuthor').value.trim();
    const genre = document.getElementById('bookGenre').value;
    const series = document.getElementById('bookSeries').value.trim();
    const tome = parseInt(document.getElementById('bookTome').value) || null;
    const totalTomes = parseInt(document.getElementById('bookTotalTomes').value) || null;
    if (!title || !author) return;

    books.push({
        id: Date.now(), title, author, genre,
        series: series || null,
        tome,
        status: 'toRead', rating: 0, review: '',
        dateAdded: new Date().toLocaleDateString('fr-FR'), dateRead: null
    });

    // Mettre à jour les meta de saga
    if (series) {
        const key = getSeriesKey(series);
        if (!sagasMeta[key]) sagasMeta[key] = {};
        if (totalTomes && totalTomes > 0) {
            sagasMeta[key].totalTomes = totalTomes;
        }
        saveSagasMeta();
    }

    saveBooks(); renderAll();
    document.getElementById('addBookForm').reset();

    if (series) {
        const seriesData = getAllSeries();
        const key = getSeriesKey(series);
        const s = seriesData[key];
        if (s && s.books.length > 1) {
            showToast(`📥 "${title}" ajouté à la saga "${s.name}" (${s.ownedCount} tomes) !`);
        } else {
            showToast(`📥 "${title}" ajouté ! Saga "${series}" créée automatiquement.`);
        }
    } else {
        showToast(`📥 "${title}" ajouté !`);
    }
}

function renderBooks() {
    const container = document.getElementById('booksList');
    const query = document.getElementById('searchInput').value.toLowerCase();
    const sortBy = document.getElementById('bookSortSelect').value;

    let filtered = books.filter(b => {
        const mf = currentFilter === 'all' || (currentFilter === 'toRead' && b.status === 'toRead') || (currentFilter === 'read' && b.status === 'read');
        const ms = b.title.toLowerCase().includes(query) || b.author.toLowerCase().includes(query) || b.genre.toLowerCase().includes(query) || (b.series && b.series.toLowerCase().includes(query));
        return mf && ms;
    });

    filtered.sort((a, b) => {
        switch (sortBy) {
            case 'title': return a.title.localeCompare(b.title);
            case 'author': return a.author.localeCompare(b.author);
            case 'rating': return b.rating - a.rating;
            case 'series':
                const sA = a.series || 'zzzzz'; const sB = b.series || 'zzzzz';
                if (sA !== sB) return sA.localeCompare(sB);
                return (a.tome || 999) - (b.tome || 999);
            case 'dateAdded': return b.id - a.id;
            default:
                if (a.status === 'toRead' && b.status === 'read') return -1;
                if (a.status === 'read' && b.status === 'toRead') return 1;
                return b.rating - a.rating;
        }
    });

    if (!filtered.length) {
        container.innerHTML = `<div class="empty-state"><span class="emoji">📭</span><p>Aucun livre trouvé.</p></div>`;
        return;
    }

    container.innerHTML = filtered.map(b => {
        const starsH = b.rating > 0 ? `<div class="stars">${'★'.repeat(b.rating)}${'☆'.repeat(5 - b.rating)}</div>` : '';
        const reviewH = b.review ? `<div class="review">"${b.review}"</div>` : '';
        const sc = b.status === 'read' ? 'read' : 'to-read';
        const sl = b.status === 'read' ? '✅ Lu' : '📖 À lire';
        const sagaH = b.series ? `<span class="saga-tag">📖 ${b.series}</span>` : '';
        const tomeH = b.tome ? `<span class="tome-tag">Tome ${b.tome}</span>` : '';

        return `<div class="book-card ${sc}">
            <button class="delete-icon" onclick="deleteBook(${b.id})">🗑</button>
            <h3>${b.title}</h3><p class="author">par ${b.author}</p>
            <span class="genre-tag">${b.genre}</span><span class="status-badge ${sc}">${sl}</span>
            ${tomeH}${sagaH}${starsH}${reviewH}
            <div class="actions">
                ${b.status === 'toRead' ? `<button class="btn-mark-read" onclick="markAsRead(${b.id})">✅ Lu</button>` : `<button class="btn-unread" onclick="markAsUnread(${b.id})">📖 À lire</button>`}
                ${b.status === 'read' ? `<button class="btn-rate" onclick="openRatingModal(${b.id})">⭐ ${b.rating > 0 ? 'Modifier' : 'Noter'}</button>` : ''}
            </div></div>`;
    }).join('');
}

function filterBooks(f, btn) { currentFilter = f; document.querySelectorAll('#page-home .filter-btn').forEach(b => b.classList.remove('active')); btn?.classList.add('active'); renderBooks(); }

function markAsRead(id) {
    const b = books.find(x => x.id === id);
    if (b) { b.status = 'read'; b.dateRead = new Date().toLocaleDateString('fr-FR'); saveBooks(); renderAll(); showToast(`✅ "${b.title}" lu !`); setTimeout(() => openRatingModal(id), 400); }
}
function markAsUnread(id) {
    const b = books.find(x => x.id === id);
    if (b) { b.status = 'toRead'; b.rating = 0; b.review = ''; b.dateRead = null; saveBooks(); renderAll(); showToast(`📖 "${b.title}" remis à lire !`); }
}
function deleteBook(id) {
    const b = books.find(x => x.id === id);
    if (b && confirm(`Supprimer "${b.title}" ?`)) {
        books = books.filter(x => x.id !== id);
        // Nettoyer les meta de saga si plus aucun livre dans la série
        if (b.series) {
            const key = getSeriesKey(b.series);
            const remaining = books.filter(x => x.series && getSeriesKey(x.series) === key);
            if (remaining.length === 0) delete sagasMeta[key];
            saveSagasMeta();
        }
        saveBooks(); renderAll(); showToast(`🗑 "${b.title}" supprimé.`);
    }
}

// RATING
function openRatingModal(id) {
    ratingBookId = id; selectedRating = 0;
    const b = books.find(x => x.id === id); if (!b) return;
    document.getElementById('modalBookTitle').textContent = b.title;
    document.getElementById('bookReview').value = b.review || '';
    if (b.rating > 0) selectedRating = b.rating;
    updateStarsDisplay();
    document.getElementById('ratingModal').classList.add('active');
}
function closeRatingModal() { document.getElementById('ratingModal').classList.remove('active'); }
function setRating(n) { selectedRating = n; updateStarsDisplay(); }
function updateStarsDisplay() { document.querySelectorAll('#starsInput .star-btn').forEach((s, i) => s.classList.toggle('active', i < selectedRating)); }
function confirmRating() {
    if (!selectedRating) { showToast('⚠️ Sélectionne au moins 1 étoile !'); return; }
    const b = books.find(x => x.id === ratingBookId);
    if (b) { b.rating = selectedRating; b.review = document.getElementById('bookReview').value.trim(); saveBooks(); renderAll(); showToast(`⭐ "${b.title}" noté ${selectedRating}/5 !`); }
    closeRatingModal();
}

// RANDOM
function pickRandomBook() {
    const gf = document.getElementById('randomGenreFilter').value;
    let cands = books.filter(b => b.status === 'toRead');
    if (gf !== 'all') cands = cands.filter(b => b.genre === gf);
    const rd = document.getElementById('randomResult'), btn = document.getElementById('randomBtn');
    if (!cands.length) { rd.innerHTML = `<div class="random-card"><h3>😅 Aucun livre à lire !</h3></div>`; return; }
    btn.disabled = true; btn.textContent = '🎰 Sélection...';
    let spins = 0;
    const iv = setInterval(() => {
        const r = cands[Math.floor(Math.random() * cands.length)];
        rd.innerHTML = `<div class="random-card spinning"><h3>${r.title}</h3><p class="author">par ${r.author}</p></div>`;
        if (++spins >= 15) {
            clearInterval(iv);
            const ch = cands[Math.floor(Math.random() * cands.length)];
            rd.innerHTML = `<div class="random-card"><h3>🎉 ${ch.title}</h3><p class="author">par ${ch.author}</p><span class="genre-tag">${ch.genre}</span>${ch.series ? `<br><span class="saga-tag">📖 ${ch.series}${ch.tome ? ' - T' + ch.tome : ''}</span>` : ''}</div>`;
            btn.disabled = false; btn.textContent = '🎰 Choisir un livre au hasard';
            showToast(`🎲 "${ch.title}" choisi !`);
        }
    }, 100);
}
function updateRandomGenreFilter() {
    const s = document.getElementById('randomGenreFilter');
    const g = [...new Set(books.filter(b => b.status === 'toRead').map(b => b.genre))];
    s.innerHTML = '<option value="all">Tous les genres</option>';
    g.forEach(x => s.innerHTML += `<option value="${x}">${x}</option>`);
}

// ============================================================
//  SAGAS (AUTO-GÉNÉRÉES)
// ============================================================
function renderSagas() {
    const container = document.getElementById('sagasList');
    const query = document.getElementById('sagaSearchInput').value.toLowerCase();
    const allSeries = getAllSeries();

    let seriesList = Object.values(allSeries);
    seriesList = seriesList.filter(s => s.name.toLowerCase().includes(query) || s.author.toLowerCase().includes(query));

    if (sagaFilter === 'completed') seriesList = seriesList.filter(s => s.isCompleted);
    else if (sagaFilter === 'inProgress') seriesList = seriesList.filter(s => s.isStarted && !s.isCompleted);
    else if (sagaFilter === 'notStarted') seriesList = seriesList.filter(s => !s.isStarted);

    const allSeriesValues = Object.values(allSeries);
    document.getElementById('sagasTotalStat').textContent = allSeriesValues.length;
    document.getElementById('sagasCompletedStat').textContent = allSeriesValues.filter(s => s.isCompleted).length;
    document.getElementById('sagasInProgressStat').textContent = allSeriesValues.filter(s => s.isStarted && !s.isCompleted).length;
    document.getElementById('sagasTotalTomes').textContent = allSeriesValues.reduce((sum, s) => sum + s.ownedCount, 0);
    document.getElementById('sagasCount').textContent = allSeriesValues.length;

    if (!seriesList.length) {
        container.innerHTML = `<div class="empty-state"><span class="emoji">📖</span><p>Aucune saga trouvée.<br>Ajoute des livres avec un nom de série !</p></div>`;
        return;
    }

    seriesList.sort((a, b) => {
        if (a.isCompleted && !b.isCompleted) return 1;
        if (!a.isCompleted && b.isCompleted) return -1;
        return b.progress - a.progress;
    });

    container.innerHTML = seriesList.map(s => {
        // Liste des tomes possédés
        const tomesHtml = s.books.map(b => `
            <div class="tome-item">
                <span class="tome-title">${b.tome ? 'T' + b.tome + ' — ' : ''}${b.title}</span>
                ${b.rating > 0 ? `<span class="tome-rating">${'★'.repeat(b.rating)}</span>` : ''}
                <span class="tome-status ${b.status === 'read' ? 'read-tome' : 'unread-tome'}">${b.status === 'read' ? '✅' : '📖'}</span>
            </div>`).join('');

        // Calculer les tomes manquants
        const ownedTomeNumbers = s.books.map(b => b.tome).filter(t => t !== null && t !== undefined);
        const missingTomes = [];
        
        if (s.totalTomes > 0) {
            for (let i = 1; i <= s.totalTomes; i++) {
                if (!ownedTomeNumbers.includes(i)) {
                    missingTomes.push(i);
                }
            }
        }

        const missingCount = s.totalTomes - s.ownedCount;

        // HTML des tomes manquants
        let missingHtml = '';
        if (missingTomes.length > 0) {
            const missingItems = missingTomes.map(t => `
                <div class="tome-item missing-tome">
                    <span class="tome-title missing-title">T${t} — ???</span>
                    <span class="tome-status missing-status">❌ Manquant</span>
                </div>`).join('');

            missingHtml = `
                <div class="missing-section">
                    <div class="missing-header">
                        <span class="missing-icon">⚠️</span>
                        <span class="missing-label">${missingTomes.length} tome${missingTomes.length > 1 ? 's' : ''} manquant${missingTomes.length > 1 ? 's' : ''}</span>
                    </div>
                    <div class="missing-list">
                        ${missingItems}
                    </div>
                    <p class="missing-hint">💡 Ajoute ces tomes via la bibliothèque avec la série "${s.name}"</p>
                </div>`;
        }

        // Icône de complétion
        let completionIcon = '';
        if (s.isCompleted) {
            completionIcon = '<span class="saga-complete-badge">🎉 Saga terminée !</span>';
        } else if (missingTomes.length === 0 && s.ownedCount >= s.totalTomes) {
            completionIcon = '<span class="saga-all-owned-badge">📚 Tous les tomes possédés</span>';
        }

        // Note moyenne
        const avgRating = s.books.filter(b => b.rating > 0);
        const avg = avgRating.length > 0 ? (avgRating.reduce((sum, b) => sum + b.rating, 0) / avgRating.length).toFixed(1) : null;

        return `<div class="saga-card ${s.isCompleted ? 'saga-completed' : ''} ${missingTomes.length > 0 ? 'saga-has-missing' : ''}">
            <h3>📖 ${s.name}</h3>
            <p class="saga-author">par ${s.author}</p>
            <span class="genre-tag">${s.genre}</span>
            ${completionIcon}
            <div class="saga-info">
                <span>📚 ${s.ownedCount}/${s.totalTomes} possédés</span>
                <span>✅ ${s.readCount} lus</span>
                ${missingCount > 0 ? `<span class="missing-count-tag">❌ ${missingCount} manquants</span>` : ''}
                ${avg ? `<span>⭐ ${avg}/5</span>` : ''}
            </div>
            <p class="progress-text">${s.progress}% lu ${s.isCompleted ? '🎉' : ''}</p>
            <div class="progress-bar"><div class="progress-fill" style="width:${Math.min(s.progress, 100)}%"></div></div>
            
            <div class="tomes-list">
                <p class="tomes-section-title">📗 Tomes possédés (${s.ownedCount})</p>
                ${tomesHtml}
            </div>

            ${missingHtml}

            <div class="actions">
                <button class="btn-edit-saga" onclick="openEditSagaModal('${s.key}')">✏️ Modifier tomes prévus</button>
            </div>
        </div>`;
    }).join('');
}

    // Recherche
    seriesList = seriesList.filter(s => s.name.toLowerCase().includes(query) || s.author.toLowerCase().includes(query));

    // Filtre
    if (sagaFilter === 'completed') seriesList = seriesList.filter(s => s.isCompleted);
    else if (sagaFilter === 'inProgress') seriesList = seriesList.filter(s => s.isStarted && !s.isCompleted);
    else if (sagaFilter === 'notStarted') seriesList = seriesList.filter(s => !s.isStarted);

    // Stats
    const allSeriesValues = Object.values(allSeries);
    document.getElementById('sagasTotalStat').textContent = allSeriesValues.length;
    document.getElementById('sagasCompletedStat').textContent = allSeriesValues.filter(s => s.isCompleted).length;
    document.getElementById('sagasInProgressStat').textContent = allSeriesValues.filter(s => s.isStarted && !s.isCompleted).length;
    document.getElementById('sagasTotalTomes').textContent = allSeriesValues.reduce((sum, s) => sum + s.ownedCount, 0);
    document.getElementById('sagasCount').textContent = allSeriesValues.length;

    if (!seriesList.length) {
        container.innerHTML = `<div class="empty-state"><span class="emoji">📖</span><p>Aucune saga trouvée.<br>Ajoute des livres avec un nom de série pour les voir ici !</p></div>`;
        return;
    }

    // Tri par progression
    seriesList.sort((a, b) => {
        if (a.isCompleted && !b.isCompleted) return 1;
        if (!a.isCompleted && b.isCompleted) return -1;
        return b.progress - a.progress;
    });

    container.innerHTML = seriesList.map(s => {
        const tomesHtml = s.books.map(b => `
            <div class="tome-item">
                <span class="tome-title">${b.tome ? 'T' + b.tome + ' — ' : ''}${b.title}</span>
                ${b.rating > 0 ? `<span class="tome-rating">${'★'.repeat(b.rating)}</span>` : ''}
                <span class="tome-status ${b.status === 'read' ? 'read-tome' : 'unread-tome'}">${b.status === 'read' ? '✅' : '📖'}</span>
            </div>`).join('');

        const missing = s.totalTomes - s.ownedCount;
        const avgRating = s.books.filter(b => b.rating > 0);
        const avg = avgRating.length > 0 ? (avgRating.reduce((sum, b) => sum + b.rating, 0) / avgRating.length).toFixed(1) : null;

        return `<div class="saga-card">
            <h3>📖 ${s.name}</h3>
            <p class="saga-author">par ${s.author}</p>
            <span class="genre-tag">${s.genre}</span>
            <div class="saga-info">
                <span>📚 ${s.ownedCount}/${s.totalTomes} possédés</span>
                <span>✅ ${s.readCount} lus</span>
                ${missing > 0 ? `<span>❓ ${missing} manquants</span>` : ''}
                ${avg ? `<span>⭐ ${avg}/5</span>` : ''}
            </div>
            <p class="progress-text">${s.progress}% lu ${s.isCompleted ? '🎉' : ''}</p>
            <div class="progress-bar"><div class="progress-fill" style="width:${Math.min(s.progress, 100)}%"></div></div>
            <div class="tomes-list">${tomesHtml}</div>
            <div class="actions">
                <button class="btn-edit-saga" onclick="openEditSagaModal('${s.key}')">✏️ Modifier tomes prévus</button>
            </div>
        </div>`;
    }).join('');
}

function filterSagas(f, btn) { sagaFilter = f; document.querySelectorAll('#page-sagas .filter-btn').forEach(b => b.classList.remove('active')); btn?.classList.add('active'); renderSagas(); }

// Edit saga modal
function openEditSagaModal(key) {
    editSagaKey = key;
    const allSeries = getAllSeries();
    const s = allSeries[key];
    if (!s) return;
    document.getElementById('editSagaTitle').textContent = s.name;
    document.getElementById('editSagaTotalTomes').value = s.totalTomes;
    document.getElementById('editSagaModal').classList.add('active');
}
function closeEditSagaModal() { document.getElementById('editSagaModal').classList.remove('active'); editSagaKey = null; }
function confirmEditSaga() {
    const val = parseInt(document.getElementById('editSagaTotalTomes').value);
    if (!val || val < 1) { showToast('⚠️ Entre un nombre valide !'); return; }
    if (!sagasMeta[editSagaKey]) sagasMeta[editSagaKey] = {};
    sagasMeta[editSagaKey].totalTomes = val;
    saveSagasMeta(); renderSagas(); renderAll();
    showToast('✏️ Saga mise à jour !');
    closeEditSagaModal();
}

// ============================================================
//  AUTEURS
// ============================================================
function renderAuthors() {
    const container = document.getElementById('authorsList');
    const query = document.getElementById('authorSearchInput').value.toLowerCase();
    const sortBy = document.getElementById('authorSortSelect').value;

    const authorMap = {};
    books.forEach(b => {
        const key = b.author.trim();
        if (!authorMap[key]) authorMap[key] = { name: key, books: [] };
        authorMap[key].books.push(b);
    });

    let authors = Object.values(authorMap).filter(a => a.name.toLowerCase().includes(query));

    const allSeries = getAllSeries();

    authors = authors.map(a => {
        const readB = a.books.filter(b => b.status === 'read').length;
        const rated = a.books.filter(b => b.rating > 0);
        const avg = rated.length > 0 ? rated.reduce((s, b) => s + b.rating, 0) / rated.length : 0;
        const authorSeries = Object.values(allSeries).filter(s => s.author.trim() === a.name);
        return { ...a, totalBooks: a.books.length, readBooks: readB, avgRating: avg, authorSeries };
    });

    authors.sort((a, b) => {
        switch (sortBy) {
            case 'name': return a.name.localeCompare(b.name);
            case 'rating': return b.avgRating - a.avgRating;
            case 'read': return b.readBooks - a.readBooks;
            default: return b.totalBooks - a.totalBooks;
        }
    });

    document.getElementById('authorsTotal').textContent = authors.length;
    if (authors.length > 0) {
        const top = [...authors].sort((a, b) => b.totalBooks - a.totalBooks)[0];
        document.getElementById('authorTopName').textContent = top.name.length > 15 ? top.name.substring(0, 15) + '…' : top.name;
        document.getElementById('authorTopCount').textContent = top.totalBooks;
    } else {
        document.getElementById('authorTopName').textContent = '-';
        document.getElementById('authorTopCount').textContent = '0';
    }

    if (!authors.length) { container.innerHTML = `<div class="empty-state"><span class="emoji">✍️</span><p>Aucun auteur trouvé.</p></div>`; return; }

    container.innerHTML = authors.map(a => {
        const booksHtml = a.books.sort((x, y) => x.title.localeCompare(y.title)).map(b => `
            <div class="author-book-item">
                <span class="ab-title">${b.title}${b.tome ? ' (T' + b.tome + ')' : ''}${b.series ? ' — ' + b.series : ''}</span>
                <span class="ab-status ${b.status === 'read' ? 'ab-read' : 'ab-toread'}">${b.status === 'read' ? '✅' : '📖'}</span>
                ${b.rating > 0 ? `<span class="ab-rating">${'★'.repeat(b.rating)}</span>` : ''}
            </div>`).join('');

        const seriesHtml = a.authorSeries.length > 0 ? `<p class="author-series">📖 Sagas : ${a.authorSeries.map(s => `${s.name} (${s.readCount}/${s.totalTomes})`).join(', ')}</p>` : '';
        const uid = 'au-' + a.name.replace(/[^a-zA-Z0-9]/g, '_') + Math.random().toString(36).substr(2, 5);

        return `<div class="author-card">
            <h3>✍️ ${a.name}</h3>
            <div class="author-stats">
                <div class="author-stat"><span class="author-stat-num">${a.totalBooks}</span><span class="author-stat-label">Livres</span></div>
                <div class="author-stat"><span class="author-stat-num">${a.readBooks}</span><span class="author-stat-label">Lus</span></div>
                <div class="author-stat"><span class="author-stat-num">${a.avgRating > 0 ? a.avgRating.toFixed(1) + '⭐' : '-'}</span><span class="author-stat-label">Note</span></div>
                <div class="author-stat"><span class="author-stat-num">${a.authorSeries.length}</span><span class="author-stat-label">Sagas</span></div>
            </div>
            ${seriesHtml}
            ${a.totalBooks > 0 ? `<button class="toggle-books-btn" onclick="toggleAuthorBooks('${uid}',this)">📚 Voir les ${a.totalBooks} livres</button><div class="author-books-container" id="${uid}">${booksHtml}</div>` : ''}
        </div>`;
    }).join('');
}

function toggleAuthorBooks(uid, btn) {
    const c = document.getElementById(uid);
    const exp = c.classList.toggle('expanded');
    btn.textContent = exp ? '📚 Masquer' : '📚 Voir les livres';
}

// ============================================================
//  WISHLIST
// ============================================================
function addWishlistItem(e) {
    e.preventDefault();
    const t = document.getElementById('wishTitle').value.trim(), a = document.getElementById('wishAuthor').value.trim();
    const g = document.getElementById('wishGenre').value, p = parseFloat(document.getElementById('wishPrice').value) || 0;
    const pr = parseInt(document.getElementById('wishPriority').value), n = document.getElementById('wishNotes').value.trim();
    if (!t || !a) return;
    wishlist.push({ id: Date.now(), title: t, author: a, genre: g, price: p, priority: pr, notes: n, status: 'toBuy', dateAdded: new Date().toLocaleDateString('fr-FR'), dateBought: null });
    saveWishlist(); renderWishlist(); updateStats();
    document.getElementById('addWishlistForm').reset(); showToast(`🛒 "${t}" ajouté !`);
}

function renderWishlist() {
    const container = document.getElementById('wishlistList'), query = document.getElementById('wishSearchInput').value.toLowerCase();
    let filtered = wishlist.filter(i => {
        const mf = wishlistFilter === 'all' || (wishlistFilter === 'toBuy' && i.status === 'toBuy') || (wishlistFilter === 'bought' && i.status === 'bought');
        return mf && (i.title.toLowerCase().includes(query) || i.author.toLowerCase().includes(query));
    });
    filtered.sort((a, b) => { if (a.status === 'toBuy' && b.status === 'bought') return -1; if (a.status === 'bought' && b.status === 'toBuy') return 1; return b.priority - a.priority; });
    if (!filtered.length) { container.innerHTML = `<div class="empty-state"><span class="emoji">🛒</span><p>Aucun livre dans la wishlist.</p></div>`; return; }
    const pl = { 3: '🔴 Haute', 2: '🟡 Moyenne', 1: '🟢 Basse' }, pc = { 3: 'high', 2: 'medium', 1: 'low' };
    container.innerHTML = filtered.map(i => {
        const sc = i.status === 'bought' ? 'wish-bought' : 'wish-to-buy', sl = i.status === 'bought' ? '✅ Acheté' : '📋 À acheter';
        return `<div class="book-card ${sc}"><button class="delete-icon" onclick="deleteWishlistItem(${i.id})">🗑</button>
            <h3>${i.title}</h3><p class="author">par ${i.author}</p>
            <span class="genre-tag">${i.genre}</span><span class="status-badge ${sc}">${sl}</span>
            ${i.price > 0 ? `<span class="price-tag">${i.price.toFixed(2)} €</span>` : ''}<span class="priority-tag ${pc[i.priority]}">${pl[i.priority]}</span>
            ${i.notes ? `<p class="wish-notes">📝 ${i.notes}</p>` : ''}
            <div class="actions">
                ${i.status === 'toBuy' ? `<button class="btn-bought" onclick="markAsBought(${i.id})">✅ Acheté</button><button class="btn-transfer" onclick="openTransferModal(${i.id})">📚 → Biblio</button>` : `<button class="btn-unbuy" onclick="markAsUnbought(${i.id})">🛒 Remettre</button><button class="btn-transfer" onclick="openTransferModal(${i.id})">📚 → Biblio</button>`}
            </div></div>`;
    }).join('');
}

function filterWishlist(f, btn) { wishlistFilter = f; document.querySelectorAll('#page-wishlist .filter-btn').forEach(b => b.classList.remove('active')); btn?.classList.add('active'); renderWishlist(); }
function markAsBought(id) { const i = wishlist.find(x => x.id === id); if (i) { i.status = 'bought'; i.dateBought = new Date().toLocaleDateString('fr-FR'); saveWishlist(); renderWishlist(); updateStats(); showToast(`✅ "${i.title}" acheté !`); } }
function markAsUnbought(id) { const i = wishlist.find(x => x.id === id); if (i) { i.status = 'toBuy'; i.dateBought = null; saveWishlist(); renderWishlist(); updateStats(); showToast(`🛒 Remis !`); } }
function deleteWishlistItem(id) { const i = wishlist.find(x => x.id === id); if (i && confirm(`Supprimer "${i.title}" ?`)) { wishlist = wishlist.filter(x => x.id !== id); saveWishlist(); renderWishlist(); updateStats(); showToast(`🗑 Supprimé.`); } }

// TRANSFER
function openTransferModal(id) { transferBookId = id; const i = wishlist.find(x => x.id === id); if (!i) return; document.getElementById('transferBookTitle').textContent = `${i.title} — ${i.author}`; document.getElementById('removeFromWishlist').checked = true; document.getElementById('transferModal').classList.add('active'); }
function closeTransferModal() { document.getElementById('transferModal').classList.remove('active'); }
function confirmTransfer() {
    const i = wishlist.find(x => x.id === transferBookId); if (!i) return;
    if (books.some(b => b.title.toLowerCase() === i.title.toLowerCase() && b.author.toLowerCase() === i.author.toLowerCase())) { showToast(`⚠️ Déjà dans la bibliothèque !`); closeTransferModal(); return; }
    books.push({ id: Date.now(), title: i.title, author: i.author, genre: i.genre, series: null, tome: null, status: 'toRead', rating: 0, review: '', dateAdded: new Date().toLocaleDateString('fr-FR'), dateRead: null });
    if (document.getElementById('removeFromWishlist').checked) wishlist = wishlist.filter(x => x.id !== transferBookId);
    else { i.status = 'bought'; i.dateBought = new Date().toLocaleDateString('fr-FR'); }
    saveBooks(); saveWishlist(); renderAll(); showToast(`📚 "${i.title}" transféré !`); closeTransferModal();
}

// ===== STATS =====
function updateStats() {
    document.getElementById('totalBooks').textContent = books.length;
    document.getElementById('toReadBooks').textContent = books.filter(b => b.status === 'toRead').length;
    document.getElementById('readBooks').textContent = books.filter(b => b.status === 'read').length;
    const rated = books.filter(b => b.rating > 0);
    document.getElementById('avgRating').textContent = rated.length > 0 ? (rated.reduce((s, b) => s + b.rating, 0) / rated.length).toFixed(1) : '-';
    document.getElementById('wishlistCount').textContent = wishlist.filter(i => i.status === 'toBuy').length;
    document.getElementById('wishlistTotal').textContent = wishlist.filter(i => i.status === 'toBuy').length;
    document.getElementById('wishlistBought').textContent = wishlist.filter(i => i.status === 'bought').length;
    document.getElementById('wishlistBudget').textContent = wishlist.filter(i => i.status === 'toBuy').reduce((s, i) => s + i.price, 0).toFixed(2) + ' €';
    document.getElementById('wishlistSpent').textContent = wishlist.filter(i => i.status === 'bought').reduce((s, i) => s + i.price, 0).toFixed(2) + ' €';
}

// ===== SAVE =====
function saveBooks() { localStorage.setItem('myBookPile', JSON.stringify(books)); }
function saveWishlist() { localStorage.setItem('myBookWishlist', JSON.stringify(wishlist)); }
function saveSagasMeta() { localStorage.setItem('myBookSagasMeta', JSON.stringify(sagasMeta)); }

// ===== TOAST =====
function showToast(msg) { const ex = document.querySelector('.toast'); if (ex) ex.remove(); const t = document.createElement('div'); t.classList.add('toast'); t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 3000); }
