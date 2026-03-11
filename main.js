/* =================================================================
    ⚡ KICKS FRONTEND V32.8 - VERSION CORRIGÉE
================================================================= */

/* --- 1. CONFIGURATION GLOBALE --- */
const CONFIG = {
    API_URL: document.body ? document.body.getAttribute('data-api-url') || "" : "",
    
    getAuthUrl: function(params = new URLSearchParams()) {
        const separator = this.API_URL.includes('?') ? '&' : '?';
        const secret = 'Bomboklatt2K26'; 
        return `${this.API_URL}${separator}auth=${secret}&${params.toString()}`;
    },

    RECAPTCHA_SITE_KEY: "6LdxFA4sAAAAAGi_sahJ3mfLrh4jsFWNXW8cfY2v",
    STRIPE_PUBLIC_KEY: "pk_live_51SX7GJBFCjC8b7qm7JgcMBsHMbUWb67Wb3rIIK1skppvjN29osXsr39G6i5LP40rjE5UZHNFmQEXS5tan4Uozqyp00dsJKtdrC",
    PRODUCTS_PER_PAGE: 10,
    MAX_QTY_PER_CART: 5,
    FREE_SHIPPING_THRESHOLD: 150,
    UPSELL_ID: "ACC-SOCK-PREM",

    FEES: {
        KLARNA: { percent: 0, fixed: 0, label: "Aucun frais" },
        PAYPAL_4X: { percent: 0, fixed: 0, label: "Aucun frais" },
        CARD: { percent: 0, fixed: 0, label: "Aucun frais" }
    },

    MESSAGES: {
        EMPTY_CART: "Votre panier est vide.",
        STOCK_LIMIT: "Sécurité : Max 5 paires par commande.",
        ERROR_NETWORK: "Erreur de connexion. Vérifiez votre réseau.",
        ERROR_RECAPTCHA: "Veuillez cocher la case 'Je ne suis pas un robot'.",
        ERROR_FORM: "Veuillez remplir tous les champs obligatoires."
    }
};

if (typeof state === 'undefined') {
    let kicks_cart = JSON.parse(localStorage.getItem('kicks_cart')) || [];

    var state = {
        products: [],            
        shippingRates: [],       
        allCities: [],           
        expressZones: [], 
        categoryHeroes: {},      
        cart: kicks_cart, // On lie le panier chargé au state                
        filterBrand: [], // CORRIGÉ : Tableau vide pour multi-sélection
        currentSizeFilter: [], // CORRIGÉ : Tableau vide pour multi-sélection
        currentCategoryFilter: '',
        currentSort: 'default', 
        currentPage: 1,
        currentShippingRate: null,
        currentPaymentMethod: "CARD", 
        appliedPromoCode: null,
        promoDiscountAmount: 0,
        recaptchaWidgetId: null,
        siteContent: {}          
    }; 
} // <--- IL MANQUAIT CETTE ACCOLADE ICI POUR FERMER LE "IF"


function isMobileOrTablet() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 600;
}

function formatPrice(amount) {
    if (amount === undefined || amount === null) return "0,00 €";
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
}

function openPanel(el) { 
    if (el) {
        el.classList.add('open');
        // On force le scroll en haut de la modale à l'ouverture
        const content = el.querySelector('.modal-content');
        if (content) content.scrollTop = 0;
        
        document.body.style.overflow = 'hidden'; // Empêche le scroll de l'arrière-plan sur TOUT support
    }
}

function closePanel(el) { 
    if (el) {
        el.classList.remove('open');
        document.body.style.overflow = ''; 
        
        // Si on ferme la modale produit, on nettoie l'URL
        if (el.id === 'product-modal') {
            window.history.pushState({}, '', window.location.pathname);
        }
    }
}

function normalizeString(str) {
    if (!str) return "";
    return str.toString()
        .toUpperCase()                               
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
        .replace(/-/g, " ")                            
        .replace(/'/g, " ")                            
        .replace(/\b(LE|LA|LES|SAINT|STE|ST|L)\b/g, "") 
        .replace(/\s+/g, " ")                          
        .trim();
}

function populateCountries(countriesList) {
    const select = document.getElementById('ck-pays');
    if (!select) return;
    select.innerHTML = '<option value="" disabled selected>Choisir une destination...</option>';

    if (!countriesList || !Array.isArray(countriesList)) return;
    countriesList.forEach(country => {
        const option = document.createElement('option');
        option.value = country.code; 
        option.textContent = country.code; 
        select.appendChild(option);
    });
}

function showSuccessScreen(name, htmlContent) {
    const div = document.createElement('div');
    div.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;color:white;text-align:center;padding:20px; overflow-y:auto;";
    div.innerHTML = `
        <div style="font-size:4rem;">✅</div>
        <h2 style="margin:20px 0; font-family:'Oswald', sans-serif;">MERCI ${name.toUpperCase()}</h2>
        <div style="font-size:1.2rem; line-height:1.6;">${htmlContent}</div>
        <button id="return-button" style="margin-top:40px;padding:12px 30px;border:2px solid white;background:none;color:white;border-radius:30px;cursor:pointer;font-weight:bold;transition:0.3s;text-transform:uppercase;">Retour Boutique</button>
    `;
    document.body.appendChild(div);
    
    document.getElementById('return-button').addEventListener('click', () => {
        const url = window.location.origin + window.location.pathname;
        window.location.replace(url); 
    });
}

/* --- 4. GESTION RECAPTCHA V2 --- */
function renderRecaptchaV2() {
    const container = document.querySelector('.g-recaptcha');
    if (window.grecaptcha && container) {
        try {
            if (container.innerHTML.trim() === "") {
                container.style.transform = 'scale(0.8)';
                container.style.transformOrigin = '0 0';

                state.recaptchaWidgetId = grecaptcha.render(container, {
                    'sitekey': CONFIG.RECAPTCHA_SITE_KEY,
                    'theme': 'light'
                });
            } else {
                grecaptcha.reset();
            }
        } catch(e) { console.warn("Recaptcha render warning:", e); }
    }
}

function getRecaptchaResponse() {
    if (window.grecaptcha) {
        if (state.recaptchaWidgetId !== null) {
            return grecaptcha.getResponse(state.recaptchaWidgetId);
        }
        return grecaptcha.getResponse();
    }
    return null;
}

/* =================================================================
    PARTIE 2 : INITIALISATION & CHARGEMENT DONNÉES
================================================================= */

document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 KICKS Frontend V32.8 Started");

    // 1. Chargement Panier (Local et rapide)
    loadCart();

    // 2. --- RÉCUPÉRATION DU PANIER ABANDONNÉ (RECOVERY) ---
    const urlParams = new URLSearchParams(window.location.search);
    const recoveryToken = urlParams.get('token') || urlParams.get('recovery');

    if (recoveryToken && CONFIG.API_URL) {
        console.log("📦 Récupération du panier demandée...");
        try {
            const recoveryUrl = CONFIG.getAuthUrl(new URLSearchParams({ 
                action: 'getAbandonedCart', 
                token: recoveryToken 
            }));
            
            const response = await fetch(recoveryUrl);
            const resData = await response.json();

            if (resData.status === "ok" && resData.data) {
                // Remplacement du panier
                state.cart = resData.data.cart;
                
                // Pré-remplissage email
                if (resData.data.email) {
                    const emailInput = document.getElementById('checkout-email');
                    if (emailInput) emailInput.value = resData.data.email;
                }
                
                saveCart(); 
                
                // Mise à jour visuelle
                if (typeof updateCartUI === 'function') {
                    updateCartUI();
                }

                // --- CORRECTIF DÉFINITIF : UTILISATION DE OPENPANEL ---
                setTimeout(() => {
                    const drawer = document.getElementById('cart-drawer');
                    if (drawer && typeof openPanel === 'function') {
                        console.log("🔓 Action: Appel de openPanel('cart-drawer')");
                        openPanel(drawer);
                    } else if (drawer) {
                        // Backup si openPanel échoue
                        drawer.classList.add('active');
                        document.body.style.overflow = 'hidden';
                        const overlay = document.querySelector('.drawer-overlay');
                        if (overlay) overlay.classList.add('active');
                    }
                }, 1000); // 1 seconde pour être sûr que tout est chargé
                
                const clientName = resData.data.prenom || "Client";
                console.log("✅ Panier récupéré pour : " + clientName);
            }
        } catch (e) {
            console.error("❌ Erreur lors de la récupération du panier:", e);
        }
    }
    
    // 3. --- CHARGEMENT OPTIMISÉ (DIAGNOSTIC FINAL) ---
    if (CONFIG.API_URL) {
        Promise.all([
            fetchProducts(),
            typeof fetchShippingConfig === 'function' ? fetchShippingConfig() : Promise.resolve(),
            typeof fetchGlobalContent === 'function' ? fetchGlobalContent() : Promise.resolve()
        ]).then(() => {
            console.log("✅ Système prêt. Vérification de l'URL...");
            
            // On récupère les paramètres au moment T
            const currentParams = new URLSearchParams(window.location.search);
            const productId = currentParams.get('product');
            
            console.log("ID recherché dans l'URL :", productId);
            console.log("Nombre de produits chargés :", state.products ? state.products.length : 0);

            if (productId && state.products) {
                const productToOpen = state.products.find(p => p.id === productId);
                
                if (productToOpen) {
                    console.log("🚀 Produit trouvé ! Ouverture de la modale...");
                    if (typeof openProductModal === 'function') {
                        setTimeout(() => openProductModal(productToOpen), 100);
                    } else {
                        console.error("❌ Erreur : openProductModal n'est pas une fonction !");
                    }
                } else {
                    console.warn("⚠️ ECHEC : L'ID '" + productId + "' n'existe pas dans state.products");
                    console.log("Liste des IDs disponibles :", state.products.map(p => p.id));
                }
            }
        }).catch(e => console.error("❌ Erreur Initialisation :", e));
    }

    // --- GESTION DU THÈME ---
    const themeBtn = document.getElementById('theme-toggle');
    if (localStorage.getItem('kicks_theme') === 'dark') {
        document.body.classList.add('dark-mode');
    }
    if (themeBtn) {
        themeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const isDark = document.body.classList.toggle('dark-mode');
            localStorage.setItem('kicks_theme', isDark ? 'dark' : 'light');
        });
    }

    // Retour Paiement Succès
    if (new URLSearchParams(window.location.search).get('payment') === 'success') {
        localStorage.removeItem('kicks_cart');
        state.cart = [];
        if (typeof updateCartUI === 'function') updateCartUI();
    }

    // --- DÉCLENCHEMENT SCRIPTS LOURDS ---
    const triggerScripts = () => {
        if (typeof loadHeavyScripts === "function") loadHeavyScripts();
        window.removeEventListener('scroll', triggerScripts);
        window.removeEventListener('mousemove', triggerScripts);
        window.removeEventListener('touchstart', triggerScripts);
    };
    window.addEventListener('scroll', triggerScripts, {passive: true});
    window.addEventListener('mousemove', triggerScripts, {passive: true});
    window.addEventListener('touchstart', triggerScripts, {passive: true});
    setTimeout(triggerScripts, 3000);

    if (typeof setupGlobalListeners === 'function') setupGlobalListeners();
    if (typeof setupMobileFilters === 'function') setupMobileFilters();
});
/* --- APPELS API --- */

async function fetchProducts() {
    const grid = document.getElementById('product-grid');
    try {
        // Optimisation du cache : on garde le timestamp mais on l'allège
        const res = await fetch(`data.json?t=${Date.now()}`); 
        if (!res.ok) throw new Error(`Fichier data.json introuvable.`);

        const data = await res.json();
        if (!Array.isArray(data)) throw new Error("Format produits invalide.");

        const grouped = {};

        data.forEach(p => {
            // --- 1. NETTOYAGE RADICAL DU NOM POUR LA CARTE ---
            let groupKey = p.MasterName || "";
            let displayNameOnCard = groupKey.split(' - ')[0].trim();

            if (!displayNameOnCard) return;

            if (!grouped[displayNameOnCard]) {
                const nameUpper = displayNameOnCard.toUpperCase();
                let detectedBrand = "";
                if (nameUpper.includes("JORDAN")) detectedBrand = "JORDAN";
                else if (nameUpper.includes("NIKE")) detectedBrand = "NIKE";
                else if (nameUpper.includes("361")) detectedBrand = "361°";
                else if (nameUpper.includes("PUMA")) detectedBrand = "PUMA";
                else detectedBrand = (displayNameOnCard.split(' ')[0] || "").toUpperCase();

                grouped[displayNameOnCard] = {
                    ...p,
                    id: p.ID,
                    model: displayNameOnCard, 
                    brand: detectedBrand, 
                    category: p['p.category'] || "SNEAKERS", 
                    price: parseFloat(p.Price || 0),
                    stock: 0,
                    image: p['Lien URL'] || "", 
                    
                    // --- PROTECTION SURVOL ---
                    description: p["SEO description (Online Store only)"] 
                        ? p["SEO description (Online Store only)"].replace(/\\n/g, '<br>').replace(/\n/g, '<br>') 
                        : "Aucune description disponible.",
                    
                    sizesList: [],
                    stockDetails: {},
                    images: [
                        p['Lien URL'], p['Image 2'], p['Image 3'], 
                        p['Image 4'], p['Image 5'], p['Image 6'], p['Image 7']
                    ].filter(img => img && String(img).trim() !== "")
                };
            }

            // --- 2. VARIANTE PRÉCISE (UNIQUEMENT DANS LA MODALE) ---
            const sizeValue = p.Size ? ` [${p.Size}]` : "";
            const fullInfoForModal = p.MasterName + sizeValue; 
            
            const q = parseInt(p.Stock || 0);
            
            if (fullInfoForModal) {
                if (!grouped[displayNameOnCard].sizesList.includes(fullInfoForModal)) {
                    grouped[displayNameOnCard].sizesList.push(fullInfoForModal);
                }
                grouped[displayNameOnCard].stockDetails[fullInfoForModal] = (grouped[displayNameOnCard].stockDetails[fullInfoForModal] || 0) + q;
                grouped[displayNameOnCard].stock += q;
            }
        });

        // TRI ET STOCKAGE DANS LE STATE
        state.products = Object.values(grouped).sort((a, b) => a.model.localeCompare(b.model));

        // --- AFFICHAGE PRIORITAIRE DU CATALOGUE ---
        // On demande le rendu immédiatement pour libérer les skeletons
        if (typeof renderCatalog === 'function') {
            renderCatalog(true);
        }

        // --- TRAITEMENTS SECONDAIRES (Encapsulés pour ne pas bloquer le thread principal) ---
        setTimeout(() => {
            const urlParams = new URLSearchParams(window.location.search);
            const productId = urlParams.get('product');
            if (productId && state.products.length > 0) {
                const productToOpen = state.products.find(p => p.id === productId);
                if (productToOpen && typeof openProductModal === 'function') {
                    openProductModal(productToOpen);
                }
            }

            if (typeof generateFilters === 'function') generateFilters(); 
            if (typeof initSearch === 'function') initSearch();
        }, 10); // Un délai de 10ms suffit à laisser le navigateur dessiner les images
        
    } catch (e) {
        console.error("Erreur Catalogue:", e);
        if (grid) grid.innerHTML = `<p class="error">Impossible de charger le catalogue.</p>`;
    }
}

