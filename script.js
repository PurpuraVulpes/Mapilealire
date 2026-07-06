// ============================================================
//  MA PILE À LIVRES - SCRIPT PRINCIPAL
// ============================================================

// DONNÉES
var books = JSON.parse(localStorage.getItem('myBookPile')) || [];
var wishlist = JSON.parse(localStorage.getItem('myBookWishlist')) || [];
var external = JSON.parse(localStorage.getItem('myBookExternal')) || [];
var sagasMeta = JSON.parse(localStorage.getItem('myBookSagasMeta')) || {};
var settings = JSON.parse(localStorage.getItem('myBookPileSettings')) || {
    theme: 'purple', particles: true, animations: true, font: 'Poppins'
};
if (!settings.font) settings.font = 'Poppins';

// ÉTATS
var currentFilter = 'all';
var wishlistFilter = 'all';
var sagaFilter = 'all';
var extFilter = 'all';
var ratingBookId = null;
var selectedRating = 0;
var ratingExtBookId = null;
var selectedExtRating = 0;
var transferBookId = null;
var editSagaKey = null;
var editBookId = null;
var editWishId = null;
var editExtId = null;
var currentUser = null;
var syncTimeout = null;

// ============================================================
//  HELPER : Set text safely (évite les erreurs si élément absent)
// ============================================================
function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
}

function getVal(id) {
    var el = document.getElementById(id);
    return el ? el.value : '';
}

// ============================================================
//  INITIALISATION
// ============================================================
document.addEventListener('DOMContentLoaded', function () {
    applySettings();
    createParticles();
    renderAll();
    var addBook_ = document.getElementById('addBookForm');
    if (addBook_) addBook_.addEventListener('submit', addBook);
    var addWish_ = document.getElementById('addWishlistForm');
    if (addWish_) addWish_.addEventListener('submit', addWishlistItem);
    var addExt_ = document.getElementById('addExtForm');
    if (addExt_) addExt_.addEventListener('submit', addExternal);
});

function renderAll() {
    renderBooks();
    renderExternal();
    renderSagas();
    renderAuthors();
    renderWishlist();
    updateStats();
    updateRandomGenreFilter();
    updateSeriesSuggestions();
    updateWishSeriesSuggestions();
}

// ============================================================
//  SAUVEGARDE
// ============================================================
function saveBooks() { localStorage.setItem('myBookPile', JSON.stringify(books)); triggerAutoSync(); }
function saveWishlist() { localStorage.setItem('myBookWishlist', JSON.stringify(wishlist)); triggerAutoSync(); }
function saveExternal() { localStorage.setItem('myBookExternal', JSON.stringify(external)); triggerAutoSync(); }
function saveSagasMeta() { localStorage.setItem('myBookSagasMeta', JSON.stringify(sagasMeta)); triggerAutoSync(); }
function saveSettings() { localStorage.setItem('myBookPileSettings', JSON.stringify(settings)); }

// ============================================================
//  PARAMÈTRES
// ============================================================
function applySettings() {
    document.documentElement.setAttribute('data-theme', settings.theme);
    document.documentElement.style.setProperty('--main-font', settings.font || 'Poppins');
    updateActiveThemeCard();
    updateActiveFontCard();
    var tp = document.getElementById('toggleParticles');
    var ta = document.getElementById('toggleAnimations');
    if (tp) tp.checked = settings.particles;
    if (ta) ta.checked = settings.animations;
    var p = document.getElementById('particles');
    if (p) p.classList.toggle('hidden', !settings.particles);
    document.body.classList.toggle('no-animations', !settings.animations);
}

function switchTab(tab, btn) {
    var pages = document.querySelectorAll('.page');
    var btns = document.querySelectorAll('.nav-btn');
    for (var i = 0; i < pages.length; i++) pages[i].classList.remove('active');
    for (var j = 0; j < btns.length; j++) btns[j].classList.remove('active');
    var target = document.getElementById('page-' + tab);
    if (target) target.classList.add('active');
    if (btn) btn.classList.add('active');
    if (tab === 'authors') renderAuthors();
    if (tab === 'sagas') renderSagas();
    if (tab === 'external') renderExternal();
}

function setTheme(t) {
    settings.theme = t;
    document.documentElement.setAttribute('data-theme', t);
    updateActiveThemeCard();
    saveSettings();
    showToast('🎨 Thème "' + t + '" appliqué !');
}

function updateActiveThemeCard() {
    var cards = document.querySelectorAll('.theme-card');
    for (var i = 0; i < cards.length; i++) {
        cards[i].classList.toggle('active', cards[i].getAttribute('data-theme-btn') === settings.theme);
    }
}

function setFont(f) {
    settings.font = f;
    document.documentElement.style.setProperty('--main-font', f);
    updateActiveFontCard();
    saveSettings();
    showToast('🔤 Police "' + f + '" appliquée !');
}

function updateActiveFontCard() {
    var cards = document.querySelectorAll('.font-card');
    for (var i = 0; i < cards.length; i++) {
        cards[i].classList.toggle('active', cards[i].getAttribute('data-font-btn') === settings.font);
    }
}

function toggleParticlesF() {
    var el = document.getElementById('toggleParticles');
    if (!el) return;
    settings.particles = el.checked;
    var p = document.getElementById('particles');
    if (p) p.classList.toggle('hidden', !settings.particles);
    saveSettings();
}

function toggleAnimationsF() {
    var el = document.getElementById('toggleAnimations');
    if (!el) return;
    settings.animations = el.checked;
    document.body.classList.toggle('no-animations', !settings.animations);
    saveSettings();
}

function exportData() {
    var data = { books: books, wishlist: wishlist, external: external, sagasMeta: sagasMeta, settings: settings };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ma-pile-a-livres.json';
    a.click();
    showToast('📤 Données exportées !');
}

