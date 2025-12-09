// ============================================
// GESTION DE LA LAMPE ET TRANSITION
// ============================================

// Éléments DOM pour la lampe
const welcomePage = document.getElementById('welcome-page');
const mainPage = document.getElementById('app');
const lampContainer = document.getElementById('lamp-container');
const lamp = document.getElementById('lamp');
const pullChain = document.getElementById('pull-chain');
const backToLampBtn = document.getElementById('backToLamp');
const lightExpand = document.getElementById('light-expand');

// Variables pour l'état de la lampe
let isLampOn = false;
let hasTransitioned = false;

// ============================================
// CONFIGURATION API (globales)
// ============================================

const API_URL = "https://opendata.paris.fr/api/records/1.0/search/?dataset=arbresremarquablesparis";
let start = 0;
const ROWS_PER_PAGE = 9;

// Variables d'état pour l'API
let isLoading = false;
let totalResults = 0;
let currentQuery = '';

// ============================================
// FONCTIONS LAMPE
// ============================================

// Fonction pour allumer la lampe
function turnOnLamp() {
    if (isLampOn || hasTransitioned) return;
    
    isLampOn = true;
    
    // 1. Allumer la lampe
    lamp.classList.add('on');
    
    // 2. Lancer l'effet d'expansion de lumière
    lightExpand.classList.add('active');
    
    // 3. Son d'allumage (optionnel)
    playLampSound();
    
    // 4. Après 1.2 seconde, transition vers la page principale
    setTimeout(() => {
        welcomePage.classList.add('hidden');
        mainPage.classList.add('active');
        hasTransitioned = true;
        
        // Initialiser la page principale
        initMainPage();
    }, 1200);
}

// Fonction pour éteindre la lampe et revenir
function turnOffLamp() {
    if (!hasTransitioned) return;
    
    // 1. Cacher la page principale
    mainPage.classList.remove('active');
    
    // 2. Réinitialiser la lampe
    lamp.classList.remove('on');
    lightExpand.classList.remove('active');
    
    // 3. Réafficher la page d'accueil après un délai
    setTimeout(() => {
        welcomePage.classList.remove('hidden');
        isLampOn = false;
        hasTransitioned = false;
    }, 500);
}

// Son d'allumage
function playLampSound() {
    try {
        // Créer un contexte audio
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Créer un oscillateur pour le "clic"
        const clickOscillator = audioContext.createOscillator();
        const clickGain = audioContext.createGain();
        
        clickOscillator.connect(clickGain);
        clickGain.connect(audioContext.destination);
        
        clickOscillator.frequency.setValueAtTime(1200, audioContext.currentTime);
        clickOscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
        
        clickGain.gain.setValueAtTime(0.3, audioContext.currentTime);
        clickGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        clickOscillator.start(audioContext.currentTime);
        clickOscillator.stop(audioContext.currentTime + 0.2);
        
        // Créer un son pour l'expansion
        setTimeout(() => {
            const expandOscillator = audioContext.createOscillator();
            const expandGain = audioContext.createGain();
            
            expandOscillator.connect(expandGain);
            expandGain.connect(audioContext.destination);
            
            expandOscillator.frequency.setValueAtTime(200, audioContext.currentTime);
            expandOscillator.frequency.linearRampToValueAtTime(100, audioContext.currentTime + 1);
            
            expandGain.gain.setValueAtTime(0.1, audioContext.currentTime);
            expandGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 1);
            
            expandOscillator.start(audioContext.currentTime);
            expandOscillator.stop(audioContext.currentTime + 1);
        }, 100);
        
    } catch (error) {
        console.log('Audio non supporté, mais la lampe fonctionne !');
    }
}

// ============================================
// INITIALISATION LAMPE
// ============================================

// Événements pour la lampe
if (lampContainer) {
    lampContainer.addEventListener('click', turnOnLamp);
}

if (pullChain) {
    pullChain.addEventListener('click', function(e) {
        e.stopPropagation();
        // Animation de traction de la chaîne
        this.style.animation = 'none';
        this.style.transform = 'translateX(-50%) translateY(20px)';
        
        setTimeout(() => {
            this.style.animation = 'pullHint 2s infinite';
        }, 300);
        
        turnOnLamp();
    });
}