async function fetchShippingConfig() {
    try {
        // Préparation du paramètre d'action
        const params = new URLSearchParams({ action: 'getShippingRates' });
        
        // Utilisation de la nouvelle fonction de configuration pour l'URL
        const url = CONFIG.getAuthUrl(params);
        
        const res = await fetch(url);

        // Vérification de sécurité pour éviter de lire du HTML comme du JSON
        const contentType = res.headers.get("content-type");
        if (!res.ok || !contentType || !contentType.includes("application/json")) {
            console.warn("Configuration livraison : L'API n'a pas renvoyé de JSON valide.");
            return;
        }

        const data = await res.json();
        
        if (Array.isArray(data)) {
            state.shippingRates = data;
            const uniqueCountries = [];
            const seen = new Set();

            data.forEach(rate => {
                const val = rate.code; 
                if (val && !seen.has(val)) {
                    seen.add(val);
                    uniqueCountries.push({ code: val, name: val });
                }
            });
            populateCountries(uniqueCountries);
        }
    } catch (e) { 
        console.warn("Erreur Livraison", e); 
    }
}

async function fetchGlobalContent() {
    try {
        // Préparation du paramètre d'action
        const params = new URLSearchParams({ action: 'getContent' });
        
        // CORRECTIF FACTUEL : On force le secret ici pour que le Back-end accepte la requête
        const separator = CONFIG.API_URL.includes('?') ? '&' : '?';
        const secret = 'bomboklatt'; 
        const url = `${CONFIG.API_URL}${separator}auth=${secret}&${params.toString()}`;
        
        const res = await fetch(url);
        
        // Vérification de sécurité (Type JSON)
        const contentType = res.headers.get("content-type");
        if (!res.ok || !contentType || !contentType.includes("application/json")) {
            console.warn("Contenu Global : L'API n'a pas renvoyé de JSON valide.");
            return;
        }

        const data = await res.json();
        state.siteContent = data;

        // Traitement des zones express
        if (data.EXPRESS_ZONES_GP) {
            let zones = [];
            if (Array.isArray(data.EXPRESS_ZONES_GP)) zones = data.EXPRESS_ZONES_GP;
            else if (typeof data.EXPRESS_ZONES_GP === 'string') zones = data.EXPRESS_ZONES_GP.split(/[,;]+/);
            
            state.expressZones = zones.map(city => city.trim().toUpperCase()).filter(Boolean);
            console.log("🚀 Zones Express chargées :", state.expressZones.length);
        }

        // Mapping des héros de catégorie
        for (const key in data) {
            if (key.startsWith('HERO_')) state.categoryHeroes[key] = data[key];
        }
        
        // Injection des textes dans les modales (Mapping Clé JSON <-> ID HTML)
        const mapping = { 
            cgv: 'content-cgv', 
            mentions: 'content-mentions', 
            paypal: 'content-paypal4x', 
            klarna: 'content-klarna', 
            livraison: 'content-livraison',
            about: 'content-propos'
        };

        for (let [key, id] of Object.entries(mapping)) {
            const element = document.getElementById(id);
            if (data[key] && element) {
                element.innerHTML = data[key];
            }
        }

        console.log("✅ Contenu Global et textes légaux injectés.");
    } catch (e) { 
        console.warn("Erreur Contenu Global:", e); 
    }
}

async function fetchAllCities() {
    try {
        // Chargement du fichier local au lieu de l'API
        const res = await fetch('communes.json');
        const data = await res.json();
        
        let cities = [];
        if (Array.isArray(data)) cities = data;
        
        if (cities.length > 0) {
            // On transforme les données du JSON pour coller au format attendu par le reste du site
            state.allCities = cities.map(c => ({
                // "Code_postal" devient "cp" pour le reste du script
                cp: String(c.Code_postal || "").trim(), 
                // "Commune" devient "ville"
                ville: String(c.Commune || "").trim(),
                villeNorm: normalizeString(String(c.Commune || ""))
            }));
            console.log("🏙️ Villes chargées via JSON :", state.allCities.length);
        }
    } catch (e) { 
        console.warn("Erreur communes.json, repli sur API...", e);
        // Sécurité : Si le fichier JSON est absent ou corrompu, on tente l'API
        try {
            const resApi = await fetch(`${CONFIG.API_URL}?action=getAllCities`);
            const dataApi = await resApi.json();
            if (Array.isArray(dataApi)) {
                state.allCities = dataApi.map(c => ({
                    cp: String(c.cp).trim(), 
                    ville: String(c.ville).trim(),
                    villeNorm: normalizeString(c.ville)
                }));
            }
        } catch (errApi) {
            console.error("Échec critique : Ni JSON ni API disponibles", errApi);
        }
    }
}

/* --- CATALOGUE & FILTRES --- */

function generateFilters() {
    const container = isMobileOrTablet() ?
        document.getElementById('mobile-filters-content') : 
        document.getElementById('filters-bar');
    
    if (!container) return;
    container.innerHTML = ''; 

    const createMultiSelect = (title, options, stateKey, isSize = false) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'filter-group-wrapper';
        wrapper.style.cssText = "display:inline-block; margin-right:10px; vertical-align:middle;";

        const btn = document.createElement('div');
        const count = state[stateKey].length;
        // CORRECTIF : Utilisation des variables CSS pour le bouton
        btn.style.cssText = "padding:8px 12px; background:var(--bg-card); color:var(--text-primary); border:1px solid var(--border-color); border-radius:4px; cursor:pointer; font-size:14px; min-width:140px; display:flex; justify-content:space-between; align-items:center; height:38px; box-sizing:border-box;";
        btn.innerHTML = `<span>${count > 0 ? `${title} (${count})` : title}</span><span style="font-size:10px; margin-left:8px;">▼</span>`;

        const menu = document.createElement('div');
        menu.className = 'kicks-custom-dropdown';
        // IMPORTANT : Empêche la fermeture quand on clique à l'intérieur du menu
        menu.onclick = (e) => e.stopPropagation(); 
        // CORRECTIF : Utilisation des variables CSS pour le menu
        menu.style.cssText = "position:fixed; z-index:100000; background:var(--bg-card); color:var(--text-primary); border:1px solid var(--border-color); border-radius:4px; padding:10px; min-width:200px; box-shadow:0 10px 25px rgba(0,0,0,0.5); display:none; max-height:300px; overflow-y:auto;";

        btn.onclick = (e) => {
            e.stopPropagation();
            const rect = btn.getBoundingClientRect();
            const isCurrentlyOpen = menu.style.display === 'block';
            
            // Fermer les autres menus ouverts
            document.querySelectorAll('.kicks-custom-dropdown').forEach(m => m.style.display = 'none');

            if (!isCurrentlyOpen) {
                menu.style.top = (rect.bottom + window.scrollY) + "px";
                menu.style.left = rect.left + "px";
                menu.style.display = 'block';
                document.body.appendChild(menu);
            }
        };

        options.forEach(opt => {
            const label = document.createElement('label');
            // CORRECTIF : Utilisation de var(--border-color) pour le séparateur
            label.style.cssText = "display:flex; align-items:center; padding:8px 0; cursor:pointer; font-size:13px; border-bottom:1px solid var(--border-color); color:var(--text-primary);";
            
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.style.marginRight = '10px';
            cb.value = isSize ? opt : opt.toLowerCase();
            if (state[stateKey].includes(cb.value)) cb.checked = true;

            cb.onchange = (e) => {
                if (e.target.checked) {
                    if (!state[stateKey].includes(e.target.value)) state[stateKey].push(e.target.value);
                } else {
                    state[stateKey] = state[stateKey].filter(v => v !== e.target.value);
                }
                
                // On met à jour le texte du bouton sans tout reconstruire
                const newCount = state[stateKey].length;
                btn.querySelector('span').textContent = newCount > 0 ? `${title} (${newCount})` : title;
                
                // On relance le catalogue (grille) mais PAS generateFilters pour garder le menu ouvert
                renderCatalog(true);
            };

            label.appendChild(cb);
            label.appendChild(document.createTextNode(opt));
            menu.appendChild(label);
        });

        wrapper.appendChild(btn);
        return wrapper;
    };

    // Fermeture globale
    document.addEventListener('click', () => {
        document.querySelectorAll('.kicks-custom-dropdown').forEach(m => m.style.display = 'none');
    });

    // 1. MARQUES
    const brands = [...new Set(state.products.map(p => p.brand).filter(Boolean))].sort();
    container.appendChild(createMultiSelect("Marques", brands, "filterBrand"));

    // 2. POINTURES
    let allSizes = new Set();
    state.products.forEach(p => { 
        if(p.sizesList) {
            p.sizesList.forEach(s => {
                const match = s.match(/\[(.*?)\]/);
                if (match) allSizes.add(match[1].trim());
            });
        }
    });
    const sortedSizes = Array.from(allSizes).sort((a, b) => parseFloat(a.replace(',', '.')) - parseFloat(b.replace(',', '.')));
    container.appendChild(createMultiSelect("Pointures", sortedSizes, "currentSizeFilter", true));

    // 3. CATÉGORIES
    const categories = [...new Set(state.products.map(p => p.category).filter(Boolean))].sort();
    const catSelect = document.createElement('select');
    // CORRECTIF : Application des variables de thème sur le select
    catSelect.style.cssText = "padding:8px 12px; border:1px solid var(--border-color); border-radius:4px; margin-right:10px; cursor:pointer; height:38px; vertical-align:middle; background:var(--bg-card); color:var(--text-primary);";
    catSelect.innerHTML = '<option value="">Toutes catégories</option>';
    categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c; opt.textContent = c;
        if(state.currentCategoryFilter === c) opt.selected = true;
        catSelect.appendChild(opt);
    });
    catSelect.onchange = (e) => { 
        state.currentCategoryFilter = e.target.value; 
        renderCatalog(true); 
    };
    container.appendChild(catSelect);

    // 4. TRI
    const sortSelect = document.createElement('select');
    // CORRECTIF : Application des variables de thème sur le select
    sortSelect.style.cssText = "padding:8px 12px; border:1px solid var(--border-color); border-radius:4px; cursor:pointer; height:38px; vertical-align:middle; background:var(--bg-card); color:var(--text-primary);";
    sortSelect.innerHTML = '<option value="default">Trier par...</option><option value="price_asc">Prix croissant</option><option value="price_desc">Prix décroissant</option>';
    sortSelect.value = state.currentSort;
    sortSelect.onchange = (e) => { 
        state.currentSort = e.target.value; 
        renderCatalog(true); 
    };
    container.appendChild(sortSelect);
}

function applySorting(products) {
    switch(state.currentSort) {
        case 'price_asc': return products.sort((a, b) => a.price - b.price);
        case 'price_desc': return products.sort((a, b) => b.price - a.price);
        case 'name_asc': return products.sort((a, b) => a.model.localeCompare(b.model));
        case 'name_desc': return products.sort((a, b) => b.model.localeCompare(a.model));
        case 'default': default: return products.sort((a, b) => a.brand.localeCompare(b.brand));
    }
}

function renderCategoryHero(category) {
    const heroSection = document.getElementById('category-hero-section');
    if (!heroSection) return;

    const catKey = category ? category.toUpperCase().replace(/\s+/g, '_') : "";
    const imgKey = `HERO_${catKey}_IMG_URL`;
    const sloganKey = `HERO_${catKey}_SLOGAN`;
    
    const imgUrl = state.categoryHeroes[imgKey];
    const slogan = state.categoryHeroes[sloganKey];

    if (category && imgUrl) {
        heroSection.style.backgroundImage = `url('${imgUrl}')`;
        heroSection.style.display = 'flex';
        const contentBox = document.getElementById('category-hero-content');
        if (contentBox) {
            contentBox.innerHTML = `<h2>${category}</h2>${slogan ? `<p>${slogan}</p>` : ''}`;
        }
    } else {
        heroSection.style.display = 'none';
    }
}

function renderCatalog(resetPage = false) {
    const grid = document.getElementById('product-grid');
    if (!grid) return;

    if (resetPage) state.currentPage = 1;

    // --- CORRECTIF : MISE À JOUR DE LA BANNIÈRE ---
    const activeFilter = state.currentCategoryFilter || (Array.isArray(state.filterBrand) ? state.filterBrand[0] : state.filterBrand);
    renderCategoryHero(activeFilter);
    // ----------------------------------------------

    let filtered = state.products;
    
    // --- FILTRAGE MARQUE (LOGIQUE MULTI-SÉLECTION) ---
    if (Array.isArray(state.filterBrand) && state.filterBrand.length > 0) {
        filtered = filtered.filter(p => 
            p.brand && state.filterBrand.includes(p.brand.toLowerCase())
        );
    } else if (typeof state.filterBrand === 'string' && state.filterBrand !== 'all' && state.filterBrand !== '') {
        filtered = filtered.filter(p => 
            p.brand && p.brand.toLowerCase() === state.filterBrand.toLowerCase()
        );
    }

    // --- FILTRAGE TAILLE (LOGIQUE MULTI-SÉLECTION) ---
    if (Array.isArray(state.currentSizeFilter) && state.currentSizeFilter.length > 0) {
        filtered = filtered.filter(p => {
            if (!p.sizesList) return false;
            // On extrait les pointures [XX] du produit pour comparer
            const productSizes = p.sizesList.map(s => {
                const match = s.match(/\[(.*?)\]/);
                return match ? match[1].trim() : s;
            });
            // On garde le produit si au moins une de ses tailles est dans le filtre
            return state.currentSizeFilter.some(size => productSizes.includes(size));
        });
    } else if (typeof state.currentSizeFilter === 'string' && state.currentSizeFilter !== '') {
        filtered = filtered.filter(p => 
            p.sizesList && p.sizesList.some(s => s.includes(`[${state.currentSizeFilter}]`))
        );
    }

    // --- FILTRAGE CATÉGORIE ---
    if (state.currentCategoryFilter) {
        filtered = filtered.filter(p => 
            p.category === state.currentCategoryFilter
        );
    }

    filtered = applySorting(filtered);

    const countEl = document.getElementById('result-count');
    if (countEl) countEl.innerText = `Toutes nos paires`;

    const itemsPerPage = CONFIG.PRODUCTS_PER_PAGE || 10;
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    
    if (state.currentPage > totalPages && totalPages > 0) {
        state.currentPage = 1;
    }

    const startIndex = (state.currentPage - 1) * itemsPerPage;
    const toShow = filtered.slice(startIndex, startIndex + itemsPerPage);

    // Vider la grille proprement
    grid.innerHTML = ''; 

    if (toShow.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:60px; color:#888;">Aucun modèle trouvé pour cette sélection.</div>';
    } else {
        // OPTIMISATION : Utilisation d'un fragment pour un rendu ultra-rapide
        const fragment = document.createDocumentFragment();
        toShow.forEach((product, index) => {
            // On passe l'index à createProductCard pour gérer le loading='eager' des 4 premières
            fragment.appendChild(createProductCard(product, index));
        });
        grid.appendChild(fragment);
    }

    // Retour en haut de la grille si on change de page (Confort utilisateur)
    if (!resetPage) {
        window.scrollTo({ top: grid.offsetTop - 100, behavior: 'smooth' });
    }

    if (typeof renderPaginationControls === 'function') {
        renderPaginationControls(totalPages);
    }

    const loader = document.querySelector('.load-trigger');
    if (loader) loader.style.display = 'none';
}