function importData(event) {
    var file = event.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (e) {
        try {
            var data = JSON.parse(e.target.result);
            if (data.books) { books = data.books; localStorage.setItem('myBookPile', JSON.stringify(books)); }
            if (data.wishlist) { wishlist = data.wishlist; localStorage.setItem('myBookWishlist', JSON.stringify(wishlist)); }
            if (data.external) { external = data.external; localStorage.setItem('myBookExternal', JSON.stringify(external)); }
            if (data.sagasMeta) { sagasMeta = data.sagasMeta; localStorage.setItem('myBookSagasMeta', JSON.stringify(sagasMeta)); }
            if (data.settings) { settings = Object.assign({}, settings, data.settings); saveSettings(); applySettings(); }
            renderAll();
            triggerAutoSync();
            showToast('📥 Importé !');
        } catch (err) { showToast('❌ Fichier invalide !'); }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function clearAllData() {
    if (confirm('⚠️ Tout supprimer ? Irréversible.')) {
        books = []; wishlist = []; external = []; sagasMeta = {};
        localStorage.setItem('myBookPile', '[]');
        localStorage.setItem('myBookWishlist', '[]');
        localStorage.setItem('myBookExternal', '[]');
        localStorage.setItem('myBookSagasMeta', '{}');
        renderAll();
        triggerAutoSync();
        showToast('🗑️ Tout supprimé.');
    }
}

// ============================================================
//  CALCUL DES JOURS DE LECTURE
// ============================================================
function calcReadingDays(type) {
    var startEl = document.getElementById(type === 'ext' ? 'extDateStart' : 'bookDateStart');
    var endEl = document.getElementById(type === 'ext' ? 'extDateEnd' : 'bookDateEnd');
    var displayEl = document.getElementById(type === 'ext' ? 'extReadingDays' : 'bookReadingDays');
    if (!startEl || !endEl || !displayEl) return;

    if (!startEl.value || !endEl.value) {
        displayEl.classList.remove('active');
        return;
    }

    var start = new Date(startEl.value);
    var end = new Date(endEl.value);
    var diff = end - start;
    var days = Math.floor(diff / (1000 * 60 * 60 * 24));

    displayEl.classList.add('active');

    if (days < 0) {
        displayEl.textContent = '⚠️ La date de fin doit être après le début !';
        displayEl.classList.add('warning');
    } else if (days === 0) {
        displayEl.textContent = '⚡ Lu en 1 jour !';
        displayEl.classList.remove('warning');
    } else if (days === 1) {
        displayEl.textContent = '📖 Lu en 2 jours';
        displayEl.classList.remove('warning');
    } else {
        displayEl.textContent = '📖 Lu en ' + (days + 1) + ' jours';
        displayEl.classList.remove('warning');
    }
}

function getReadingDaysText(startDate, endDate) {
    if (!startDate || !endDate) return null;
    var start = new Date(startDate);
    var end = new Date(endDate);
    var diff = end - start;
    var days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return null;
    return days + 1;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    var day = String(d.getDate()).padStart(2, '0');
    var month = String(d.getMonth() + 1).padStart(2, '0');
    var year = d.getFullYear();
    return day + '/' + month + '/' + year;
}

function createParticles() {
    var c = document.getElementById('particles');
    if (!c) return;
    for (var i = 0; i < 50; i++) {
        var p = document.createElement('div');
        p.classList.add('particle');
        var s = Math.random() * 6 + 2;
        p.style.width = s + 'px';
        p.style.height = s + 'px';
        p.style.left = Math.random() * 100 + '%';
        p.style.animationDuration = (Math.random() * 15 + 10) + 's';
        p.style.animationDelay = (Math.random() * 10) + 's';
        c.appendChild(p);
    }
}

// ============================================================
//  GESTION DES SÉRIES
// ============================================================
function getSeriesKey(name) { return name.trim().toLowerCase(); }

function getAllSeries() {
    var seriesMap = {};
    for (var i = 0; i < books.length; i++) {
        var b = books[i];
        if (b.series && b.series.trim()) {
            var key = getSeriesKey(b.series);
            if (!seriesMap[key]) {
                seriesMap[key] = { key: key, name: b.series.trim(), author: b.author, genre: b.genre, books: [] };
            }
            seriesMap[key].books.push(b);
        }
    }
    var keys = Object.keys(seriesMap);
    for (var k = 0; k < keys.length; k++) {
        var key = keys[k];
        var meta = sagasMeta[key] || {};
        seriesMap[key].totalTomes = meta.totalTomes || seriesMap[key].books.length;
        seriesMap[key].books.sort(function (a, b) { return (a.tome || 999) - (b.tome || 999); });
        var readCount = 0;
        for (var j = 0; j < seriesMap[key].books.length; j++) {
            if (seriesMap[key].books[j].status === 'read') readCount++;
        }
        seriesMap[key].readCount = readCount;
        seriesMap[key].ownedCount = seriesMap[key].books.length;
        seriesMap[key].progress = seriesMap[key].totalTomes > 0 ? Math.round((readCount / seriesMap[key].totalTomes) * 100) : 0;
        seriesMap[key].isCompleted = readCount >= seriesMap[key].totalTomes && seriesMap[key].totalTomes > 0;
        seriesMap[key].isStarted = readCount > 0;
    }
    return seriesMap;
}

function updateSeriesSuggestions() {
    var datalist = document.getElementById('seriesSuggestions');
    if (!datalist) return;
    var allSeries = getAllSeries();
    var names = [];
    var values = Object.keys(allSeries);
    for (var i = 0; i < values.length; i++) {
        var n = allSeries[values[i]].name;
        if (names.indexOf(n) === -1) names.push(n);
    }
    datalist.innerHTML = '';
    for (var j = 0; j < names.length; j++) {
        var opt = document.createElement('option');
        opt.value = names[j];
        datalist.appendChild(opt);
    }
    var input = document.getElementById('bookSeries');
    if (input && input.value.trim()) {
        var key = getSeriesKey(input.value);
        var meta = sagasMeta[key];
        if (meta && meta.totalTomes) {
            var totInput = document.getElementById('bookTotalTomes');
            if (totInput && !totInput.value) totInput.value = meta.totalTomes;
        }
    }
}

function updateWishSeriesSuggestions() {
    var datalist = document.getElementById('wishSeriesSuggestions');
    if (!datalist) return;
    var allSeries = getAllSeries();
    var names = [];
    var values = Object.keys(allSeries);
    for (var i = 0; i < values.length; i++) {
        var n = allSeries[values[i]].name;
        if (names.indexOf(n) === -1) names.push(n);
    }
    for (var j = 0; j < wishlist.length; j++) {
        if (wishlist[j].series && names.indexOf(wishlist[j].series) === -1) names.push(wishlist[j].series);
    }
    datalist.innerHTML = '';
    for (var k = 0; k < names.length; k++) {
        var opt = document.createElement('option');
        opt.value = names[k];
        datalist.appendChild(opt);
    }
}

var FORMAT_ICONS = { 'Broché': '📕', 'Poche': '📒', 'Collector': '✨', 'Relié': '📗', 'Audiobook': '🎧' };

function getFormatHtml(format) {
    if (!format) return '';
    var icon = FORMAT_ICONS[format] || '📕';
    var cls = format.toLowerCase().replace(/[éè]/g, 'e').replace(/\s/g, '-');
    return '<span class="format-tag format-' + cls + '">' + icon + ' ' + format + '</span>';
}

var SOURCE_ICONS = {
    'Bibliothèque': '🏛️',
    'Internet': '💻',
    'École': '🎓',
    'Ma collection': '📚'
};

// ============================================================
//  BIBLIOTHÈQUE
// ============================================================
function addBook(e) {
    e.preventDefault();
    var title = getVal('bookTitle').trim();
    var author = getVal('bookAuthor').trim();
    var genre = getVal('bookGenre');
    var format = getVal('bookFormat');
    var series = getVal('bookSeries').trim();
    var tome = parseInt(getVal('bookTome')) || null;
    var totalTomes = parseInt(getVal('bookTotalTomes')) || null;
    if (!title || !author) return;

    books.push({
        id: Date.now(), title: title, author: author, genre: genre, format: format,
        series: series || null, tome: tome,
        status: 'toRead', rating: 0, review: '',
        dateAdded: new Date().toLocaleDateString('fr-FR'), dateRead: null
    });

    if (series) {
        var key = getSeriesKey(series);
        if (!sagasMeta[key]) sagasMeta[key] = {};
        if (totalTomes && totalTomes > 0) sagasMeta[key].totalTomes = totalTomes;
        saveSagasMeta();
    }

    saveBooks();
    renderAll();
    var form = document.getElementById('addBookForm');
    if (form) form.reset();
    showToast('📥 "' + title + '" ajouté !');
}

function renderBooks() {
    var container = document.getElementById('booksList');
    if (!container) return;
    var query = getVal('searchInput').toLowerCase();
    var sortBy = getVal('bookSortSelect') || 'default';

    var filtered = [];
    for (var i = 0; i < books.length; i++) {
        var b = books[i];
        var mf = currentFilter === 'all'
            || (currentFilter === 'toRead' && b.status === 'toRead')
            || (currentFilter === 'read' && b.status === 'read')
            || (currentFilter === 'oneShot' && (!b.series || !b.series.trim()))
            || (currentFilter === 'series' && b.series && b.series.trim());
        var ms = b.title.toLowerCase().indexOf(query) !== -1 || b.author.toLowerCase().indexOf(query) !== -1 ||
            (b.genre && b.genre.toLowerCase().indexOf(query) !== -1) ||
            (b.series && b.series.toLowerCase().indexOf(query) !== -1) ||
            (b.format && b.format.toLowerCase().indexOf(query) !== -1);
        if (mf && ms) filtered.push(b);
    }

    filtered.sort(function (a, b) {
        switch (sortBy) {
            case 'title': return a.title.localeCompare(b.title);
            case 'author': return a.author.localeCompare(b.author);
            case 'rating': return b.rating - a.rating;
            case 'series':
                var sA = a.series || 'zzzzz', sB = b.series || 'zzzzz';
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
        container.innerHTML = '<div class="empty-state"><span class="emoji">📭</span><p>Aucun livre trouvé.</p></div>';
        return;
    }

    var html = '';
    for (var j = 0; j < filtered.length; j++) {
        var bk = filtered[j];
        var starsH = bk.rating > 0 ? '<div class="stars">' + '★'.repeat(bk.rating) + '☆'.repeat(5 - bk.rating) + '</div>' : '';
        var reviewH = bk.review ? '<div class="review">"' + bk.review + '"</div>' : '';
        var readDays = getReadingDaysText(bk.dateStart, bk.dateEnd);
        var readingH = '';
        if (bk.status === 'read' && readDays) {
            readingH = '<span class="reading-info">📖 Lu en ' + readDays + ' jour' + (readDays > 1 ? 's' : '') + '</span>';
            if (bk.dateStart && bk.dateEnd) {
                readingH += '<p class="reading-dates">📅 Du ' + formatDate(bk.dateStart) + ' au ' + formatDate(bk.dateEnd) + '</p>';
            }
        }
        var sc = bk.status === 'read' ? 'read' : 'to-read';
        var sl = bk.status === 'read' ? '✅ Lu' : '📖 À lire';
        var sagaH = bk.series ? '<span class="saga-tag">📖 ' + bk.series + '</span>' : '';
        var tomeH = bk.tome ? '<span class="tome-tag">Tome ' + bk.tome + '</span>' : '';
        var formatH = getFormatHtml(bk.format);

        html += '<div class="book-card ' + sc + '">' +
            '<button class="delete-icon" onclick="deleteBook(' + bk.id + ')">🗑</button>' +
            '<h3>' + bk.title + '</h3><p class="author">par ' + bk.author + '</p>' +
            '<span class="genre-tag">' + (bk.genre || 'Roman') + '</span>' +
            '<span class="status-badge ' + sc + '">' + sl + '</span>' +
            formatH + tomeH + sagaH + readingH + starsH + reviewH +
            '<div class="actions">' +
            (bk.status === 'toRead' ? '<button class="btn-mark-read" onclick="markAsRead(' + bk.id + ')">✅ Lu</button>' : '<button class="btn-unread" onclick="markAsUnread(' + bk.id + ')">📖 À lire</button>') +
            (bk.status === 'read' ? '<button class="btn-rate" onclick="openRatingModal(' + bk.id + ')">⭐ ' + (bk.rating > 0 ? 'Modifier note' : 'Noter') + '</button>' : '') +
            '<button class="btn-edit" onclick="openEditBookModal(' + bk.id + ')">✏️ Modifier</button>' +
            '</div></div>';
    }
    container.innerHTML = html;
}

function filterBooks(f, btn) {
    currentFilter = f;
    var btns = document.querySelectorAll('#page-home .filter-btn');
    for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');
    if (btn) btn.classList.add('active');
    renderBooks();
}

function markAsRead(id) {
    for (var i = 0; i < books.length; i++) {
        if (books[i].id === id) {
            books[i].status = 'read';
            books[i].dateRead = new Date().toLocaleDateString('fr-FR');
            saveBooks();
            renderAll();
            showToast('✅ Lu !');
            var bid = id;
            setTimeout(function () { openRatingModal(bid); }, 400);
            return;
        }
    }
}

function markAsUnread(id) {
    for (var i = 0; i < books.length; i++) {
        if (books[i].id === id) {
            books[i].status = 'toRead';
            books[i].rating = 0;
            books[i].review = '';
            books[i].dateRead = null;
            saveBooks();
            renderAll();
            showToast('📖 Remis à lire !');
            return;
        }
    }
}

function deleteBook(id) {
    var book = null;
    for (var i = 0; i < books.length; i++) { if (books[i].id === id) { book = books[i]; break; } }
    if (book && confirm('Supprimer "' + book.title + '" ?')) {
        books = books.filter(function (x) { return x.id !== id; });
        if (book.series) {
            var key = getSeriesKey(book.series);
            var remaining = books.filter(function (x) { return x.series && getSeriesKey(x.series) === key; });
            if (remaining.length === 0) delete sagasMeta[key];
            saveSagasMeta();
        }
        saveBooks();
        renderAll();
        showToast('🗑 Supprimé.');
    }
}

function openRatingModal(id) {
    ratingBookId = id;
    selectedRating = 0;
    var b = null;
    for (var i = 0; i < books.length; i++) { if (books[i].id === id) { b = books[i]; break; } }
    if (!b) return;
    setText('modalBookTitle', b.title);
    var rv = document.getElementById('bookReview'); if (rv) rv.value = b.review || '';
    var ds = document.getElementById('bookDateStart'); if (ds) ds.value = b.dateStart || '';
    var de = document.getElementById('bookDateEnd'); if (de) de.value = b.dateEnd || '';
    if (b.rating > 0) selectedRating = b.rating;
    updateStarsDisplay();
    calcReadingDays('book');
    var m = document.getElementById('ratingModal');
    if (m) m.classList.add('active');
}

function closeRatingModal() {
    var m = document.getElementById('ratingModal');
    if (m) m.classList.remove('active');
}

function setRating(n) { selectedRating = n; updateStarsDisplay(); }

function updateStarsDisplay() {
    var stars = document.querySelectorAll('#starsInput .star-btn');
    for (var i = 0; i < stars.length; i++) stars[i].classList.toggle('active', i < selectedRating);
}

function confirmRating() {
    if (!selectedRating) { showToast('⚠️ Sélectionne au moins 1 étoile !'); return; }
    for (var i = 0; i < books.length; i++) {
        if (books[i].id === ratingBookId) {
            books[i].rating = selectedRating;
            books[i].review = getVal('bookReview').trim();
            books[i].dateStart = getVal('bookDateStart') || null;
            books[i].dateEnd = getVal('bookDateEnd') || null;
            saveBooks();
            renderAll();
            showToast('⭐ Noté ' + selectedRating + '/5 !');
            break;
        }
    }
    closeRatingModal();
}

function pickRandomBook() {
    var gf = getVal('randomGenreFilter');
    var cands = [];
    for (var i = 0; i < books.length; i++) {
        if (books[i].status === 'toRead' && (gf === 'all' || books[i].genre === gf)) cands.push(books[i]);
    }
    var rd = document.getElementById('randomResult');
    var btn = document.getElementById('randomBtn');
    if (!rd || !btn) return;
    if (!cands.length) { rd.innerHTML = '<div class="random-card"><h3>😅 Aucun livre à lire !</h3></div>'; return; }
    btn.disabled = true; btn.textContent = '🎰 Sélection...';
    var spins = 0;
    var iv = setInterval(function () {
        var r = cands[Math.floor(Math.random() * cands.length)];
        rd.innerHTML = '<div class="random-card spinning"><h3>' + r.title + '</h3><p class="author">par ' + r.author + '</p></div>';
        spins++;
        if (spins >= 15) {
            clearInterval(iv);
            var ch = cands[Math.floor(Math.random() * cands.length)];
            rd.innerHTML = '<div class="random-card"><h3>🎉 ' + ch.title + '</h3><p class="author">par ' + ch.author + '</p><span class="genre-tag">' + ch.genre + '</span>' +
                (ch.series ? '<br><span class="saga-tag">📖 ' + ch.series + (ch.tome ? ' - T' + ch.tome : '') + '</span>' : '') + '</div>';
            btn.disabled = false; btn.textContent = '🎰 Choisir au hasard';
            showToast('🎲 "' + ch.title + '" choisi !');
        }
    }, 100);
}

function updateRandomGenreFilter() {
    var s = document.getElementById('randomGenreFilter');
    if (!s) return;
    var genres = [];
    for (var i = 0; i < books.length; i++) {
        if (books[i].status === 'toRead' && genres.indexOf(books[i].genre) === -1) genres.push(books[i].genre);
    }
    s.innerHTML = '<option value="all">Tous</option>';
    for (var j = 0; j < genres.length; j++) s.innerHTML += '<option value="' + genres[j] + '">' + genres[j] + '</option>';
}

// ============================================================
//  EXTERNAL (Empruntés/Lus)
// ============================================================
function addExternal(e) {
    e.preventDefault();
    var title = getVal('extTitle').trim();
    var author = getVal('extAuthor').trim();
    var genre = getVal('extGenre');
    var source = getVal('extSource');
    var series = getVal('extSeries').trim();
    var tome = parseInt(getVal('extTome')) || null;
    var status = getVal('extStatus');
    var notes = getVal('extNotes').trim();
    var wtb = document.getElementById('extWantToBuy');
    var wantToBuy = wtb ? wtb.checked : false;
    if (!title || !author) return;

    var extId = Date.now();
    external.push({
        id: extId, title: title, author: author, genre: genre, source: source,
        series: series || null, tome: tome, status: status, notes: notes,
        wantToBuy: wantToBuy, rating: 0, review: '',
        dateAdded: new Date().toLocaleDateString('fr-FR')
    });

    if (wantToBuy) {
        var exists = false;
        for (var i = 0; i < wishlist.length; i++) {
            if (wishlist[i].title.toLowerCase() === title.toLowerCase() && wishlist[i].author.toLowerCase() === author.toLowerCase()) {
                exists = true; break;
            }
        }
        if (!exists) {
            wishlist.push({
                id: Date.now() + 1, title: title, author: author, genre: genre,
                format: 'Broché', price: 0, priority: 2,
                notes: notes ? ('Vient de "empruntés" : ' + notes) : 'Vient de "empruntés"',
                series: series || null, tome: tome, status: 'toBuy',
                dateAdded: new Date().toLocaleDateString('fr-FR'), dateBought: null,
                fromExternal: extId
            });
            saveWishlist();
        }
    }

    saveExternal();
    renderAll();
    var form = document.getElementById('addExtForm');
    if (form) form.reset();
    if (wantToBuy) showToast('📖 "' + title + '" ajouté + 🛒 wishlist !');
    else showToast('📖 "' + title + '" ajouté !');
}

function renderExternal() {
    var container = document.getElementById('externalList');
    if (!container) return;
    var query = getVal('extSearchInput').toLowerCase();
    var sortBy = getVal('extSortSelect') || 'default';

    var filtered = [];
    for (var i = 0; i < external.length; i++) {
        var e = external[i];
        var mf = extFilter === 'all' ||
            (extFilter === 'returned' && e.status === 'returned') ||
            (extFilter === 'given' && e.status === 'given') ||
            (extFilter === 'kept' && e.status === 'kept') ||
            (extFilter === 'wantToBuy' && e.wantToBuy);
        var ms = e.title.toLowerCase().indexOf(query) !== -1 || e.author.toLowerCase().indexOf(query) !== -1 ||
            (e.genre && e.genre.toLowerCase().indexOf(query) !== -1) ||
            (e.series && e.series.toLowerCase().indexOf(query) !== -1) ||
            (e.source && e.source.toLowerCase().indexOf(query) !== -1);
        if (mf && ms) filtered.push(e);
    }

    filtered.sort(function (a, b) {
        switch (sortBy) {
            case 'title': return a.title.localeCompare(b.title);
            case 'author': return a.author.localeCompare(b.author);
            case 'rating': return b.rating - a.rating;
            case 'source': return (a.source || '').localeCompare(b.source || '');
            case 'dateAdded': return b.id - a.id;
            default:
                var order = { 'returned': 0, 'given': 1, 'kept': 2 };
                return (order[a.status] || 99) - (order[b.status] || 99);
        }
    });

    // Stats
    var ratedSum = 0, ratedCount = 0, toBuyCount = 0, returnedCount = 0, givenCount = 0, keptCount = 0, tomesCount = 0;
    var extSeriesSet = {};
    for (var s = 0; s < external.length; s++) {
        if (external[s].status === 'returned') returnedCount++;
        if (external[s].status === 'given') givenCount++;
        if (external[s].status === 'kept') keptCount++;
        if (external[s].rating > 0) { ratedSum += external[s].rating; ratedCount++; }
        if (external[s].wantToBuy) toBuyCount++;
        if (external[s].series && external[s].series.trim()) {
            extSeriesSet[external[s].series.trim().toLowerCase()] = true;
            if (external[s].tome) tomesCount++;
        }
    }
    var extSagasNb = Object.keys(extSeriesSet).length;

    setText('extTotal', external.length);
    setText('extToBuy', toBuyCount);
    setText('extAvgRating', ratedCount > 0 ? (ratedSum / ratedCount).toFixed(1) : '-');
    setText('extReturned', returnedCount);
    setText('extGiven', givenCount);
    setText('extKept', keptCount);
    setText('extSagasCount', extSagasNb);
    setText('extTomesCount', tomesCount);

    if (!filtered.length) {
        container.innerHTML = '<div class="empty-state"><span class="emoji">📖</span><p>Aucun livre externe.</p></div>';
        return;
    }

    var statusLabels = { 'returned': '📤 Retiré', 'given': '🎁 Rendu', 'kept': '📚 Laissé' };
    var statusClasses = { 'returned': 'ext-returned', 'given': 'ext-given', 'kept': 'ext-kept' };
    var html = '';

    for (var j = 0; j < filtered.length; j++) {
        var it = filtered[j];
        var starsH = it.rating > 0 ? '<div class="stars">' + '★'.repeat(it.rating) + '☆'.repeat(5 - it.rating) + '</div>' : '';
        var reviewH = it.review ? '<div class="review">"' + it.review + '"</div>' : '';
        var readDays = getReadingDaysText(it.dateStart, it.dateEnd);
        var readingH = '';
        if (readDays) {
            readingH = '<span class="reading-info">📖 Lu en ' + readDays + ' jour' + (readDays > 1 ? 's' : '') + '</span>';
            if (it.dateStart && it.dateEnd) {
                readingH += '<p class="reading-dates">📅 Du ' + formatDate(it.dateStart) + ' au ' + formatDate(it.dateEnd) + '</p>';
            }
        }
        var sourceIcon = SOURCE_ICONS[it.source] || '📚';
        var sourceH = it.source ? '<span class="source-tag">' + sourceIcon + ' ' + it.source + '</span>' : '';
        var seriesH = it.series ? '<span class="saga-tag">📖 ' + it.series + '</span>' : '';
        var tomeH = it.tome ? '<span class="tome-tag">Tome ' + it.tome + '</span>' : '';
        var wantH = it.wantToBuy ? '<span class="want-buy-badge">🛒 À acheter</span>' : '';
        var sc = statusClasses[it.status] || 'ext-returned';

        html += '<div class="book-card ' + sc + '">' +
            '<button class="delete-icon" onclick="deleteExternal(' + it.id + ')">🗑</button>' +
            '<h3>' + it.title + '</h3><p class="author">par ' + it.author + '</p>' +
            '<div class="wish-tags">' +
            '<span class="genre-tag">' + it.genre + '</span>' +
            '<span class="status-badge ' + sc + '">' + (statusLabels[it.status] || '📖') + '</span>' +
            sourceH + tomeH + seriesH + wantH +
            '</div>' + readingH + starsH + reviewH +
            (it.notes ? '<p class="wish-notes">📝 ' + it.notes + '</p>' : '') +
            '<div class="actions">' +
            '<button class="btn-rate" onclick="openRatingExtModal(' + it.id + ')">⭐ ' + (it.rating > 0 ? 'Modifier note' : 'Noter') + '</button>' +
            (it.status !== 'returned' ? '<button class="btn-returned" onclick="changeExtStatus(' + it.id + ', \'returned\')">📤 Retiré</button>' : '') +
            (it.status !== 'given' ? '<button class="btn-given" onclick="changeExtStatus(' + it.id + ', \'given\')">🎁 Rendu</button>' : '') +
            (it.status !== 'kept' ? '<button class="btn-kept" onclick="changeExtStatus(' + it.id + ', \'kept\')">📚 Laissé</button>' : '') +
            '<button class="btn-want-buy" onclick="toggleExtWantBuy(' + it.id + ')">' + (it.wantToBuy ? '❌ Retirer wishlist' : '🛒 Ajouter wishlist') + '</button>' +
            '<button class="btn-edit" onclick="openEditExtModal(' + it.id + ')">✏️ Modifier</button>' +
            '</div></div>';
    }
    container.innerHTML = html;
}

function filterExt(f, btn) {
    extFilter = f;
    var btns = document.querySelectorAll('#page-external .filter-btn');
    for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');
    if (btn) btn.classList.add('active');
    renderExternal();
}

function changeExtStatus(id, newStatus) {
    for (var i = 0; i < external.length; i++) {
        if (external[i].id === id) {
            external[i].status = newStatus;
            saveExternal();
            renderAll();
            var labels = { 'returned': '📤 Retiré', 'given': '🎁 Rendu', 'kept': '📚 Laissé' };
            showToast(labels[newStatus] + ' !');
            return;
        }
    }
}

function toggleExtWantBuy(id) {
    for (var i = 0; i < external.length; i++) {
        if (external[i].id === id) {
            external[i].wantToBuy = !external[i].wantToBuy;
            if (external[i].wantToBuy) {
                var it = external[i];
                var exists = false;
                for (var j = 0; j < wishlist.length; j++) {
                    if (wishlist[j].title.toLowerCase() === it.title.toLowerCase() && wishlist[j].author.toLowerCase() === it.author.toLowerCase()) {
                        exists = true; break;
                    }
                }
                if (!exists) {
                    wishlist.push({
                        id: Date.now(), title: it.title, author: it.author, genre: it.genre,
                        format: 'Broché', price: 0, priority: 2,
                        notes: it.notes ? ('Vient de "empruntés" : ' + it.notes) : 'Vient de "empruntés"',
                        series: it.series, tome: it.tome, status: 'toBuy',
                        dateAdded: new Date().toLocaleDateString('fr-FR'), dateBought: null,
                        fromExternal: it.id
                    });
                    saveWishlist();
                    showToast('🛒 Ajouté à la wishlist !');
                } else {
                    showToast('✅ Déjà dans la wishlist !');
                }
            } else {
                wishlist = wishlist.filter(function (w) { return w.fromExternal !== id; });
                saveWishlist();
                showToast('❌ Retiré de la wishlist !');
            }
            saveExternal();
            renderAll();
            return;
        }
    }
}

function deleteExternal(id) {
    var item = null;
    for (var i = 0; i < external.length; i++) { if (external[i].id === id) { item = external[i]; break; } }
    if (item && confirm('Supprimer "' + item.title + '" ?')) {
        external = external.filter(function (x) { return x.id !== id; });
        wishlist = wishlist.filter(function (w) { return w.fromExternal !== id; });
        saveExternal();
        saveWishlist();
        renderAll();
        showToast('🗑 Supprimé.');
    }
}

function openRatingExtModal(id) {
    ratingExtBookId = id;
    selectedExtRating = 0;
    var b = null;
    for (var i = 0; i < external.length; i++) { if (external[i].id === id) { b = external[i]; break; } }
    if (!b) return;
    setText('modalExtBookTitle', b.title);
    var rv = document.getElementById('extBookReview'); if (rv) rv.value = b.review || '';
    var ds = document.getElementById('extDateStart'); if (ds) ds.value = b.dateStart || '';
    var de = document.getElementById('extDateEnd'); if (de) de.value = b.dateEnd || '';
    if (b.rating > 0) selectedExtRating = b.rating;
    updateExtStarsDisplay();
    calcReadingDays('ext');
    var m = document.getElementById('ratingExtModal');
    if (m) m.classList.add('active');
}

function closeRatingExtModal() {
    var m = document.getElementById('ratingExtModal');
    if (m) m.classList.remove('active');
}

function setExtRating(n) { selectedExtRating = n; updateExtStarsDisplay(); }

function updateExtStarsDisplay() {
    var stars = document.querySelectorAll('#starsExtInput .star-btn');
    for (var i = 0; i < stars.length; i++) stars[i].classList.toggle('active', i < selectedExtRating);
}

function confirmExtRating() {
    if (!selectedExtRating) { showToast('⚠️ Sélectionne au moins 1 étoile !'); return; }
    for (var i = 0; i < external.length; i++) {
        if (external[i].id === ratingExtBookId) {
            external[i].rating = selectedExtRating;
            external[i].review = getVal('extBookReview').trim();
            external[i].dateStart = getVal('extDateStart') || null;
            external[i].dateEnd = getVal('extDateEnd') || null;
            saveExternal();
            renderAll();
            showToast('⭐ Noté ' + selectedExtRating + '/5 !');
            break;
        }
    }
    closeRatingExtModal();
}

// ============================================================
//  SAGAS
// ============================================================
function renderSagas() {
    var container = document.getElementById('sagasList');
    if (!container) return;
    var query = getVal('sagaSearchInput').toLowerCase();
    var allSeries = getAllSeries();
    var allKeys = Object.keys(allSeries);

    var seriesList = [];
    for (var i = 0; i < allKeys.length; i++) {
        var s = allSeries[allKeys[i]];
        if (s.name.toLowerCase().indexOf(query) !== -1 || s.author.toLowerCase().indexOf(query) !== -1) {
            seriesList.push(s);
        }
    }

    if (sagaFilter === 'completed') seriesList = seriesList.filter(function (s) { return s.isCompleted; });
    else if (sagaFilter === 'inProgress') seriesList = seriesList.filter(function (s) { return s.isStarted && !s.isCompleted; });
    else if (sagaFilter === 'notStarted') seriesList = seriesList.filter(function (s) { return !s.isStarted; });

    var allValues = [];
    for (var a = 0; a < allKeys.length; a++) allValues.push(allSeries[allKeys[a]]);

    // Stats sécurisées avec setText
    setText('sagasTotalStat', allValues.length);
    setText('sagasCompletedStat', allValues.filter(function (s) { return s.isCompleted; }).length);
    setText('sagasInProgressStat', allValues.filter(function (s) { return s.isStarted && !s.isCompleted; }).length);
    var totalT = 0;
    for (var t = 0; t < allValues.length; t++) totalT += allValues[t].ownedCount;
    setText('sagasTotalTomes', totalT);
    setText('sagasCount', allValues.length);

    if (!seriesList.length) {
        container.innerHTML = '<div class="empty-state"><span class="emoji">📚</span><p>Aucune saga trouvée.</p></div>';
        return;
    }

    seriesList.sort(function (a, b) {
        if (a.isCompleted && !b.isCompleted) return 1;
        if (!a.isCompleted && b.isCompleted) return -1;
        return b.progress - a.progress;
    });

    var html = '';
    for (var si = 0; si < seriesList.length; si++) {
        var sg = seriesList[si];
        var tomesHtml = '';
        for (var ti = 0; ti < sg.books.length; ti++) {
            var bk = sg.books[ti];
            tomesHtml += '<div class="tome-item"><span class="tome-title">' + (bk.tome ? 'T' + bk.tome + ' — ' : '') + bk.title + '</span>' +
                (bk.rating > 0 ? '<span class="tome-rating">' + '★'.repeat(bk.rating) + '</span>' : '') +
                '<span class="tome-status ' + (bk.status === 'read' ? 'read-tome' : 'unread-tome') + '">' + (bk.status === 'read' ? '✅' : '📖') + '</span></div>';
        }

        var ownedNums = [];
        for (var oi = 0; oi < sg.books.length; oi++) { if (sg.books[oi].tome) ownedNums.push(sg.books[oi].tome); }
        var missingTomes = [];
        if (sg.totalTomes > 0) { for (var mi = 1; mi <= sg.totalTomes; mi++) { if (ownedNums.indexOf(mi) === -1) missingTomes.push(mi); } }

        var missingHtml = '';
        if (missingTomes.length > 0) {
            var missingItems = '';
            for (var mj = 0; mj < missingTomes.length; mj++) {
                missingItems += '<div class="tome-item missing-tome"><span class="tome-title missing-title">T' + missingTomes[mj] + ' — ???</span><span class="tome-status missing-status">❌ Manquant</span></div>';
            }
            missingHtml = '<div class="missing-section"><div class="missing-header"><span class="missing-icon">⚠️</span><span class="missing-label">' + missingTomes.length + ' tome' + (missingTomes.length > 1 ? 's' : '') + ' manquant' + (missingTomes.length > 1 ? 's' : '') + '</span></div><div class="missing-list">' + missingItems + '</div></div>';
        }

        var compIcon = '';
        if (sg.isCompleted) compIcon = '<span class="saga-complete-badge">🎉 Terminée !</span>';
        else if (missingTomes.length === 0 && sg.ownedCount >= sg.totalTomes) compIcon = '<span class="saga-all-owned-badge">📚 Tous possédés</span>';

        var ratedBooks = sg.books.filter(function (b) { return b.rating > 0; });
        var avg = ratedBooks.length > 0 ? (ratedBooks.reduce(function (s, b) { return s + b.rating; }, 0) / ratedBooks.length).toFixed(1) : null;
        var missingCount = sg.totalTomes - sg.ownedCount;

        html += '<div class="saga-card ' + (sg.isCompleted ? 'saga-completed' : '') + ' ' + (missingTomes.length > 0 ? 'saga-has-missing' : '') + '">' +
            '<h3>📖 ' + sg.name + '</h3><p class="saga-author">par ' + sg.author + '</p><span class="genre-tag">' + sg.genre + '</span>' + compIcon +
            '<div class="saga-info"><span>📚 ' + sg.ownedCount + '/' + sg.totalTomes + ' possédés</span><span>✅ ' + sg.readCount + ' lus</span>' +
            (missingCount > 0 ? '<span class="missing-count-tag">❌ ' + missingCount + ' manquants</span>' : '') +
            (avg ? '<span>⭐ ' + avg + '/5</span>' : '') + '</div>' +
            '<p class="progress-text">' + sg.progress + '% lu ' + (sg.isCompleted ? '🎉' : '') + '</p>' +
            '<div class="progress-bar"><div class="progress-fill" style="width:' + Math.min(sg.progress, 100) + '%"></div></div>' +
            '<div class="tomes-list"><p class="tomes-section-title">📗 Tomes possédés (' + sg.ownedCount + ')</p>' + tomesHtml + '</div>' +
            missingHtml +
            '<div class="actions"><button class="btn-edit-saga" onclick="openEditSagaModal(\'' + sg.key + '\')">✏️ Modifier tomes prévus</button></div></div>';
    }
    container.innerHTML = html;
}

function filterSagas(f, btn) {
    sagaFilter = f;
    var btns = document.querySelectorAll('#page-sagas .filter-btn');
    for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');
    if (btn) btn.classList.add('active');
    renderSagas();
}

function openEditSagaModal(key) {
    editSagaKey = key;
    var allSeries = getAllSeries();
    var s = allSeries[key];
    if (!s) return;
    setText('editSagaTitle', s.name);
    var t = document.getElementById('editSagaTotalTomes');
    if (t) t.value = s.totalTomes;
    var m = document.getElementById('editSagaModal');
    if (m) m.classList.add('active');
}

function closeEditSagaModal() {
    var m = document.getElementById('editSagaModal');
    if (m) m.classList.remove('active');
    editSagaKey = null;
}

function confirmEditSaga() {
    var val = parseInt(getVal('editSagaTotalTomes'));
    if (!val || val < 1) { showToast('⚠️ Nombre invalide !'); return; }
    if (!sagasMeta[editSagaKey]) sagasMeta[editSagaKey] = {};
    sagasMeta[editSagaKey].totalTomes = val;
    saveSagasMeta();
    renderAll();
    showToast('✏️ Mise à jour !');
    closeEditSagaModal();
}

// ============================================================
//  AUTEURS
// ============================================================
function renderAuthors() {
    var container = document.getElementById('authorsList');
    if (!container) return;
    var query = getVal('authorSearchInput').toLowerCase();
    var sortBy = getVal('authorSortSelect') || 'count';

    var authorMap = {};
    for (var i = 0; i < books.length; i++) {
        var key = books[i].author.trim();
        if (!authorMap[key]) authorMap[key] = { name: key, books: [], extBooks: [] };
        authorMap[key].books.push(books[i]);
    }
    for (var i2 = 0; i2 < external.length; i2++) {
        var key2 = external[i2].author.trim();
        if (!authorMap[key2]) authorMap[key2] = { name: key2, books: [], extBooks: [] };
        authorMap[key2].extBooks.push(external[i2]);
    }

    var allSeries = getAllSeries();
    var authors = [];
    var aKeys = Object.keys(authorMap);
    for (var j = 0; j < aKeys.length; j++) {
        var a = authorMap[aKeys[j]];
        if (a.name.toLowerCase().indexOf(query) === -1) continue;
        var totalBooks = a.books.length + a.extBooks.length;
        var readB = 0, ratingSum = 0, ratedCount = 0;
        for (var k = 0; k < a.books.length; k++) {
            if (a.books[k].status === 'read') readB++;
            if (a.books[k].rating > 0) { ratingSum += a.books[k].rating; ratedCount++; }
        }
        for (var k2 = 0; k2 < a.extBooks.length; k2++) {
            if (a.extBooks[k2].status === 'read') readB++;
            if (a.extBooks[k2].rating > 0) { ratingSum += a.extBooks[k2].rating; ratedCount++; }
        }
        var aSeries = [];
        var sKeys = Object.keys(allSeries);
        for (var s = 0; s < sKeys.length; s++) {
            if (allSeries[sKeys[s]].author.trim() === a.name) aSeries.push(allSeries[sKeys[s]]);
        }
        authors.push({
            name: a.name, books: a.books, extBooks: a.extBooks, totalBooks: totalBooks,
            readBooks: readB, avgRating: ratedCount > 0 ? ratingSum / ratedCount : 0,
            authorSeries: aSeries
        });
    }

    authors.sort(function (a, b) {
        switch (sortBy) {
            case 'name': return a.name.localeCompare(b.name);
            case 'rating': return b.avgRating - a.avgRating;
            case 'read': return b.readBooks - a.readBooks;
            default: return b.totalBooks - a.totalBooks;
        }
    });

    setText('authorsTotal', authors.length);
    if (authors.length > 0) {
        var sorted = authors.slice().sort(function (a, b) { return b.totalBooks - a.totalBooks; });
        setText('authorTopName', sorted[0].name.length > 15 ? sorted[0].name.substring(0, 15) + '…' : sorted[0].name);
        setText('authorTopCount', sorted[0].totalBooks);
    } else {
        setText('authorTopName', '-');
        setText('authorTopCount', '0');
    }

    if (!authors.length) {
        container.innerHTML = '<div class="empty-state"><span class="emoji">✍️</span><p>Aucun auteur trouvé.</p></div>';
        return;
    }

    var html = '';
    for (var ai = 0; ai < authors.length; ai++) {
        var au = authors[ai];
        var booksHtml = '';
        var allBooksList = [];
        for (var b1 = 0; b1 < au.books.length; b1++) allBooksList.push({ book: au.books[b1], external: false });
        for (var b2 = 0; b2 < au.extBooks.length; b2++) allBooksList.push({ book: au.extBooks[b2], external: true });
        allBooksList.sort(function (x, y) { return x.book.title.localeCompare(y.book.title); });

        for (var bi = 0; bi < allBooksList.length; bi++) {
            var bkObj = allBooksList[bi];
            var bk = bkObj.book;
            var statusCls = bkObj.external ? 'ab-ext' : (bk.status === 'read' ? 'ab-read' : 'ab-toread');
            var statusIcon = bkObj.external ? '📖' : (bk.status === 'read' ? '✅' : '📖');
            var extLabel = bkObj.external ? ' (externe)' : '';
            booksHtml += '<div class="author-book-item"><span class="ab-title">' + bk.title +
                (bk.tome ? ' (T' + bk.tome + ')' : '') + (bk.series ? ' — ' + bk.series : '') + extLabel +
                '</span><span class="ab-status ' + statusCls + '">' + statusIcon + '</span>' +
                (bk.rating > 0 ? '<span class="ab-rating">' + '★'.repeat(bk.rating) + '</span>' : '') + '</div>';
        }

        var seriesHtml = '';
        if (au.authorSeries.length > 0) {
            var parts = [];
            for (var si = 0; si < au.authorSeries.length; si++) {
                parts.push(au.authorSeries[si].name + ' (' + au.authorSeries[si].readCount + '/' + au.authorSeries[si].totalTomes + ')');
            }
            seriesHtml = '<p class="author-series">📖 Sagas : ' + parts.join(', ') + '</p>';
        }
        var uid = 'au' + ai + '_' + Math.random().toString(36).substr(2, 5);

        html += '<div class="author-card"><h3>✍️ ' + au.name + '</h3>' +
            '<div class="author-stats">' +
            '<div class="author-stat"><span class="author-stat-num">' + au.totalBooks + '</span><span class="author-stat-label">Livres</span></div>' +
            '<div class="author-stat"><span class="author-stat-num">' + au.readBooks + '</span><span class="author-stat-label">Lus</span></div>' +
            '<div class="author-stat"><span class="author-stat-num">' + (au.avgRating > 0 ? au.avgRating.toFixed(1) + '⭐' : '-') + '</span><span class="author-stat-label">Note</span></div>' +
            '<div class="author-stat"><span class="author-stat-num">' + au.authorSeries.length + '</span><span class="author-stat-label">Sagas</span></div>' +
            '</div>' + seriesHtml +
            (au.totalBooks > 0 ? '<button class="toggle-books-btn" onclick="toggleAuthorBooks(\'' + uid + '\',this)">📚 Voir les ' + au.totalBooks + ' livres</button><div class="author-books-container" id="' + uid + '">' + booksHtml + '</div>' : '') +
            '</div>';
    }
    container.innerHTML = html;
}

function toggleAuthorBooks(uid, btn) {
    var c = document.getElementById(uid);
    if (!c) return;
    var exp = c.classList.toggle('expanded');
    btn.textContent = exp ? '📚 Masquer' : '📚 Voir les livres';
}

// ============================================================
//  WISHLIST
// ============================================================
function addWishlistItem(e) {
    e.preventDefault();
    var title = getVal('wishTitle').trim();
    var author = getVal('wishAuthor').trim();
    var genre = getVal('wishGenre');
    var format = getVal('wishFormat');
    var price = parseFloat(getVal('wishPrice')) || 0;
    var priority = parseInt(getVal('wishPriority'));
    var notes = getVal('wishNotes').trim();
    var series = getVal('wishSeries').trim();
    var tome = parseInt(getVal('wishTome')) || null;
    if (!title || !author) return;

    wishlist.push({
        id: Date.now(), title: title, author: author, genre: genre, format: format,
        price: price, priority: priority, notes: notes,
        series: series || null, tome: tome,
        status: 'toBuy', dateAdded: new Date().toLocaleDateString('fr-FR'), dateBought: null
    });
    saveWishlist();
    renderWishlist();
    updateStats();
    updateWishSeriesSuggestions();
    var form = document.getElementById('addWishlistForm');
    if (form) form.reset();
    showToast('🛒 "' + title + '" ajouté !');
}

function renderWishlist() {
    var container = document.getElementById('wishlistList');
    if (!container) return;
    var query = getVal('wishSearchInput').toLowerCase();

    var filtered = [];
    for (var i = 0; i < wishlist.length; i++) {
        var it = wishlist[i];
        var mf = wishlistFilter === 'all' || (wishlistFilter === 'toBuy' && it.status === 'toBuy') || (wishlistFilter === 'bought' && it.status === 'bought');
        var ms = it.title.toLowerCase().indexOf(query) !== -1 || it.author.toLowerCase().indexOf(query) !== -1 ||
            (it.genre && it.genre.toLowerCase().indexOf(query) !== -1) ||
            (it.series && it.series.toLowerCase().indexOf(query) !== -1) ||
            (it.format && it.format.toLowerCase().indexOf(query) !== -1);
        if (mf && ms) filtered.push(it);
    }

    filtered.sort(function (a, b) {
        if (a.status === 'toBuy' && b.status === 'bought') return -1;
        if (a.status === 'bought' && b.status === 'toBuy') return 1;
        return b.priority - a.priority;
    });

    if (!filtered.length) {
        container.innerHTML = '<div class="empty-state"><span class="emoji">🛒</span><p>Aucun livre dans la wishlist.</p></div>';
        return;
    }

    var pl = { 3: '🔴 Haute', 2: '🟡 Moyenne', 1: '🟢 Basse' };
    var pc = { 3: 'high', 2: 'medium', 1: 'low' };
    var html = '';

    for (var j = 0; j < filtered.length; j++) {
        var it = filtered[j];
        var sc = it.status === 'bought' ? 'wish-bought' : 'wish-to-buy';
        var sl = it.status === 'bought' ? '✅ Acheté' : '📋 À acheter';
        var formatH = getFormatHtml(it.format);
        var seriesH = it.series ? '<span class="saga-tag">📖 ' + it.series + '</span>' : '';
        var tomeH = it.tome ? '<span class="tome-tag">Tome ' + it.tome + '</span>' : '';

        html += '<div class="book-card ' + sc + '"><button class="delete-icon" onclick="deleteWishlistItem(' + it.id + ')">🗑</button>' +
            '<h3>' + it.title + '</h3><p class="author">par ' + it.author + '</p>' +
            '<div class="wish-tags"><span class="genre-tag">' + (it.genre || 'Roman') + '</span>' +
            '<span class="status-badge ' + sc + '">' + sl + '</span>' + formatH +
            (it.price > 0 ? '<span class="price-tag">' + it.price.toFixed(2) + ' €</span>' : '') +
            '<span class="priority-tag ' + pc[it.priority] + '">' + pl[it.priority] + '</span>' +
            tomeH + seriesH + '</div>' +
            (it.notes ? '<p class="wish-notes">📝 ' + it.notes + '</p>' : '') +
            '<div class="actions">' +
            (it.status === 'toBuy'
                ? '<button class="btn-bought" onclick="markAsBought(' + it.id + ')">✅ Acheté</button><button class="btn-transfer" onclick="openTransferModal(' + it.id + ')">📚 → Biblio</button>'
                : '<button class="btn-unbuy" onclick="markAsUnbought(' + it.id + ')">🛒 Remettre</button><button class="btn-transfer" onclick="openTransferModal(' + it.id + ')">📚 → Biblio</button>') +
            '<button class="btn-edit" onclick="openEditWishModal(' + it.id + ')">✏️ Modifier</button>' +
            '</div></div>';
    }
    container.innerHTML = html;
}

function filterWishlist(f, btn) {
    wishlistFilter = f;
    var btns = document.querySelectorAll('#page-wishlist .filter-btn');
    for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');
    if (btn) btn.classList.add('active');
    renderWishlist();
}

function markAsBought(id) {
    for (var i = 0; i < wishlist.length; i++) {
        if (wishlist[i].id === id) {
            wishlist[i].status = 'bought';
            wishlist[i].dateBought = new Date().toLocaleDateString('fr-FR');
            saveWishlist();
            renderWishlist();
            updateStats();
            showToast('✅ Acheté !');
            return;
        }
    }
}

function markAsUnbought(id) {
    for (var i = 0; i < wishlist.length; i++) {
        if (wishlist[i].id === id) {
            wishlist[i].status = 'toBuy';
            wishlist[i].dateBought = null;
            saveWishlist();
            renderWishlist();
            updateStats();
            showToast('🛒 Remis !');
            return;
        }
    }
}

function deleteWishlistItem(id) {
    var item = null;
    for (var i = 0; i < wishlist.length; i++) { if (wishlist[i].id === id) { item = wishlist[i]; break; } }
    if (item && confirm('Supprimer "' + item.title + '" ?')) {
        if (item.fromExternal) {
            for (var e = 0; e < external.length; e++) {
                if (external[e].id === item.fromExternal) { external[e].wantToBuy = false; break; }
            }
            saveExternal();
        }
        wishlist = wishlist.filter(function (x) { return x.id !== id; });
        saveWishlist();
        renderAll();
        showToast('🗑 Supprimé.');
    }
}

function openTransferModal(id) {
    transferBookId = id;
    var item = null;
    for (var i = 0; i < wishlist.length; i++) { if (wishlist[i].id === id) { item = wishlist[i]; break; } }
    if (!item) return;
    setText('transferBookTitle', item.title + ' — ' + item.author);
    var cb = document.getElementById('removeFromWishlist');
    if (cb) cb.checked = true;
    var m = document.getElementById('transferModal');
    if (m) m.classList.add('active');
}

function closeTransferModal() {
    var m = document.getElementById('transferModal');
    if (m) m.classList.remove('active');
}

function confirmTransfer() {
    var item = null;
    for (var i = 0; i < wishlist.length; i++) { if (wishlist[i].id === transferBookId) { item = wishlist[i]; break; } }
    if (!item) return;
    var exists = false;
    for (var j = 0; j < books.length; j++) {
        if (books[j].title.toLowerCase() === item.title.toLowerCase() && books[j].author.toLowerCase() === item.author.toLowerCase()) { exists = true; break; }
    }
    if (exists) { showToast('⚠️ Déjà dans la biblio !'); closeTransferModal(); return; }
    books.push({
        id: Date.now(), title: item.title, author: item.author,
        genre: item.genre || 'Roman', format: item.format || 'Broché',
        series: item.series || null, tome: item.tome || null,
        status: 'toRead', rating: 0, review: '',
        dateAdded: new Date().toLocaleDateString('fr-FR'), dateRead: null
    });
    if (item.series) {
        var key = getSeriesKey(item.series);
        if (!sagasMeta[key]) sagasMeta[key] = {};
        saveSagasMeta();
    }
    var cb = document.getElementById('removeFromWishlist');
    if (cb && cb.checked) {
        wishlist = wishlist.filter(function (x) { return x.id !== transferBookId; });
    } else {
        item.status = 'bought';
        item.dateBought = new Date().toLocaleDateString('fr-FR');
    }
    saveBooks();
    saveWishlist();
    renderAll();
    showToast('📚 Transféré !');
    closeTransferModal();
}

// ============================================================
//  STATS GLOBALES
// ============================================================
function updateStats() {
    setText('totalBooks', books.length);
    var toRead = 0, read = 0, rSum = 0, rCount = 0, oneShot = 0, broche = 0, poche = 0;
    for (var i = 0; i < books.length; i++) {
        if (books[i].status === 'toRead') toRead++;
        if (books[i].status === 'read') read++;
        if (books[i].rating > 0) { rSum += books[i].rating; rCount++; }
        if (!books[i].series || !books[i].series.trim()) oneShot++;
        if (books[i].format === 'Broché') broche++;
        if (books[i].format === 'Poche') poche++;
    }
    for (var e = 0; e < external.length; e++) {
        if (external[e].rating > 0) { rSum += external[e].rating; rCount++; }
    }
    var extReadCount = external.length;

    setText('toReadBooks', toRead);
    setText('readBooks', read);
    setText('externalCount', external.length);
    setText('totalReadGlobal', read + extReadCount);
    setText('avgRating', rCount > 0 ? (rSum / rCount).toFixed(1) : '-');
    setText('oneShotCount', oneShot);
    setText('brocheCount', broche);
    setText('pocheCount', poche);

    var wToBuy = 0, wBought = 0, budget = 0, spent = 0;
    for (var j = 0; j < wishlist.length; j++) {
        if (wishlist[j].status === 'toBuy') { wToBuy++; budget += wishlist[j].price || 0; }
        if (wishlist[j].status === 'bought') { wBought++; spent += wishlist[j].price || 0; }
    }
    setText('wishlistCount', wToBuy);
    setText('wishlistTotal', wToBuy);
    setText('wishlistBought', wBought);
    setText('wishlistBudget', budget.toFixed(2) + ' €');
    setText('wishlistSpent', spent.toFixed(2) + ' €');
}

// ============================================================
//  TOAST
// ============================================================
function showToast(msg) {
    var ex = document.querySelector('.toast');
    if (ex) ex.remove();
    var t = document.createElement('div');
    t.classList.add('toast');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.remove(); }, 3000);
}

// ============================================================
//  ÉDITION LIVRE BIBLIOTHÈQUE
// ============================================================
function openEditBookModal(id) {
    editBookId = id;
    var b = null;
    for (var i = 0; i < books.length; i++) { if (books[i].id === id) { b = books[i]; break; } }
    if (!b) return;
    var el;
    el = document.getElementById('editBookTitle'); if (el) el.value = b.title;
    el = document.getElementById('editBookAuthor'); if (el) el.value = b.author;
    el = document.getElementById('editBookGenre'); if (el) el.value = b.genre || 'Roman';
    el = document.getElementById('editBookFormat'); if (el) el.value = b.format || 'Broché';
    el = document.getElementById('editBookSeries'); if (el) el.value = b.series || '';
    el = document.getElementById('editBookTome'); if (el) el.value = b.tome || '';
    var m = document.getElementById('editBookModal');
    if (m) m.classList.add('active');
}

function closeEditBookModal() {
    var m = document.getElementById('editBookModal');
    if (m) m.classList.remove('active');
    editBookId = null;
}

function confirmEditBook() {
    var b = null;
    for (var i = 0; i < books.length; i++) { if (books[i].id === editBookId) { b = books[i]; break; } }
    if (!b) return;

    var title = getVal('editBookTitle').trim();
    var author = getVal('editBookAuthor').trim();
    if (!title || !author) { showToast('⚠️ Titre et auteur requis !'); return; }

    var oldSeries = b.series;
    b.title = title;
    b.author = author;
    b.genre = getVal('editBookGenre');
    b.format = getVal('editBookFormat');
    var newSeries = getVal('editBookSeries').trim();
    b.series = newSeries || null;
    b.tome = parseInt(getVal('editBookTome')) || null;

    if (oldSeries && oldSeries !== newSeries) {
        var oldKey = getSeriesKey(oldSeries);
        var remaining = books.filter(function (x) { return x.series && getSeriesKey(x.series) === oldKey; });
        if (remaining.length === 0) delete sagasMeta[oldKey];
    }

    if (newSeries) {
        var newKey = getSeriesKey(newSeries);
        if (!sagasMeta[newKey]) sagasMeta[newKey] = {};
    }

    saveBooks();
    saveSagasMeta();
    renderAll();
    showToast('✅ "' + title + '" modifié !');
    closeEditBookModal();
}

// ============================================================
//  ÉDITION WISHLIST
// ============================================================
function openEditWishModal(id) {
    editWishId = id;
    var it = null;
    for (var i = 0; i < wishlist.length; i++) { if (wishlist[i].id === id) { it = wishlist[i]; break; } }
    if (!it) return;
    var el;
    el = document.getElementById('editWishTitle'); if (el) el.value = it.title;
    el = document.getElementById('editWishAuthor'); if (el) el.value = it.author;
    el = document.getElementById('editWishGenre'); if (el) el.value = it.genre || 'Roman';
    el = document.getElementById('editWishFormat'); if (el) el.value = it.format || 'Broché';
    el = document.getElementById('editWishPriority'); if (el) el.value = it.priority || 2;
    el = document.getElementById('editWishSeries'); if (el) el.value = it.series || '';
    el = document.getElementById('editWishTome'); if (el) el.value = it.tome || '';
    el = document.getElementById('editWishPrice'); if (el) el.value = it.price || '';
    el = document.getElementById('editWishNotes'); if (el) el.value = it.notes || '';
    var m = document.getElementById('editWishModal');
    if (m) m.classList.add('active');
}

function closeEditWishModal() {
    var m = document.getElementById('editWishModal');
    if (m) m.classList.remove('active');
    editWishId = null;
}

function confirmEditWish() {
    var it = null;
    for (var i = 0; i < wishlist.length; i++) { if (wishlist[i].id === editWishId) { it = wishlist[i]; break; } }
    if (!it) return;

    var title = getVal('editWishTitle').trim();
    var author = getVal('editWishAuthor').trim();
    if (!title || !author) { showToast('⚠️ Titre et auteur requis !'); return; }

    it.title = title;
    it.author = author;
    it.genre = getVal('editWishGenre');
    it.format = getVal('editWishFormat');
    it.priority = parseInt(getVal('editWishPriority'));
    it.series = getVal('editWishSeries').trim() || null;
    it.tome = parseInt(getVal('editWishTome')) || null;
    it.price = parseFloat(getVal('editWishPrice')) || 0;
    it.notes = getVal('editWishNotes').trim();

    saveWishlist();
    renderAll();
    showToast('✅ "' + title + '" modifié !');
    closeEditWishModal();
}

// ============================================================
//  ÉDITION EXTERNAL
// ============================================================
function openEditExtModal(id) {
    editExtId = id;
    var it = null;
    for (var i = 0; i < external.length; i++) { if (external[i].id === id) { it = external[i]; break; } }
    if (!it) return;
    var el;
    el = document.getElementById('editExtTitle'); if (el) el.value = it.title;
    el = document.getElementById('editExtAuthor'); if (el) el.value = it.author;
    el = document.getElementById('editExtGenre'); if (el) el.value = it.genre || 'Roman';
    el = document.getElementById('editExtSource'); if (el) el.value = it.source || 'Bibliothèque';
    el = document.getElementById('editExtSeries'); if (el) el.value = it.series || '';
    el = document.getElementById('editExtTome'); if (el) el.value = it.tome || '';
    el = document.getElementById('editExtNotes'); if (el) el.value = it.notes || '';
    var m = document.getElementById('editExtModal');
    if (m) m.classList.add('active');
}

function closeEditExtModal() {
    var m = document.getElementById('editExtModal');
    if (m) m.classList.remove('active');
    editExtId = null;
}

function confirmEditExt() {
    var it = null;
    for (var i = 0; i < external.length; i++) { if (external[i].id === editExtId) { it = external[i]; break; } }
    if (!it) return;

    var title = getVal('editExtTitle').trim();
    var author = getVal('editExtAuthor').trim();
    if (!title || !author) { showToast('⚠️ Titre et auteur requis !'); return; }

    it.title = title;
    it.author = author;
    it.genre = getVal('editExtGenre');
    it.source = getVal('editExtSource');
    it.series = getVal('editExtSeries').trim() || null;
    it.tome = parseInt(getVal('editExtTome')) || null;
    it.notes = getVal('editExtNotes').trim();

    saveExternal();
    renderAll();
    showToast('✅ "' + title + '" modifié !');
    closeEditExtModal();
}

// ============================================================
//  FIREBASE
// ============================================================
document.addEventListener('firebaseReady', function () {
    var auth = window.firebaseAuth;
    if (!auth || !window.firebaseOnAuthChanged) return;
    window.firebaseOnAuthChanged(auth, function (user) {
        if (user) {
            currentUser = user;
            showLoggedUI(user);
            firebasePullData();
        } else {
            currentUser = null;
            showNotLoggedUI();
        }
    });
});

function showAuthTab(tab, btn) {
    var tabs = document.querySelectorAll('.auth-tab');
    var forms = document.querySelectorAll('.auth-form');
    for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove('active');
    for (var j = 0; j < forms.length; j++) forms[j].classList.remove('active');
    if (btn) btn.classList.add('active');
    var f = document.getElementById(tab + 'Form');
    if (f) f.classList.add('active');
}

function showLoggedUI(user) {
    var nl = document.getElementById('authNotLogged');
    var l = document.getElementById('authLogged');
    if (nl) nl.style.display = 'none';
    if (l) l.style.display = 'block';
    setText('userEmail', user.email);
}

function showNotLoggedUI() {
    var nl = document.getElementById('authNotLogged');
    var l = document.getElementById('authLogged');
    if (nl) nl.style.display = 'block';
    if (l) l.style.display = 'none';
}

function firebaseRegister() {
    var email = getVal('regEmail').trim();
    var pass = getVal('regPassword');
    var pass2 = getVal('regPassword2');
    if (!email || !pass) { showToast('⚠️ Remplis tous les champs !'); return; }
    if (pass.length < 6) { showToast('⚠️ Mot de passe : min. 6 caractères'); return; }
    if (pass !== pass2) { showToast('⚠️ Les mots de passe ne correspondent pas !'); return; }
    if (!window.firebaseCreateUser) { showToast('❌ Firebase non chargé'); return; }
    window.firebaseCreateUser(window.firebaseAuth, email, pass)
        .then(function () { showToast('✅ Compte créé !'); setTimeout(firebaseSync, 1000); })
        .catch(function (error) {
            var msg = '❌ Erreur';
            if (error.code === 'auth/email-already-in-use') msg = '⚠️ Email déjà utilisé';
            else if (error.code === 'auth/invalid-email') msg = '⚠️ Email invalide';
            else if (error.code === 'auth/weak-password') msg = '⚠️ Mot de passe trop faible';
            showToast(msg);
        });
}

function firebaseLogin() {
    var email = getVal('loginEmail').trim();
    var pass = getVal('loginPassword');
    if (!email || !pass) { showToast('⚠️ Remplis tous les champs !'); return; }
    if (!window.firebaseSignIn) { showToast('❌ Firebase non chargé'); return; }
    window.firebaseSignIn(window.firebaseAuth, email, pass)
        .then(function () { showToast('✅ Connecté !'); })
        .catch(function (error) {
            var msg = '❌ Erreur';
            if (error.code === 'auth/user-not-found') msg = '⚠️ Utilisateur introuvable';
            else if (error.code === 'auth/wrong-password') msg = '⚠️ Mot de passe incorrect';
            else if (error.code === 'auth/invalid-email') msg = '⚠️ Email invalide';
            else if (error.code === 'auth/invalid-credential') msg = '⚠️ Identifiants invalides';
            showToast(msg);
        });
}

function firebaseLogout() {
    if (!confirm('Se déconnecter ?')) return;
    if (!window.firebaseSignOut) return;
    window.firebaseSignOut(window.firebaseAuth).then(function () { showToast('👋 Déconnecté !'); });
}

function firebaseSync() {
    if (!currentUser) { showToast('⚠️ Non connecté !'); return; }
    setSyncStatus('syncing', '⏳ Synchronisation...');
    var data = { books: books, wishlist: wishlist, external: external, sagasMeta: sagasMeta, settings: settings, lastSync: Date.now() };
    var docRef = window.firebaseDoc(window.firebaseDb, 'users', currentUser.uid);
    window.firebaseSetDoc(docRef, data)
        .then(function () {
            setSyncStatus('ok', '☁️ Synchronisé ' + new Date().toLocaleTimeString('fr-FR'));
            showToast('☁️ Synchronisé !');
        })
        .catch(function (err) { setSyncStatus('error', '❌ Erreur'); showToast('❌ Erreur sync'); console.error(err); });
}

function firebasePullData() {
    if (!currentUser) return;
    setSyncStatus('syncing', '⏳ Récupération...');
    var docRef = window.firebaseDoc(window.firebaseDb, 'users', currentUser.uid);
    window.firebaseGetDoc(docRef)
        .then(function (docSnap) {
            if (docSnap.exists()) {
                var data = docSnap.data();
                var localLastSync = parseInt(localStorage.getItem('lastLocalChange') || '0');
                var cloudLastSync = data.lastSync || 0;
                if (localLastSync > cloudLastSync && (books.length > 0 || wishlist.length > 0 || external.length > 0)) {
                    if (confirm('⚠️ Données locales plus récentes.\n\nOK = local vers cloud / Annuler = cloud vers local')) {
                        firebaseSync(); return;
                    }
                }
                if (data.books) books = data.books;
                if (data.wishlist) wishlist = data.wishlist;
                if (data.external) external = data.external;
                if (data.sagasMeta) sagasMeta = data.sagasMeta;
                if (data.settings) { settings = Object.assign({}, settings, data.settings); applySettings(); }
                localStorage.setItem('myBookPile', JSON.stringify(books));
                localStorage.setItem('myBookWishlist', JSON.stringify(wishlist));
                localStorage.setItem('myBookExternal', JSON.stringify(external));
                localStorage.setItem('myBookSagasMeta', JSON.stringify(sagasMeta));
                saveSettings();
                renderAll();
                setSyncStatus('ok', '☁️ Récupéré');
                showToast('⬇️ Récupéré !');
            } else {
                setSyncStatus('ok', '☁️ Premier envoi...');
                firebaseSync();
            }
        })
        .catch(function (err) { setSyncStatus('error', '❌ Erreur'); console.error(err); });
}

function setSyncStatus(status, msg) {
    var el = document.getElementById('syncStatus');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('syncing', 'error');
    if (status === 'syncing') el.classList.add('syncing');
    if (status === 'error') el.classList.add('error');
}

function triggerAutoSync() {
    localStorage.setItem('lastLocalChange', Date.now().toString());
    if (!currentUser) return;
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(function () { firebaseSync(); }, 3000);
}
