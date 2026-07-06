// ===== DONNÉES =====
let books = JSON.parse(localStorage.getItem('myBookPile')) || [];
let wishlist = JSON.parse(localStorage.getItem('myBookWishlist')) || [];
let sagas = JSON.parse(localStorage.getItem('myBookSagas')) || [];
let currentFilter = 'all';
let wishlistFilter = 'all';
let sagaFilter = 'all';
let ratingBookId = null;
let selectedRating = 0;
let transferBookId = null;

let settings = JSON.parse(localStorage.getItem('myBookPileSettings')) || {
    theme: 'purple', particles: true, animations: true
};

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    applySettings();
    createParticles();
    renderBooks();
    renderWishlist();
    renderSagas();
    renderAuthors();
    updateStats();
    updateRandomGenreFilter();
    updateSagaSelect();

    document.getElementById('addBookForm').addEventListener('submit', addBook);
    document.getElementById('addWishlistForm').addEventListener('submit', addWishlistItem);
    document.getElementById('addSagaForm').addEventListener('submit', addSaga);
});

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

function setTheme(theme) {
    settings.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    updateActiveThemeCard();
    saveSettings();
    showToast(`🎨 Thème "${theme}" appliqué !`);
}
function updateActiveThemeCard() {
    document.querySelectorAll('.theme-card').forEach(c => c.classList.toggle('active', c.getAttribute('data-theme-btn') === settings.theme));
}

function toggleParticlesF() {
    settings.particles = document.getElementById('toggleParticles').checked;
    document.getElementById('particles').classList.toggle('hidden', !settings.particles);
    saveSettings();
}
function toggleAnimationsF() {
    settings.animations = document.getElementById('toggleAnimations').checked;
    document.body.classList.toggle('no-animations', !settings.animations);
    saveSettings();
}

// ===== EXPORT/IMPORT =====
function exportData() {
    const data = { books, wishlist, sagas, settings };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'ma-pile-a-livres.json'; a.click();
    URL.revokeObjectURL(url);
    showToast('📤 Données exportées !');
}
function importData(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.books) { books = data.books; saveBooks(); }
            if (data.wishlist) { wishlist = data.wishlist; saveWishlist(); }
            if (data.sagas) { sagas = data.sagas; saveSagas(); }
            if (data.settings) { settings = { ...settings, ...data.settings }; saveSettings(); applySettings(); }
            renderAll();
            showToast('📥 Données importées !');
        } catch (err) { showToast('❌ Fichier invalide !'); }
    };
    reader.readAsText(file);
    event.target.value = '';
}
function clearAllData() {
    if (confirm('⚠️ Tout supprimer ? Irréversible.')) {
        books = []; wishlist = []; sagas = [];
        saveBooks(); saveWishlist(); saveSagas();
        renderAll();
        showToast('🗑️ Tout supprimé.');
    }
}

function renderAll() {
    renderBooks(); renderWishlist(); renderSagas(); renderAuthors();
    updateStats(); updateRandomGenreFilter(); updateSagaSelect();
}