function createProductCard(product, i = 10) {
    const div = document.createElement('div');
    div.className = 'product-card';
    
    const stock = parseInt(product.stock || 0);
    const isOutOfStock = stock <= 0;
    const isLowStock = stock > 0 && stock <= 3;
    
    let badge = '';
    if (isOutOfStock) {
        badge = '<span style="position:absolute; top:10px; right:10px; background:black; color:white; padding:4px 8px; font-size:0.7rem; font-weight:bold; border-radius:4px; z-index:2;">RUPTURE</span>';
    } else if (isLowStock) {
        badge = '<span style="position:absolute; top:10px; right:10px; background:#ff6600; color:white; padding:4px 8px; font-size:0.7rem; font-weight:bold; border-radius:4px; z-index:2;">STOCK LIMITÉ</span>';
    }

    const catBadge = (!isOutOfStock && product.category) ? `<span class="category-badge">${product.category}</span>` : '';
    const imgUrl = (product.images && product.images.length > 0) ? product.images[0] : 'assets/placeholder.jpg';
    
    let priceHtml;
    if (product.oldPrice && product.oldPrice > product.price) {
        priceHtml = `
            <div class="price-group">
                <span class="product-price" style="color:var(--error-color);">${formatPrice(product.price)}</span>
                <span class="product-old-price">${formatPrice(product.oldPrice)}</span>
            </div>
        `;
    } else {
        priceHtml = `<span class="product-price">${formatPrice(product.price)}</span>`;
    }

    let sizesHtml = '';
    if (!isOutOfStock && product.sizesList && product.sizesList.length > 0) {
        sizesHtml = `<div class="hover-sizes">${product.sizesList.slice(0, 8).map(s => `<span class="size-tag-mini">${s}</span>`).join('')}</div>`;
    }

    // Détermination de la priorité de chargement pour le LCP
    const isCritical = i < 4; 
    const loadingAttr = isCritical ? 'eager' : 'lazy';
    const priorityAttr = isCritical ? 'fetchpriority="high"' : '';

    // Ajout d'un style de "skeleton" directement sur le wrapper pour éviter les sauts (CLS)
    div.innerHTML = `
        <div class="product-image-wrapper" style="${isOutOfStock ? 'opacity:0.6;' : ''} aspect-ratio:1/1; background-color:var(--bg-secondary); overflow:hidden; position:relative;">
            <img src="${imgUrl}" alt="${product.model}" loading="${loadingAttr}" ${priorityAttr} 
                 class="main-img" 
                 style="width:100%; height:100%; object-fit:cover; display:block;">
            ${badge} ${catBadge} ${sizesHtml}
        </div>
        <div class="product-info">
            <span class="product-brand">${product.brand || 'KICKS'}</span>
            <h3 class="product-title">${product.model || ''}</h3>
            <div class="product-bottom" style="display:flex; justify-content:space-between; align-items:center; margin-top:5px;">
                ${priceHtml}
                <button class="add-btn-mini" ${isOutOfStock ? 'disabled' : ''}>+</button>
            </div>
        </div>
    `;

    // --- PARTIE 2 : LISTENERS ET IMAGE DE SURVOL ---
    div.addEventListener('click', () => openProductModal(product));
    
    const addBtn = div.querySelector('.add-btn-mini');
    if (addBtn) {
        addBtn.addEventListener('click', (ev) => { 
            ev.stopPropagation(); 
            openProductModal(product); 
        });
    }
    
    // --- IMAGE DE SURVOL OPTIMISÉE ---
    if (product.images && product.images.length > 1 && !isOutOfStock) {
        const wrapper = div.querySelector('.product-image-wrapper');
        const hoverImg = document.createElement('img');
        hoverImg.src = product.images[1]; 
        hoverImg.alt = `Survol ${product.model}`;
        hoverImg.className = 'hover-img'; 
        // On la charge en lazy pour ne pas ralentir l'image principale
        hoverImg.loading = 'lazy';
        hoverImg.style.cssText = "width:100%; height:100%; object-fit:cover; position:absolute; top:0; left:0; opacity:0; transition:opacity 0.3s ease;";
        wrapper.appendChild(hoverImg);
    }

    return div;
}

function renderPaginationControls(totalPages) {
    let container = document.getElementById('pagination-container');
    
    // 1. GESTION DU CONTAINER (Optimisée)
    if (!container) {
        container = document.createElement('div'); 
        container.id = 'pagination-container'; 
        container.className = 'pagination-controls';
        const grid = document.getElementById('product-grid');
        if(grid) grid.after(container);
    }

    // 2. NETTOYAGE ET SÉCURITÉ
    container.innerHTML = '';
    if (totalPages <= 1) {
        container.style.display = 'none'; // On cache si une seule page
        return;
    } else {
        container.style.display = 'flex'; // On affiche si plusieurs pages
    }

    // 3. GÉNÉRATION DES BOUTONS
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        // On s'assure que la classe active est bien appliquée selon l'état global
        btn.className = `page-btn ${i === state.currentPage ? 'active' : ''}`;
        btn.innerText = i;
        
        // Empêcher le focus persistant sur mobile
        btn.setAttribute('type', 'button');

        btn.onclick = () => {
            // Si on est déjà sur la page, on ne fait rien
            if (state.currentPage === i) return;

            state.currentPage = i; 
            
            // Appel du catalogue sans resetPage (car on veut juste changer de vue)
            renderCatalog(false);

            // Remontée fluide en haut du catalogue pour le confort mobile
            const catalogSection = document.querySelector('.catalog-section') || document.getElementById('product-grid');
            if (catalogSection) {
                catalogSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        };
        
        container.appendChild(btn);
    }
}

/* --- MODALE PRODUIT & GDT (CORRECTION APPLIQUÉE AVEC DESIGN CHIPS + BADGE PAYPAL 4X) --- */
function openProductModal(product) {
    const modal = document.getElementById('product-modal');
    if (!modal) return;
    
    // --- PARTIE SEO FORCEE ---
    const oldProductSchema = document.getElementById('product-schema');
    if (oldProductSchema) oldProductSchema.remove();

    const productImg = (product.images && product.images.length > 0) ? product.images[0] : 'assets/placeholder.jpg';
    
    // CORRECTIF : On ajoute le 5ème paramètre (seoTitle) pour l'automatisation
    if (typeof boostMySEO === 'function') {
        boostMySEO(
            product.model, 
            product.seoDesc || product.description, 
            product.price, 
            productImg,
            product.seoTitle // <-- Ajout du titre optimisé ici
        );
    } else {
        // Fallback si boostMySEO est absente
        const productSchema = document.createElement('script');
        productSchema.id = 'product-schema';
        productSchema.type = 'application/ld+json';
        const absoluteImg = window.location.origin + '/' + productImg;
        productSchema.text = JSON.stringify({
            "@context": "https://schema.org/",
            "@type": "Product",
            "name": product.model,
            "brand": { "@type": "Brand", "name": product.brand },
            "image": [absoluteImg.replace(/([^:]\/)\/+/g, "$1")],
            "description": product.seoDesc || product.description,
            "offers": {
                "@type": "Offer",
                "url": window.location.origin + window.location.pathname + '?product=' + encodeURIComponent(product.id),
                "priceCurrency": "EUR",
                "price": product.price,
                "availability": "https://schema.org/InStock"
            }
        });
        document.head.appendChild(productSchema);
    }

    // Mise à jour du titre de l'onglet (Priorité à la colonne V)
    document.title = product.seoTitle || (product.model + " | KICKS - Shop");
    
    const metaTitle = document.getElementById('meta-title');
    if(metaTitle) metaTitle.innerText = product.seoTitle || product.model;
    
    const metaDesc = document.getElementById('meta-description');
    if (metaDesc) metaDesc.setAttribute('content', product.seoDesc || product.description || "");

    const newUrl = window.location.origin + window.location.pathname + '?product=' + encodeURIComponent(product.id);
    window.history.pushState({ productId: product.id }, product.seoTitle || product.model, newUrl);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', newUrl);

    // Galerie
    const galleryContainer = modal.querySelector('.modal-gallery');
    if (galleryContainer) {
        galleryContainer.innerHTML = '';
        const images = (product.images && product.images.length) ? product.images : ['assets/placeholder.jpg'];
        const mainCont = document.createElement('div');
        mainCont.className = 'main-image-container';
        mainCont.style.cssText = "position:relative; overflow:hidden; border-radius:8px;";
        
        const mainImg = document.createElement('img');
        mainImg.id = 'modal-img-main'; 
        mainImg.src = images[0];
        // CORRECTIF SEO : Ajout d'un alt dynamique pour Google Images
        mainImg.alt = product.model + " - Vue principale";
        mainCont.appendChild(mainImg);
        
        if (!isMobileOrTablet()) {
            mainCont.addEventListener('mousemove', (e) => {
                const rect = mainCont.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                mainImg.style.transformOrigin = `${x}% ${y}%`;
                mainImg.style.transform = "scale(2)";
            });
            mainCont.addEventListener('mouseleave', () => { mainImg.style.transform = "scale(1)"; });
        }

        if (images.length > 1) {
            let currentIdx = 0;
            const updateImg = () => {
                mainImg.src = images[currentIdx];
                // Mise à jour de l'alt lors du changement d'image
                mainImg.alt = `${product.model} - Vue ${currentIdx + 1}`;
                document.querySelectorAll('.thumbnails-row img').forEach((t, i) => t.classList.toggle('active', i === currentIdx));
            };
            const createArrow = (dir) => {
                const btn = document.createElement('button');
                btn.innerHTML = dir === 'prev' ? '&#10094;' : '&#10095;';
                btn.style.cssText = `position:absolute; top:50%; ${dir==='prev'?'left:10px':'right:10px'}; transform:translateY(-50%); background:rgba(255,255,255,0.8); border:none; padding:10px; cursor:pointer; border-radius:50%; z-index:10; font-size:1.2rem;`;
                return btn;
            };
            const prev = createArrow('prev');
            prev.onclick = (e) => { e.stopPropagation(); currentIdx = (currentIdx - 1 + images.length) % images.length; updateImg(); };
            const next = createArrow('next');
            next.onclick = (e) => { e.stopPropagation(); currentIdx = (currentIdx + 1) % images.length; updateImg(); };
            mainCont.appendChild(prev); mainCont.appendChild(next);
        }

        const thumbs = document.createElement('div'); 
        thumbs.className = 'thumbnails-row';
        galleryContainer.append(mainCont, thumbs);
        
        const showImage = (idx) => {
            mainImg.src = images[idx];
            mainImg.alt = `${product.model} - Vue ${idx + 1}`;
            thumbs.querySelectorAll('img').forEach((img, i) => img.classList.toggle('active', i === idx));
        };
        
        images.forEach((src, idx) => {
            const t = document.createElement('img'); 
            t.src = src; 
            // CORRECTIF SEO : Alt sur les miniatures
            t.alt = `${product.model} miniature ${idx + 1}`;
            t.onclick = () => showImage(idx);
            thumbs.appendChild(t);
        });
        showImage(0);

        const shareButton = document.createElement('button');
        shareButton.className = 'share-btn';
        shareButton.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>';
        shareButton.style.cssText = "position:absolute; top:15px; left:15px; z-index:10; background:rgba(255,255,255,0.7); border-radius:50%; width:40px; height:40px; display:flex; align-items:center; justify-content:center;";
        mainCont.appendChild(shareButton);
        shareButton.onclick = (e) => {
            e.stopPropagation();
            const productTitle = encodeURIComponent(`${product.brand} ${product.model} - ${formatPrice(product.price)} sur KICKS.`);
            const productLink = encodeURIComponent(window.location.origin + window.location.pathname + "?product=" + product.id);
            window.open(`whatsapp://send?text=${productTitle}%0A${productLink}`, '_blank');
        };
    }
    
    // Infos
    document.getElementById('modal-brand').innerText = product.brand;
    document.getElementById('modal-title').innerText = product.model;
    
    const descBox = document.getElementById('modal-desc');
    if (descBox) {
        // CORRECTIF : Priorité à la description SEO si disponible pour la cohérence contenu/SEO
        descBox.innerHTML = product.seoDesc || product.description || "Aucune description disponible.";
    }
    
    // --- GESTION DU PRIX ET DU BADGE PAYPAL 4X (AJOUT CHIRURGICAL) ---
    const priceEl = document.getElementById('modal-price');
    if (priceEl) {
        if (product.oldPrice && product.oldPrice > product.price) {
            priceEl.innerHTML = `<span style="font-size:1.5rem; font-weight:700; color:var(--error-color); margin-right:15px;">${formatPrice(product.price)}</span><span style="font-size:1.1rem; color:var(--text-muted); text-decoration:line-through;">${formatPrice(product.oldPrice)}</span>`;
        } else {
            priceEl.innerText = formatPrice(product.price);
            priceEl.style.color = 'var(--text-primary)';
        }

        // Insertion du conteneur PayPal 4X sous le prix
        let p4xContainer = document.getElementById('paypal-4x-container');
        if (!p4xContainer) {
            p4xContainer = document.createElement('div');
            p4xContainer.id = 'paypal-4x-container';
            priceEl.parentElement.appendChild(p4xContainer);
        }
        // Appel de la fonction de calcul (doit être définie dans main.js)
        if (typeof updatePayPal4XDisplay === 'function') {
            updatePayPal4XDisplay(product.price);
        }
    }

    // Tailles & Stock avec nouveau design Chips
    const sizeBox = document.getElementById('modal-sizes');
    const stockWarn = document.getElementById('stock-warning');
    const qtyIn = document.getElementById('modal-qty');
    
    // On vide et on applique la classe container pour le nouveau design
    sizeBox.innerHTML = ''; 
    sizeBox.className = 'size-selector-container';
    
    stockWarn.classList.add('hidden');
    qtyIn.value = 1; qtyIn.disabled = true;
    let selSize = null, maxStock = 0;

    const availableSizes = product.sizesList || [];
    if (availableSizes.length > 0) {
        availableSizes.forEach(s => {
            const chip = document.createElement('div');
            chip.className = 'size-chip'; 
            chip.innerText = s;
            
            const realSizeStock = (product.stockDetails && product.stockDetails[s] !== undefined) ? parseInt(product.stockDetails[s]) : 0;
            
            if (realSizeStock <= 0) {
                chip.classList.add('out-of-stock');
            } else {
                chip.onclick = () => {
                    sizeBox.querySelectorAll('.size-chip').forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                    selSize = s; 
                    maxStock = realSizeStock;
                    qtyIn.disabled = false; 
                    qtyIn.max = maxStock; 
                    qtyIn.value = 1;
                    stockWarn.innerText = `En stock`;
                    stockWarn.style.color = "#28a745"; 
                    stockWarn.classList.remove('hidden');
                    
                    // Mise à jour du badge PayPal 4X selon la quantité
                    if (typeof updatePayPal4XDisplay === 'function') {
                        updatePayPal4XDisplay(product.price * parseInt(qtyIn.value));
                    }
                };
            }
            sizeBox.appendChild(chip);
        });
    } else {
        sizeBox.innerHTML = '<div style="color:red; font-weight:bold;">Rupture de stock totale</div>';
    }

    // Gestion de l'input quantité pour mettre à jour le 4X en temps réel
    qtyIn.oninput = () => {
        if (typeof updatePayPal4XDisplay === 'function') {
            updatePayPal4XDisplay(product.price * (parseInt(qtyIn.value) || 0));
        }
    };

    const addBtn = document.getElementById('add-to-cart-btn');
    const newBtn = addBtn.cloneNode(true); addBtn.parentNode.replaceChild(newBtn, addBtn);
    newBtn.onclick = () => {
        if (!selSize) { stockWarn.innerText = "Veuillez choisir une taille."; stockWarn.style.color = "red"; stockWarn.classList.remove('hidden'); return; }
        addToCart(product, selSize, parseInt(qtyIn.value) || 1);
    };

    const gdtBtn = document.getElementById('trigger-gdt');
    if (gdtBtn) {
        const catClean = (product.category || "").toUpperCase();
        if (catClean.includes("ATTELLE") || catClean.includes("GENOUILLERE") || catClean.includes("ACCESSOIRE")) {
            gdtBtn.style.display = 'none';
        } else {
            gdtBtn.style.display = 'inline-block';
            gdtBtn.onclick = () => initGDT(product.brand);
        }
    }
    
    // CORRECTIF : Remplacement de l'appel manuel par l'automatisation intelligente
    // On n'utilise plus product.related_products (colonne Sheets), on laisse le script choisir les meilleurs modèles
    displayRelatedProducts(product);
    
    openPanel(modal);
    
    if(isMobileOrTablet()) {
        const modalContent = modal.querySelector('.modal-content');
        if(modalContent) modalContent.scrollTop = 0;
    }
}

