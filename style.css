// ============================================================
//  MA PILE À LIVRES — SCRIPT PRINCIPAL v11.5
//  + Scanner code-barres (Quagga2 + Google Books API)
// ============================================================

(function () {
    'use strict';

    // ============================================================
    //  DONNÉES & ÉTAT
    // ============================================================
    var books = loadJSON('myBookPile', []);
    var wishlist = loadJSON('myBookWishlist', []);
    var external = loadJSON('myBookExternal', []);
    var sagasMeta = loadJSON('myBookSagasMeta', {});
    var deletedItems = loadJSON('myBookDeleted', { books: [], wishlist: [], external: [] });
    var settings = loadJSON('myBookPileSettings', {
        theme: 'purple', particles: true, animations: true, font: 'Poppins'
    });
    if (!settings.font) settings.font = 'Poppins';

    var state = {
        currentFilter: 'all',
        wishlistFilter: 'all',
        sagaFilter: 'all',
        extFilter: 'all',
        ratingBookId: null,
        selectedRating: 0,
        ratingExtBookId: null,
        selectedExtRating: 0,
        transferBookId: null,
        editSagaKey: null,
        editBookId: null,
        editWishId: null,
        editExtId: null,
        currentUser: null,
        syncTimeout: null,
        periodicSyncInterval: null,
        // Scanner
        scannerActive: false,
        scannerTarget: 'book', // 'book' | 'ext' | 'wish'
        lastDetectedCode: null,
        detectionCount: {}
    };

    // ============================================================
    //  CONSTANTES
    // ============================================================
    var FORMAT_ICONS = { 'Broché': '📕', 'Poche': '📒', 'Collector': '✨', 'Relié': '📗', 'Audiobook': '🎧' };
    var SOURCE_ICONS = { 'Bibliothèque': '🏛️', 'Internet': '💻', 'École': '🎓', 'Ma collection': '📚' };
    var EXT_STATUS_LABELS = { 'returned': '📤 Retiré', 'given': '🎁 Rendu', 'kept': '📚 Laissé' };
    var EXT_STATUS_CLASSES = { 'returned': 'ext-returned', 'given': 'ext-given', 'kept': 'ext-kept' };
    var PRIORITY_LABELS = { 3: '🔴 Haute', 2: '🟡 Moyenne', 1: '🟢 Basse' };
    var PRIORITY_CLASSES = { 3: 'high', 2: 'medium', 1: 'low' };
    var MS_PER_DAY = 86400000;
    var SYNC_DEBOUNCE_MS = 2000;
    var SYNC_RETRY_DELAY = 5000;
    var SYNC_PERIODIC_MS = 60000;
    var DELETED_RETENTION_MS = 30 * MS_PER_DAY;
    var SCANNER_MIN_DETECTIONS = 3;

    // ============================================================
    //  HELPERS
    // ============================================================
    function $(id) { return document.getElementById(id); }

    function setText(id, value) {
        var el = $(id);
        if (el) el.textContent = value;
    }

    function setFormVal(id, value) {
        var el = $(id);
        if (el) el.value = value;
    }

    function getVal(id) {
        var el = $(id);
        return el ? el.value.trim() : '';
    }

    function getRawVal(id) {
        var el = $(id);
        return el ? el.value : '';
    }

    function loadJSON(key, fallback) {
        try {
            var data = JSON.parse(localStorage.getItem(key));
            return data !== null ? data : fallback;
        } catch (e) {
            return fallback;
        }
    }

    function saveJSON(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.warn('Erreur localStorage:', e);
        }
    }

    function findById(arr, id) {
        for (var i = 0; i < arr.length; i++) {
            if (arr[i].id === id) return arr[i];
        }
        return null;
    }

    function removeById(arr, id) {
        var result = [];
        for (var i = 0; i < arr.length; i++) {
            if (arr[i].id !== id) result.push(arr[i]);
        }
        return result;
    }

    function escapeHTML(str) {
        if (str === null || str === undefined || str === '') return '';
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(String(str)));
        return div.innerHTML;
    }

    function nowDateStr() { return new Date().toLocaleDateString('fr-FR'); }
    function nowTimestamp() { return Date.now(); }

    function getSeriesKey(name) { return name.trim().toLowerCase(); }

    function stampUpdate(item) {
        if (item) item.updatedAt = nowTimestamp();
        return item;
    }

    // ============================================================
    //  SAUVEGARDE
    // ============================================================
    function saveBooks() { saveJSON('myBookPile', books); triggerAutoSync(); }
    function saveWishlist() { saveJSON('myBookWishlist', wishlist); triggerAutoSync(); }
    function saveExternal() { saveJSON('myBookExternal', external); triggerAutoSync(); }
    function saveSagasMeta() { saveJSON('myBookSagasMeta', sagasMeta); triggerAutoSync(); }
    function saveSettings() { saveJSON('myBookPileSettings', settings); }
    function saveDeleted() { saveJSON('myBookDeleted', deletedItems); }

    // ============================================================
    //  INITIALISATION
    // ============================================================
    document.addEventListener('DOMContentLoaded', function () {
        applySettings();
        createParticles();
        renderAll();
        bindEvents();
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
    //  BINDING D'ÉVÉNEMENTS
    // ============================================================
    function bindEvents() {
        // Navigation
        delegateClick('.main-nav', '.nav-btn', function (btn) {
            var tab = btn.getAttribute('data-tab');
            if (tab) switchTab(tab, btn);
        });

        // Filtres
        delegateClick(document.body, '.filter-btn[data-filter]', function (btn) {
            var filter = btn.getAttribute('data-filter');
            var target = btn.getAttribute('data-target');
            switch (target) {
                case 'home':     filterBooks(filter, btn); break;
                case 'external': filterExt(filter, btn); break;
                case 'sagas':    filterSagas(filter, btn); break;
                case 'wishlist': filterWishlist(filter, btn); break;
            }
        });

        // Thèmes & polices
        delegateClick(document.body, '.theme-card[data-theme-btn]', function (btn) {
            setTheme(btn.getAttribute('data-theme-btn'));
        });
        delegateClick(document.body, '.font-card[data-font-btn]', function (btn) {
            setFont(btn.getAttribute('data-font-btn'));
        });

        // Étoiles modales
        delegateClick($('starsInput'), '.star-btn', function (btn) {
            var r = parseInt(btn.getAttribute('data-rating'));
            if (r) { state.selectedRating = r; updateStarsDisplay(); }
        });
        delegateClick($('starsExtInput'), '.star-btn', function (btn) {
            var r = parseInt(btn.getAttribute('data-rating'));
            if (r) { state.selectedExtRating = r; updateExtStarsDisplay(); }
        });

        // Auth tabs
        delegateClick(document.body, '.auth-tab[data-auth-tab]', function (btn) {
            showAuthTab(btn.getAttribute('data-auth-tab'), btn);
        });

        // Formulaires
        bindForm('addBookForm', addBook);
        bindForm('addExtForm', addExternal);
        bindForm('addWishlistForm', addWishlistItem);

        // Boutons par ID
        bindClick('randomBtn', pickRandomBook);
        bindClick('confirmRatingBtn', confirmRating);
        bindClick('confirmExtRatingBtn', confirmExtRating);
        bindClick('confirmTransferBtn', confirmTransfer);
        bindClick('confirmEditSagaBtn', confirmEditSaga);
        bindClick('confirmEditBookBtn', confirmEditBook);
        bindClick('confirmEditWishBtn', confirmEditWish);
        bindClick('confirmEditExtBtn', confirmEditExt);

        // Fermeture modales
        bindClick('closeRatingModal', function () { closeModal('ratingModal'); });
        bindClick('closeRatingExtModal', function () { closeModal('ratingExtModal'); });
        bindClick('closeTransferModal', function () { closeModal('transferModal'); });
        bindClick('closeEditSagaModal', function () { closeModal('editSagaModal'); state.editSagaKey = null; });
        bindClick('closeEditBookModal', function () { closeModal('editBookModal'); state.editBookId = null; });
        bindClick('closeEditWishModal', function () { closeModal('editWishModal'); state.editWishId = null; });
        bindClick('closeEditExtModal', function () { closeModal('editExtModal'); state.editExtId = null; });

        // 📷 SCANNER CODE-BARRES
        bindClick('btnScanBarcode', function () { openScanner('book'); });
        bindClick('btnScanBarcodeExt', function () { openScanner('ext'); });
        bindClick('btnScanBarcodeWish', function () { openScanner('wish'); });
        bindClick('closeScanModal', closeScanner);
        bindClick('btnCancelScan', closeScanner);
        bindClick('btnManualISBN', askManualISBN);

        // Fermeture par clic overlay
        var overlays = document.querySelectorAll('.modal-overlay');
        for (var i = 0; i < overlays.length; i++) {
            overlays[i].addEventListener('click', function (e) {
                if (e.target === this) {
                    this.classList.remove('active');
                    // Si c'est le scan, on l'arrête aussi
                    if (this.id === 'scanModal') stopScanner();
                }
            });
        }

        // Fermeture par Escape
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                var modals = document.querySelectorAll('.modal-overlay.active');
                for (var i = 0; i < modals.length; i++) {
                    modals[i].classList.remove('active');
                    if (modals[i].id === 'scanModal') stopScanner();
                }
            }
        });

        // Paramètres
        bindClick('btnExport', exportData);
        bindClick('btnImportTrigger', function () { var f = $('importFile'); if (f) f.click(); });
        bindClick('btnClearAll', clearAllData);
        var importFile = $('importFile');
        if (importFile) importFile.addEventListener('change', importData);

        // Toggles
        bindChange('toggleParticles', toggleParticlesF);
        bindChange('toggleAnimations', toggleAnimationsF);

        // Tri & recherche
        bindChange('bookSortSelect', renderBooks);
        bindChange('extSortSelect', renderExternal);
        bindChange('authorSortSelect', renderAuthors);
        bindInput('searchInput', renderBooks);
        bindInput('extSearchInput', renderExternal);
        bindInput('sagaSearchInput', renderSagas);
        bindInput('authorSearchInput', renderAuthors);
        bindInput('wishSearchInput', renderWishlist);

        // Dates lecture
        bindChange('bookDateStart', function () { calcReadingDays('book'); });
        bindChange('bookDateEnd', function () { calcReadingDays('book'); });
        bindChange('extDateStart', function () { calcReadingDays('ext'); });
        bindChange('extDateEnd', function () { calcReadingDays('ext'); });

        // Suggestions séries
        bindInput('bookSeries', updateSeriesSuggestions);

        // Firebase
        bindClick('btnLogin', firebaseLogin);
        bindClick('btnRegister', firebaseRegister);
        bindClick('btnSync', function () { firebaseSync(false); });
        bindClick('btnPullData', function () { firebasePullData(false); });
        bindClick('btnLogout', firebaseLogout);

        // Actions dynamiques
        delegateClick(document.body, '[data-action]', handleDynamicAction);

        // Sync au retour de visibilité
        document.addEventListener('visibilitychange', function () {
            if (!document.hidden && state.currentUser) {
                firebaseSync(true);
            }
        });
    }

    function bindClick(id, fn) { var el = $(id); if (el) el.addEventListener('click', fn); }
    function bindChange(id, fn) { var el = $(id); if (el) el.addEventListener('change', fn); }
    function bindInput(id, fn) { var el = $(id); if (el) el.addEventListener('input', fn); }
    function bindForm(id, fn) { var el = $(id); if (el) el.addEventListener('submit', fn); }

    function delegateClick(parent, selector, fn) {
        if (typeof parent === 'string') parent = document.querySelector(parent);
        if (!parent) return;
        parent.addEventListener('click', function (e) {
            var target = e.target.closest(selector);
            if (target && parent.contains(target)) fn(target, e);
        });
    }

    // ============================================================
    //  ACTIONS DYNAMIQUES
    // ============================================================
    function handleDynamicAction(btn) {
        var action = btn.getAttribute('data-action');
        var id = parseInt(btn.getAttribute('data-id'));
        var value = btn.getAttribute('data-value');

        switch (action) {
            case 'markRead':     markAsRead(id); break;
            case 'markUnread':   markAsUnread(id); break;
            case 'deleteBook':   deleteBook(id); break;
            case 'rateBook':     openRatingModal(id); break;
            case 'editBook':     openEditBookModal(id); break;
            case 'deleteExt':    deleteExternal(id); break;
            case 'rateExt':      openRatingExtModal(id); break;
            case 'editExt':      openEditExtModal(id); break;
            case 'toggleExtBuy': toggleExtWantBuy(id); break;
            case 'deleteWish':   deleteWishlistItem(id); break;
            case 'markBought':   markAsBought(id); break;
            case 'markUnbought': markAsUnbought(id); break;
            case 'transferWish': openTransferModal(id); break;
            case 'editWish':     openEditWishModal(id); break;
            case 'editSaga':     openEditSagaModal(value); break;
            case 'toggleAuthor': toggleAuthorBooks(value, btn); break;
        }
    }

    // ============================================================
    //  📷 SCANNER DE CODE-BARRES
    // ============================================================
    function openScanner(target) {
        if (typeof Quagga === 'undefined') {
            showToast('❌ Bibliothèque de scan non chargée. Vérifie ta connexion.');
            return;
        }

        // Vérifier le support caméra
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showToast('❌ Ton navigateur ne supporte pas la caméra');
            return;
        }

        state.scannerTarget = target || 'book';
        state.lastDetectedCode = null;
        state.detectionCount = {};

        openModal('scanModal');
        setTimeout(startScanner, 400);
    }

    function closeScanner() {
        stopScanner();
        closeModal('scanModal');
    }

    function startScanner() {
        var container = $('scannerContainer');
        if (!container) return;

        var hint = $('scannerHint');
        if (hint) {
            hint.textContent = '📷 Ouverture de la caméra...';
            hint.className = 'scanner-hint';
        }

        Quagga.init({
            inputStream: {
                name: 'Live',
                type: 'LiveStream',
                target: container,
                constraints: {
                    facingMode: 'environment',
                    width: { min: 640, ideal: 1280 },
                    height: { min: 480, ideal: 720 }
                }
            },
            locator: {
                patchSize: 'medium',
                halfSample: true
            },
            numOfWorkers: navigator.hardwareConcurrency ? Math.min(navigator.hardwareConcurrency, 4) : 2,
            decoder: {
                readers: ['ean_reader', 'ean_8_reader']
            },
            locate: true
        }, function (err) {
            if (err) {
                console.error('Scanner init error:', err);
                if (hint) {
                    hint.textContent = '❌ Impossible d\'accéder à la caméra. Vérifie les permissions.';
                    hint.className = 'scanner-hint error';
                }
                showToast('❌ Erreur caméra : vérifie les permissions');
                return;
            }
            Quagga.start();
            state.scannerActive = true;
            if (hint) {
                hint.textContent = '🔍 Recherche du code-barres...';
                hint.className = 'scanner-hint';
            }
        });

        Quagga.onDetected(handleBarcodeDetected);
    }

    function stopScanner() {
        if (state.scannerActive && typeof Quagga !== 'undefined') {
            try {
                Quagga.offDetected(handleBarcodeDetected);
                Quagga.stop();
            } catch (e) {
                console.warn('Scanner stop error:', e);
            }
            state.scannerActive = false;
        }
    }

    function handleBarcodeDetected(result) {
        if (!result || !result.codeResult) return;
        var code = result.codeResult.code;

        // Compter les détections pour fiabilité
        state.detectionCount[code] = (state.detectionCount[code] || 0) + 1;

        if (state.detectionCount[code] < SCANNER_MIN_DETECTIONS) return;
        if (code === state.lastDetectedCode) return;

        state.lastDetectedCode = code;
        state.detectionCount = {};

        var hint = $('scannerHint');
        if (hint) {
            hint.textContent = '✅ Code détecté : ' + code + ' — Recherche...';
            hint.className = 'scanner-hint success';
        }

        // Vibration mobile
        if (navigator.vibrate) {
            try { navigator.vibrate(200); } catch (e) {}
        }

        fetchBookByISBN(code);
    }

    function askManualISBN() {
        var isbn = prompt('📖 Entre l\'ISBN du livre (10 ou 13 chiffres) :');
        if (!isbn || !isbn.trim()) return;

        var cleaned = isbn.replace(/[-\s]/g, '');
        if (!/^\d{10}$|^\d{13}$/.test(cleaned)) {
            showToast('⚠️ ISBN invalide (10 ou 13 chiffres attendus)');
            return;
        }

        var hint = $('scannerHint');
        if (hint) {
            hint.textContent = '🔍 Recherche...';
            hint.className = 'scanner-hint';
        }
        fetchBookByISBN(cleaned);
    }

    // ============================================================
    //  RÉCUPÉRATION INFOS LIVRE VIA API
    // ============================================================
    function fetchBookByISBN(isbn) {
        // Essayer Google Books en premier
        fetch('https://www.googleapis.com/books/v1/volumes?q=isbn:' + isbn)
            .then(function (res) { return res.json(); })
            .then(function (data) {
                if (data.totalItems > 0 && data.items && data.items[0].volumeInfo) {
                    var info = data.items[0].volumeInfo;
                    fillScannedBook({
                        title: info.title || '',
                        author: (info.authors && info.authors.join(', ')) || '',
                        genre: guessGenre(info.categories),
                        isbn: isbn
                    });
                    showToast('✅ Livre trouvé !');
                    closeScanner();
                } else {
                    // Fallback vers Open Library
                    fetchFromOpenLibrary(isbn);
                }
            })
            .catch(function (err) {
                console.error('Google Books error:', err);
                fetchFromOpenLibrary(isbn);
            });
    }

    function fetchFromOpenLibrary(isbn) {
        fetch('https://openlibrary.org/api/books?bibkeys=ISBN:' + isbn + '&format=json&jscmd=data')
            .then(function (res) { return res.json(); })
            .then(function (data) {
                var key = 'ISBN:' + isbn;
                if (data[key]) {
                    var book = data[key];
                    var authors = book.authors
                        ? book.authors.map(function (a) { return a.name; }).join(', ')
                        : '';
                    fillScannedBook({
                        title: book.title || '',
                        author: authors,
                        genre: 'Roman',
                        isbn: isbn
                    });
                    showToast('✅ Livre trouvé (Open Library) !');
                    closeScanner();
                } else {
                    var hint = $('scannerHint');
                    if (hint) {
                        hint.textContent = '❌ Livre introuvable — Saisie manuelle';
                        hint.className = 'scanner-hint error';
                    }
                    showToast('⚠️ Livre non trouvé — Saisis manuellement');
                    setTimeout(function () {
                        closeScanner();
                        var titleInput = getTargetInput('title');
                        if (titleInput) titleInput.focus();
                    }, 1500);
                }
            })
            .catch(function (err) {
                console.error('Open Library error:', err);
                showToast('❌ Erreur de connexion');
            });
    }

    function guessGenre(categories) {
        if (!categories || !categories.length) return 'Roman';
        var cat = categories[0].toLowerCase();

        if (cat.indexOf('fantasy') !== -1) return 'Fantasy';
        if (cat.indexOf('science') !== -1 && cat.indexOf('fiction') !== -1) return 'SF';
        if (cat.indexOf('thriller') !== -1) return 'Thriller';
        if (cat.indexOf('mystery') !== -1 || cat.indexOf('detective') !== -1) return 'Policier';
        if (cat.indexOf('romance') !== -1) return 'Romance';
        if (cat.indexOf('young adult') !== -1) return 'Young Adult';
        if (cat.indexOf('juvenile') !== -1) return 'Jeunesse';
        if (cat.indexOf('biography') !== -1) return 'Biographie';
        if (cat.indexOf('philosophy') !== -1) return 'Philosophie';
        if (cat.indexOf('history') !== -1) return 'Histoire';
        if (cat.indexOf('poetry') !== -1) return 'Poésie';
        if (cat.indexOf('comic') !== -1 || cat.indexOf('graphic novel') !== -1) return 'BD';
        if (cat.indexOf('horror') !== -1) return 'Fantastique';
        if (cat.indexOf('self-help') !== -1) return 'Dev perso';

        return 'Roman';
    }

    // Remplit le formulaire selon la cible (book, ext, wish)
    function getTargetInput(field) {
        var prefix = state.scannerTarget === 'ext' ? 'ext'
                   : state.scannerTarget === 'wish' ? 'wish'
                   : 'book';
        var capitalize = field.charAt(0).toUpperCase() + field.slice(1);
        return $(prefix + capitalize);
    }

    function fillScannedBook(data) {
        var prefix = state.scannerTarget === 'ext' ? 'ext'
                   : state.scannerTarget === 'wish' ? 'wish'
                   : 'book';

        setFormVal(prefix + 'Title', data.title);
        setFormVal(prefix + 'Author', data.author);
        if (data.genre) setFormVal(prefix + 'Genre', data.genre);

        // Scroll vers le formulaire
        var formId = prefix === 'book' ? 'addBookForm'
                   : prefix === 'ext'  ? 'addExtForm'
                   : 'addWishlistForm';
        var form = $(formId);
        if (form) form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // ============================================================
    //  PARAMÈTRES & THÈMES
    // ============================================================
    function applySettings() {
        document.documentElement.setAttribute('data-theme', settings.theme);
        document.documentElement.style.setProperty('--main-font', settings.font || 'Poppins');
        updateActiveThemeCard();
        updateActiveFontCard();

        var tp = $('toggleParticles');
        var ta = $('toggleAnimations');
        if (tp) tp.checked = settings.particles;
        if (ta) ta.checked = settings.animations;

        var p = $('particles');
        if (p) p.classList.toggle('hidden', !settings.particles);
        document.body.classList.toggle('no-animations', !settings.animations);
    }

    function switchTab(tab, btn) {
        var pages = document.querySelectorAll('.page');
        var btns = document.querySelectorAll('.nav-btn');
        for (var i = 0; i < pages.length; i++) pages[i].classList.remove('active');
        for (var j = 0; j < btns.length; j++) btns[j].classList.remove('active');

        var target = $('page-' + tab);
        if (target) target.classList.add('active');
        if (btn) btn.classList.add('active');

        switch (tab) {
            case 'authors':  renderAuthors(); break;
            case 'sagas':    renderSagas(); break;
            case 'external': renderExternal(); break;
            case 'wishlist': renderWishlist(); break;
        }
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
        var el = $('toggleParticles');
        if (!el) return;
        settings.particles = el.checked;
        var p = $('particles');
        if (p) p.classList.toggle('hidden', !settings.particles);
        saveSettings();
    }

    function toggleAnimationsF() {
        var el = $('toggleAnimations');
        if (!el) return;
        settings.animations = el.checked;
        document.body.classList.toggle('no-animations', !settings.animations);
        saveSettings();
    }

    function exportData() {
        var data = {
            books: books, wishlist: wishlist, external: external,
            sagasMeta: sagasMeta, settings: settings, deletedItems: deletedItems
        };
        var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'ma-pile-a-livres.json';
        a.click();
        URL.revokeObjectURL(a.href);
        showToast('📤 Données exportées !');
    }

    function importData(event) {
        var file = event.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (e) {
            try {
                var data = JSON.parse(e.target.result);
                if (data.books && Array.isArray(data.books)) { books = data.books; saveJSON('myBookPile', books); }
                if (data.wishlist && Array.isArray(data.wishlist)) { wishlist = data.wishlist; saveJSON('myBookWishlist', wishlist); }
                if (data.external && Array.isArray(data.external)) { external = data.external; saveJSON('myBookExternal', external); }
                if (data.sagasMeta && typeof data.sagasMeta === 'object') { sagasMeta = data.sagasMeta; saveJSON('myBookSagasMeta', sagasMeta); }
                if (data.deletedItems && typeof data.deletedItems === 'object') { deletedItems = data.deletedItems; saveDeleted(); }
                if (data.settings && typeof data.settings === 'object') {
                    settings = Object.assign({}, settings, data.settings);
                    saveSettings();
                    applySettings();
                }
                renderAll();
                triggerAutoSync();
                showToast('📥 Importé !');
            } catch (err) {
                showToast('❌ Fichier invalide !');
                console.error('Import error:', err);
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    function clearAllData() {
        if (!confirm('⚠️ Tout supprimer localement ? Le cloud restera intact tant que tu ne synchronises pas.')) return;
        books = []; wishlist = []; external = []; sagasMeta = {};
        deletedItems = { books: [], wishlist: [], external: [] };
        saveJSON('myBookPile', []);
        saveJSON('myBookWishlist', []);
        saveJSON('myBookExternal', []);
        saveJSON('myBookSagasMeta', {});
        saveDeleted();
        renderAll();
        showToast('🗑️ Tout supprimé localement.');
    }

    // ============================================================
    //  UTILITAIRES DATE
    // ============================================================
    function calcReadingDays(type) {
        var prefix = type === 'ext' ? 'ext' : 'book';
        var startEl = $(prefix + 'DateStart');
        var endEl = $(prefix + 'DateEnd');
        var displayEl = $(prefix + 'ReadingDays');
        if (!startEl || !endEl || !displayEl) return;

        if (!startEl.value || !endEl.value) {
            displayEl.classList.remove('active');
            return;
        }

        var days = Math.floor((new Date(endEl.value) - new Date(startEl.value)) / MS_PER_DAY);
        displayEl.classList.add('active');
        displayEl.classList.remove('warning');

        if (days < 0) {
            displayEl.textContent = '⚠️ La date de fin doit être après le début !';
            displayEl.classList.add('warning');
        } else {
            var total = days + 1;
            displayEl.textContent = total === 1 ? '⚡ Lu en 1 jour !' : '📖 Lu en ' + total + ' jours';
        }
    }

    function getReadingDaysText(startDate, endDate) {
        if (!startDate || !endDate) return null;
        var days = Math.floor((new Date(endDate) - new Date(startDate)) / MS_PER_DAY);
        return days >= 0 ? days + 1 : null;
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        var d = new Date(dateStr);
        return String(d.getDate()).padStart(2, '0') + '/' +
               String(d.getMonth() + 1).padStart(2, '0') + '/' +
               d.getFullYear();
    }

    // ============================================================
    //  PARTICULES
    // ============================================================
    function createParticles() {
        var c = $('particles');
        if (!c) return;
        var frag = document.createDocumentFragment();
        for (var i = 0; i < 50; i++) {
            var p = document.createElement('div');
            p.className = 'particle';
            var s = Math.random() * 6 + 2;
            p.style.cssText = 'width:' + s + 'px;height:' + s + 'px;left:' +
                (Math.random() * 100) + '%;animation-duration:' +
                (Math.random() * 15 + 10) + 's;animation-delay:' +
                (Math.random() * 10) + 's';
            frag.appendChild(p);
        }
        c.appendChild(frag);
    }

    // ============================================================
    //  GESTION DES SÉRIES
    // ============================================================
    function getAllSeries() {
        var seriesMap = {};
        for (var i = 0; i < books.length; i++) {
            var b = books[i];
            if (!b.series || !b.series.trim()) continue;

            var key = getSeriesKey(b.series);
            if (!seriesMap[key]) {
                seriesMap[key] = {
                    key: key, name: b.series.trim(), author: b.author,
                    genre: b.genre, books: []
                };
            }
            seriesMap[key].books.push(b);
        }

        var keys = Object.keys(seriesMap);
        for (var k = 0; k < keys.length; k++) {
            var s = seriesMap[keys[k]];
            var meta = sagasMeta[keys[k]] || {};

            s.books.sort(function (a, b) { return (a.tome || 999) - (b.tome || 999); });

            var readCount = 0;
            for (var j = 0; j < s.books.length; j++) {
                if (s.books[j].status === 'read') readCount++;
            }

            s.totalTomes = meta.totalTomes || s.books.length;
            s.readCount = readCount;
            s.ownedCount = s.books.length;
            s.progress = s.totalTomes > 0 ? Math.round((readCount / s.totalTomes) * 100) : 0;
            s.isCompleted = readCount >= s.totalTomes && s.totalTomes > 0;
            s.isStarted = readCount > 0;
        }
        return seriesMap;
    }

    function getExternalSeries() {
        var map = {};
        for (var i = 0; i < external.length; i++) {
            var e = external[i];
            if (!e.series || !e.series.trim()) continue;

            var key = getSeriesKey(e.series);
            if (!map[key]) {
                map[key] = {
                    key: key, name: e.series.trim(), author: e.author,
                    genre: e.genre, books: [], isExternal: true
                };
            }
            map[key].books.push(e);
        }

        var keys = Object.keys(map);
        for (var k = 0; k < keys.length; k++) {
            var s = map[keys[k]];
            s.books.sort(function (a, b) { return (a.tome || 999) - (b.tome || 999); });

            var maxTotal = 0;
            for (var eb = 0; eb < s.books.length; eb++) {
                if (s.books[eb].totalTomes && s.books[eb].totalTomes > maxTotal) {
                    maxTotal = s.books[eb].totalTomes;
                }
            }
            s.totalTomes = maxTotal || s.books.length;
            s.readCount = s.books.length;
            s.ownedCount = s.books.length;
            s.progress = s.totalTomes > 0 ? Math.round((s.readCount / s.totalTomes) * 100) : 0;
            s.isCompleted = s.readCount >= s.totalTomes && s.totalTomes > 0;
            s.isStarted = true;
        }
        return map;
    }

    function updateSeriesSuggestions() {
        var datalist = $('seriesSuggestions');
        if (!datalist) return;

        var allSeries = getAllSeries();
        var names = collectSeriesNames(allSeries);
        datalist.innerHTML = buildDatalistOptions(names);

        var input = $('bookSeries');
        if (input && input.value.trim()) {
            var meta = sagasMeta[getSeriesKey(input.value)];
            if (meta && meta.totalTomes) {
                var totInput = $('bookTotalTomes');
                if (totInput && !totInput.value) totInput.value = meta.totalTomes;
            }
        }
    }

    function updateWishSeriesSuggestions() {
        var datalist = $('wishSeriesSuggestions');
        if (!datalist) return;

        var allSeries = getAllSeries();
        var names = collectSeriesNames(allSeries);
        for (var j = 0; j < wishlist.length; j++) {
            if (wishlist[j].series && names.indexOf(wishlist[j].series) === -1) {
                names.push(wishlist[j].series);
            }
        }
        datalist.innerHTML = buildDatalistOptions(names);
    }

    function collectSeriesNames(seriesMap) {
        var names = [];
        var keys = Object.keys(seriesMap);
        for (var i = 0; i < keys.length; i++) {
            var n = seriesMap[keys[i]].name;
            if (names.indexOf(n) === -1) names.push(n);
        }
        return names;
    }

    function buildDatalistOptions(names) {
        var html = '';
        for (var i = 0; i < names.length; i++) {
            html += '<option value="' + escapeHTML(names[i]) + '">';
        }
        return html;
    }

    // ============================================================
    //  HTML HELPERS
    // ============================================================
    function getFormatHtml(format) {
        if (!format) return '';
        var icon = FORMAT_ICONS[format] || '📕';
        var cls = format.toLowerCase().replace(/[éè]/g, 'e').replace(/\s/g, '-');
        return '<span class="format-tag format-' + cls + '">' + icon + ' ' + escapeHTML(format) + '</span>';
    }

    function buildReadingHtml(item) {
        var readDays = getReadingDaysText(item.dateStart, item.dateEnd);
        if (!readDays) return '';
        var html = '<span class="reading-info">📖 Lu en ' + readDays + ' jour' + (readDays > 1 ? 's' : '') + '</span>';
        if (item.dateStart && item.dateEnd) {
            html += '<p class="reading-dates">📅 Du ' + formatDate(item.dateStart) + ' au ' + formatDate(item.dateEnd) + '</p>';
        }
        return html;
    }

    function buildStarsHtml(rating) {
        if (!rating || rating <= 0) return '';
        return '<div class="stars">' + '★'.repeat(rating) + '☆'.repeat(5 - rating) + '</div>';
    }

    function buildReviewHtml(review) {
        if (!review) return '';
        return '<div class="review">"' + escapeHTML(review) + '"</div>';
    }

    function buildTomeHtml(tome, totalTomes) {
        if (!tome) return '';
        var text = 'Tome ' + tome + (totalTomes ? '/' + totalTomes : '');
        return '<span class="tome-tag">' + text + '</span>';
    }

    // ============================================================
    //  MODALES HELPERS
    // ============================================================
    function openModal(id) { var m = $(id); if (m) m.classList.add('active'); }
    function closeModal(id) { var m = $(id); if (m) m.classList.remove('active'); }

     // ============================================================
    //  BIBLIOTHÈQUE — AJOUT
    // ============================================================
    function addBook(e) {
        e.preventDefault();
        var title = getVal('bookTitle');
        var author = getVal('bookAuthor');
        if (!title || !author) { showToast('⚠️ Titre et auteur requis !'); return; }

        var series = getVal('bookSeries');
        var totalTomes = parseInt(getRawVal('bookTotalTomes')) || null;

        books.push({
            id: nowTimestamp(), title: title, author: author,
            genre: getRawVal('bookGenre'), format: getRawVal('bookFormat'),
            series: series || null, tome: parseInt(getRawVal('bookTome')) || null,
            status: 'toRead', rating: 0, review: '',
            dateAdded: nowDateStr(), dateRead: null,
            dateStart: null, dateEnd: null,
            updatedAt: nowTimestamp()
        });

        if (series) {
            var key = getSeriesKey(series);
            if (!sagasMeta[key]) sagasMeta[key] = {};
            if (totalTomes && totalTomes > 0) sagasMeta[key].totalTomes = totalTomes;
            saveSagasMeta();
        }

        saveBooks();
        renderAll();
        var form = $('addBookForm');
        if (form) form.reset();
        showToast('📥 "' + title + '" ajouté !');
    }

    // ============================================================
    //  BIBLIOTHÈQUE — RENDU
    // ============================================================
    function renderBooks() {
        var container = $('booksList');
        if (!container) return;

        var query = getVal('searchInput').toLowerCase();
        var sortBy = getRawVal('bookSortSelect') || 'default';
        var filter = state.currentFilter;

        var filtered = books.filter(function (b) {
            var matchFilter = filter === 'all'
                || (filter === 'toRead' && b.status === 'toRead')
                || (filter === 'read' && b.status === 'read')
                || (filter === 'oneShot' && (!b.series || !b.series.trim()))
                || (filter === 'series' && b.series && b.series.trim());

            var matchSearch = !query
                || b.title.toLowerCase().indexOf(query) !== -1
                || b.author.toLowerCase().indexOf(query) !== -1
                || (b.genre && b.genre.toLowerCase().indexOf(query) !== -1)
                || (b.series && b.series.toLowerCase().indexOf(query) !== -1)
                || (b.format && b.format.toLowerCase().indexOf(query) !== -1);

            return matchFilter && matchSearch;
        });

        filtered.sort(function (a, b) {
            switch (sortBy) {
                case 'title':     return a.title.localeCompare(b.title);
                case 'author':    return a.author.localeCompare(b.author);
                case 'rating':    return b.rating - a.rating;
                case 'series':
                    var sA = a.series || '\uffff', sB = b.series || '\uffff';
                    if (sA !== sB) return sA.localeCompare(sB);
                    return (a.tome || 999) - (b.tome || 999);
                case 'dateAdded': return b.id - a.id;
                default:
                    if (a.status !== b.status) return a.status === 'toRead' ? -1 : 1;
                    return b.rating - a.rating;
            }
        });

        if (!filtered.length) {
            container.innerHTML = '<div class="empty-state"><span class="emoji">📭</span><p>Aucun livre trouvé.</p></div>';
            return;
        }

        var parts = [];
        for (var j = 0; j < filtered.length; j++) {
            var bk = filtered[j];
            var sc = bk.status === 'read' ? 'read' : 'to-read';
            var sl = bk.status === 'read' ? '✅ Lu' : '📖 À lire';
            var sagaH = bk.series ? '<span class="saga-tag">📖 ' + escapeHTML(bk.series) + '</span>' : '';
            var readingH = bk.status === 'read' ? buildReadingHtml(bk) : '';

            parts.push(
                '<div class="book-card ' + sc + '">' +
                '<button class="delete-icon" data-action="deleteBook" data-id="' + bk.id + '" type="button" aria-label="Supprimer">🗑</button>' +
                '<h3>' + escapeHTML(bk.title) + '</h3>' +
                '<p class="author">par ' + escapeHTML(bk.author) + '</p>' +
                '<span class="genre-tag">' + escapeHTML(bk.genre || 'Roman') + '</span>' +
                '<span class="status-badge ' + sc + '">' + sl + '</span>' +
                getFormatHtml(bk.format) + buildTomeHtml(bk.tome) + sagaH + readingH +
                buildStarsHtml(bk.rating) + buildReviewHtml(bk.review) +
                '<div class="actions">' +
                (bk.status === 'toRead'
                    ? '<button data-action="markRead" data-id="' + bk.id + '" class="btn-mark-read" type="button">✅ Lu</button>'
                    : '<button data-action="markUnread" data-id="' + bk.id + '" class="btn-unread" type="button">📖 À lire</button>') +
                (bk.status === 'read'
                    ? '<button data-action="rateBook" data-id="' + bk.id + '" class="btn-rate" type="button">⭐ ' + (bk.rating > 0 ? 'Modifier note' : 'Noter') + '</button>'
                    : '') +
                '<button data-action="editBook" data-id="' + bk.id + '" class="btn-edit" type="button">✏️ Modifier</button>' +
                '</div></div>'
            );
        }
        container.innerHTML = parts.join('');
    }

    function filterBooks(f, btn) {
        state.currentFilter = f;
        setActiveFilter('#page-home', btn);
        renderBooks();
    }

    function setActiveFilter(pageSelector, activeBtn) {
        var btns = document.querySelectorAll(pageSelector + ' .filter-btn');
        for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');
        if (activeBtn) activeBtn.classList.add('active');
    }

    function markAsRead(id) {
        var b = findById(books, id);
        if (!b) return;
        b.status = 'read';
        b.dateRead = nowDateStr();
        stampUpdate(b);
        saveBooks();
        renderAll();
        showToast('✅ Lu !');
        setTimeout(function () { openRatingModal(id); }, 400);
    }

    function markAsUnread(id) {
        var b = findById(books, id);
        if (!b) return;
        b.status = 'toRead';
        b.rating = 0;
        b.review = '';
        b.dateRead = null;
        b.dateStart = null;
        b.dateEnd = null;
        stampUpdate(b);
        saveBooks();
        renderAll();
        showToast('📖 Remis à lire !');
    }

    function deleteBook(id) {
        var book = findById(books, id);
        if (!book || !confirm('Supprimer "' + book.title + '" ?')) return;

        books = removeById(books, id);
        deletedItems.books.push({ id: id, deletedAt: nowTimestamp() });
        saveDeleted();

        if (book.series) {
            var key = getSeriesKey(book.series);
            var hasOthers = books.some(function (b) {
                return b.series && getSeriesKey(b.series) === key;
            });
            if (!hasOthers) delete sagasMeta[key];
            saveSagasMeta();
        }

        saveBooks();
        renderAll();
        showToast('🗑 Supprimé.');
    }

    // ============================================================
    //  MODALE NOTATION (BIBLIO)
    // ============================================================
    function openRatingModal(id) {
        state.ratingBookId = id;
        state.selectedRating = 0;
        var b = findById(books, id);
        if (!b) return;

        setText('modalBookTitle', b.title);
        setFormVal('bookReview', b.review || '');
        setFormVal('bookDateStart', b.dateStart || '');
        setFormVal('bookDateEnd', b.dateEnd || '');

        if (b.rating > 0) state.selectedRating = b.rating;
        updateStarsDisplay();
        calcReadingDays('book');
        openModal('ratingModal');
    }

    function updateStarsDisplay() {
        var stars = document.querySelectorAll('#starsInput .star-btn');
        for (var i = 0; i < stars.length; i++) {
            stars[i].classList.toggle('active', i < state.selectedRating);
        }
    }

    function confirmRating() {
        if (!state.selectedRating) { showToast('⚠️ Sélectionne au moins 1 étoile !'); return; }
        var b = findById(books, state.ratingBookId);
        if (!b) return;

        b.rating = state.selectedRating;
        b.review = getVal('bookReview');
        b.dateStart = getRawVal('bookDateStart') || null;
        b.dateEnd = getRawVal('bookDateEnd') || null;
        stampUpdate(b);

        saveBooks();
        renderAll();
        showToast('⭐ Noté ' + state.selectedRating + '/5 !');
        closeModal('ratingModal');
    }

    // ============================================================
    //  RANDOM BOOK
    // ============================================================
    function pickRandomBook() {
        var gf = getRawVal('randomGenreFilter');
        var cands = books.filter(function (b) {
            return b.status === 'toRead' && (gf === 'all' || b.genre === gf);
        });

        var rd = $('randomResult');
        var btn = $('randomBtn');
        if (!rd || !btn) return;

        if (!cands.length) {
            rd.innerHTML = '<div class="random-card"><h3>😅 Aucun livre à lire !</h3></div>';
            return;
        }

        btn.disabled = true;
        btn.textContent = '🎰 Sélection...';
        var spins = 0;

        var iv = setInterval(function () {
            var r = cands[Math.floor(Math.random() * cands.length)];
            rd.innerHTML = '<div class="random-card spinning"><h3>' + escapeHTML(r.title) + '</h3><p class="author">par ' + escapeHTML(r.author) + '</p></div>';
            spins++;

            if (spins >= 15) {
                clearInterval(iv);
                var ch = cands[Math.floor(Math.random() * cands.length)];
                rd.innerHTML =
                    '<div class="random-card">' +
                    '<h3>🎉 ' + escapeHTML(ch.title) + '</h3>' +
                    '<p class="author">par ' + escapeHTML(ch.author) + '</p>' +
                    '<span class="genre-tag">' + escapeHTML(ch.genre) + '</span>' +
                    (ch.series ? '<br><span class="saga-tag">📖 ' + escapeHTML(ch.series) + (ch.tome ? ' - T' + ch.tome : '') + '</span>' : '') +
                    '</div>';
                btn.disabled = false;
                btn.textContent = '🎰 Choisir au hasard';
                showToast('🎲 "' + ch.title + '" choisi !');
            }
        }, 100);
    }

    function updateRandomGenreFilter() {
        var s = $('randomGenreFilter');
        if (!s) return;
        var genres = [];
        for (var i = 0; i < books.length; i++) {
            if (books[i].status === 'toRead' && genres.indexOf(books[i].genre) === -1) {
                genres.push(books[i].genre);
            }
        }
        var html = '<option value="all">Tous</option>';
        for (var j = 0; j < genres.length; j++) {
            html += '<option value="' + escapeHTML(genres[j]) + '">' + escapeHTML(genres[j]) + '</option>';
        }
        s.innerHTML = html;
    }

    // ============================================================
    //  LIVRES EXTERNES
    // ============================================================
    function addExternal(e) {
        e.preventDefault();
        var title = getVal('extTitle');
        var author = getVal('extAuthor');
        if (!title || !author) { showToast('⚠️ Titre et auteur requis !'); return; }

        var series = getVal('extSeries');
        var wtb = $('extWantToBuy');
        var wantToBuy = wtb ? wtb.checked : false;

        var extId = nowTimestamp();
        external.push({
            id: extId, title: title, author: author,
            genre: getRawVal('extGenre'), source: getRawVal('extSource'),
            series: series || null,
            tome: parseInt(getRawVal('extTome')) || null,
            totalTomes: parseInt(getRawVal('extTotalTomes')) || null,
            status: getRawVal('extStatus'),
            notes: getVal('extNotes'),
            wantToBuy: wantToBuy, rating: 0, review: '',
            dateAdded: nowDateStr(), dateStart: null, dateEnd: null,
            updatedAt: nowTimestamp()
        });

        if (wantToBuy) {
            addToWishlistFromExternal(extId, title, author, getRawVal('extGenre'), series, parseInt(getRawVal('extTome')) || null, getVal('extNotes'));
        }

        saveExternal();
        renderAll();
        var form = $('addExtForm');
        if (form) form.reset();
        showToast(wantToBuy ? '📖 "' + title + '" ajouté + 🛒 wishlist !' : '📖 "' + title + '" ajouté !');
    }

    function addToWishlistFromExternal(extId, title, author, genre, series, tome, notes) {
        var exists = wishlist.some(function (w) {
            return w.title.toLowerCase() === title.toLowerCase() &&
                   w.author.toLowerCase() === author.toLowerCase();
        });
        if (exists) return;

        wishlist.push({
            id: nowTimestamp() + 1, title: title, author: author, genre: genre,
            format: 'Broché', price: 0, priority: 2,
            notes: notes ? ('Vient de "empruntés" : ' + notes) : 'Vient de "empruntés"',
            series: series || null, tome: tome, totalTomes: null,
            status: 'toBuy', dateAdded: nowDateStr(), dateBought: null,
            fromExternal: extId,
            updatedAt: nowTimestamp()
        });
        saveWishlist();
    }

    function renderExternal() {
        var container = $('externalList');
        if (!container) return;

        var query = getVal('extSearchInput').toLowerCase();
        var sortBy = getRawVal('extSortSelect') || 'default';
        var filter = state.extFilter;

        var filtered = external.filter(function (e) {
            var matchFilter = filter === 'all'
                || (filter === 'returned' && e.status === 'returned')
                || (filter === 'given' && e.status === 'given')
                || (filter === 'kept' && e.status === 'kept')
                || (filter === 'wantToBuy' && e.wantToBuy);

            var matchSearch = !query
                || e.title.toLowerCase().indexOf(query) !== -1
                || e.author.toLowerCase().indexOf(query) !== -1
                || (e.genre && e.genre.toLowerCase().indexOf(query) !== -1)
                || (e.series && e.series.toLowerCase().indexOf(query) !== -1)
                || (e.source && e.source.toLowerCase().indexOf(query) !== -1);

            return matchFilter && matchSearch;
        });

        filtered.sort(function (a, b) {
            switch (sortBy) {
                case 'title':     return a.title.localeCompare(b.title);
                case 'author':    return a.author.localeCompare(b.author);
                case 'rating':    return b.rating - a.rating;
                case 'source':    return (a.source || '').localeCompare(b.source || '');
                case 'dateAdded': return b.id - a.id;
                default:
                    var order = { 'returned': 0, 'given': 1, 'kept': 2 };
                    return (order[a.status] || 99) - (order[b.status] || 99);
            }
        });

        updateExtStats();

        if (!filtered.length) {
            container.innerHTML = '<div class="empty-state"><span class="emoji">📖</span><p>Aucun livre externe.</p></div>';
            return;
        }

        var parts = [];
        for (var j = 0; j < filtered.length; j++) {
            var it = filtered[j];
            var sc = EXT_STATUS_CLASSES[it.status] || 'ext-returned';
            var sourceIcon = SOURCE_ICONS[it.source] || '📚';

            parts.push(
                '<div class="book-card ' + sc + '">' +
                '<button class="delete-icon" data-action="deleteExt" data-id="' + it.id + '" type="button" aria-label="Supprimer">🗑</button>' +
                '<h3>' + escapeHTML(it.title) + '</h3>' +
                '<p class="author">par ' + escapeHTML(it.author) + '</p>' +
                '<div class="wish-tags">' +
                '<span class="genre-tag">' + escapeHTML(it.genre) + '</span>' +
                '<span class="status-badge ' + sc + '">' + (EXT_STATUS_LABELS[it.status] || '📖') + '</span>' +
                (it.source ? '<span class="source-tag">' + sourceIcon + ' ' + escapeHTML(it.source) + '</span>' : '') +
                buildTomeHtml(it.tome, it.totalTomes) +
                (it.series ? '<span class="saga-tag">📖 ' + escapeHTML(it.series) + '</span>' : '') +
                (it.wantToBuy ? '<span class="want-buy-badge">🛒 À acheter</span>' : '') +
                '</div>' +
                buildReadingHtml(it) + buildStarsHtml(it.rating) + buildReviewHtml(it.review) +
                (it.notes ? '<p class="wish-notes">📝 ' + escapeHTML(it.notes) + '</p>' : '') +
                '<div class="actions">' +
                '<button data-action="rateExt" data-id="' + it.id + '" class="btn-rate" type="button">⭐ ' + (it.rating > 0 ? 'Modifier note' : 'Noter') + '</button>' +
                '<button data-action="toggleExtBuy" data-id="' + it.id + '" class="btn-want-buy" type="button">' + (it.wantToBuy ? '❌ Retirer wishlist' : '🛒 Ajouter wishlist') + '</button>' +
                '<button data-action="editExt" data-id="' + it.id + '" class="btn-edit" type="button">✏️ Modifier</button>' +
                '</div></div>'
            );
        }
        container.innerHTML = parts.join('');
    }

    function updateExtStats() {
        var ratedSum = 0, ratedCount = 0, toBuyCount = 0;
        var returnedCount = 0, givenCount = 0, keptCount = 0, tomesCount = 0;
        var extSeriesSet = {};

        for (var i = 0; i < external.length; i++) {
            var e = external[i];
            if (e.status === 'returned') returnedCount++;
            else if (e.status === 'given') givenCount++;
            else if (e.status === 'kept') keptCount++;
            if (e.rating > 0) { ratedSum += e.rating; ratedCount++; }
            if (e.wantToBuy) toBuyCount++;
            if (e.series && e.series.trim()) {
                extSeriesSet[e.series.trim().toLowerCase()] = true;
                if (e.tome) tomesCount++;
            }
        }

        setText('extTotal', external.length);
        setText('extToBuy', toBuyCount);
        setText('extAvgRating', ratedCount > 0 ? (ratedSum / ratedCount).toFixed(1) : '-');
        setText('extReturned', returnedCount);
        setText('extGiven', givenCount);
        setText('extKept', keptCount);
        setText('extSagasCount', Object.keys(extSeriesSet).length);
        setText('extTomesCount', tomesCount);
    }

    function filterExt(f, btn) {
        state.extFilter = f;
        setActiveFilter('#page-external', btn);
        renderExternal();
    }

    function toggleExtWantBuy(id) {
        var item = findById(external, id);
        if (!item) return;

        item.wantToBuy = !item.wantToBuy;
        stampUpdate(item);

        if (item.wantToBuy) {
            addToWishlistFromExternal(item.id, item.title, item.author, item.genre, item.series, item.tome, item.notes);
            showToast('🛒 Ajouté à la wishlist !');
        } else {
            var toRemove = wishlist.filter(function (w) { return w.fromExternal === id; });
            for (var i = 0; i < toRemove.length; i++) {
                deletedItems.wishlist.push({ id: toRemove[i].id, deletedAt: nowTimestamp() });
            }
            wishlist = wishlist.filter(function (w) { return w.fromExternal !== id; });
            saveDeleted();
            saveWishlist();
            showToast('❌ Retiré de la wishlist !');
        }

        saveExternal();
        renderAll();
    }

    function deleteExternal(id) {
        var item = findById(external, id);
        if (!item || !confirm('Supprimer "' + item.title + '" ?')) return;

        external = removeById(external, id);
        deletedItems.external.push({ id: id, deletedAt: nowTimestamp() });

        var relatedWish = wishlist.filter(function (w) { return w.fromExternal === id; });
        wishlist = wishlist.filter(function (w) { return w.fromExternal !== id; });
        for (var i = 0; i < relatedWish.length; i++) {
            deletedItems.wishlist.push({ id: relatedWish[i].id, deletedAt: nowTimestamp() });
        }
        saveDeleted();

        saveExternal();
        saveWishlist();
        renderAll();
        showToast('🗑 Supprimé.');
    }

    // ============================================================
    //  MODALE NOTATION (EXTERNE)
    // ============================================================
    function openRatingExtModal(id) {
        state.ratingExtBookId = id;
        state.selectedExtRating = 0;
        var b = findById(external, id);
        if (!b) return;

        setText('modalExtBookTitle', b.title);
        setFormVal('extBookReview', b.review || '');
        setFormVal('extDateStart', b.dateStart || '');
        setFormVal('extDateEnd', b.dateEnd || '');

        if (b.rating > 0) state.selectedExtRating = b.rating;
        updateExtStarsDisplay();
        calcReadingDays('ext');
        openModal('ratingExtModal');
    }

    function updateExtStarsDisplay() {
        var stars = document.querySelectorAll('#starsExtInput .star-btn');
        for (var i = 0; i < stars.length; i++) {
            stars[i].classList.toggle('active', i < state.selectedExtRating);
        }
    }

    function confirmExtRating() {
        if (!state.selectedExtRating) { showToast('⚠️ Sélectionne au moins 1 étoile !'); return; }
        var b = findById(external, state.ratingExtBookId);
        if (!b) return;

        b.rating = state.selectedExtRating;
        b.review = getVal('extBookReview');
        b.dateStart = getRawVal('extDateStart') || null;
        b.dateEnd = getRawVal('extDateEnd') || null;
        stampUpdate(b);

        saveExternal();
        renderAll();
        showToast('⭐ Noté ' + state.selectedExtRating + '/5 !');
        closeModal('ratingExtModal');
    }

    // ============================================================
    //  SAGAS
    // ============================================================
    function renderSagas() {
        var container = $('sagasList');
        if (!container) return;

        var query = getVal('sagaSearchInput').toLowerCase();
        var allSeries = getAllSeries();
        var extSeries = getExternalSeries();

        var seriesList = filterSagasByQuery(allSeries, query);
        var extSagasList = filterSagasByQuery(extSeries, query);

        updateSagasStats(allSeries, extSagasList);

        var displayList;
        switch (state.sagaFilter) {
            case 'external':   displayList = extSagasList; break;
            case 'completed':  displayList = seriesList.filter(function (s) { return s.isCompleted; }); break;
            case 'inProgress': displayList = seriesList.filter(function (s) { return s.isStarted && !s.isCompleted; }); break;
            case 'notStarted': displayList = seriesList.filter(function (s) { return !s.isStarted; }); break;
            default:           displayList = seriesList;
        }

        if (!displayList.length) {
            container.innerHTML = '<div class="empty-state"><span class="emoji">📚</span><p>Aucune saga trouvée.</p></div>';
            return;
        }

        displayList.sort(function (a, b) {
            if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
            return b.progress - a.progress;
        });

        var parts = [];
        for (var si = 0; si < displayList.length; si++) {
            parts.push(buildSagaCard(displayList[si]));
        }
        container.innerHTML = parts.join('');
    }

    function filterSagasByQuery(seriesMap, query) {
        var list = [];
        var keys = Object.keys(seriesMap);
        for (var i = 0; i < keys.length; i++) {
            var s = seriesMap[keys[i]];
            if (!query || s.name.toLowerCase().indexOf(query) !== -1 || s.author.toLowerCase().indexOf(query) !== -1) {
                list.push(s);
            }
        }
        return list;
    }

    function updateSagasStats(allSeries, extSagasList) {
        var allValues = Object.values(allSeries);
        var completedCount = 0, inProgressCount = 0, totalTomes = 0;

        for (var t = 0; t < allValues.length; t++) {
            if (allValues[t].isCompleted) completedCount++;
            else if (allValues[t].isStarted) inProgressCount++;
            totalTomes += allValues[t].ownedCount;
        }

        var extTomesCount = 0;
        for (var etc = 0; etc < extSagasList.length; etc++) {
            extTomesCount += extSagasList[etc].books.length;
        }

        setText('sagasTotalStat', allValues.length);
        setText('sagasCompletedStat', completedCount);
        setText('sagasInProgressStat', inProgressCount);
        setText('sagasTotalTomes', totalTomes);
        setText('sagasCount', allValues.length);
        setText('sagasExtStat', extSagasList.length);
        setText('sagasExtTomes', extTomesCount);
    }

    function buildSagaCard(sg) {
        var tomesHtml = '';
        for (var ti = 0; ti < sg.books.length; ti++) {
            var bk = sg.books[ti];
            var isRead = sg.isExternal ? true : (bk.status === 'read');
            tomesHtml +=
                '<div class="tome-item">' +
                '<span class="tome-title">' + (bk.tome ? 'T' + bk.tome + ' — ' : '') + escapeHTML(bk.title) + '</span>' +
                (bk.rating > 0 ? '<span class="tome-rating">' + '★'.repeat(bk.rating) + '</span>' : '') +
                '<span class="tome-status ' + (isRead ? 'read-tome' : 'unread-tome') + '">' + (isRead ? '✅' : '📖') + '</span>' +
                '</div>';
        }

        var ownedNums = [];
        for (var oi = 0; oi < sg.books.length; oi++) {
            if (sg.books[oi].tome) ownedNums.push(sg.books[oi].tome);
        }

        var missingTomes = [];
        if (sg.totalTomes > 0) {
            for (var mi = 1; mi <= sg.totalTomes; mi++) {
                if (ownedNums.indexOf(mi) === -1) missingTomes.push(mi);
            }
        }

        var missingHtml = '';
        if (missingTomes.length > 0) {
            var missingItems = '';
            for (var mj = 0; mj < missingTomes.length; mj++) {
                missingItems += '<div class="tome-item missing-tome"><span class="tome-title missing-title">T' + missingTomes[mj] + ' — ???</span><span class="tome-status missing-status">❌ Manquant</span></div>';
            }
            missingHtml =
                '<div class="missing-section">' +
                '<div class="missing-header"><span class="missing-icon">⚠️</span><span class="missing-label">' +
                missingTomes.length + ' tome' + (missingTomes.length > 1 ? 's' : '') + ' manquant' + (missingTomes.length > 1 ? 's' : '') +
                '</span></div><div class="missing-list">' + missingItems + '</div></div>';
        }

        var compIcon = '';
        if (sg.isExternal) compIcon = '<span class="saga-ext-badge">📖 Saga empruntée</span>';
        else if (sg.isCompleted) compIcon = '<span class="saga-complete-badge">🎉 Terminée !</span>';
        else if (missingTomes.length === 0 && sg.ownedCount >= sg.totalTomes) compIcon = '<span class="saga-all-owned-badge">📚 Tous possédés</span>';

        var ratedBooks = sg.books.filter(function (b) { return b.rating > 0; });
        var avg = ratedBooks.length > 0
            ? (ratedBooks.reduce(function (sum, b) { return sum + b.rating; }, 0) / ratedBooks.length).toFixed(1)
            : null;
        var missingCount = sg.totalTomes - sg.ownedCount;

        var infoLabel = sg.isExternal ? 'lus' : 'possédés';
        var readLabel = sg.isExternal ? '' : '<span>✅ ' + sg.readCount + ' lus</span>';
        var tomeLabel = sg.isExternal ? 'lus' : 'possédés';

        return '<div class="saga-card ' + (sg.isCompleted ? 'saga-completed' : '') + ' ' + (missingTomes.length > 0 ? 'saga-has-missing' : '') + ' ' + (sg.isExternal ? 'saga-external' : '') + '">' +
            '<h3>📖 ' + escapeHTML(sg.name) + '</h3>' +
            '<p class="saga-author">par ' + escapeHTML(sg.author) + '</p>' +
            '<span class="genre-tag">' + escapeHTML(sg.genre) + '</span>' + compIcon +
            '<div class="saga-info">' +
            '<span>📚 ' + sg.ownedCount + '/' + sg.totalTomes + ' ' + infoLabel + '</span>' +
            readLabel +
            (missingCount > 0 ? '<span class="missing-count-tag">❌ ' + missingCount + ' manquants</span>' : '') +
            (avg ? '<span>⭐ ' + avg + '/5</span>' : '') +
            '</div>' +
            '<p class="progress-text">' + sg.progress + '% ' + (sg.isExternal ? 'lus' : 'lu') + ' ' + (sg.isCompleted ? '🎉' : '') + '</p>' +
            '<div class="progress-bar"><div class="progress-fill" style="width:' + Math.min(sg.progress, 100) + '%"></div></div>' +
            '<div class="tomes-list"><p class="tomes-section-title">📗 Tomes ' + tomeLabel + ' (' + sg.ownedCount + ')</p>' + tomesHtml + '</div>' +
            missingHtml +
            (sg.isExternal ? '' : '<div class="actions"><button data-action="editSaga" data-value="' + sg.key + '" class="btn-edit-saga" type="button">✏️ Modifier tomes prévus</button></div>') +
            '</div>';
    }

    function filterSagas(f, btn) {
        state.sagaFilter = f;
        setActiveFilter('#page-sagas', btn);
        renderSagas();
    }

    function openEditSagaModal(key) {
        state.editSagaKey = key;
        var s = getAllSeries()[key];
        if (!s) return;
        setText('editSagaTitle', s.name);
        setFormVal('editSagaTotalTomes', s.totalTomes);
        openModal('editSagaModal');
    }

    function confirmEditSaga() {
        var val = parseInt(getRawVal('editSagaTotalTomes'));
        if (!val || val < 1) { showToast('⚠️ Nombre invalide !'); return; }
        if (!sagasMeta[state.editSagaKey]) sagasMeta[state.editSagaKey] = {};
        sagasMeta[state.editSagaKey].totalTomes = val;
        sagasMeta[state.editSagaKey].updatedAt = nowTimestamp();
        saveSagasMeta();
        renderAll();
        showToast('✏️ Mise à jour !');
        closeModal('editSagaModal');
        state.editSagaKey = null;
    }

    // ============================================================
    //  AUTEURS
    // ============================================================
    function renderAuthors() {
        var container = $('authorsList');
        if (!container) return;

        var query = getVal('authorSearchInput').toLowerCase();
        var sortBy = getRawVal('authorSortSelect') || 'count';
        var allSeries = getAllSeries();

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

        var authors = [];
        var aKeys = Object.keys(authorMap);
        for (var j = 0; j < aKeys.length; j++) {
            var a = authorMap[aKeys[j]];
            if (query && a.name.toLowerCase().indexOf(query) === -1) continue;

            var totalBooks = a.books.length + a.extBooks.length;
            var readB = 0, ratingSum = 0, ratedCount = 0;

            for (var k = 0; k < a.books.length; k++) {
                if (a.books[k].status === 'read') readB++;
                if (a.books[k].rating > 0) { ratingSum += a.books[k].rating; ratedCount++; }
            }
            for (var k2 = 0; k2 < a.extBooks.length; k2++) {
                readB++;
                if (a.extBooks[k2].rating > 0) { ratingSum += a.extBooks[k2].rating; ratedCount++; }
            }

            var aSeries = [];
            var sKeys = Object.keys(allSeries);
            for (var s = 0; s < sKeys.length; s++) {
                if (allSeries[sKeys[s]].author.trim() === a.name) aSeries.push(allSeries[sKeys[s]]);
            }

            authors.push({
                name: a.name, books: a.books, extBooks: a.extBooks, totalBooks: totalBooks,
                readBooks: readB,
                avgRating: ratedCount > 0 ? ratingSum / ratedCount : 0,
                authorSeries: aSeries
            });
        }

        authors.sort(function (a, b) {
            switch (sortBy) {
                case 'name':   return a.name.localeCompare(b.name);
                case 'rating': return b.avgRating - a.avgRating;
                case 'read':   return b.readBooks - a.readBooks;
                default:       return b.totalBooks - a.totalBooks;
            }
        });

        setText('authorsTotal', authors.length);
        if (authors.length > 0) {
            var sorted = authors.slice().sort(function (a, b) { return b.totalBooks - a.totalBooks; });
            var topName = sorted[0].name;
            setText('authorTopName', topName.length > 15 ? topName.substring(0, 15) + '…' : topName);
            setText('authorTopCount', sorted[0].totalBooks);
        } else {
            setText('authorTopName', '-');
            setText('authorTopCount', '0');
        }

        if (!authors.length) {
            container.innerHTML = '<div class="empty-state"><span class="emoji">✍️</span><p>Aucun auteur trouvé.</p></div>';
            return;
        }

        var parts = [];
        for (var ai = 0; ai < authors.length; ai++) {
            parts.push(buildAuthorCard(authors[ai], ai));
        }
        container.innerHTML = parts.join('');
    }

    function buildAuthorCard(au, index) {
        var allBooksList = [];
        for (var b1 = 0; b1 < au.books.length; b1++) allBooksList.push({ book: au.books[b1], isExternal: false });
        for (var b2 = 0; b2 < au.extBooks.length; b2++) allBooksList.push({ book: au.extBooks[b2], isExternal: true });
        allBooksList.sort(function (x, y) { return x.book.title.localeCompare(y.book.title); });

        var booksHtml = '';
        for (var bi = 0; bi < allBooksList.length; bi++) {
            var bkObj = allBooksList[bi];
            var bk = bkObj.book;
            var statusCls = bkObj.isExternal ? 'ab-ext' : (bk.status === 'read' ? 'ab-read' : 'ab-toread');
            var statusIcon = bkObj.isExternal ? '📖' : (bk.status === 'read' ? '✅' : '📖');
            var extLabel = bkObj.isExternal ? ' (externe)' : '';

            booksHtml +=
                '<div class="author-book-item">' +
                '<span class="ab-title">' + escapeHTML(bk.title) +
                (bk.tome ? ' (T' + bk.tome + ')' : '') +
                (bk.series ? ' — ' + escapeHTML(bk.series) : '') + extLabel +
                '</span>' +
                '<span class="ab-status ' + statusCls + '">' + statusIcon + '</span>' +
                (bk.rating > 0 ? '<span class="ab-rating">' + '★'.repeat(bk.rating) + '</span>' : '') +
                '</div>';
        }

        var seriesHtml = '';
        if (au.authorSeries.length > 0) {
            var seriesParts = [];
            for (var si = 0; si < au.authorSeries.length; si++) {
                seriesParts.push(escapeHTML(au.authorSeries[si].name) + ' (' + au.authorSeries[si].readCount + '/' + au.authorSeries[si].totalTomes + ')');
            }
            seriesHtml = '<p class="author-series">📖 Sagas : ' + seriesParts.join(', ') + '</p>';
        }

        var uid = 'au_' + index + '_' + Math.random().toString(36).substr(2, 6);

        return '<div class="author-card">' +
            '<h3>✍️ ' + escapeHTML(au.name) + '</h3>' +
            '<div class="author-stats">' +
            '<div class="author-stat"><span class="author-stat-num">' + au.totalBooks + '</span><span class="author-stat-label">Livres</span></div>' +
            '<div class="author-stat"><span class="author-stat-num">' + au.readBooks + '</span><span class="author-stat-label">Lus</span></div>' +
            '<div class="author-stat"><span class="author-stat-num">' + (au.avgRating > 0 ? au.avgRating.toFixed(1) + '⭐' : '-') + '</span><span class="author-stat-label">Note</span></div>' +
            '<div class="author-stat"><span class="author-stat-num">' + au.authorSeries.length + '</span><span class="author-stat-label">Sagas</span></div>' +
            '</div>' + seriesHtml +
            (au.totalBooks > 0
                ? '<button data-action="toggleAuthor" data-value="' + uid + '" class="toggle-books-btn" type="button">📚 Voir les ' + au.totalBooks + ' livres</button>' +
                  '<div class="author-books-container" id="' + uid + '">' + booksHtml + '</div>'
                : '') +
            '</div>';
    }

    function toggleAuthorBooks(uid, btn) {
        var c = $(uid);
        if (!c) return;
        var exp = c.classList.toggle('expanded');
        btn.textContent = exp ? '📚 Masquer' : '📚 Voir les livres';
    }

    // ============================================================
    //  WISHLIST
    // ============================================================
    function addWishlistItem(e) {
        e.preventDefault();
        var title = getVal('wishTitle');
        var author = getVal('wishAuthor');
        if (!title || !author) { showToast('⚠️ Titre et auteur requis !'); return; }

        wishlist.push({
            id: nowTimestamp(), title: title, author: author,
            genre: getRawVal('wishGenre'), format: getRawVal('wishFormat'),
            price: parseFloat(getRawVal('wishPrice')) || 0,
            priority: parseInt(getRawVal('wishPriority')) || 2,
            notes: getVal('wishNotes'),
            series: getVal('wishSeries') || null,
            tome: parseInt(getRawVal('wishTome')) || null,
            totalTomes: parseInt(getRawVal('wishTotalTomes')) || null,
            status: 'toBuy', dateAdded: nowDateStr(), dateBought: null,
            updatedAt: nowTimestamp()
        });

        saveWishlist();
        renderWishlist();
        updateStats();
        updateWishSeriesSuggestions();
        var form = $('addWishlistForm');
        if (form) form.reset();
        showToast('🛒 "' + title + '" ajouté !');
    }

    function renderWishlist() {
        var container = $('wishlistList');
        if (!container) return;

        var query = getVal('wishSearchInput').toLowerCase();
        var filter = state.wishlistFilter;

        var filtered = wishlist.filter(function (it) {
            var matchFilter = filter === 'all'
                || (filter === 'toBuy' && it.status === 'toBuy')
                || (filter === 'bought' && it.status === 'bought');

            var matchSearch = !query
                || it.title.toLowerCase().indexOf(query) !== -1
                || it.author.toLowerCase().indexOf(query) !== -1
                || (it.genre && it.genre.toLowerCase().indexOf(query) !== -1)
                || (it.series && it.series.toLowerCase().indexOf(query) !== -1)
                || (it.format && it.format.toLowerCase().indexOf(query) !== -1);

            return matchFilter && matchSearch;
        });

        filtered.sort(function (a, b) {
            if (a.status !== b.status) return a.status === 'toBuy' ? -1 : 1;
            return b.priority - a.priority;
        });

        if (!filtered.length) {
            container.innerHTML = '<div class="empty-state"><span class="emoji">🛒</span><p>Aucun livre dans la wishlist.</p></div>';
            return;
        }

        var parts = [];
        for (var j = 0; j < filtered.length; j++) {
            var it = filtered[j];
            var sc = it.status === 'bought' ? 'wish-bought' : 'wish-to-buy';
            var sl = it.status === 'bought' ? '✅ Acheté' : '📋 À acheter';

            parts.push(
                '<div class="book-card ' + sc + '">' +
                '<button class="delete-icon" data-action="deleteWish" data-id="' + it.id + '" type="button" aria-label="Supprimer">🗑</button>' +
                '<h3>' + escapeHTML(it.title) + '</h3>' +
                '<p class="author">par ' + escapeHTML(it.author) + '</p>' +
                '<div class="wish-tags">' +
                '<span class="genre-tag">' + escapeHTML(it.genre || 'Roman') + '</span>' +
                '<span class="status-badge ' + sc + '">' + sl + '</span>' +
                getFormatHtml(it.format) +
                (it.price > 0 ? '<span class="price-tag">' + it.price.toFixed(2) + ' €</span>' : '') +
                '<span class="priority-tag ' + (PRIORITY_CLASSES[it.priority] || 'medium') + '">' + (PRIORITY_LABELS[it.priority] || '🟡 Moyenne') + '</span>' +
                buildTomeHtml(it.tome, it.totalTomes) +
                (it.series ? '<span class="saga-tag">📖 ' + escapeHTML(it.series) + '</span>' : '') +
                '</div>' +
                (it.notes ? '<p class="wish-notes">📝 ' + escapeHTML(it.notes) + '</p>' : '') +
                '<div class="actions">' +
                (it.status === 'toBuy'
                    ? '<button data-action="markBought" data-id="' + it.id + '" class="btn-bought" type="button">✅ Acheté</button>'
                    : '<button data-action="markUnbought" data-id="' + it.id + '" class="btn-unbuy" type="button">🛒 Remettre</button>') +
                '<button data-action="transferWish" data-id="' + it.id + '" class="btn-transfer" type="button">📚 → Biblio</button>' +
                '<button data-action="editWish" data-id="' + it.id + '" class="btn-edit" type="button">✏️ Modifier</button>' +
                '</div></div>'
            );
        }
        container.innerHTML = parts.join('');
    }

    function filterWishlist(f, btn) {
        state.wishlistFilter = f;
        setActiveFilter('#page-wishlist', btn);
        renderWishlist();
    }

    function markAsBought(id) {
        var it = findById(wishlist, id);
        if (!it) return;
        it.status = 'bought';
        it.dateBought = nowDateStr();
        stampUpdate(it);
        saveWishlist();
        renderWishlist();
        updateStats();
        showToast('✅ Acheté !');
    }

    function markAsUnbought(id) {
        var it = findById(wishlist, id);
        if (!it) return;
        it.status = 'toBuy';
        it.dateBought = null;
        stampUpdate(it);
        saveWishlist();
        renderWishlist();
        updateStats();
        showToast('🛒 Remis !');
    }

    function deleteWishlistItem(id) {
        var item = findById(wishlist, id);
        if (!item || !confirm('Supprimer "' + item.title + '" ?')) return;

        if (item.fromExternal) {
            var ext = findById(external, item.fromExternal);
            if (ext) { ext.wantToBuy = false; stampUpdate(ext); saveExternal(); }
        }

        wishlist = removeById(wishlist, id);
        deletedItems.wishlist.push({ id: id, deletedAt: nowTimestamp() });
        saveDeleted();

        saveWishlist();
        renderAll();
        showToast('🗑 Supprimé.');
    }

    // ============================================================
    //  MODALE TRANSFERT
    // ============================================================
    function openTransferModal(id) {
        state.transferBookId = id;
        var item = findById(wishlist, id);
        if (!item) return;
        setText('transferBookTitle', item.title + ' — ' + item.author);
        var cb = $('removeFromWishlist');
        if (cb) cb.checked = true;
        openModal('transferModal');
    }

    function confirmTransfer() {
        var item = findById(wishlist, state.transferBookId);
        if (!item) return;

        var exists = books.some(function (b) {
            return b.title.toLowerCase() === item.title.toLowerCase() &&
                   b.author.toLowerCase() === item.author.toLowerCase();
        });
        if (exists) {
            showToast('⚠️ Déjà dans la biblio !');
            closeModal('transferModal');
            return;
        }

        books.push({
            id: nowTimestamp(), title: item.title, author: item.author,
            genre: item.genre || 'Roman', format: item.format || 'Broché',
            series: item.series || null, tome: item.tome || null,
            status: 'toRead', rating: 0, review: '',
            dateAdded: nowDateStr(), dateRead: null,
            dateStart: null, dateEnd: null,
            updatedAt: nowTimestamp()
        });

        if (item.series) {
            var key = getSeriesKey(item.series);
            if (!sagasMeta[key]) sagasMeta[key] = {};
            if (item.totalTomes) sagasMeta[key].totalTomes = item.totalTomes;
            saveSagasMeta();
        }

        var cb = $('removeFromWishlist');
        if (cb && cb.checked) {
            wishlist = removeById(wishlist, state.transferBookId);
            deletedItems.wishlist.push({ id: state.transferBookId, deletedAt: nowTimestamp() });
            saveDeleted();
        } else {
            item.status = 'bought';
            item.dateBought = nowDateStr();
            stampUpdate(item);
        }

        saveBooks();
        saveWishlist();
        renderAll();
        showToast('📚 Transféré !');
        closeModal('transferModal');
    }

    // ============================================================
    //  STATS GLOBALES
    // ============================================================
    function updateStats() {
        var toRead = 0, read = 0, rSum = 0, rCount = 0, oneShot = 0, broche = 0, poche = 0;

        for (var i = 0; i < books.length; i++) {
            var b = books[i];
            if (b.status === 'toRead') toRead++;
            else if (b.status === 'read') read++;
            if (b.rating > 0) { rSum += b.rating; rCount++; }
            if (!b.series || !b.series.trim()) oneShot++;
            if (b.format === 'Broché') broche++;
            else if (b.format === 'Poche') poche++;
        }

        var extReadCount = external.length;
        for (var e = 0; e < external.length; e++) {
            if (external[e].rating > 0) { rSum += external[e].rating; rCount++; }
        }

        setText('totalBooks', books.length);
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
            var w = wishlist[j];
            if (w.status === 'toBuy') { wToBuy++; budget += w.price || 0; }
            else if (w.status === 'bought') { wBought++; spent += w.price || 0; }
        }

        setText('wishlistCount', wToBuy);
        setText('wishlistTotal', wToBuy);
        setText('wishlistBought', wBought);
        setText('wishlistBudget', budget.toFixed(2) + ' €');
        setText('wishlistSpent', spent.toFixed(2) + ' €');
    }

    // ============================================================
    //  ÉDITION LIVRE BIBLIOTHÈQUE
    // ============================================================
    function openEditBookModal(id) {
        state.editBookId = id;
        var b = findById(books, id);
        if (!b) return;

        setFormVal('editBookTitle', b.title);
        setFormVal('editBookAuthor', b.author);
        setFormVal('editBookGenre', b.genre || 'Roman');
        setFormVal('editBookFormat', b.format || 'Broché');
        setFormVal('editBookSeries', b.series || '');
        setFormVal('editBookTome', b.tome || '');

        openModal('editBookModal');
    }

    function confirmEditBook() {
        var b = findById(books, state.editBookId);
        if (!b) return;

        var title = getVal('editBookTitle');
        var author = getVal('editBookAuthor');
        if (!title || !author) { showToast('⚠️ Titre et auteur requis !'); return; }

        var oldSeries = b.series;
        b.title = title;
        b.author = author;
        b.genre = getRawVal('editBookGenre');
        b.format = getRawVal('editBookFormat');
        var newSeries = getVal('editBookSeries');
        b.series = newSeries || null;
        b.tome = parseInt(getRawVal('editBookTome')) || null;
        stampUpdate(b);

        if (oldSeries && oldSeries !== newSeries) {
            var oldKey = getSeriesKey(oldSeries);
            var hasOthers = books.some(function (x) {
                return x.series && getSeriesKey(x.series) === oldKey && x.id !== b.id;
            });
            if (!hasOthers) delete sagasMeta[oldKey];
        }

        if (newSeries) {
            var newKey = getSeriesKey(newSeries);
            if (!sagasMeta[newKey]) sagasMeta[newKey] = {};
        }

        saveBooks();
        saveSagasMeta();
        renderAll();
        showToast('✅ "' + title + '" modifié !');
        closeModal('editBookModal');
        state.editBookId = null;
    }

    // ============================================================
    //  ÉDITION WISHLIST
    // ============================================================
    function openEditWishModal(id) {
        state.editWishId = id;
        var it = findById(wishlist, id);
        if (!it) return;

        setFormVal('editWishTitle', it.title);
        setFormVal('editWishAuthor', it.author);
        setFormVal('editWishGenre', it.genre || 'Roman');
        setFormVal('editWishFormat', it.format || 'Broché');
        setFormVal('editWishPriority', it.priority || 2);
        setFormVal('editWishSeries', it.series || '');
        setFormVal('editWishTome', it.tome || '');
        setFormVal('editWishTotalTomes', it.totalTomes || '');
        setFormVal('editWishPrice', it.price || '');
        setFormVal('editWishNotes', it.notes || '');

        openModal('editWishModal');
    }

    function confirmEditWish() {
        var it = findById(wishlist, state.editWishId);
        if (!it) return;

        var title = getVal('editWishTitle');
        var author = getVal('editWishAuthor');
        if (!title || !author) { showToast('⚠️ Titre et auteur requis !'); return; }

        it.title = title;
        it.author = author;
        it.genre = getRawVal('editWishGenre');
        it.format = getRawVal('editWishFormat');
        it.priority = parseInt(getRawVal('editWishPriority')) || 2;
        it.series = getVal('editWishSeries') || null;
        it.tome = parseInt(getRawVal('editWishTome')) || null;
        it.totalTomes = parseInt(getRawVal('editWishTotalTomes')) || null;
        it.price = parseFloat(getRawVal('editWishPrice')) || 0;
        it.notes = getVal('editWishNotes');
        stampUpdate(it);

        saveWishlist();
        renderAll();
        showToast('✅ "' + title + '" modifié !');
        closeModal('editWishModal');
        state.editWishId = null;
    }

    // ============================================================
    //  ÉDITION EXTERNE
    // ============================================================
    function openEditExtModal(id) {
        state.editExtId = id;
        var it = findById(external, id);
        if (!it) return;

        setFormVal('editExtTitle', it.title);
        setFormVal('editExtAuthor', it.author);
        setFormVal('editExtGenre', it.genre || 'Roman');
        setFormVal('editExtSource', it.source || 'Bibliothèque');
        setFormVal('editExtStatus', it.status || 'returned');
        setFormVal('editExtSeries', it.series || '');
        setFormVal('editExtTome', it.tome || '');
        setFormVal('editExtTotalTomes', it.totalTomes || '');
        setFormVal('editExtNotes', it.notes || '');

        openModal('editExtModal');
    }

    function confirmEditExt() {
        var it = findById(external, state.editExtId);
        if (!it) return;

        var title = getVal('editExtTitle');
        var author = getVal('editExtAuthor');
        if (!title || !author) { showToast('⚠️ Titre et auteur requis !'); return; }

        it.title = title;
        it.author = author;
        it.genre = getRawVal('editExtGenre');
        it.source = getRawVal('editExtSource');
        it.status = getRawVal('editExtStatus');
        it.series = getVal('editExtSeries') || null;
        it.tome = parseInt(getRawVal('editExtTome')) || null;
        it.totalTomes = parseInt(getRawVal('editExtTotalTomes')) || null;
        it.notes = getVal('editExtNotes');
        stampUpdate(it);

        saveExternal();
        renderAll();
        showToast('✅ "' + title + '" modifié !');
        closeModal('editExtModal');
        state.editExtId = null;
    }

    // ============================================================
    //  TOAST
    // ============================================================
    function showToast(msg) {
        var ex = document.querySelector('.toast');
        if (ex) ex.remove();
        var t = document.createElement('div');
        t.className = 'toast';
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(function () { if (t.parentNode) t.remove(); }, 3000);
    }

    // ============================================================
    //  FIREBASE — INITIALISATION & AUTH
    // ============================================================
    document.addEventListener('firebaseReady', function () {
        var auth = window.firebaseAuth;
        if (!auth || !window.firebaseOnAuthChanged) return;
        window.firebaseOnAuthChanged(auth, function (user) {
            if (user) {
                state.currentUser = user;
                showLoggedUI(user);
                firebasePullData(true);
                startPeriodicSync();
            } else {
                state.currentUser = null;
                showNotLoggedUI();
                stopPeriodicSync();
            }
        });
    });

    function showAuthTab(tab, btn) {
        var tabs = document.querySelectorAll('.auth-tab');
        var forms = document.querySelectorAll('.auth-form');
        for (var i = 0; i < tabs.length; i++) {
            tabs[i].classList.remove('active');
            tabs[i].setAttribute('aria-selected', 'false');
        }
        for (var j = 0; j < forms.length; j++) forms[j].classList.remove('active');
        if (btn) {
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
        }
        var f = $(tab + 'Form');
        if (f) f.classList.add('active');
    }

    function showLoggedUI(user) {
        var nl = $('authNotLogged');
        var l = $('authLogged');
        if (nl) nl.style.display = 'none';
        if (l) l.style.display = 'block';
        setText('userEmail', user.email);
    }

    function showNotLoggedUI() {
        var nl = $('authNotLogged');
        var l = $('authLogged');
        if (nl) nl.style.display = 'block';
        if (l) l.style.display = 'none';
    }

    function firebaseRegister() {
        var email = getVal('regEmail');
        var pass = getRawVal('regPassword');
        var pass2 = getRawVal('regPassword2');

        if (!email || !pass) { showToast('⚠️ Remplis tous les champs !'); return; }
        if (pass.length < 6) { showToast('⚠️ Mot de passe : min. 6 caractères'); return; }
        if (pass !== pass2) { showToast('⚠️ Les mots de passe ne correspondent pas !'); return; }
        if (!window.firebaseCreateUser) { showToast('❌ Firebase non chargé'); return; }

        window.firebaseCreateUser(window.firebaseAuth, email, pass)
            .then(function () {
                showToast('✅ Compte créé !');
                setTimeout(function () { firebaseSync(true); }, 1000);
            })
            .catch(function (error) {
                var msgs = {
                    'auth/email-already-in-use': '⚠️ Email déjà utilisé',
                    'auth/invalid-email': '⚠️ Email invalide',
                    'auth/weak-password': '⚠️ Mot de passe trop faible'
                };
                showToast(msgs[error.code] || '❌ Erreur : ' + error.message);
            });
    }

    function firebaseLogin() {
        var email = getVal('loginEmail');
        var pass = getRawVal('loginPassword');

        if (!email || !pass) { showToast('⚠️ Remplis tous les champs !'); return; }
        if (!window.firebaseSignIn) { showToast('❌ Firebase non chargé'); return; }

        window.firebaseSignIn(window.firebaseAuth, email, pass)
            .then(function () { showToast('✅ Connecté !'); })
            .catch(function (error) {
                var msgs = {
                    'auth/user-not-found': '⚠️ Utilisateur introuvable',
                    'auth/wrong-password': '⚠️ Mot de passe incorrect',
                    'auth/invalid-email': '⚠️ Email invalide',
                    'auth/invalid-credential': '⚠️ Identifiants invalides'
                };
                showToast(msgs[error.code] || '❌ Erreur : ' + error.message);
            });
    }

    function firebaseLogout() {
        if (!confirm('Se déconnecter ?')) return;
        if (!window.firebaseSignOut) return;
        window.firebaseSignOut(window.firebaseAuth)
            .then(function () { showToast('👋 Déconnecté !'); });
    }

    // ============================================================
    //  FUSION INTELLIGENTE DES DONNÉES
    // ============================================================
    function mergeArrays(localArr, cloudArr, deletedList) {
        var merged = {};
        var deletedMap = {};

        for (var d = 0; d < deletedList.length; d++) {
            deletedMap[deletedList[d].id] = deletedList[d].deletedAt;
        }

        for (var i = 0; i < localArr.length; i++) {
            var item = localArr[i];
            if (!deletedMap[item.id]) merged[item.id] = item;
        }

        for (var j = 0; j < cloudArr.length; j++) {
            var cItem = cloudArr[j];

            if (deletedMap[cItem.id] && deletedMap[cItem.id] > (cItem.updatedAt || 0)) continue;

            if (!merged[cItem.id]) {
                merged[cItem.id] = cItem;
                continue;
            }

            var localItem = merged[cItem.id];
            var localTime = localItem.updatedAt || 0;
            var cloudTime = cItem.updatedAt || 0;

            if (cloudTime > localTime) merged[cItem.id] = cItem;
        }

        var result = [];
        var keys = Object.keys(merged);
        for (var k = 0; k < keys.length; k++) result.push(merged[keys[k]]);
        return result;
    }

    function mergeDeleted(localDel, cloudDel) {
        var map = {};
        var i;
        for (i = 0; i < localDel.length; i++) map[localDel[i].id] = localDel[i];
        for (i = 0; i < cloudDel.length; i++) {
            if (!map[cloudDel[i].id] || cloudDel[i].deletedAt > map[cloudDel[i].id].deletedAt) {
                map[cloudDel[i].id] = cloudDel[i];
            }
        }
        var result = [];
        var keys = Object.keys(map);
        var cutoff = nowTimestamp() - DELETED_RETENTION_MS;
        for (var k = 0; k < keys.length; k++) {
            if (map[keys[k]].deletedAt > cutoff) result.push(map[keys[k]]);
        }
        return result;
    }

    function mergeSagasMeta(localMeta, cloudMeta) {
        var merged = Object.assign({}, cloudMeta || {});
        var keys = Object.keys(localMeta || {});
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var localItem = localMeta[key];
            var cloudItem = merged[key];

            if (!cloudItem) {
                merged[key] = localItem;
            } else {
                var localTime = localItem.updatedAt || 0;
                var cloudTime = cloudItem.updatedAt || 0;
                if (localTime >= cloudTime) merged[key] = localItem;
            }
        }
        return merged;
    }

    // ============================================================
    //  SYNC — PUSH (envoi local → cloud avec fusion)
    // ============================================================
    function firebaseSync(silent) {
        if (!state.currentUser) {
            if (!silent) showToast('⚠️ Non connecté !');
            return Promise.reject('not-logged');
        }

        setSyncStatus('syncing', '⏳ Synchronisation...');

        var docRef = window.firebaseDoc(window.firebaseDb, 'users', state.currentUser.uid);

        return window.firebaseGetDoc(docRef)
            .then(function (docSnap) {
                var cloudData = docSnap.exists() ? docSnap.data() : {};

                var mergedBooks = mergeArrays(books, cloudData.books || [], deletedItems.books);
                var mergedWishlist = mergeArrays(wishlist, cloudData.wishlist || [], deletedItems.wishlist);
                var mergedExternal = mergeArrays(external, cloudData.external || [], deletedItems.external);
                var mergedSagas = mergeSagasMeta(sagasMeta, cloudData.sagasMeta);

                var cloudDeleted = cloudData.deletedItems || { books: [], wishlist: [], external: [] };
                var mergedDeleted = {
                    books:    mergeDeleted(deletedItems.books,    cloudDeleted.books    || []),
                    wishlist: mergeDeleted(deletedItems.wishlist, cloudDeleted.wishlist || []),
                    external: mergeDeleted(deletedItems.external, cloudDeleted.external || [])
                };

                books = mergedBooks;
                wishlist = mergedWishlist;
                external = mergedExternal;
                sagasMeta = mergedSagas;
                deletedItems = mergedDeleted;

                saveJSON('myBookPile', books);
                saveJSON('myBookWishlist', wishlist);
                saveJSON('myBookExternal', external);
                saveJSON('myBookSagasMeta', sagasMeta);
                saveDeleted();

                var data = {
                    books: mergedBooks,
                    wishlist: mergedWishlist,
                    external: mergedExternal,
                    sagasMeta: mergedSagas,
                    deletedItems: mergedDeleted,
                    settings: settings,
                    lastSync: nowTimestamp(),
                    device: navigator.userAgent.substring(0, 100)
                };

                return window.firebaseSetDoc(docRef, data);
            })
            .then(function () {
                renderAll();
                setSyncStatus('ok', '☁️ Synchronisé ' + new Date().toLocaleTimeString('fr-FR'));
                if (!silent) showToast('☁️ Synchronisé !');
                localStorage.setItem('lastSyncedAt', nowTimestamp().toString());
            })
            .catch(function (err) {
                setSyncStatus('error', '❌ Erreur');
                if (!silent) showToast('❌ Erreur sync — retry dans 5s');
                console.error('Sync error:', err);
                setTimeout(function () { firebaseSync(true); }, SYNC_RETRY_DELAY);
                throw err;
            });
    }

    // ============================================================
    //  PULL — Récupération (manuelle ou à la connexion)
    // ============================================================
    function firebasePullData(isInitial) {
        if (!state.currentUser) return;

        setSyncStatus('syncing', '⏳ Récupération...');
        var docRef = window.firebaseDoc(window.firebaseDb, 'users', state.currentUser.uid);

        window.firebaseGetDoc(docRef)
            .then(function (docSnap) {
                if (!docSnap.exists()) {
                    setSyncStatus('ok', '☁️ Premier envoi...');
                    firebaseSync(true);
                    return;
                }

                var cloudData = docSnap.data();

                if (!isInitial) {
                    var msg = '⚠️ Récupérer et fusionner avec le cloud ?\n\n' +
                              '• Cloud : ' + (cloudData.books || []).length + ' livres, ' +
                              (cloudData.wishlist || []).length + ' wishlist, ' +
                              (cloudData.external || []).length + ' externes\n' +
                              '• Local : ' + books.length + ' livres, ' +
                              wishlist.length + ' wishlist, ' + external.length + ' externes\n\n' +
                              'La fusion intelligente préservera tout ce qui est le plus récent.';

                    if (!confirm(msg)) {
                        setSyncStatus('ok', '☁️ Annulé');
                        return;
                    }
                }

                books = mergeArrays(books, cloudData.books || [], deletedItems.books);
                wishlist = mergeArrays(wishlist, cloudData.wishlist || [], deletedItems.wishlist);
                external = mergeArrays(external, cloudData.external || [], deletedItems.external);
                sagasMeta = mergeSagasMeta(sagasMeta, cloudData.sagasMeta);

                var cd = cloudData.deletedItems || { books: [], wishlist: [], external: [] };
                deletedItems = {
                    books:    mergeDeleted(deletedItems.books,    cd.books    || []),
                    wishlist: mergeDeleted(deletedItems.wishlist, cd.wishlist || []),
                    external: mergeDeleted(deletedItems.external, cd.external || [])
                };

                if (cloudData.settings && typeof cloudData.settings === 'object') {
                    settings = Object.assign({}, settings, cloudData.settings);
                    applySettings();
                }

                saveJSON('myBookPile', books);
                saveJSON('myBookWishlist', wishlist);
                saveJSON('myBookExternal', external);
                saveJSON('myBookSagasMeta', sagasMeta);
                saveDeleted();
                saveSettings();

                renderAll();
                setSyncStatus('ok', '☁️ ' + (isInitial ? 'Fusionné' : 'Récupéré'));

                if (isInitial) {
                    showToast('☁️ Données fusionnées !');
                } else {
                    showToast('⬇️ Fusionné avec succès !');
                }

                setTimeout(function () { firebaseSync(true); }, 500);
            })
            .catch(function (err) {
                setSyncStatus('error', '❌ Erreur');
                console.error('Pull error:', err);
                if (!isInitial) showToast('❌ Erreur récupération');
            });
    }

    function setSyncStatus(status, msg) {
        var el = $('syncStatus');
        if (!el) return;
        el.textContent = msg;
        el.classList.remove('syncing', 'error');
        if (status === 'syncing') el.classList.add('syncing');
        else if (status === 'error') el.classList.add('error');
    }

    // ============================================================
    //  AUTO-SYNC (déclenché après chaque modification locale)
    // ============================================================
    function triggerAutoSync() {
        localStorage.setItem('lastLocalChange', nowTimestamp().toString());
        if (!state.currentUser) return;
        if (state.syncTimeout) clearTimeout(state.syncTimeout);
        state.syncTimeout = setTimeout(function () {
            firebaseSync(true);
        }, SYNC_DEBOUNCE_MS);
    }

    // ============================================================
    //  SYNC PÉRIODIQUE (toutes les 60s, vérifie si cloud modifié)
    // ============================================================
    function startPeriodicSync() {
        if (state.periodicSyncInterval) return;
        state.periodicSyncInterval = setInterval(function () {
            if (!state.currentUser) return;
            if (document.hidden) return;

            var docRef = window.firebaseDoc(window.firebaseDb, 'users', state.currentUser.uid);
            window.firebaseGetDoc(docRef)
                .then(function (docSnap) {
                    if (!docSnap.exists()) return;
                    var cloudData = docSnap.data();
                    var lastSynced = parseInt(localStorage.getItem('lastSyncedAt') || '0');

                    if ((cloudData.lastSync || 0) > lastSynced) {
                        firebaseSync(true);
                    }
                })
                .catch(function (err) {
                    console.warn('Periodic check failed:', err);
                });
        }, SYNC_PERIODIC_MS);
    }

    function stopPeriodicSync() {
        if (state.periodicSyncInterval) {
            clearInterval(state.periodicSyncInterval);
            state.periodicSyncInterval = null;
        }
    }

})(); 