// ===== PARTICULES =====
function createParticles() {
    const c = document.getElementById('particles');
    for (let i = 0; i < 50; i++) {
        const p = document.createElement('div'); p.classList.add('particle');
        const s = Math.random() * 6 + 2;
        p.style.width = s + 'px'; p.style.height = s + 'px';
        p.style.left = Math.random() * 100 + '%';
        p.style.animationDuration = (Math.random() * 15 + 10) + 's';
        p.style.animationDelay = (Math.random() * 10) + 's';
        c.appendChild(p);
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
    const sagaId = document.getElementById('bookSaga').value;
    const tome = parseInt(document.getElementById('bookTome').value) || null;
    if (!title || !author) return;

    const book = {
        id: Date.now(), title, author, genre,
        sagaId: sagaId ? parseInt(sagaId) : null,
        tome: tome,
        status: 'toRead', rating: 0, review: '',
        dateAdded: new Date().toLocaleDateString('fr-FR'), dateRead: null
    };
    books.push(book);
    saveBooks(); renderBooks(); renderSagas(); renderAuthors();
    updateStats(); updateRandomGenreFilter();
    document.getElementById('addBookForm').reset();
    showToast(`📥 "${title}" ajouté !`);
}

function renderBooks() {
    const container = document.getElementById('booksList');
    const query = document.getElementById('searchInput').value.toLowerCase();
    const sortBy = document.getElementById('bookSortSelect').value;

    let filtered = books.filter(b => {
        const mf = currentFilter === 'all' || (currentFilter === 'toRead' && b.status === 'toRead') || (currentFilter === 'read' && b.status === 'read');
        const ms = b.title.toLowerCase().includes(query) || b.author.toLowerCase().includes(query) || b.genre.toLowerCase().includes(query);
        return mf && ms;
    });

    // Sort
    filtered.sort((a, b) => {
        switch (sortBy) {
            case 'title': return a.title.localeCompare(b.title);
            case 'author': return a.author.localeCompare(b.author);
            case 'rating': return b.rating - a.rating;
            case 'saga':
                const sA = a.sagaId ? getSagaName(a.sagaId) : 'zzz';
                const sB = b.sagaId ? getSagaName(b.sagaId) : 'zzz';
                if (sA !== sB) return sA.localeCompare(sB);
                return (a.tome || 999) - (b.tome || 999);
            case 'dateAdded': return b.id - a.id;
            default:
                if (a.status === 'toRead' && b.status === 'read') return -1;
                if (a.status === 'read' && b.status === 'toRead') return 1;
                return b.rating - a.rating;
        }
    });

    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-state"><span class="emoji">📭</span><p>Aucun livre trouvé.</p></div>`;
        return;
    }

    container.innerHTML = filtered.map(book => {
        const starsHtml = book.rating > 0 ? `<div class="stars">${'★'.repeat(book.rating)}${'☆'.repeat(5 - book.rating)}</div>` : '';
        const reviewHtml = book.review ? `<div class="review">"${book.review}"</div>` : '';
        const statusClass = book.status === 'read' ? 'read' : 'to-read';
        const statusLabel = book.status === 'read' ? '✅ Lu' : '📖 À lire';
        const sagaName = book.sagaId ? getSagaName(book.sagaId) : '';
        const sagaHtml = sagaName ? `<span class="saga-tag">📖 ${sagaName}</span>` : '';
        const tomeHtml = book.tome ? `<span class="tome-tag">Tome ${book.tome}</span>` : '';

        return `
            <div class="book-card ${statusClass}">
                <button class="delete-icon" onclick="deleteBook(${book.id})">🗑</button>
                <h3>${book.title}</h3>
                <p class="author">par ${book.author}</p>
                <span class="genre-tag">${book.genre}</span>
                <span class="status-badge ${statusClass}">${statusLabel}</span>
                ${tomeHtml}${sagaHtml}
                ${starsHtml}${reviewHtml}
                <div class="actions">
                    ${book.status === 'toRead'
                        ? `<button class="btn-mark-read" onclick="markAsRead(${book.id})">✅ Marquer lu</button>`
                        : `<button class="btn-unread" onclick="markAsUnread(${book.id})">📖 Remettre à lire</button>`}
                    ${book.status === 'read' ? `<button class="btn-rate" onclick="openRatingModal(${book.id})">⭐ ${book.rating > 0 ? 'Modifier' : 'Noter'}</button>` : ''}
                </div>
            </div>`;
    }).join('');
}

function getSagaName(id) {
    const s = sagas.find(s => s.id === id);
    return s ? s.name : '';
}