function renderRelatedProducts(relatedIds) {
    const section = document.getElementById('related-products-section');
    const grid = document.getElementById('related-products-grid');

    if (!section || !grid) return;
    if (!relatedIds || relatedIds.length === 0) {
        section.classList.add('hidden');
        return;
    }
    
    grid.innerHTML = '';
    const relatedProducts = state.products.filter(p => relatedIds.includes(p.id) && p.stock > 0).slice(0, 4);
    if (relatedProducts.length === 0) {
        section.classList.add('hidden');
        return;
    } 
    
    section.classList.remove('hidden');
    relatedProducts.forEach(product => {
        const card = createProductCard(product); 
        const miniBtn = card.querySelector('.add-btn-mini');
        if(miniBtn) miniBtn.remove();
        grid.appendChild(card);
    });
}

/* --- NOUVEAU GDT (Logic GDT conservée à l'identique) --- */

const GDT_BRANDS = ['Nike','Jordan','Peak','361°','Puma','Under Armour','Adidas','Reebok','Timberland','Converse','Asics'];
const GDT_RANGES = { men:{min:35,max:50}, women:{min:34,max:45}, kids:{min:28,max:39} };
const GDT_ADJUST = {'Nike':0,'Jordan':0.2,'Peak':0,'361°':-0.1,'Puma':0.1,'Under Armour':0,'Adidas':0,'Reebok':0,'Timberland':0.3,'Converse':-0.2,'Asics':0};
const GDT_HEADERS = {
    'men': ['EU','US (M)','UK','Longueur pied'],
    'women': ['EU','US (W)','UK','Longueur pied'],
    'kids': ['EU','US (Y/C)','UK','Longueur pied']
};

function euToCm(eu){ return +(22.5 + 0.5*(eu - 35)).toFixed(1); }
function euToUsMen(eu){ return +(eu - 33).toFixed(1); }
function euToUsWomen(eu){ return +(eu - 31).toFixed(1); }
function euToUk(us){ return +(us - 1).toFixed(1); }

function buildGdtRows(brand, category){
  const rows=[]; 
  const r = GDT_RANGES[category];
  for(let eu=r.min; eu<=r.max; eu++){
    let cm = (category==='kids') ?
    +(12.25 + 0.5*(eu - 16) + (GDT_ADJUST[brand]||0)).toFixed(1) : +(euToCm(eu) + (GDT_ADJUST[brand]||0)).toFixed(1);
    
    let us, usText, uk, ukText, cmText;
    if(category==='women'){
      us = euToUsWomen(eu);
    } else {
      us = euToUsMen(eu);
    }
    
    usText = Number.isInteger(us)?us.toString():us.toFixed(1);
    uk = euToUk(us);
    ukText = Number.isInteger(uk)?uk.toString():uk.toFixed(1);
    if(brand==='Peak'){
      const mm = Math.round(cm*10);
      cmText = mm + ' mm';
    } else {
      cmText = cm.toFixed(1) + ' cm';
    }
    
    rows.push([eu.toString(), usText, ukText, cmText]);
  }
  return rows;
}

function buildGdtTable(category, rows){
  const headers = GDT_HEADERS[category];
  const wrap=document.createElement('div'); wrap.className='table-wrap';
  const table=document.createElement('table'); table.className='table';
  const thead=document.createElement('thead'); const thr=document.createElement('tr');
  headers.forEach(h=>{ const th=document.createElement('th'); th.textContent=h; thr.appendChild(th); }); thead.appendChild(thr); table.appendChild(thead);
  
  const tbody=document.createElement('tbody');
  rows.forEach(r=>{ 
      const tr=document.createElement('tr'); 
      tr.setAttribute('data-cat', category); 
      r.forEach((c, i)=>{ 
          const td=document.createElement('td'); 
          td.textContent=c; 
          td.setAttribute('data-label', headers[i]);
          tr.appendChild(td); 
      }); 
      tbody.appendChild(tr); 
  });
  table.appendChild(tbody); wrap.appendChild(table); return wrap;
}

function renderGdtBrand(brand){
  const main=document.getElementById('mainArea'); 
  if(!main) return;
  main.innerHTML='';
  
  const card=document.createElement('div'); card.className='card';
  const title=document.createElement('h2'); title.textContent=brand; card.appendChild(title);
  const mTitle=document.createElement('div'); mTitle.className='section-title'; mTitle.textContent='Homme (EU 35 → 50)'; mTitle.setAttribute('data-cat','men'); card.appendChild(mTitle);
  card.appendChild(buildGdtTable('men', buildGdtRows(brand,'men')));

  const wTitle=document.createElement('div'); wTitle.className='section-title'; wTitle.textContent='Femme (EU 34 → 45)';
  wTitle.setAttribute('data-cat','women'); card.appendChild(wTitle);
  card.appendChild(buildGdtTable('women', buildGdtRows(brand,'women')));

  const kTitle=document.createElement('div'); kTitle.className='section-title'; kTitle.textContent='Enfant (EU 28 → 39)'; kTitle.setAttribute('data-cat','kids'); card.appendChild(kTitle);
  card.appendChild(buildGdtTable('kids', buildGdtRows(brand,'kids')));

  main.appendChild(card);
  const bTitle = document.getElementById('brandTitle');
  if(bTitle) bTitle.textContent=brand;
  
  const note=document.getElementById('brandNote');
  if(note) {
      if(brand==='Converse') note.textContent='Converse a tendance à tailler petit — envisager +0.5 à 1.0 cm de marge.';
      else if(brand==='Timberland') note.textContent='Timberland peut tailler large — vérifie le guide modèle.';
      else note.textContent='Astuce : mesure ton pied en cm — choisis la taille dont la longueur est égale ou légèrement supérieure.';
  }
}

function initGDT(brandNameInput) {
    const modal = document.getElementById('modal-gdt'); 
    if(!modal) return;
    
    openPanel(modal);
    
    let currentBrand = 'Nike';
    if (brandNameInput) {
        const inputLower = brandNameInput.toLowerCase();
        const found = GDT_BRANDS.find(b => {
            const bLower = b.toLowerCase();
            return inputLower.includes(bLower) || bLower.includes(inputLower);
        });
        if (found) currentBrand = found;
        else if (inputLower.includes('jordan')) currentBrand = 'Jordan';
        else if (inputLower.includes('yeezy')) currentBrand = 'Adidas';
    }

    const controls = document.getElementById('controls');
    if (controls) {
        controls.innerHTML = '';
        GDT_BRANDS.forEach((b, i) => {
            const btn = document.createElement('button'); 
            btn.className = 'tab'; 
            btn.textContent = b;
            if (b === currentBrand) btn.classList.add('active');
            btn.addEventListener('click', () => { 
                document.querySelectorAll('#modal-gdt .tab').forEach(x=>x.classList.remove('active')); 
                btn.classList.add('active'); 
                renderGdtBrand(b); 
            });
            controls.appendChild(btn);
        });
    }
    renderGdtBrand(currentBrand);
}
/* =================================================================
   ⚡ KICKS FRONTEND V32.8 (PARTIE 2 : PANIER, CHECKOUT & COOKIES)
================================================================= */

/* --- GESTION PANIER & UPSELL DYNAMIQUE --- */

function loadCart() { 
    try { 
        const saved = localStorage.getItem('kicks_cart');
        if (saved) state.cart = JSON.parse(saved); 
        updateCartUI(); 
    } catch (e) { 
        state.cart = [];
    } 
}

function saveCart() { 
    localStorage.setItem('kicks_cart', JSON.stringify(state.cart));
}

function addToCart(product, size, qty) {
    // 1. GESTION DU CHARGEMENT DES COMMUNES (À LA DEMANDE)
    // On vérifie si les villes sont déjà chargées dans l'état global
    if (!state.allCities || state.allCities.length === 0) {
        console.log("📦 Premier ajout au panier détecté : Chargement du JSON des communes...");
        fetchAllCities(); 
    }

    // 2. TA LOGIQUE DE VÉRIFICATION DE LIMITE (EXISTANTE)
    const totalItems = state.cart.reduce((acc, item) => acc + item.qty, 0);
    if ((totalItems + qty) > CONFIG.MAX_QTY_PER_CART) { 
        alert(CONFIG.MESSAGES.STOCK_LIMIT); 
        return; 
    }
    
    // Récupération du stock réel selon la taille
    const limit = (product.stockDetails && product.stockDetails[size]) 
        ? parseInt(product.stockDetails[size]) 
        : product.stock;
        
    const existing = state.cart.find(i => i.id === product.id && i.size === size);
    const currentQty = existing ? existing.qty : 0;
    
    if ((currentQty + qty) > limit) { 
        alert(`Stock insuffisant. Il ne reste que ${limit} paires.`); 
        return; 
    }

    // --- CONSTRUCTION DE L'URL ABSOLUE (IMAGE) ---
let relativePath = product["Lien URL"] || 'assets/placeholder.jpg';
let fullImageUrl = relativePath;

// Si le chemin ne commence pas par http, on met le domaine officiel de ton site
if (relativePath.indexOf('http') !== 0) {
    // ON FORCE LE VRAI DOMAINE pour que les mails affichent les photos
    const baseUrl = "https://kixx.fr"; 
    
    // Nettoyage des slashes
    fullImageUrl = baseUrl + (relativePath.startsWith('/') ? '' : '/') + relativePath;
}

    if (existing) {
        existing.qty += qty;
    } else {
        state.cart.push({ 
            id: product.id, 
            model: product.model, 
            brand: product.brand, 
            price: product.price, 
            image: fullImageUrl, // L'URL complète et correcte est enregistrée ici
            size: size, 
            qty: qty, 
            stockMax: limit,
            // CORRECTION : On utilise bien la clé MAJUSCULE du JSON
            cartUpsellId: product.CART_UPSELL_ID || null, 
        });
    }

    saveCart(); 
    updateCartUI();
    closePanel(document.getElementById('product-modal')); 
    openPanel(document.getElementById('cart-drawer'));
}

function changeQty(index, delta) { 
    const item = state.cart[index]; 
    if (!item) return;
    const newQty = item.qty + delta; 
    if (delta > 0 && newQty > item.stockMax) { alert(`Stock max atteint (${item.stockMax}).`); return; } 
    if (newQty <= 0) { removeFromCart(index); return; } 
    item.qty = newQty;
    saveCart(); updateCartUI(); 
}

function removeFromCart(index) { 
    state.cart.splice(index, 1); 
    saveCart(); updateCartUI();
}

function updateCartUI() {
    const list = document.getElementById('cart-items'); 
    const badge = document.getElementById('cart-count'); 
    const totalEl = document.getElementById('cart-total-price');
    const qtyEl = document.getElementById('cart-qty');
    
    if (!list) return; 
    list.innerHTML = ""; 
    let total = 0; 
    let count = 0;
    state.cart.forEach((item) => { 
        total += item.price * item.qty; 
        count += item.qty; 
    });

    if (state.cart.length === 0) { 
        list.innerHTML = `<div style="text-align:center; padding:40px; color:#888;">${CONFIG.MESSAGES.EMPTY_CART}</div>`;
        if(badge) badge.classList.add('hidden'); 
    } 
    else {
        const remaining = CONFIG.FREE_SHIPPING_THRESHOLD - total;
        let progressHtml = remaining > 0 ? 
            `<div style="padding:10px; background:var(--bg-secondary); margin-bottom:15px; border-radius:4px; font-size:0.9rem; border:1px solid var(--border-color);">Plus que <b>${formatPrice(remaining)}</b> pour la livraison offerte !<div style="height:4px; background:#ddd; margin-top:5px; border-radius:2px;"><div style="width:${Math.min(100, ((CONFIG.FREE_SHIPPING_THRESHOLD - remaining) / CONFIG.FREE_SHIPPING_THRESHOLD) * 100)}%; height:100%; background:#00c853; border-radius:2px;"></div></div></div>` : 
            `<div style="padding:10px; background:#e8f5e9; color:#2e7d32; margin-bottom:15px; border-radius:4px; font-weight:bold; text-align:center;">🎉 Livraison OFFERTE !</div>`;
        list.insertAdjacentHTML('beforeend', progressHtml);

        state.cart.forEach((item, idx) => { 
            // --- CORRECTIFS POUR COMPATIBILITÉ BDD_PRODUITS ---
            // On priorise 'item.image' (le lien réel de la Col F) et 'item.model' (le MasterName de la Col B)
            const itemImg = item.image || item.img || `assets/img/${item.model}.jpg`; 
            const itemName = item.model || item.name || "Produit KICKS";

            const div = document.createElement('div'); 
            div.className = 'cart-item'; 
            div.innerHTML = `
                <img src="${itemImg}" style="width:60px; height:60px; object-fit:cover; border-radius:4px; background:#f4f4f4;" onerror="this.src='assets/img/placeholder.jpg'">
                <div style="flex:1;">
                    <div style="font-weight:600; font-size:0.9rem;">${itemName}</div>
                    <div style="font-size:0.8rem; color:#666;">Taille: ${item.size}</div>
                    <div style="font-weight:700; margin-top:4px;">${formatPrice(item.price)}</div>
                    <div class="qty-control" style="display:flex; align-items:center; gap:10px; margin-top:5px;">
                        <button onclick="changeQty(${idx}, -1)" class="qty-btn">-</button>
                        <span>${item.qty}</span>
                        <button onclick="changeQty(${idx}, 1)" class="qty-btn">+</button>
                        <button onclick="removeFromCart(${idx})" class="remove-btn">Retirer</button>
                    </div>
                </div>`; 
            list.appendChild(div); 
        });

        // --- GESTION UPSELL ---
        const triggerItem = state.cart.find(item => item.cartUpsellId && item.cartUpsellId.length > 1);
        const targetUpsellId = triggerItem ? triggerItem.cartUpsellId : CONFIG.UPSELL_ID;
        const accessory = state.products.find(p => p.id === targetUpsellId);
        const isAccessoryInCart = state.cart.some(item => item.id === targetUpsellId);
        if (accessory && !isAccessoryInCart && accessory.stock > 0) {
            const sizeRecommendation = triggerItem ? triggerItem.size : (accessory.sizesList[0] || 'TU');
            const phraseAccroche = triggerItem ? `Complétez votre commande de ${triggerItem.model} !` : "Ne manquez pas cet accessoire !";
            const upsellHtml = `
                <div style="background:#fff8e1; border:1px solid #ffc107; padding:15px; border-radius:6px; margin-top:15px; display:flex; gap:10px; align-items:center;">
                    <img src="${accessory.images[0] || 'assets/placeholder.jpg'}" style="width:50px; height:50px; object-fit:cover; border-radius:4px;">
                    <div style="flex:1;">
                        <p style="margin:0; font-weight:bold; font-size:0.9rem; color:#111;">${phraseAccroche}</p>
                        <p style="margin:2px 0 8px; font-size:0.8rem;">Ajouter <strong>${accessory.model}</strong> (${sizeRecommendation}) pour ${formatPrice(accessory.price)}</p>
                        <button id="add-upsell-btn" data-id="${accessory.id}" data-size="${sizeRecommendation}" style="background:#ffc107; color:#111; border:none; padding:5px 10px; border-radius:4px; font-weight:bold; font-size:0.75rem; cursor:pointer;">Ajouter au Panier</button>
                    </div>
                </div>
            `;
            list.insertAdjacentHTML('beforeend', upsellHtml);
            
            setTimeout(() => {
                const upsellBtn = document.getElementById('add-upsell-btn');
                if (upsellBtn) {
                    upsellBtn.addEventListener('click', () => {
                        const recSize = upsellBtn.getAttribute('data-size');
                        const recId = upsellBtn.getAttribute('data-id');
                        const productToAdd = state.products.find(p => p.id === recId);
                        if(productToAdd) addToCart(productToAdd, recSize, 1);
                    });
                }
            }, 0);
        }

        if(badge) { badge.innerText = count; badge.classList.remove('hidden'); }

        // --- INCITATION PAYPAL AVEC RÉAJUSTEMENT LIVRAISON ---
        const shippingCost = state.currentShippingRate ? (state.currentShippingRate.price || 0) : 0;
        const finalTotal = total + shippingCost;
        let paypalHtml = "";
        
        if (finalTotal > 0 && finalTotal < 30) {
            const missing = (30 - finalTotal).toFixed(2);
            paypalHtml = `
                <div class="paypal-incentive" style="background:#fff9e6; border:1px dashed #ffcc00; padding:10px; border-radius:6px; margin-top:15px; font-size:0.85rem; color:#856404; text-align:center;">
                    Ajoutez <strong>${missing}€</strong> pour profiter du <strong>Paiement en 4X</strong> sans frais avec PayPal.
                </div>`;
        } else if (finalTotal >= 30) {
            const monthly = (finalTotal / 4).toFixed(2);
            paypalHtml = `
                <div class="paypal-incentive" style="background:#e6f3ff; border:1px solid #0070ba; padding:10px; border-radius:6px; margin-top:15px; font-size:0.85rem; color:#003087; text-align:center; animation: paypalPulse 2s infinite;">
                    Éligible au <strong>Paiement en 4X</strong> PayPal : 4 mensualités de <strong>${monthly}€</strong>.
                </div>`;
        }
        list.insertAdjacentHTML('beforeend', paypalHtml);
    }
    
    if(totalEl) totalEl.innerText = formatPrice(total); 
    if(qtyEl) qtyEl.innerText = count;

    // --- RELANCE CALCUL LIVRAISON (ZONES SENSIBLES) ---
    if (typeof calculateShipping === 'function' && document.getElementById('checkout-step-2')?.classList.contains('active')) {
        calculateShipping();
    }
}