// Bouton pour retourner à la lampe
if (backToLampBtn) {
    backToLampBtn.addEventListener('click', turnOffLamp);
}

// Animation de la chaîne au survol
if (pullChain) {
    pullChain.addEventListener('mouseenter', () => {
        pullChain.style.transform = 'translateX(-50%) scale(1.2)';
    });

    pullChain.addEventListener('mouseleave', () => {
        pullChain.style.transform = 'translateX(-50%) scale(1)';
    });
}

// ============================================
// INITIALISATION PAGE PRINCIPALE
// ============================================

// Variables pour les éléments DOM de la page principale
let dataContainer, searchInput, searchBtn, loadMoreBtn, resultsCount;

// Fonction pour initialiser les éléments DOM après la transition
function initMainPage() {
    // Sélectionner les éléments DOM
    dataContainer = document.getElementById('dataContainer');
    searchInput = document.getElementById('searchInput');
    searchBtn = document.getElementById('searchBtn');
    loadMoreBtn = document.getElementById('loadMoreBtn');
    resultsCount = document.getElementById('resultsCount');
    
    // Vérifier que les éléments existent
    if (!dataContainer || !searchBtn || !loadMoreBtn || !resultsCount) {
        console.error('Certains éléments de la page principale sont introuvables');
        return;
    }
    
    // Initialiser les événements
    searchBtn.addEventListener('click', performSearch);
    
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });
    }
    
    loadMoreBtn.addEventListener('click', loadMore);
    
    // Charger les données initiales
    loadInitialData();
}

// Charger les données initiale
async function loadInitialData() {
    showLoader();
    const records = await fetchData();
    displayData(records, true);
}

// ============================================
// FONCTIONS API ET AFFICHAGE
// ============================================

// Fonction pour afficher le loader
function showLoader() {
    if (!dataContainer) return;
    
    dataContainer.innerHTML = `
        <div class="loader">
            <div class="spinner"></div>
            <p>Chargement des données...</p>
        </div>
    `;
}

// Fonction pour afficher une erreur
function showError(message) {
    if (!dataContainer) return;
    
    dataContainer.innerHTML = `
        <div class="error-message">
            <h3>❌ Erreur</h3>
            <p>${message}</p>
            <p>Vérifiez votre connexion internet ou réessayez plus tard.</p>
        </div>
    `;
}

// Fonction pour afficher "aucun résultat"
function showNoResults() {
    if (!dataContainer) return;
    
    dataContainer.innerHTML = `
        <div class="no-results">
            <h3>🔍 Aucun résultat trouvé</h3>
            <p>Essayez avec d'autres termes de recherche.</p>
        </div>
    `;
}

// Fonction principale pour récupérer les données
async function fetchData(query = '') {
    if (isLoading) return [];
    
    isLoading = true;
    
    try {
        const url = new URL(API_URL);
        url.searchParams.append('rows', ROWS_PER_PAGE);
        url.searchParams.append('start', start);
        
        if (query.trim()) {
            url.searchParams.append('q', query);
        }
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        totalResults = data.nhits || 0;
        updateResultsCount();
        
        return data.records || [];
        
    } catch (error) {
        console.error('❌ Erreur lors de la récupération des données:', error);
        showError(`Impossible de charger les données: ${error.message}`);
        return [];
    } finally {
        isLoading = false;
    }
}

// Fonction pour mettre à jour le compteur de résultats
function updateResultsCount() {
    if (!resultsCount || !loadMoreBtn) return;
    
    const displayedCount = Math.min(start + ROWS_PER_PAGE, totalResults);
    resultsCount.textContent = `Affichage de ${displayedCount} sur ${totalResults} résultats`;
    
    if (displayedCount < totalResults) {
        loadMoreBtn.style.display = 'block';
    } else {
        loadMoreBtn.style.display = 'none';
    }
}