function filterBooks(f, btn) {
    currentFilter = f;
    document.querySelectorAll('#page-home .filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderBooks();
}

function markAsRead(id) {
    const b = books.find(x => x.id === id);
    if (b) { b.status = 'read'; b.dateRead = new Date().toLocaleDateString('fr-FR'); saveBooks(); renderBooks(); renderSagas(); renderAuthors(); updateStats(); showToast(`✅ "${b.title}" lu !`); setTimeout(() => openRatingModal(id), 400); }
}
function markAsUnread(id) {
    const b = books.find(x => x.id === id);
    if (b) { b.status = 'toRead'; b.rating = 0; b.review = ''; b.dateRead = null; saveBooks(); renderBooks(); renderSagas(); renderAuthors(); updateStats(); showToast(`📖 "${b.title}" remis à lire !`); }
}
function deleteBook(id) {
    const b = books.find(x => x.id === id);
    if (b && confirm(`Supprimer "${b.title}" ?`)) { books = books.filter(x => x.id !== id); saveBooks(); renderAll(); showToast(`🗑 "${b.title}" supprimé.`); }
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
function closeRatingModal() { document.getElementById('ratingModal').classList.remove('active'); ratingBookId = null; selectedRating = 0; }
function setRating(n) { selectedRating = n; updateStarsDisplay(); }
function updateStarsDisplay() { document.querySelectorAll('#starsInput .star-btn').forEach((s, i) => s.classList.toggle('active', i < selectedRating)); }
function confirmRating() {
    if (selectedRating === 0) { showToast('⚠️ Sélectionne au moins 1 étoile !'); return; }
    const b = books.find(x => x.id === ratingBookId);
    if (b) { b.rating = selectedRating; b.review = document.getElementById('bookReview').value.trim(); saveBooks(); renderBooks(); renderAuthors(); updateStats(); showToast(`⭐ "${b.title}" noté ${selectedRating}/5 !`); }
    closeRatingModal();
}

// RANDOM
function pickRandomBook() {
    const gf = document.getElementById('randomGenreFilter').value;
    let cands = books.filter(b => b.status === 'toRead');
    if (gf !== 'all') cands = cands.filter(b => b.genre === gf);
    const rd = document.getElementById('randomResult');
    const btn = document.getElementById('randomBtn');
    if (cands.length === 0) { rd.innerHTML = `<div class="random-card"><h3>😅 Aucun livre à lire !</h3></div>`; return; }
    btn.disabled = true; btn.textContent = '🎰 Sélection...';
    let spins = 0;
    const iv = setInterval(() => {
        const r = cands[Math.floor(Math.random() * cands.length)];
        rd.innerHTML = `<div class="random-card spinning"><h3>${r.title}</h3><p class="author">par ${r.author}</p></div>`;
        if (++spins >= 15) {
            clearInterval(iv);
            const ch = cands[Math.floor(Math.random() * cands.length)];
            rd.innerHTML = `<div class="random-card"><h3>🎉 ${ch.title}</h3><p class="author">par ${ch.author}</p><span class="genre-tag">${ch.genre}</span></div>`;
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
//  SAGAS
// ============================================================
function addSaga(e) {
    e.preventDefault();
    const name = document.getElementById('sagaName').value.trim();
    const author = document.getElementById('sagaAuthor').value.trim();
    const totalTomes = parseInt(document.getElementById('sagaTotalTomes').value);
    const genre = document.getElementById('sagaGenre').value;
    const status = document.getElementById('sagaStatus').value;
    const notes = document.getElementById('sagaNotes').value.trim();
    if (!name || !author || !totalTomes) return;

    sagas.push({
        id: Date.now(), name, author, totalTomes, genre, status, notes,
        dateCreated: new Date().toLocaleDateString('fr-FR')
    });
    saveSagas(); renderSagas(); updateStats(); updateSagaSelect();
    document.getElementById('addSagaForm').reset();
    showToast(`📖 Saga "${name}" créée !`);
}

function renderSagas() {
    const container = document.getElementById('sagasList');
    const query = document.getElementById('sagaSearchInput').value.toLowerCase();

    let filtered = sagas.filter(s => {
        const ms = s.name.toLowerCase().includes(query) || s.author.toLowerCase().includes(query);
        return ms;
    });

    // Calcul des données de chaque saga
    filtered = filtered.map(saga => {
        const sagaBooks = books.filter(b => b.sagaId === saga.id);
        const readCount = sagaBooks.filter(b => b.status === 'read').length;
        const ownedCount = sagaBooks.length;
        const progress = saga.totalTomes > 0 ? Math.round((readCount / saga.totalTomes) * 100) : 0;
        const isCompleted = readCount >= saga.totalTomes;
        const isStarted = readCount > 0;
        return { ...saga, sagaBooks, readCount, ownedCount, progress, isCompleted, isStarted };
    });

    // Filtre
    if (sagaFilter === 'completed') filtered = filtered.filter(s => s.isCompleted);
    else if (sagaFilter === 'inProgress') filtered = filtered.filter(s => s.isStarted && !s.isCompleted);
    else if (sagaFilter === 'notStarted') filtered = filtered.filter(s => !s.isStarted);

    // Stats
    const allSagaData = sagas.map(saga => {
        const sb = books.filter(b => b.sagaId === saga.id);
        const rc = sb.filter(b => b.status === 'read').length;
        return { ...saga, readCount: rc, isCompleted: rc >= saga.totalTomes, isStarted: rc > 0 };
    });
    document.getElementById('sagasTotalStat').textContent = sagas.length;
    document.getElementById('sagasCompletedStat').textContent = allSagaData.filter(s => s.isCompleted).length;
    document.getElementById('sagasInProgressStat').textContent = allSagaData.filter(s => s.isStarted && !s.isCompleted).length;
    document.getElementById('sagasTotalTomes').textContent = sagas.reduce((s, x) => s + x.totalTomes, 0);

    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-state"><span class="emoji">📖</span><p>Aucune saga trouvée.</p></div>`;
        return;
    }

    container.innerHTML = filtered.map(saga => {
        const tomesHtml = saga.sagaBooks
            .sort((a, b) => (a.tome || 999) - (b.tome || 999))
            .map(b => `
                <div class="tome-item">
                    <span class="tome-title">${b.tome ? 'T' + b.tome + ' — ' : ''}${b.title}</span>
                    <span class="tome-status ${b.status === 'read' ? 'read-tome' : 'unread-tome'}">${b.status === 'read' ? '✅ Lu' : '📖 À lire'}</span>
                </div>
            `).join('');

        const missingTomes = saga.totalTomes - saga.ownedCount;
        const sagaStatusLabel = saga.status === 'complete' ? '✅ Parution terminée' : '📝 En cours de parution';

        return `
            <div class="saga-card">
                <button class="delete-icon" onclick="deleteSaga(${saga.id})">🗑</button>
                <h3>📖 ${saga.name}</h3>
                <p class="saga-author">par ${saga.author}</p>
                <span class="genre-tag">${saga.genre}</span>
                <div class="saga-info">
                    <span>📚 ${saga.ownedCount}/${saga.totalTomes} tomes possédés</span>
                    <span>✅ ${saga.readCount} lus</span>
                    ${missingTomes > 0 ? `<span>❓ ${missingTomes} manquants</span>` : ''}
                </div>
                <p class="progress-text">${saga.progress}% lu</p>
                <div class="progress-bar"><div class="progress-fill" style="width:${saga.progress}%"></div></div>
                <span style="font-size:.8rem;color:#888">${sagaStatusLabel}</span>
                ${saga.notes ? `<p class="saga-notes">📝 ${saga.notes}</p>` : ''}
                ${tomesHtml ? `<div class="tomes-list">${tomesHtml}</div>` : '<p style="color:#666;font-size:.85rem;margin-top:10px">Aucun tome ajouté. Ajoute des livres liés à cette saga !</p>'}
            </div>`;
    }).join('');
}

function filterSagas(f, btn) {
    sagaFilter = f;
    document.querySelectorAll('#page-sagas .filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderSagas();
}

function deleteSaga(id) {
    const s = sagas.find(x => x.id === id);
    if (s && confirm(`Supprimer la saga "${s.name}" ? Les livres liés resteront dans ta bibliothèque.`)) {
        sagas = sagas.filter(x => x.id !== id);
        books.forEach(b => { if (b.sagaId === id) { b.sagaId = null; b.tome = null; } });
        saveSagas(); saveBooks(); renderAll();
        showToast(`🗑 Saga "${s.name}" supprimée.`);
    }
}

function updateSagaSelect() {
    const sel = document.getElementById('bookSaga');
    sel.innerHTML = '<option value="">Aucune saga</option>';
    sagas.forEach(s => sel.innerHTML += `<option value="${s.id}">📖 ${s.name} (${s.author})</option>`);
}

// ============================================================
//  AUTEURS
// ============================================================
function renderAuthors() {
    const container = document.getElementById('authorsList');
    const query = document.getElementById('authorSearchInput').value.toLowerCase();
    const sortBy = document.getElementById('authorSortSelect').value;

    // Construire la liste des auteurs
    const authorMap = {};
    books.forEach(b => {
        const key = b.author.trim();
        if (!authorMap[key]) authorMap[key] = { name: key, books: [] };
        authorMap[key].books.push(b);
    });
    // Ajouter aussi auteurs des sagas sans livres encore
    sagas.forEach(s => {
        const key = s.author.trim();
        if (!authorMap[key]) authorMap[key] = { name: key, books: [] };
    });

    let authors = Object.values(authorMap);

    // Recherche
    authors = authors.filter(a => a.name.toLowerCase().includes(query));

    // Calculs
    authors = authors.map(a => {
        const totalBooks = a.books.length;
        const readBooks = a.books.filter(b => b.status === 'read').length;
        const rated = a.books.filter(b => b.rating > 0);
        const avgRating = rated.length > 0 ? (rated.reduce((s, b) => s + b.rating, 0) / rated.length) : 0;
        const authorSagas = sagas.filter(s => s.author.trim() === a.name);
        return { ...a, totalBooks, readBooks, avgRating, authorSagas };
    });

    // Tri
    authors.sort((a, b) => {
        switch (sortBy) {
            case 'name': return a.name.localeCompare(b.name);
            case 'count': return b.totalBooks - a.totalBooks;
            case 'rating': return b.avgRating - a.avgRating;
            case 'read': return b.readBooks - a.readBooks;
            default: return b.totalBooks - a.totalBooks;
        }
    });

    // Stats globales
    document.getElementById('authorsTotal').textContent = authors.length;
    if (authors.length > 0) {
        const top = [...authors].sort((a, b) => b.totalBooks - a.totalBooks)[0];
        document.getElementById('authorTopName').textContent = top.name.length > 15 ? top.name.substring(0, 15) + '…' : top.name;
        document.getElementById('authorTopCount').textContent = top.totalBooks;
    } else {
        document.getElementById('authorTopName').textContent = '-';
        document.getElementById('authorTopCount').textContent = '0';
    }

    if (authors.length === 0) {
        container.innerHTML = `<div class="empty-state"><span class="emoji">✍️</span><p>Aucun auteur trouvé.</p></div>`;
        return;
    }

    container.innerHTML = authors.map(a => {
        const booksListHtml = a.books
            .sort((x, y) => x.title.localeCompare(y.title))
            .map(b => `
                <div class="author-book-item">
                    <span class="ab-title">${b.title}${b.tome ? ' (T' + b.tome + ')' : ''}</span>
                    <span class="ab-status ${b.status === 'read' ? 'ab-read' : 'ab-toread'}">${b.status === 'read' ? '✅ Lu' : '📖 À lire'}</span>
                    ${b.rating > 0 ? `<span class="ab-rating">${'★'.repeat(b.rating)}</span>` : ''}
                </div>
            `).join('');

        const sagasHtml = a.authorSagas.length > 0
            ? `<p style="font-size:.8rem;color:var(--saga-1);margin-top:8px">📖 Sagas : ${a.authorSagas.map(s => s.name).join(', ')}</p>`
            : '';

        const uid = 'author-' + a.name.replace(/[^a-zA-Z0-9]/g, '_');

        return `
            <div class="author-card">
                <h3>✍️ ${a.name}</h3>
                <div class="author-stats">
                    <div class="author-stat">
                        <span class="author-stat-num">${a.totalBooks}</span>
                        <span class="author-stat-label">Livres</span>
                    </div>
                    <div class="author-stat">
                        <span class="author-stat-num">${a.readBooks}</span>
                        <span class="author-stat-label">Lus</span>
                    </div>
                    <div class="author-stat">
                        <span class="author-stat-num">${a.avgRating > 0 ? a.avgRating.toFixed(1) + '⭐' : '-'}</span>
                        <span class="author-stat-label">Note moy.</span>
                    </div>
                    <div class="author-stat">
                        <span class="author-stat-num">${a.authorSagas.length}</span>
                        <span class="author-stat-label">Sagas</span>
                    </div>
                </div>
                ${sagasHtml}
                ${a.totalBooks > 0 ? `
                    <button class="toggle-books-btn" onclick="toggleAuthorBooks('${uid}', this)">📚 Voir les livres (${a.totalBooks})</button>
                    <div class="author-books-container" id="${uid}">
                        <div class="author-books-list">${booksListHtml}</div>
                    </div>
                ` : '<p style="color:#666;font-size:.85rem;margin-top:8px">Aucun livre dans la bibliothèque</p>'}
            </div>`;
    }).join('');
}

function toggleAuthorBooks(uid, btn) {
    const container = document.getElementById(uid);
    const expanded = container.classList.toggle('expanded');
    btn.textContent = expanded ? '📚 Masquer les livres' : `📚 Voir les livres`;
}

// ============================================================
//  WISHLIST
// ============================================================
function addWishlistItem(e) {
    e.preventDefault();
    const title = document.getElementById('wishTitle').value.trim();
    const author = document.getElementById('wishAuthor').value.trim();
    const genre = document.getElementById('wishGenre').value;
    const price = parseFloat(document.getElementById('wishPrice').value) || 0;
    const priority = parseInt(document.getElementById('wishPriority').value);
    const notes = document.getElementById('wishNotes').value.trim();
    if (!title || !author) return;

    wishlist.push({ id: Date.now(), title, author, genre, price, priority, notes, status: 'toBuy', dateAdded: new Date().toLocaleDateString('fr-FR'), dateBought: null });
    saveWishlist(); renderWishlist(); updateStats();
    document.getElementById('addWishlistForm').reset();
    showToast(`🛒 "${title}" ajouté !`);
}

function renderWishlist() {
    const container = document.getElementById('wishlistList');
    const query = document.getElementById('wishSearchInput').value.toLowerCase();

    let filtered = wishlist.filter(i => {
        const mf = wishlistFilter === 'all' || (wishlistFilter === 'toBuy' && i.status === 'toBuy') || (wishlistFilter === 'bought' && i.status === 'bought');
        const ms = i.title.toLowerCase().includes(query) || i.author.toLowerCase().includes(query);
        return mf && ms;
    });

    filtered.sort((a, b) => {
        if (a.status === 'toBuy' && b.status === 'bought') return -1;
        if (a.status === 'bought' && b.status === 'toBuy') return 1;
        if (a.status === 'toBuy' && b.status === 'toBuy') return b.priority - a.priority;
        return 0;
    });

    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-state"><span class="emoji">🛒</span><p>Aucun livre dans la wishlist.</p></div>`;
        return;
    }

    const plabels = { 3: '🔴 Haute', 2: '🟡 Moyenne', 1: '🟢 Basse' };
    const pclasses = { 3: 'high', 2: 'medium', 1: 'low' };

    container.innerHTML = filtered.map(i => {
        const sc = i.status === 'bought' ? 'wish-bought' : 'wish-to-buy';
        const sl = i.status === 'bought' ? '✅ Acheté' : '📋 À acheter';
        return `
            <div class="book-card ${sc}">
                <button class="delete-icon" onclick="deleteWishlistItem(${i.id})">🗑</button>
                <h3>${i.title}</h3>
                <p class="author">par ${i.author}</p>
                <span class="genre-tag">${i.genre}</span>
                <span class="status-badge ${sc}">${sl}</span>
                ${i.price > 0 ? `<span class="price-tag">${i.price.toFixed(2)} €</span>` : ''}
                <span class="priority-tag ${pclasses[i.priority]}">${plabels[i.priority]}</span>
                ${i.notes ? `<p class="wish-notes">📝 ${i.notes}</p>` : ''}
                <div class="actions">
                    ${i.status === 'toBuy'
                        ? `<button class="btn-bought" onclick="markAsBought(${i.id})">✅ Acheté</button><button class="btn-transfer" onclick="openTransferModal(${i.id})">📚 → Bibliothèque</button>`
                        : `<button class="btn-unbuy" onclick="markAsUnbought(${i.id})">🛒 Remettre</button><button class="btn-transfer" onclick="openTransferModal(${i.id})">📚 → Bibliothèque</button>`}
                </div>
            </div>`;
    }).join('');
}

function filterWishlist(f, btn) {
    wishlistFilter = f;
    document.querySelectorAll('#page-wishlist .filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderWishlist();
}
function markAsBought(id) { const i = wishlist.find(x => x.id === id); if (i) { i.status = 'bought'; i.dateBought = new Date().toLocaleDateString('fr-FR'); saveWishlist(); renderWishlist(); updateStats(); showToast(`✅ "${i.title}" acheté !`); } }
function markAsUnbought(id) { const i = wishlist.find(x => x.id === id); if (i) { i.status = 'toBuy'; i.dateBought = null; saveWishlist(); renderWishlist(); updateStats(); showToast(`🛒 "${i.title}" remis !`); } }
function deleteWishlistItem(id) { const i = wishlist.find(x => x.id === id); if (i && confirm(`Supprimer "${i.title}" ?`)) { wishlist = wishlist.filter(x => x.id !== id); saveWishlist(); renderWishlist(); updateStats(); showToast(`🗑 Supprimé.`); } }

// TRANSFER
function openTransferModal(id) {
    transferBookId = id;
    const i = wishlist.find(x => x.id === id); if (!i) return;
    document.getElementById('transferBookTitle').textContent = `${i.title} — par ${i.author}`;
    document.getElementById('removeFromWishlist').checked = true;
    document.getElementById('transferModal').classList.add('active');
}
function closeTransferModal() { document.getElementById('transferModal').classList.remove('active'); transferBookId = null; }
function confirmTransfer() {
    const i = wishlist.find(x => x.id === transferBookId); if (!i) return;
    if (books.some(b => b.title.toLowerCase() === i.title.toLowerCase() && b.author.toLowerCase() === i.author.toLowerCase())) { showToast(`⚠️ Déjà dans la bibliothèque !`); closeTransferModal(); return; }
    books.push({ id: Date.now(), title: i.title, author: i.author, genre: i.genre, sagaId: null, tome: null, status: 'toRead', rating: 0, review: '', dateAdded: new Date().toLocaleDateString('fr-FR'), dateRead: null });
    if (document.getElementById('removeFromWishlist').checked) { wishlist = wishlist.filter(x => x.id !== transferBookId); } else { i.status = 'bought'; i.dateBought = new Date().toLocaleDateString('fr-FR'); }
    saveBooks(); saveWishlist(); renderAll();
    showToast(`📚 "${i.title}" transféré !`);
    closeTransferModal();
}

// ===== STATS =====
function updateStats() {
    const total = books.length;
    const toRead = books.filter(b => b.status === 'toRead').length;
    const read = books.filter(b => b.status === 'read').length;
    const rated = books.filter(b => b.rating > 0);
    const avg = rated.length > 0 ? (rated.reduce((s, b) => s + b.rating, 0) / rated.length).toFixed(1) : '-';
    document.getElementById('totalBooks').textContent = total;
    document.getElementById('toReadBooks').textContent = toRead;
    document.getElementById('readBooks').textContent = read;
    document.getElementById('avgRating').textContent = avg;

    const wt = wishlist.filter(i => i.status === 'toBuy').length;
    const wb = wishlist.filter(i => i.status === 'bought').length;
    const budget = wishlist.filter(i => i.status === 'toBuy').reduce((s, i) => s + i.price, 0);
    const spent = wishlist.filter(i => i.status === 'bought').reduce((s, i) => s + i.price, 0);
    document.getElementById('wishlistCount').textContent = wt;
    document.getElementById('wishlistTotal').textContent = wt;
    document.getElementById('wishlistBought').textContent = wb;
    document.getElementById('wishlistBudget').textContent = budget.toFixed(2) + ' €';
    document.getElementById('wishlistSpent').textContent = spent.toFixed(2) + ' €';
    document.getElementById('sagasCount').textContent = sagas.length;
}

// ===== SAVE =====
function saveBooks() { localStorage.setItem('myBookPile', JSON.stringify(books)); }
function saveWishlist() { localStorage.setItem('myBookWishlist', JSON.stringify(wishlist)); }
function saveSagas() { localStorage.setItem('myBookSagas', JSON.stringify(sagas)); }

// ===== TOAST =====
function showToast(msg) {
    const ex = document.querySelector('.toast'); if (ex) ex.remove();
    const t = document.createElement('div'); t.classList.add('toast'); t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 3000);
}