/* --- RECHERCHE --- */
function initSearch() {
    const input = document.getElementById('search-input'); 
    const resultsBox = document.getElementById('search-results');
    const searchBtn = document.getElementById('search-btn');
    
    if (!input || !resultsBox || !searchBtn) return;
    if (isMobileOrTablet()) {
        resultsBox.classList.add('hidden');
    }

    input.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase().trim(); 
        if (q.length < 2) { 
            resultsBox.classList.add('hidden'); 
            return; 
        }
        const hits = state.products.filter(p => (p.model && p.model.toLowerCase().includes(q)) || (p.brand && p.brand.toLowerCase().includes(q))).slice(0, 5);
        resultsBox.innerHTML = '';
    
        if (hits.length === 0) resultsBox.innerHTML = '<div class="search-result-item">Aucun résultat</div>';
        else { 
            hits.forEach(p => { 
                const item = document.createElement('div'); 
                item.className = 'search-result-item'; 
                const img = (p.images && p.images[0]) ? p.images[0] : ''; 
                item.innerHTML = `<img src="${img}"><div><span style="font-weight:bold">${p.model}</span><br><small>${formatPrice(p.price)}</small></div>`; 
                item.addEventListener('click', () => { 
                    openProductModal(p);
                    resultsBox.classList.add('hidden'); 
                    input.value = ''; 
                }); 
                resultsBox.appendChild(item); 
            }); 
        }
        resultsBox.classList.remove('hidden');
    });
    document.addEventListener('click', (e) => { 
        if (!input.contains(e.target) && !resultsBox.contains(e.target) && !searchBtn.contains(e.target)) {
            resultsBox.classList.add('hidden'); 
        }
    });
}

function updateThemeIcons(isDark) { 
    const sun = document.querySelector('.icon-sun'); 
    const moon = document.querySelector('.icon-moon');
    if (sun && moon) { 
        sun.classList.toggle('hidden', isDark); 
        moon.classList.toggle('hidden', !isDark);
        moon.style.color = isDark ? "#ffffff" : "inherit"; 
    } 
}

/* --- LOGIQUE MOBILE & OFF-CANVAS --- */
function setupMobileFilters() {
    const isMobile = isMobileOrTablet();
    const filterBar = document.getElementById('filters-bar');
    const mobileContent = document.getElementById('mobile-filters-content');
    const mobileTrigger = document.getElementById('mobile-menu-trigger');
    const filterDrawer = document.getElementById('mobile-filter-drawer');
    const applyBtn = document.getElementById('apply-filters-btn');
    const searchContainer = document.querySelector('.search-container');
    const headerContainer = document.querySelector('.header-container'); 

    if (!mobileContent || !searchContainer || !headerContainer) return;
    if (isMobile) {
        if (!mobileContent.contains(searchContainer)) {
            const searchWrapper = document.createElement('div');
            searchWrapper.id = 'mobile-search-wrapper';
            searchWrapper.style.cssText = 'padding: 10px 0; border-bottom: 1px solid var(--border-color); margin-bottom: 15px;';
            searchWrapper.appendChild(searchContainer);
            
            mobileContent.prepend(searchWrapper);
            searchContainer.style.display = 'block';
        }

        if (filterBar.children.length > 0) {
            const fragment = document.createDocumentFragment();
            while (filterBar.firstChild) {
                fragment.appendChild(filterBar.firstChild);
            }
            mobileContent.innerHTML = ''; 
            mobileContent.appendChild(searchContainer.parentElement);
            mobileContent.appendChild(fragment); 
            filterBar.style.display = 'none';
        }

        if (mobileTrigger) {
            mobileTrigger.classList.remove('hidden');
            mobileTrigger.addEventListener('click', () => {
                openPanel(filterDrawer);
            });
        }
        
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                closePanel(filterDrawer);
                renderCatalog(true); 
            });
        }

    } else { 
        if (!headerContainer.contains(searchContainer)) {
            const headerActions = document.querySelector('.header-actions');
            if (headerActions && searchContainer.parentElement.id === 'mobile-search-wrapper') {
                headerContainer.insertBefore(searchContainer, headerActions);
                const mobileWrapper = document.getElementById('mobile-search-wrapper');
                if(mobileWrapper) mobileWrapper.remove();
                searchContainer.style.display = ''; 
            }
        }
        if (filterBar) filterBar.style.display = 'flex';
        const mobileTrigger = document.getElementById('mobile-menu-trigger');
        if (mobileTrigger) mobileTrigger.classList.add('hidden');
    }
}

/* --- ÉCOUTEURS GLOBAUX & AVIS CLIENT (CORRIGÉ) --- */
function setupGlobalListeners() {
    // Panier
    const cartTrig = document.getElementById('cart-trigger');
    if (cartTrig) {
        cartTrig.addEventListener('click', (e) => {
            e.stopPropagation(); // Empêche la répercussion du clic
            openPanel(document.getElementById('cart-drawer'));
        });
    }

    // Fermeture
    document.addEventListener('click', (e) => {
        const el = e.target;
        if (el.classList.contains('close-drawer') || el.classList.contains('drawer-overlay') || el.classList.contains('close-modal') || el.classList.contains('modal-overlay')) {
            const parent = el.closest('.modal') || el.closest('.drawer');
            if(parent) {
                closePanel(parent);
                if (parent.id === 'product-modal') {
                    document.title = "KICKS | Sneakers Exclusives";
                    const metaDesc = document.getElementById('meta-description');
                    if (metaDesc) metaDesc.setAttribute('content', "KICKS - La référence sneakers exclusives. Livraison 48H authenticité garantie.");
                }
            }
        }
    });

    // Modales Footer (CORRIGÉ : STOP PROPAGATION AJOUTÉ)
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-modal]');
        if (btn) { 
            e.stopPropagation(); // BLOQUE LE CONFLIT AVEC LA NEWSLETTER
            const modalId = btn.getAttribute('data-modal');
            const targetModal = document.getElementById(modalId); 
            
            if(targetModal) {
                // Modification : Chargement site AVC Kicks dans la modale
                if (modalId === 'modal-avis') {
                    const contentBox = targetModal.querySelector('.modal-content');
                    if (contentBox) {
                        contentBox.innerHTML = `
                            <button class="close-modal" style="position:absolute; top:10px; right:10px; z-index:99; background:white; border-radius:50%; width:30px; height:30px; border:1px solid #ddd; cursor:pointer; font-weight:bold; color:black;">✕</button>
                            <iframe src="https://avc.kixx.fr" style="width:100%; height:100%; min-height:80vh; border:none; display:block;" allow="autoplay"></iframe>
                        `;
                        contentBox.style.padding = "0";
                        contentBox.style.overflow = "hidden";
                    }
                }
                
                openPanel(targetModal);
                if(isMobileOrTablet()) {
                    const content = targetModal.querySelector('.modal-content');
                    if(content) content.scrollTop = 0;
                }
            }
        }
    });

    // Dark Mode
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Sécurité anti-conflit
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('kicks_theme', isDark ? 'dark' : 'light');
            updateThemeIcons(isDark);
        });
    }

    // Checkout Trigger
    const checkoutBtn = document.getElementById('checkout-trigger-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Empêche le clic de traverser vers le fond
            if (state.cart.length === 0) { alert(CONFIG.MESSAGES.EMPTY_CART); return; }
            closePanel(document.getElementById('cart-drawer'));
            initCheckoutUI(); 
            openPanel(document.getElementById('modal-checkout')); 
            setTimeout(renderRecaptchaV2, 500); 
            const checkoutModal = document.getElementById('modal-checkout');
            if (isMobileOrTablet() && checkoutModal) {
                checkoutModal.querySelector('.modal-content').scrollTop = 0;
            }
        });
    }
}
    // Dark Mode
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('kicks_theme', isDark ? 'dark' : 'light');
            updateThemeIcons(isDark);
        });
    }

    // Checkout Trigger
const checkoutBtn = document.getElementById('checkout-trigger-btn');
if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
        if (state.cart.length === 0) { 
            alert(CONFIG.MESSAGES.EMPTY_CART); 
            return; 
        }
        closePanel(document.getElementById('cart-drawer'));
        initCheckoutUI(); 
        openPanel(document.getElementById('modal-checkout')); 
        setTimeout(renderRecaptchaV2, 500); 
        
        const checkoutModal = document.getElementById('modal-checkout');
        if (isMobileOrTablet() && checkoutModal) {
            checkoutModal.querySelector('.modal-content').scrollTop = 0;
        }
    });
}

// === FIN DU FICHIER ===
// Note : Assure-toi qu'il n'y a plus aucune accolade '}' seule après ce bloc.

/* --- CHECKOUT UI & LOGIQUE (CORRIGÉ) --- */
function initCheckoutUI() {
    const btnVirement = document.getElementById('btn-pay-virement');
    if (btnVirement) {
        // Suppression de l'ancienne fonction 'initiateBankTransferWrapper'
        // On lie directement le bouton à ta fonction de traitement complète
        btnVirement.onclick = (e) => submitManualOrder(e);
    }
    
    state.currentPaymentMethod = "CARD";
    state.appliedPromoCode = null;
    state.promoDiscountAmount = 0;
    
    const paysSelect = document.getElementById('ck-pays');
    if (paysSelect) {
        paysSelect.addEventListener('change', () => updateShippingOptions(paysSelect.value));
    }

    const villeInput = document.getElementById('ck-ville');
    const cpInput = document.getElementById('ck-cp');

    if (villeInput) villeInput.addEventListener('input', updateExpressShipping);
    if (cpInput) cpInput.addEventListener('input', updateExpressShipping);

    const methodBtns = document.querySelectorAll('.pay-btn-select');
    methodBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Sécurité anti-conflit newsletter
            methodBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            state.currentPaymentMethod = btn.getAttribute('data-method');
            initPaymentButtonsArea(); 
            updateCheckoutTotal();
        });
    });

    const promoBtn = document.getElementById('apply-promo-btn');
    if(promoBtn) {
        promoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            applyPromoCode();
        });
    }

    initPaymentButtonsArea();
    updateCheckoutTotal();
    initAutocomplete();
    initFormNavigation();
}

function initFormNavigation() {
    const form = document.getElementById('checkout-form');
    if (!form) return;
    
    const inputs = form.querySelectorAll('input, select');
    inputs.forEach((input, index) => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const nextInput = inputs[index + 1];
                if (nextInput) {
                    nextInput.focus();
                } else {
                    document.querySelector('.checkout-summary-col').scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });
}

function initAutocomplete() {
    const cpInput = document.getElementById('ck-cp');
    const villeInput = document.getElementById('ck-ville');
    if (!cpInput || !villeInput) return;

    let suggestionsBox = document.getElementById('cp-suggestions');
    if (!suggestionsBox) return;

    suggestionsBox.style.display = 'none';

    cpInput.addEventListener('input', (e) => {
        const cpVal = e.target.value.trim(); 
        
        if (cpVal.length < 2 || !state.allCities || state.allCities.length === 0) { 
             suggestionsBox.style.display = 'none'; 
             if (typeof updateExpressShipping === 'function') updateExpressShipping(); 
             return; 
        }

        const matches = state.allCities.filter(c => {
            const code = String(c.cp || "").trim();
            return code.startsWith(cpVal);
        }).slice(0, 8);

        suggestionsBox.innerHTML = '';

        if (matches.length > 0) {
            suggestionsBox.style.display = 'block';
            matches.forEach(c => {
                const li = document.createElement('li'); 
                li.innerText = `${c.cp} - ${c.ville}`;
                li.style.cursor = 'pointer';
                
                li.onclick = (event) => { 
                    event.preventDefault();
                    cpInput.value = c.cp; 
                    villeInput.value = c.ville; 
                    suggestionsBox.style.display = 'none'; 
                    
                    // On déclenche les events pour le calcul des frais et le backend
                    cpInput.dispatchEvent(new Event('input', { bubbles: true })); 
                    villeInput.dispatchEvent(new Event('change', { bubbles: true }));
                    
                    if (typeof updateExpressShipping === 'function') updateExpressShipping();
                };
                suggestionsBox.appendChild(li);
            });
        } else {
            suggestionsBox.style.display = 'none';
        }
    });

    document.addEventListener('click', (e) => { 
        if (e.target !== cpInput && !suggestionsBox.contains(e.target)) {
            suggestionsBox.style.display = 'none'; 
        }
    });
}

    // Fermeture de la boîte si on clique à l'extérieur
document.addEventListener('click', (e) => { 
    // On récupère les éléments en temps réel
    const inputCP = document.getElementById('checkout-cp'); // Vérifie que l'ID est bien celui de ton champ CP
    const sBox = document.getElementById('suggestions-cp'); // Vérifie que l'ID est bien celui de ta liste

    if (inputCP && sBox) {
        if (e.target !== inputCP && !sBox.contains(e.target)) {
            sBox.style.display = 'none'; 
        }
    }
});
	
/* --- GESTION PANIER ABANDONNÉ --- */
async function syncAbandonedCart() {
    const customer = getFormData(); 
    if (!customer || !customer.email || state.cart.length === 0) return;

    // Préparation d'un panier complet avec infos produits pour éviter le NaN et les images vides
    const fullCart = state.cart.map(item => {
        const productInfo = state.products ? state.products.find(p => p.id === (item.model || item.id)) : null;
        return {
            ...item,
            name: item.name || (productInfo ? productInfo.name : "Produit"),
            price: item.price || (productInfo ? productInfo.price : 0),
            img: item.img || (productInfo ? productInfo.image || productInfo.img : "")
        };
    });

    const params = new URLSearchParams({ action: 'syncAbandonedCart' });
    const payload = {
        client: customer,
        cart: fullCart,
        total: document.getElementById('checkout-total')?.innerText || "0"
    };

    try {
        await fetch(CONFIG.getAuthUrl(params), { 
            method: 'POST', 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload) 
        });
    } catch (e) { 
        console.warn("Sync failed", e); 
    }
}

