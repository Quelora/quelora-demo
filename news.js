// ./news.js
const heroCarousel = document.getElementById("heroCarousel");
const newsContainer = document.getElementById("newsContainer");
const loading = document.getElementById("loading");
const error = document.getElementById("error");

let page = 0;
let isLoading = false;
const limit = 16; 
const HERO_COUNT = 3; 

async function fetchNews(page, limit) {
    const res = await fetch(`/api/posts?page=${page}&limit=${limit}`);
    if (!res.ok) throw new Error("Failed to fetch news");
    return await res.json();
}

/**
 * Crea la estructura base de una tarjeta (DIV con data-entity y .news-meta)
 * @param {Object} item - Objeto de datos de la noticia
 * @param {string} extraClasses - Clases CSS adicionales para el estilo (e.g., 'hero-card')
 * @param {boolean} isHero - Indica si es una tarjeta destacada
 * @returns {HTMLDivElement} El elemento DIV creado
 */
function createCardElement(item, extraClasses = '', isHero = false) {
    // *** REQUERIDO por Quelora.js: selector: '.news-card' y entityIdAttribute: 'data-entity' ***
    const card = document.createElement("div"); 
    card.className = `news-card ${extraClasses}`;
    card.dataset.id = item.entity; 
    card.dataset.entity = item.entity; // REQUERIDO

    let mediaHTML = '';
    let watermarkText = item.metadata?.subreddit || "SOURCE";
    const isVideo = item.image.includes("youtube.com") || item.image.includes("youtu.be");
    
    let imageSrc = item.image;
    if (isVideo) {
        watermarkText = item.metadata?.subreddit || "YOUTUBE";
        let videoId = null;
        try {
            if (item.image.includes("youtube.com")) {
                const urlParams = new URL(item.image).searchParams;
                videoId = urlParams.get("v");
            } else if (item.image.includes("youtu.be")) {
                videoId = item.image.split("/").pop();
            }
            if (videoId) {
                imageSrc = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
            }
        } catch (e) { /* Fallback */ }
    }
    
    if (isHero) {
        // Estructura para Hero (imagen de fondo y overlay de texto)
        card.innerHTML = `
            <a  style="text-decoration: none; color: inherit; display: contents;">
                <div class="hero-image-bg" style="background-image: url('${imageSrc}');"></div>
                <div class="hero-overlay">
                    <div class="watermark">${watermarkText}</div>
                    <h2 class="title">${item.title}</h2>
                    <div class="news-meta">

                    </div>
                </div>

            </a>
        `;
    } else {
        // Estructura para Grid (imagen y card-info)
        mediaHTML = `<img src="${imageSrc}" alt="${item.title}" class="news-image">`;
        card.innerHTML = `
            <a style="text-decoration: none; color: inherit; display: contents;">
                <div class="news-image-wrapper">
                    ${mediaHTML}
                    <div class="watermark">${watermarkText}</div>
                </div>
                <div class="card-info">
                    <h3 class="news-title">${item.title}</h3>
                    <p>${item.description || item.metadata?.subreddit || ""}</p>
                    <div class="news-meta"> 
                        <span>${item.metadata?.author || "Unknown"}</span>
                        <span>${new Date(item.created_at).toLocaleDateString("en-US")}</span>
                    </div>
                </div>
            </a>
        `;
    }

    return card;
}


function renderHeroCarousel(heroItems) {
    if (heroItems.length < HERO_COUNT) {
        heroCarousel.style.display = 'none';
        return;
    }

    const mainItem = heroItems[0];
    const secondaryItems = heroItems.slice(1, HERO_COUNT);
    
    // Crear los elementos DIV (con la estructura de Quelora)
    const mainCardElement = createCardElement(mainItem, 'hero-card hero-card-main', true);
    
    const secondaryCardElements = secondaryItems.map(item => createCardElement(item, 'hero-card hero-card-small', true).outerHTML).join('');
    
    const heroContent = `
        ${mainCardElement.outerHTML}
        <div class="hero-card-secondary-grid">${secondaryCardElements}</div>
    `;

    heroCarousel.innerHTML = heroContent;
}

function renderNewsGrid(newsItems) {
    newsItems.forEach((item) => {
        const card = createCardElement(item, '', false); // No es Hero
        newsContainer.appendChild(card);
    });
}


async function loadMoreNews(isInitialLoad = false) {
    if (isLoading) return;
    isLoading = true;
    loading.style.display = "block";
    error.style.display = "none";

    try {
        const newNews = await fetchNews(page, limit);
        if (newNews.length > 0) {
            
            if (isInitialLoad && page === 0) {
                const heroItems = newNews.slice(0, HERO_COUNT); 
                renderHeroCarousel(heroItems);
                
                const gridItems = newNews.slice(HERO_COUNT);
                renderNewsGrid(gridItems);
            } else {
                renderNewsGrid(newNews);
            }
            
            page++;
        }
        
        loading.style.display = "none";
        if (newNews.length === 0 && page > 0) { 
             loading.textContent = "No hay más historias para mostrar.";
             loading.style.display = "block";
        }

    } catch (e) {
        console.error(e);
        loading.style.display = "none";
        error.style.display = "block";
        error.textContent = "Fallo al cargar el contenido. Por favor, inténtalo de nuevo más tarde.";
    } finally {
        isLoading = false;
    }
}

// Scroll infinito
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

window.addEventListener("scroll", debounce(() => {
    const scrollPosition = window.scrollY + window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    if (scrollPosition >= documentHeight - 600) { 
        loadMoreNews();
    }
}, 200));

(async () => {
    await loadMoreNews(true); 
})();