// Fonction pour formater les données
function formatData(record) {
    const fields = record.fields || {};
    
    const title = fields.com_nom_usuel || fields.arbres_libellefrancais || 'Arbre remarquable';
    const latinName = fields.com_nom_latin || `${fields.arbres_genre || ''} ${fields.arbres_espece || ''}`.trim();
    
    const details = [];
    
    // Ajoute les informations principales
    if (latinName) {
        details.push(`🌿 <strong>Nom latin:</strong> ${latinName}`);
    }
    
    if (fields.com_adresse || fields.arbres_adresse) {
        const adresse = fields.com_adresse || fields.arbres_adresse;
        details.push(`📍 <strong>Adresse:</strong> ${adresse}`);
    }
    
    if (fields.com_arrondissement || fields.arbres_arrondissement) {
        const arrondissement = fields.com_arrondissement || fields.arbres_arrondissement;
        details.push(`🏙️ <strong>Arrondissement:</strong> ${arrondissement}`);
    }
    
    if (fields.arbres_hauteurenm) {
        details.push(`📏 <strong>Hauteur:</strong> ${fields.arbres_hauteurenm} m`);
    }
    
    if (fields.arbres_circonferenceencm) {
        details.push(`📐 <strong>Circonférence:</strong> ${fields.arbres_circonferenceencm} cm`);
    }
    
    if (fields.com_annee_plantation || fields.arbres_dateplantation) {
        const annee = fields.com_annee_plantation || 
                     (fields.arbres_dateplantation ? fields.arbres_dateplantation.split('-')[0] : '');
        if (annee) {
            details.push(`🌱 <strong>Planté en:</strong> ${annee}`);
        }
    }
    
    if (fields.com_qualification_rem) {
        details.push(`⭐ <strong>Qualification:</strong> ${fields.com_qualification_rem}`);
    }
    
    if (fields.com_domanialite || fields.arbres_domanialite) {
        const domanialite = fields.com_domanialite || fields.arbres_domanialite;
        details.push(`🏞️ <strong>Lieu:</strong> ${domanialite}`);
    }
    
    if (fields.com_resume && fields.com_resume.length < 150) {
        details.push(`📝 <strong>Description:</strong> ${fields.com_resume}`);
    }
    
    // Gestion de la photo
    const hasPhoto = fields.com_url_photo1;
    let photoSection = '';
    
    if (hasPhoto) {
        photoSection = `
            <div class="photo-info">
                <p class="photo-link">📷 <a href="${fields.com_url_photo1}" target="_blank">Voir la photo de cet arbre</a></p>
            </div>
        `;
    } else {
        photoSection = `
            <div class="no-photo-info">
                <p class="no-photo">🌳 <em>Photo non disponible</em></p>
            </div>
        `;
    }
    
    return {
        title: `🌳 ${title}`,
        details: details,
        photoSection: photoSection
    };
}

// Fonction pour afficher les données
function displayData(records, isNewSearch = false) {
    if (!dataContainer) return;
    
    if (isNewSearch) {
        dataContainer.innerHTML = '';
        start = 0;
    }
    
    if (records.length === 0 && isNewSearch) {
        showNoResults();
        return;
    }
    
    records.forEach(record => {
        const formatted = formatData(record);
        
        const card = document.createElement('div');
        card.className = 'data-card';
        
        // Structure avec contenu caché par défaut
        card.innerHTML = `
            <h3>${formatted.title}</h3>
            <div class="card-content">
                ${formatted.photoSection}
                <div class="card-details">
                    ${formatted.details.map(detail => `<p>${detail}</p>`).join('')}
                </div>
            </div>
        `;
        
        dataContainer.appendChild(card);
        
        // Pour mobile : toggle au clic
        card.addEventListener('click', function(e) {
            if (window.innerWidth <= 768) {
                e.preventDefault();
                this.classList.toggle('active');
            }
        });
    });
}

// Fonction pour exécuter une recherche
async function performSearch() {
    if (!searchInput || !dataContainer) return;
    
    const query = searchInput.value.trim();
    currentQuery = query;
    
    showLoader();
    start = 0;
    
    const records = await fetchData(query);
    displayData(records, true);
}

// Fonction pour charger plus de résultats
async function loadMore() {
    start += ROWS_PER_PAGE;
    
    const records = await fetchData(currentQuery);
    displayData(records, false);
}

// ============================================
// ÉVÉNEMENTS GLOBAUX
// ============================================

// Empêcher le rechargement de la page
window.addEventListener('DOMContentLoaded', () => {
    // Si l'utilisateur rafraîchit la page, on reste sur la page d'accueil
    // La lampe sera réinitialisée
    console.log('🌳 Arbres Remarquables de Paris - Prêt');
});