/* --- LIVRAISON DYNAMIQUE --- */
function updateExpressShipping() {
    const paysSelect = document.getElementById('ck-pays');
    const selectedZone = paysSelect ? paysSelect.value : null;
    
    if(selectedZone) {
         updateShippingOptions(selectedZone);
    } else {
        const container = document.getElementById('shipping-options-container');
        if (container) container.innerHTML = '<div style="color:#666; font-style:italic; padding:10px;">Veuillez choisir votre pays de livraison.</div>';
        state.currentShippingRate = null;
        updateCheckoutTotal();
    }
}

function updateShippingOptions(selectedZone) {
    const container = document.getElementById('shipping-options-container');
    if (!container) return;
    container.innerHTML = '';

    const villeInput = document.getElementById('ck-ville');
    const cpInput = document.getElementById('ck-cp');
    
    if (!villeInput || !cpInput || villeInput.value.trim().length < 3) {
        container.innerHTML = '<div style="color:#666; font-style:italic; padding:10px;">Veuillez compléter votre adresse (CP et Ville) pour voir les tarifs.</div>';
        state.currentShippingRate = null;
        updateCheckoutTotal();
        return;
    }

    const cartSubtotal = state.cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
    const userCityRaw = villeInput.value;
    const userCityNorm = normalizeString(userCityRaw);

    let validRates = state.shippingRates.filter(rate => {
        if (rate.code !== selectedZone) return false;
        if (String(rate.name).toLowerCase().includes('express') || rate.isSensitive) return false;

        const min = parseFloat(rate.min || 0);
        const max = parseFloat(rate.max || 999999);
        const isFreeShippingRate = parseFloat(rate.price) === 0;
        
        if (cartSubtotal >= CONFIG.FREE_SHIPPING_THRESHOLD && isFreeShippingRate) return true;
        if (!isFreeShippingRate) return cartSubtotal >= min && cartSubtotal <= max;
        return false;
    });

    if (selectedZone === 'Guadeloupe' || selectedZone === 'Martinique' || selectedZone === 'Guyane') {
        const isEligible = state.expressZones.some(zoneKeyword => userCityNorm.includes(zoneKeyword));
        if (isEligible) {
            const expressRate = state.shippingRates.find(r => 
                r.code === selectedZone && 
                (String(r.name).toLowerCase().includes('express') || r.isSensitive)
            );
            if (expressRate) {
                const min = parseFloat(expressRate.min || 0);
                const max = parseFloat(expressRate.max || 999999);
                if (cartSubtotal >= min && cartSubtotal <= max) {
                    validRates.push(expressRate);
                }
            }
        }
    }

    if (validRates.length === 0) {
        container.innerHTML = '<div style="color:red; padding:10px;">Aucune livraison disponible pour cette zone/montant.</div>';
        state.currentShippingRate = null;
    } else {
        validRates.sort((a, b) => (parseFloat(a.price)||0) - (parseFloat(b.price)||0));
        validRates.forEach((rate, idx) => {
            const label = document.createElement('label');
            const logoHtml = rate.logo ? `<img src="${rate.logo}" style="height:25px; margin-right:10px; object-fit:contain;">` : '';
            const price = parseFloat(rate.price || 0);
            const priceTxt = price === 0 ? "OFFERT" : formatPrice(price);
            const color = price === 0 ? "#00c853" : "#000";
            
            const isExpress = String(rate.name).toLowerCase().includes('express') || rate.isSensitive;
            const bgStyle = isExpress ? "background:#fff8e1; border:1px solid #ffc107;" : "";
            
            const isSelected = (!state.currentShippingRate && idx === 0) || (state.currentShippingRate && state.currentShippingRate.name === rate.name && state.currentShippingRate.code === rate.code);

            label.innerHTML = `
                <div class="shipping-option" style="display:flex; align-items:center; width:100%; cursor:pointer; padding:10px; border-radius:6px; ${bgStyle}">
                    <input type="radio" name="shipping_method" value="${idx}" ${isSelected?'checked':''} style="margin-right:15px;">
                    ${logoHtml}
                    <div style="flex:1;">
                        <span style="font-weight:700;">${rate.name}</span>
                        ${isExpress ? '<br><small style="color:#d32f2f; font-weight:bold;">🚀 Livraison Rapide 24h</small>' : ''}
                    </div>
                    <b style="color:${color}">${priceTxt}</b>
                </div>
            `;
            
            label.querySelector('input').addEventListener('change', () => { 
                state.currentShippingRate = rate; 
                updateCheckoutTotal(); 
            });
            container.appendChild(label);
            
            if(isSelected || (!state.currentShippingRate && idx === 0)) state.currentShippingRate = rate;
        });
    }
    updateCheckoutTotal();
}

function updateCheckoutTotal() {
    const subTotal = state.cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
    const shipping = state.currentShippingRate ? parseFloat(state.currentShippingRate.price) : 0;
    const discount = state.appliedPromoCode ? state.promoDiscountAmount : 0;
    const baseTotal = Math.max(0, subTotal + shipping - discount);
    
    const feeConfig = CONFIG.FEES[state.currentPaymentMethod] || CONFIG.FEES.CARD;
    let fees = 0;
    
    if (state.currentPaymentMethod !== 'CARD' && state.currentPaymentMethod !== 'VIREMENT') {
        fees = (baseTotal * feeConfig.percent) + feeConfig.fixed;
    }
    
    fees = Math.max(0, fees);
    const grandTotal = baseTotal + fees;
    const setText = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val; };
    
    setText('checkout-subtotal', formatPrice(subTotal));
    setText('checkout-shipping', state.currentShippingRate ? (shipping===0?"Offert":formatPrice(shipping)) : "...");
    
    const discRow = document.getElementById('discount-row');
    if (discRow) {
        if(discount > 0) { 
            discRow.classList.remove('hidden'); 
            setText('checkout-discount', "- " + formatPrice(discount));
        } else discRow.classList.add('hidden');
    }

    const feesRow = document.getElementById('fees-row');
    const feesEl = document.getElementById('checkout-fees');
    if (feesRow && feesEl) {
        if (fees > 0) { 
            feesRow.style.display = 'flex';
            feesRow.classList.remove('hidden');
            feesEl.innerText = "+ " + formatPrice(fees);
        } else {
            feesRow.style.display = 'none';
            feesRow.classList.add('hidden');
        }
    }

    setText('checkout-total', formatPrice(grandTotal));
    
    const payLabel = document.getElementById('btn-pay-label');
    if (payLabel) {
        if (state.currentPaymentMethod === 'KLARNA') payLabel.innerText = `🌸 Payer ${formatPrice(grandTotal)}`;
        else if (state.currentPaymentMethod === 'CARD') payLabel.innerText = `💳 Payer par Carte`;
    }

    // --- ICI TU METS LES // POUR STOPPER LE DOUBLON ---
    // syncAbandonedCart(); 
}

/* --- PAIEMENTS & HELPERS --- */

function initPaymentButtonsArea() {
    let btnVirement = document.getElementById('btn-pay-virement');
    const payActions = document.querySelector('.payment-actions');
    if (!btnVirement && payActions) {
        btnVirement = document.createElement('button');
        btnVirement.id = 'btn-pay-virement';
        btnVirement.className = 'btn-primary full-width hidden';
        btnVirement.innerText = "💶 Confirmer le Virement";
        payActions.appendChild(btnVirement);
    }
    btnVirement = document.getElementById('btn-pay-virement');
    const stripeBtn = document.getElementById('btn-pay-stripe');
    const paypalDiv = document.getElementById('paypal-button-container');
    const method = state.currentPaymentMethod;
    if(stripeBtn) {
        stripeBtn.classList.add('hidden');
        const newBtn = stripeBtn.cloneNode(true);
        stripeBtn.parentNode.replaceChild(newBtn, stripeBtn);
        newBtn.addEventListener('click', handleStripePayment);
    }
    
    if(paypalDiv) paypalDiv.classList.add('hidden');
    if(btnVirement) btnVirement.classList.add('hidden');
    if (method === 'VIREMENT') {
        if(btnVirement) btnVirement.classList.remove('hidden');
    } else if (method === 'PAYPAL_4X') {
        if(paypalDiv) { paypalDiv.classList.remove('hidden'); initPayPalButtons();
        }
    } else { // CARD / KLARNA
        const sBtn = document.getElementById('btn-pay-stripe');
        if(sBtn) sBtn.classList.remove('hidden');
    }
}

// A. VIREMENT (SÉCURISÉ)
function initiateBankTransfer(customer) {
    const btn = document.getElementById('btn-pay-virement');
    
    // 1. Récupération du jeton de la case à cocher
    const recaptchaResponse = grecaptcha.getResponse();

    if (!recaptchaResponse) {
        alert("⚠️ Sécurité : Veuillez cocher la case 'Je ne suis pas un robot'. Si le test a expiré, merci de cliquer à nouveau dessus.");
        if (typeof grecaptcha !== 'undefined') {
            grecaptcha.reset(); 
        }
        return;
    }

    // 2. Calcul des montants
    const subTotal = state.cart.reduce((acc, i) => acc + (i.price * i.qty), 0);
    const shippingCost = state.currentShippingRate ? parseFloat(state.currentShippingRate.price) : 0;
    const discount = state.appliedPromoCode ? state.promoDiscountAmount : 0;
    const total = Math.max(0, subTotal + shippingCost - discount);

    // 3. Préparation du payload (Structure réalignée intelligemment sur le Backend)
    const customerData = {
        prenom: customer.prenom,
        nom: customer.nom,
        email: customer.email,
        tel: customer.tel,
        adresse: customer.adresse,
        cp: customer.cp,
        ville: customer.ville,
        pays: customer.pays
    };

    const payload = { 
        action: 'recordManualOrder', 
        source: 'VIREMENT', 
        recaptchaToken: recaptchaResponse,
        
        // On envoie les 3 variantes pour satisfaire toutes les conditions du Backend (putrie.txt)
        client: customerData,
        customerDetails: customerData,
        customer: customerData,

        cart: JSON.parse(localStorage.getItem('kicks_cart') || '[]'), 
        total: total.toFixed(2), 
        promoCode: state.appliedPromoCode,
        shippingRate: state.currentShippingRate,
        shippingName: state.currentShippingRate ? state.currentShippingRate.name : "Standard",
        shippingPrice: state.currentShippingRate ? state.currentShippingRate.price : 0
    };

    if (btn) { btn.disabled = true; btn.innerText = "Traitement sécurisé..."; }

    // 4. Envoi au Backend avec URL sécurisée
    const params = new URLSearchParams({ action: 'recordManualOrder' });
    const secureUrl = CONFIG.getAuthUrl(params);

    fetch(secureUrl, { 
        method: 'POST', 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload) 
    })
    .then(res => res.json())
    .then(res => {
        if(res.error) throw new Error(res.error);
        
        // Succès
        closePanel(document.getElementById('modal-checkout'));
        localStorage.removeItem('kicks_cart');
        state.cart = []; 
        if (typeof updateCartUI === 'function') updateCartUI();
        
        // --- CORRECTIF : BLINDAGE RIB INTELLIGENT ---
        // 1. On récupère l'objet, peu importe s'il s'appelle 'rib' ou 'RIB'
        const ribData = res.rib || res.RIB || {};
        
        // 2. On extrait chaque valeur en testant les deux versions (MAJ et min)
        // Ajout de l'adresse de la banque (RIB_ADRESSE / adresse)
        const infoBank = {
            iban: ribData.IBAN || ribData.iban || 'N/A',
            bic: ribData.BIC || ribData.bic || 'N/A',
            titulaire: ribData.TITULAIRE || ribData.titulaire || 'N/A',
            banque: ribData.BANQUE || ribData.banque || 'N/A',
            adresse: ribData.ADRESSE || ribData.adresse || '' 
        };

        // 3. On injecte dans le HTML (incluant l'adresse si elle existe)
        const ribHtml = `
            <div style="text-align:left; background:var(--bg-secondary); color:var(--text-primary); padding:20px; border-radius:8px; margin-top:20px; font-size:0.9rem;">
                <h3>Détails du Virement</h3>
                <p>Montant : <strong>${formatPrice(total)}</strong></p>
                <p>Référence : <strong>${res.orderId || res.id}</strong></p>
                <hr style="border:0; border-top:1px solid #ccc; margin:10px 0;">
                <p><strong>TITULAIRE :</strong> ${infoBank.titulaire}</p>
                <p><strong>IBAN :</strong> ${infoBank.iban}</p>
                <p><strong>BIC :</strong> ${infoBank.bic}</p>
                <p><strong>BANQUE :</strong> ${infoBank.banque}</p>
                ${infoBank.adresse ? `<p><strong>ADRESSE BANQUE :</strong> ${infoBank.adresse}</p>` : ''}
            </div>`;
        
        showSuccessScreen(customer.prenom, `Commande enregistrée. Veuillez effectuer le virement.` + ribHtml);
        grecaptcha.reset(); 
    })
    .catch(e => { 
        alert("Erreur: " + e.message); 
        if (btn) { btn.disabled = false; btn.innerText = "💶 Confirmer le Virement"; }
        grecaptcha.reset();
    });
}
// --- CORRECTIF : Cette fonction attend que le script injecté par ton index.html soit prêt ---
async function initStripe() {
    return new Promise((resolve) => {
        // 1. On vérifie si Stripe est déjà là
        if (window.Stripe) {
            resolve(window.Stripe);
            return;
        }

        // 2. Si Stripe n'est pas encore là, on force le chargement s'il n'a pas commencé
        // On synchronise avec loadHeavyScripts pour ne pas bloquer les images
        if (typeof loadHeavyScripts === "function" && !window.scriptsLoaded) {
            if (document.readyState === 'complete') {
                // Si la page est déjà prête, on lance après un court délai
                setTimeout(loadHeavyScripts, 1000);
            } else {
                // Sinon, on attend le chargement complet (images incluses)
                window.addEventListener('load', () => {
                    setTimeout(loadHeavyScripts, 1000); // Délai réduit à 1s pour plus de réactivité
                });
            }
        }

        // 3. On surveille l'apparition de l'objet Stripe (et PayPal par extension)
        const interval = setInterval(() => {
            if (window.Stripe) {
                clearInterval(interval);
                resolve(window.Stripe);
            }
        }, 100);

        // Sécurité : timeout après 8 secondes pour ne pas bloquer l'utilisateur indéfiniment
        setTimeout(() => {
            clearInterval(interval);
            if (!window.Stripe) {
                console.warn("⚠️ Stripe/PayPal n'ont pas pu charger à temps.");
            }
            resolve(window.Stripe || null);
        }, 8000);
    });
}

