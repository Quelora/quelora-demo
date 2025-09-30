const heroCarousel = document.getElementById("heroCarousel");
const newsContainer = document.getElementById("newsContainer");
const statusContainer = document.getElementById("statusContainer");
const loaderOverlay = document.getElementById("loader-overlay");

let page = 0;
let isLoading = false;
let hasMore = true;
const limit = 16;
const HERO_COUNT = 3;

function showLoader(show) {
    if (show) {
        loaderOverlay.classList.remove('hidden');
    } else {
        setTimeout(() => loaderOverlay.classList.add('hidden'), 300);
    }
}

function updateStatus(message) {
    statusContainer.innerHTML = `<div class="status-message">${message}</div>`;
}

async function fetchNews(page, limit) {
    const res = await fetch(`/api/posts?page=${page}&limit=${limit}`);
    if (!res.ok) throw new Error("Failed to fetch news");
    return await res.json();
}

function createCardElement(item, extraClasses = '', isHero = false) {
    const card = document.createElement("div");
    card.className = `news-card ${extraClasses}`;
    card.dataset.id = item.entity;
    card.dataset.entity = item.entity;

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
        } catch (e) {}
    }

    if (isHero) {
        card.innerHTML = `
            <a style="text-decoration: none; color: inherit; display: contents;">
                <div class="hero-image-bg" style="background-image: url('${imageSrc}');"></div>
                <div class="hero-overlay">
                    <div class="watermark">${watermarkText}</div>
                    <h2 class="title">${item.title}</h2>
                    <div class="news-meta"></div>
                </div>
            </a>`;
    } else {
        const mediaHTML = `<img src="${imageSrc}" alt="${item.title}" class="news-image">`;
        card.innerHTML = `
            <a style="text-decoration: none; color: inherit; display: contents;">
                ${mediaHTML}
                <div class="watermark">${watermarkText}</div>
                <div class="card-info">
                    <h3 class="news-title">${item.title}</h3>
                    <p>${item.description || item.metadata?.subreddit || ""}</p>
                    <div class="news-meta">
                        <span>${item.metadata?.author || "Unknown"}</span>
                        <span>${new Date(item.created_at).toLocaleDateString("es-ES")}</span>
                    </div>
                </div>
            </a>`;
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
    const mainCardElement = createCardElement(mainItem, 'hero-card hero-card-main', true);
    const secondaryCardElements = secondaryItems.map(item => createCardElement(item, 'hero-card hero-card-small', true).outerHTML).join('');

    heroCarousel.innerHTML = `
        ${mainCardElement.outerHTML}
        <div class="hero-card-secondary-grid">${secondaryCardElements}</div>
    `;
}

function renderNewsGrid(newsItems) {
    newsItems.forEach((item) => {
        const card = createCardElement(item, '', false);
        newsContainer.appendChild(card);
    });
}

async function loadMoreNews(isInitialLoad = false) {
    if (isLoading || !hasMore) return;
    isLoading = true;
    if (isInitialLoad) {
        showLoader(true);
    } else {
        updateStatus('Cargando más historias...');
    }
    
    try {
        const newNews = await fetchNews(page, limit);
        if (isInitialLoad) {
            const heroItems = newNews.slice(0, HERO_COUNT);
            renderHeroCarousel(heroItems);
            const gridItems = newNews.slice(HERO_COUNT);
            renderNewsGrid(gridItems);
        } else {
            renderNewsGrid(newNews);
        }

        if (newNews.length < limit) {
            hasMore = false;
            updateStatus('Has llegado al final. ¡No hay más historias por ahora!');
        } else {
            statusContainer.innerHTML = '';
        }
        
        page++;
    } catch (e) {
        console.error(e);
        updateStatus('Error al cargar el contenido. Por favor, inténtalo de nuevo más tarde.');
    } finally {
        isLoading = false;
        if (isInitialLoad) showLoader(false);
    }
}

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