// B. STRIPE & KLARNA
async function handleStripePayment() {
    // --- CORRECTIF : On s'assure que Stripe est chargé avant de continuer ---
    await initStripe();

    const recaptchaToken = getRecaptchaResponse();
    if (!recaptchaToken) { 
        alert(CONFIG.MESSAGES.ERROR_RECAPTCHA); 
        if (typeof grecaptcha !== 'undefined') grecaptcha.reset();
        return; 
    }
    
    const customer = getFormData(); 
    if (!customer) return;
    
    if (!state.currentShippingRate) { 
        alert("Choisissez une livraison."); 
        return; 
    }

    const btn = document.getElementById('btn-pay-stripe'); 
    if (btn) {
        btn.disabled = true;
        btn.innerText = "Redirection sécurisée...";
    }

    // --- PRÉPARATION DU PAYLOAD AVEC DOUBLE SYNTAXE POUR ÉVITER L'ERREUR STRIPE ---
    const payload = {
        action: 'createCheckoutSession',
        source: 'STRIPE',
        recaptchaToken: recaptchaToken, 
        cart: JSON.parse(localStorage.getItem('kicks_cart') || '[]'),
        
        // TRIPLE SÉCURITÉ POUR LE BACKEND
        client: customer,           
        customer: customer,         
        customerDetails: customer, 
        
        customerEmail: customer.email, 
        shippingRate: state.currentShippingRate,
        shippingName: state.currentShippingRate.name,
        shippingPrice: state.currentShippingRate.price,
        promoCode: state.appliedPromoCode,

        // On envoie les deux syntaxes pour être certain que le Backend et Stripe soient contents
        successUrl: window.location.origin + window.location.pathname + "?payment=success",
        cancelUrl: window.location.origin + window.location.pathname,
        success_url: window.location.origin + window.location.pathname + "?payment=success",
        cancel_url: window.location.origin + window.location.pathname
    };

    // Détermination du mode de paiement Stripe
    if (state.currentPaymentMethod === 'KLARNA') {
        payload.paymentMethod = 'KLARNA';
    } else {
        payload.paymentMethod = 'CARD';
    }

    try {
        // Ajout de la source dans les params pour le Backend
        const params = new URLSearchParams({ 
            action: 'createCheckoutSession',
            source: 'STRIPE' 
        });
        const secureUrl = CONFIG.getAuthUrl(params);

        const res = await fetch(secureUrl, { 
            method: 'POST', 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload) 
        });
        
        const json = await res.json();
        
        if (json.url) {
            // Redirection vers la page de paiement Stripe (Hébergée)
            window.location.href = json.url;
        } else {
            throw new Error(json.error || "Erreur Session Stripe/Klarna");
        }
    } catch (e) {
        console.error("Erreur Stripe:", e);
        alert(e.message); 
        if (btn) {
            btn.disabled = false;
            btn.innerText = (state.currentPaymentMethod === 'KLARNA') ? "Payez avec Klarna" : "Payer par Carte";
        }
        if (window.grecaptcha) grecaptcha.reset();
    }
}

// C. PAYPAL
function initPayPalButtons() {
    const container = document.getElementById('paypal-button-container'); 
    if (!container) return;
    
    // 1. Nettoyage physique du container
    container.innerHTML = "";

    // 2. Vérification SDK
    if (!window.paypal || !window.paypal.Buttons) {
        console.warn("PayPal SDK non chargé ou incomplet.");
        container.innerHTML = "<div style='color:red;font-size:12px;'>Erreur chargement PayPal. Recharger la page.</div>";
        return;
    }
    
    try {
        // 3. Création et Rendu du Bouton
        const paypalButtons = window.paypal.Buttons({
            style: { 
                layout: 'vertical', 
                color: 'gold', 
                shape: 'rect', 
                label: 'paypal' 
            },

            // Validation au clic
            onClick: function(data, actions) {
                const customer = getFormData();
                if (!customer || !state.currentShippingRate) { 
                    alert(CONFIG.MESSAGES.ERROR_FORM + " / Choix de livraison manquant."); 
                    return actions.reject(); 
                }

                const token = getRecaptchaResponse();
                if (!token) { 
                    alert(CONFIG.MESSAGES.ERROR_RECAPTCHA); 
                    if (window.grecaptcha) grecaptcha.reset();
                    return actions.reject(); 
                }
                
                return actions.resolve();
            },

            // Création de la transaction
            createOrder: function(data, actions) {
                const sub = state.cart.reduce((acc, i) => acc + i.price * i.qty, 0);
                const ship = state.currentShippingRate ? parseFloat(state.currentShippingRate.price) : 0;
                const base = Math.max(0, sub + ship - state.promoDiscountAmount);
                
                const fees = (base * CONFIG.FEES.PAYPAL_4X.percent) + CONFIG.FEES.PAYPAL_4X.fixed;
                const totalVal = (base + fees).toFixed(2);

                return actions.order.create({ 
                    purchase_units: [{ 
                        amount: { 
                            currency_code: 'EUR',
                            value: totalVal 
                        } 
                    }] 
                });
            },

            // Capture du paiement et enregistrement Sheet
            onApprove: function(data, actions) {
                return actions.order.capture().then(function(details) {
                    const customer = getFormData();
                    const token = getRecaptchaResponse();
                    const totalWithFees = details.purchase_units[0].amount.value;

                    // --- PAYLOAD AVEC TRIPLE SÉCURITÉ ---
                    const payload = { 
                        action: 'recordManualOrder', 
                        source: 'PAYPAL', 
                        recaptchaToken: token, 
                        paymentId: details.id, 
                        total: totalWithFees,
                        cart: JSON.parse(localStorage.getItem('kicks_cart') || '[]'), 

                        // TRIPLE SÉCURITÉ POUR PAYPAL
                        client: customer,          // Pour l'Email (data.client)
                        customer: customer,        // Pour la Sheet (data.customer)
                        customerDetails: customer, // Pour la Sheet (data.customerDetails)

                        promoCode: state.appliedPromoCode,
                        shippingRate: state.currentShippingRate,
						shippingName: state.currentShippingRate.name,  //
						shippingPrice: state.currentShippingRate.price //
                    };
                    
                    const params = new URLSearchParams({ action: 'recordManualOrder' });
                    const secureUrl = CONFIG.getAuthUrl(params);

                    fetch(secureUrl, { 
                        method: 'POST', 
                        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                        body: JSON.stringify(payload) 
                    })
                    .then(res => res.json())
                    .then(res => {
                        if (res.error) {
                            alert("Erreur Enregistrement : " + res.error);
                        } else {
                            localStorage.removeItem('kicks_cart');
                            state.cart = [];
                            window.location.href = "?payment=success"; 
                        }
                    })
                    .catch(e => alert("Erreur Réseau : " + e.message));
                });
            },

            onError: function (err) {
                console.error("Erreur PayPal Button:", err);
                alert("Une erreur technique est survenue avec PayPal. Veuillez réessayer.");
            }
        });

        if (paypalButtons.isEligible()) {
            paypalButtons.render('#paypal-button-container');
        } else {
            container.innerHTML = "PayPal n'est pas disponible pour cette configuration.";
        }

    } catch (e) {
        console.error("Erreur Init PayPal:", e);
    }
}

/* --- HELPERS --- */

async function applyPromoCode() {
    const recaptchaToken = getRecaptchaResponse();
    if (!recaptchaToken) { alert(CONFIG.MESSAGES.ERROR_RECAPTCHA); return; }
    const input = document.getElementById('promo-code-input');
    const msg = document.getElementById('promo-message');
    const code = input.value.trim().toUpperCase(); if (!code) return;
    
    msg.innerText = "Vérification...";
    try {
        const res = await fetch(CONFIG.API_URL, { method: 'POST', body: JSON.stringify({ action: 'checkPromo', code: code, recaptchaToken: recaptchaToken }) });
        const data = await res.json();
        
        if (data.valid) {
            state.appliedPromoCode = code;
            state.promoDiscountAmount = state.cart.reduce((acc, i) => acc + i.price * i.qty, 0) * data.discountPercent;
            msg.innerText = `Code appliqué : -${(data.discountPercent*100).toFixed(0)}% !`;
            msg.style.color = "green";
            updateCheckoutTotal();
        } else {
            msg.innerText = "Code invalide.";
            msg.style.color = "red";
            state.appliedPromoCode = null; state.promoDiscountAmount = 0; updateCheckoutTotal();
        }
        if(window.grecaptcha) grecaptcha.reset();
    } catch (e) { msg.innerText = "Erreur."; }
}

function getFormData() {
    const val = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ""; };
    const pays = document.getElementById('ck-pays');
    const requiredFields = { email: 'ck-email', prenom: 'ck-prenom', nom: 'ck-nom', tel: 'ck-tel', adresse: 'ck-adresse', cp: 'ck-cp', ville: 'ck-ville' };
    for (let key in requiredFields) {
        const value = val(requiredFields[key]);
        if (!value) { 
            alert(`Veuillez remplir le champ : ${key.toUpperCase()}.`);
            return null; 
        }
    }
    
    if (!pays || !pays.value) { 
        alert("Veuillez choisir le pays de livraison.");
        return null; 
    }
    
    return { 
        email: val('ck-email'), prenom: val('ck-prenom'), nom: val('ck-nom'), tel: val('ck-tel'), 
        adresse: val('ck-adresse'), cp: val('ck-cp'), ville: val('ck-ville'), 
        pays: pays.value 
    };
}

/* =================================================================
   🍪 GESTIONNAIRE RGPD / COOKIES
================================================================= */

document.addEventListener('DOMContentLoaded', () => {
    initCookieConsent();
});

function initCookieConsent() {
    const modal = document.getElementById('cookie-consent-modal');
    if (!modal) return;
    // Vérifier si le choix a déjà été fait
    const consent = localStorage.getItem('kicks_cookie_consent');
    // Si pas de choix, on affiche la modale (après un petit délai pour le splash screen)
    if (!consent) {
        setTimeout(() => {
            modal.classList.remove('hidden');
        }, 2500);
        // 2.5s pour laisser le temps au splash screen de finir si besoin
    } else {
        // Si consentement déjà donné, on active les scripts autorisés
        const choices = JSON.parse(consent);
        if (choices.analytics) activateScript('analytics');
    }

    // Boutons
    const btnAccept = document.getElementById('cookie-accept-btn');
    const btnReject = document.getElementById('cookie-reject-btn');
    const btnSettings = document.getElementById('cookie-settings-btn');
    const btnSave = document.getElementById('cookie-save-btn');
    const detailsDiv = document.getElementById('cookie-details');

    // 1. TOUT ACCEPTER
    if(btnAccept) btnAccept.addEventListener('click', () => {
        saveConsent({ necessary: true, analytics: true });
        activateScript('analytics');
        modal.classList.add('hidden');
    });

    // 2. TOUT REFUSER (Sauf essentiels)
    if(btnReject) btnReject.addEventListener('click', () => {
        saveConsent({ necessary: true, analytics: false });
        modal.classList.add('hidden');
    });

    // 3. PERSONNALISER
    if(btnSettings) btnSettings.addEventListener('click', () => {
        detailsDiv.classList.remove('hidden');
        btnSettings.classList.add('hidden');
        document.querySelector('.main-cookie-btns').classList.add('hidden');
        btnSave.classList.remove('hidden');
    });

    // 4. SAUVEGARDER CHOIX
    if(btnSave) btnSave.addEventListener('click', () => {
        const analyticsChecked = document.getElementById('cookie-analytics').checked;
        saveConsent({ necessary: true, analytics: analyticsChecked });
        if (analyticsChecked) activateScript('analytics');
        modal.classList.add('hidden');
    });
}

function saveConsent(preferences) {
    localStorage.setItem('kicks_cookie_consent', JSON.stringify(preferences));
    localStorage.setItem('kicks_consent_date', new Date().toISOString());
}

// Fonction magique qui transforme le text/plain en javascript exécutable
function activateScript(category) {
    const scripts = document.querySelectorAll(`script[data-cookiecategory="${category}"]`);
    scripts.forEach(oldScript => {
        const newScript = document.createElement('script');
        newScript.text = oldScript.innerText;
        
        // Copier les attributs (src, async, etc.)
        Array.from(oldScript.attributes).forEach(attr => {
            if (attr.name !== 'type' && attr.name !== 'data-cookiecategory') {
                newScript.setAttribute(attr.name, attr.value);
            }
        });
        
        newScript.type = 'text/javascript'; // On active !
        
        // Remplacer l'ancien script inactif par le nouveau actif
        oldScript.parentNode.replaceChild(newScript, oldScript);
        console.log(`🍪 Script RGPD activé : ${category}`);
    });
}
/**
 * RÉCUPÈRE ET VALIDE LES DONNÉES DU FORMULAIRE DE LIVRAISON
 */
function getCustomerData() {
    const prenom = document.getElementById('ck-prenom')?.value.trim() || "";
    const nom = document.getElementById('ck-nom')?.value.trim() || "";
    const email = document.getElementById('ck-email')?.value.trim() || "";
    const tel = document.getElementById('ck-tel')?.value.trim() || "";
    const adresse = document.getElementById('ck-adresse')?.value.trim() || "";
    const cp = document.getElementById('ck-cp')?.value.trim() || "";
    const ville = document.getElementById('ck-ville')?.value.trim() || "";
    const pays = document.getElementById('ck-pays')?.value || "";

    // Validation stricte : tous les champs doivent être remplis
    if (!prenom || !nom || !email || !tel || !adresse || !cp || !ville || !pays) {
        alert("Veuillez remplir tous les champs de livraison.");
        return null;
    }

    // Validation email basique
    if (!email.includes('@')) {
        alert("Veuillez saisir une adresse email valide.");
        return null;
    }

    return { 
        prenom: prenom, 
        nom: nom, 
        email: email, 
        tel: tel, 
        adresse: adresse, 
        cp: cp, 
        ville: ville, 
        pays: pays 
    };
}

async function submitManualOrder(event) {
    // 1. ARRÊT IMMÉDIAT ET VÉRIFICATION DU VERROU
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    const btn = document.getElementById('btn-pay-virement') || document.querySelector('button[onclick*="submitManualOrder"]');
    
    // Si le bouton a déjà la classe 'is-processing', on stop tout
    if (!btn || btn.classList.contains('is-processing')) return;

    // 2. VERROUILLAGE PHYSIQUE ET VISUEL
    btn.classList.add('is-processing');
    btn.disabled = true;
    btn.dataset.oldText = btn.innerText;
    btn.innerText = "⏳ TRAITEMENT UNIQUE EN COURS...";

    try {
        console.log("🚀 Démarrage de l'envoi unique et sécurisé...");

        // 3. RÉCUPÉRATION DES DONNÉES
        const customerData = {
            prenom: document.getElementById('ck-prenom')?.value.trim(),
            nom: document.getElementById('ck-nom')?.value.trim(),
            email: document.getElementById('ck-email')?.value.trim(),
            tel: document.getElementById('ck-tel')?.value.trim(),
            adresse: document.getElementById('ck-adresse')?.value.trim(),
            cp: document.getElementById('ck-cp')?.value.trim(),
            ville: document.getElementById('ck-ville')?.value.trim(),
            pays: document.getElementById('ck-pays')?.value
        };

        if (!customerData.email || !customerData.prenom || !customerData.nom) {
            throw new Error("Veuillez remplir nom, prénom et email.");
        }

        // 4. RECAPTCHA
        let recaptchaToken = "";
        try {
            recaptchaToken = grecaptcha.getResponse();
        } catch (e) {}

        if (!recaptchaToken) {
            throw new Error("Veuillez valider le reCAPTCHA.");
        }

        // 5. CALCUL DU PRIX
        const cart = state.cart || [];
        if (cart.length === 0) throw new Error("Votre panier est vide.");

        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const shipping = state.currentShippingRate ? parseFloat(state.currentShippingRate.price) : 0;
        const discount = state.promoDiscountAmount || 0;
        const numericTotal = parseFloat((subtotal + shipping - discount).toFixed(2));

        const selectedShippingName = state.currentShippingRate ? state.currentShippingRate.name : "Standard";

        // 6. PAYLOAD OPTIMISÉ
        const payload = {
            action: "recordManualOrder",
            paymentMethod: "VIREMENT",
            recaptchaToken: recaptchaToken,
            client: customerData,
            customer: customerData,
            cart: cart,
            shipping: selectedShippingName,
            total: numericTotal,
            amount: numericTotal
        };

        const params = new URLSearchParams({ action: 'recordManualOrder' });
        const url = CONFIG.getAuthUrl(params);

        // 7. ENVOI
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });

        // Lecture du résultat JSON
        let result = {};
        try {
            result = await response.json();
        } catch (e) {
            if (response.ok) result = { status: 'success' };
        }

        // 8. AFFICHAGE DU RÉSULTAT ET DU RIB COMPLET
        if (result.status === 'success' || result.status === 'ok' || response.ok) {
            
            // Construction de l'affichage du RIB avec sécurité String
            let ribHtml = "";
            if (result.rib) {
                ribHtml = `
                    <strong>Titulaire :</strong> ${String(result.rib.titulaire || "KICKS")}<br>
                    <strong>IBAN :</strong> ${String(result.rib.iban || "Non renseigné")}<br>
                    <strong>BIC :</strong> ${String(result.rib.bic || "")}
                `;
            } else {
                // Secours sur le state local si le serveur ne répond pas sur le RIB
                const ribFallback = state.siteContent.RIB || "RIB non disponible, contactez le support.";
                ribHtml = String(ribFallback).replace(/\n/g, '<br>');
            }

            const totalAffiche = numericTotal.toFixed(2) + "€";

            const successHTML = `
                <div style="background:rgba(255,255,255,0.1); padding:20px; border-radius:15px; margin-top:10px; max-width:500px;">
                    <p>Votre commande a été pré-enregistrée avec succès.</p>
                    <p style="color:#ffcc00; font-weight:bold; font-size:1.3rem; margin:15px 0;">
                        MONTANT À RÉGLER : ${totalAffiche}
                    </p>
                    <p>Veuillez effectuer votre virement sur le RIB suivant :</p>
                    <div style="background:white; color:black; padding:15px; border-radius:10px; font-family:monospace; font-size:1rem; margin:15px 0; border:2px solid #ffcc00; text-align:left; line-height:1.6;">
                        ${ribHtml}
                    </div>
                    <p style="font-size:0.9rem; font-style:italic;">Utilisez votre nom comme libellé de virement. Un email récapitulatif vous a été envoyé.</p>
                </div>
            `;

            // Nettoyage panier
            localStorage.removeItem('kicks_cart');
            state.cart = [];
            if (typeof updateCartUI === "function") updateCartUI();

            // Affichage de l'écran plein écran noir
            showSuccessScreen(customerData.prenom, successHTML);

        } else {
            throw new Error(result.message || "Le serveur a refusé la commande.");
        }

    } catch (error) {
        console.error("❌ ÉCHEC ENVOI :", error);
        alert("⚠️ " + error.message);
        
        // DÉVERROUILLAGE EN CAS D'ERREUR
        setTimeout(() => {
            if (btn) {
                btn.classList.remove('is-processing');
                btn.disabled = false;
                btn.innerText = btn.dataset.oldText || "Confirmer la commande";
            }
        }, 2000); 
    }
}
function updatePayPal4XDisplay(totalAmount) {
    const container = document.getElementById('paypal-4x-container');
    if (!container) return;

    // Seuil factuel de 30€ pour le 4X PayPal
    if (totalAmount >= 30) {
        const monthly = (totalAmount / 4).toFixed(2);
        container.innerHTML = `
            <div class="paypal-4x-badge">
                <img src="https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_37x23.jpg" alt="PayPal">
                Payez en 4X sans frais de <strong>${monthly}€</strong>
            </div>
        `;
        container.classList.remove('hidden-4x');
    } else {
        container.classList.add('hidden-4x');
        container.innerHTML = "";
    }
}
// FORCE LE NETTOYAGE DES DOUBLES CLICS
document.addEventListener('DOMContentLoaded', () => {
    const virementBtn = document.getElementById('btn-pay-virement');
    if (virementBtn) {
        // On supprime tout ce qui pourrait être attaché
        const newBtn = virementBtn.cloneNode(true);
        virementBtn.parentNode.replaceChild(newBtn, virementBtn);
        
        // On réattache UNIQUEMENT notre fonction
        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            submitManualOrder(e);
        });
    }
});
// --- GESTION DU BOUTON FILTRE MOBILE ---
document.addEventListener('DOMContentLoaded', () => {
    const mobileBtn = document.getElementById('apply-filters-mobile-btn');
    if (mobileBtn) {
        mobileBtn.addEventListener('click', () => {
            // 1. Applique les filtres (On appelle ton moteur de rendu réel)
            if (typeof renderCatalog === 'function') {
                renderCatalog(true);
            }

            // 2. FERME LE MENU (On utilise le BON ID de ton HTML)
            if (typeof closeDrawer === 'function') {
                closeDrawer('mobile-filter-drawer');
            }

            // 3. REMONTE en haut pour que le client voie les résultats
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
});
// --- OPTIMISATION SEO DYNAMIQUE KICKS ---
function boostMySEO(productName, description, price, imageUrl, seoTitle) {
  // 1. Mise à jour du Titre (Colonne V) et de la Meta Description (Colonne W)
  // On utilise seoTitle s'il existe, sinon on garde le format par défaut
  document.title = seoTitle || (productName + " | KICKS - Shop");
  
  let metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    metaDesc.setAttribute("content", description);
  }

  // 2. CORRECTION SEO : On crée l'URL complète pour Google
  const absoluteImageUrl = (window.location.origin + "/" + imageUrl).replace(/ /g, '%20');

  // 3. Injection du JSON-LD (Product Schema)
  let existingSchema = document.getElementById('product-schema');
  if (existingSchema) {
    existingSchema.remove();
  }

  let schema = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": productName, // Google préfère le nom réel du produit ici
    "image": [absoluteImageUrl], 
    "description": description, // Utilise ta colonne W optimisée
    "offers": {
      "@type": "Offer",
      "priceCurrency": "EUR",
      "price": price,
      "itemCondition": "https://schema.org/NewCondition",
      "availability": "https://schema.org/InStock",
      "url": window.location.href
    }
  };

  let script = document.createElement('script');
  script.id = 'product-schema';
  script.type = 'application/ld+json';
  script.text = JSON.stringify(schema);
  document.head.appendChild(script);
}
function forceFeedGoogle() {
    // On crée un fragment invisible que seul le bot va sniffer en priorité
    const seoTunnel = document.createElement('div');
    seoTunnel.style.display = 'none'; // Invisible pour l'humain
    seoTunnel.id = 'bot-tunnel';
    
    // On y injecte des mots-clés sémantiques liés à ton inventaire
    // Optimisation : Ajout de la dimension performance et locale (Guadeloupe/Antilles)
    seoTunnel.innerHTML = `
        <h2>Achat Sneakers Authentiques KICKS</h2>
        <p>Large choix de Jordan,Nike , Peak Flash et exclusivités basketball performance. 
           Produits Authentiques, livraison express 24/48h en Guadeloupe 
          Service client premium aux Antilles et en France.</p>
    `;
    document.body.prepend(seoTunnel);
}
function polishImageSEO() {
    document.querySelectorAll('img').forEach(img => {
        // On intervient seulement si la balise alt est vide ou absente
        if (!img.alt || img.alt === "") {
            // CORRECTIF : On cherche le titre le plus pertinent (H1, titre modal ou titre de page)
            const context = document.querySelector('h1')?.innerText || 
                            document.getElementById('modal-title')?.innerText || 
                            document.title.split('|')[0].trim() || 
                            "Sneaker KICKS";

            // Injection des attributs SEO optimisés
            // On ajoute des termes sémantiques pour favoriser Google Images
            img.setAttribute('alt', context + " - Vue détaillée Authentic KICKS");
            img.setAttribute('title', context + " - KICKS Shop");
            
            // OPTIMISATION SUPPLÉMENTAIRE : On force le décodage asynchrone pour la performance
            img.decoding = "async";
            
            // On s'assure que l'image est bien marquée comme appartenant au shop pour le crawling
            img.setAttribute('itemprop', 'image');
        }
    });
}
/* =================================================================
   📧 GESTION NEWSLETTER (RÉINITIALISATION AUTO)
================================================================= */
document.addEventListener('submit', async (e) => {
    if (e.target.id === 'newsletter-form') {
        e.preventDefault();
        const form = e.target;
        const btn = form.querySelector('button');
        const originalContent = form.innerHTML; // On sauvegarde le formulaire
        
        const data = {
            action: 'newsletter',
            prenom: form.querySelector('[name="prenom"]').value,
            nom: form.querySelector('[name="nom"]').value,
            email: form.querySelector('[name="email"]').value
        };

        btn.disabled = true;
        btn.innerText = "INSCRIPTION...";

        const url = CONFIG.getAuthUrl(new URLSearchParams(data));

        try {
            // Suppression de 'no-cors' pour pouvoir lire la réponse du Worker
            const response = await fetch(url, { method: 'POST' });
            const result = await response.json(); 

            // Choix du message selon le retour de l'Apps Script
            let textMsg = `MERCI ${data.prenom.toUpperCase()} ! <br> Inscription validée. ⚡`;
            
            if (result.message === "Déjà inscrit !") {
                textMsg = `HELLO ${data.prenom.toUpperCase()} ! <br> Tu es déjà dans l'équipe. 😉`;
            }

            // Affichage du message (succès ou déjà inscrit)
            form.innerHTML = `<div id="success-msg" style="color:#00ff00; padding:20px; border:1px solid #00ff00; text-align:center; font-weight:bold;">
                ${textMsg}
            </div>`;

            // RÉINITIALISATION APRÈS 5 SECONDES
            setTimeout(() => {
                form.innerHTML = originalContent;
                // On récupère la nouvelle instance du formulaire après injection du innerHTML
                const refreshedForm = document.getElementById('newsletter-form');
                if (refreshedForm) refreshedForm.reset(); 
            }, 5000);

        } catch (err) {
            console.error("Erreur:", err);
            btn.disabled = false;
            btn.innerText = "RÉESSAYER";
        }
    }
});
/**
 * AUTOMATISATION DES SUGGESTIONS DE PRODUITS
 * Cette fonction filtre le catalogue par marque et catégorie,
 * mélange les résultats et utilise createProductCard pour l'affichage.
 */
function displayRelatedProducts(currentProduct) {
    const container = document.getElementById('related-products-grid');
    const section = document.getElementById('related-products-section');
    
    // Sécurité : on vérifie que les éléments HTML et les données produits existent
    if (!container || !section || !state.products) {
        console.warn("⚠️ SEO Suggestions : Conteneur ou produits introuvables.");
        return;
    }

    // 1. FILTRE : On cherche les produits de la même marque, en excluant le produit actuel
    let related = state.products.filter(p => 
        p.brand === currentProduct.brand && p.id !== currentProduct.id
    );

    // 2. COMPLÉMENT : Si on a moins de 4 résultats, on ajoute des produits de la même catégorie
    if (related.length < 4) {
        const extra = state.products.filter(p => 
            p.category === currentProduct.category && 
            p.id !== currentProduct.id && 
            !related.some(r => r.id === p.id)
        );
        related = [...related, ...extra];
    }

    // 3. MÉLANGE : On trie aléatoirement et on ne garde que les 4 premiers
    const shuffled = related.sort(() => 0.5 - Math.random()).slice(0, 4);

    // 4. NETTOYAGE ET INJECTION
    container.innerHTML = ''; // On vide proprement les anciennes suggestions

    if (shuffled.length > 0) {
        shuffled.forEach((product, index) => {
            // On appelle ta fonction exacte. L'index (index + 10) sert pour le lazy-loading.
            const card = createProductCard(product, index + 10);
            container.appendChild(card);
        });
        
        // On affiche la section si elle était cachée
        section.classList.remove('hidden');
        section.style.display = 'block'; 
        console.log("✅ SEO Suggestions : 4 modèles injectés automatiquement.");
    } else {
        // Si vraiment rien n'est trouvé, on cache la section pour ne pas faire moche
        section.classList.add('hidden');
        section.style.display = 'none';
    }
}
/* =================================================================
    🔍 GESTION FAQ DYNAMIQUE AVEC RECHERCHE
================================================================= */
async function loadFAQ() {
    const faqContainer = document.getElementById('faq-container');
    if (!faqContainer) return;

    // Ajout de la barre de recherche au-dessus du conteneur
    faqContainer.innerHTML = `
        <div style="margin-bottom: 20px; position: relative;">
            <input type="text" id="faq-search" placeholder="UNE QUESTION ? TAPEZ UN MOT-CLÉ (EX: LIVRAISON)..." 
                style="width: 100%; padding: 15px; border: 2px solid #000; font-family: inherit; font-weight: bold; text-transform: uppercase; outline: none; border-radius:0;">
        </div>
        <div id="faq-list"></div>
    `;

    const faqList = document.getElementById('faq-list');

    try {
        const url = CONFIG.getAuthUrl(new URLSearchParams({ action: 'getFAQ' }));
        const response = await fetch(url);
        const faqs = await response.json();

        if (!faqs || faqs.length === 0) {
            faqList.innerHTML = "<p style='text-align:center; padding:20px;'>Aucune question trouvée pour le moment.</p>";
            return;
        }

        const renderFaqs = (filteredFaqs) => {
            faqList.innerHTML = filteredFaqs.map((item) => `
                <div class="faq-item" style="border-bottom: 1px solid #eee; margin-bottom: 5px; background:#fff;">
                    <button class="faq-question" style="width: 100%; text-align: left; padding: 18px 15px; background: none; border: none; font-weight: bold; cursor: pointer; display: flex; justify-content: space-between; align-items: center; text-transform: uppercase; font-size: 13px; font-family:inherit;">
                        <span style="padding-right:10px;">${item.question}</span>
                        <span class="icon" style="font-size:18px;">+</span>
                    </button>
                    <div class="faq-answer" style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease-out; background-color: #f9f9f9;">
                        <p style="padding: 15px; line-height: 1.6; color: #444; margin:0; font-size:14px; border-left:3px solid #000;">${item.reponse}</p>
                    </div>
                </div>
            `).join('');

            document.querySelectorAll('.faq-question').forEach(button => {
                button.onclick = function() {
                    const answer = this.nextElementSibling;
                    const icon = this.querySelector('.icon');
                    
                    document.querySelectorAll('.faq-answer').forEach(other => {
                        if (other !== answer) {
                            other.style.maxHeight = null;
                            other.previousElementSibling.querySelector('.icon').innerText = '+';
                        }
                    });

                    if (answer.style.maxHeight && answer.style.maxHeight !== "0px") {
                        answer.style.maxHeight = null;
                        icon.innerText = '+';
                    } else {
                        answer.style.maxHeight = answer.scrollHeight + "px";
                        icon.innerText = '-';
                    }
                };
            });
        };

        renderFaqs(faqs);

        document.getElementById('faq-search').addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = faqs.filter(f => 
                f.question.toLowerCase().includes(term) || 
                f.reponse.toLowerCase().includes(term)
            );
            renderFaqs(filtered);
        });

    } catch (err) {
        console.error("Erreur FAQ:", err);
        faqList.innerHTML = "<p style='text-align:center; color:red;'>Erreur de connexion au serveur.</p>";
    }
}

// --- DÉCLENCHEUR SPÉCIFIQUE POUR TON BOUTON FOOTER ---
document.addEventListener('DOMContentLoaded', () => {
    const btnFaq = document.getElementById('btn-faq-footer');
    if (btnFaq) {
        btnFaq.addEventListener('click', () => {
            // On laisse un micro-délai (100ms) pour que la modale s'affiche 
            // avant de calculer les hauteurs scrollHeight
            setTimeout(loadFAQ, 100);
        });
    }
});
