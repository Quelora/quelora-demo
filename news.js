const heroScrollContainer = document.getElementById("heroScrollContainer");
const newsContainer = document.getElementById("newsContainer");
const statusContainer = document.getElementById("statusContainer");
const loaderOverlay = document.getElementById("loader-overlay");
const prevControl = document.getElementById("prevControl");
const nextControl = document.getElementById("nextControl");
const heroCarousel = document.getElementById("heroCarousel");

let page = 0;
let isLoading = false;
let hasMore = true;
const limit = 16;
const HERO_COUNT = 5;
const SLIDE_INTERVAL = 3000;
let slideIndex = 0;
let slideInterval;
let heroData = [];
const SCROLL_THRESHOLD = 800; 
let isPausedByUser = false; 

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
    if (!item || !item.title || !item.image || !item.entity) {
        return null;
    }

    const card = document.createElement("div");
    card.className = `news-card ${extraClasses}`;
    card.dataset.id = item.entity;
    card.dataset.entity = item.entity;

    let watermarkText = item.metadata?.subreddit || "SOURCE";
    
    const isVideo = item.image && (item.image.includes("youtube.com") || item.image.includes("youtu.be"));

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
                        <span>${new Date(item.created_at).toLocaleDateString("en-US")}</span>
                    </div>
                </div>
            </a>`;
    }
    return card;
}

function renderHeroCarousel(items) {
    const validItems = items.filter(item => {
        return item && item.title && item.image && item.entity;
    });

    if (validItems.length === 0) {
        heroCarousel.style.display = 'none';
        return;
    }

    const totalSlides = validItems.length;
    const itemsToRender = [validItems[totalSlides - 1], ...validItems, validItems[0]];

    heroScrollContainer.innerHTML = '';

    // El ancho de la diapositiva es el ancho del carrusel padre.
    const slideWidth = heroCarousel.offsetWidth;

    itemsToRender.forEach((item) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'hero-card-container'; 
        wrapper.style.width = `${slideWidth}px`; 
        
        const card = createCardElement(item, 'hero-card hero-card-main', true);
        
        if (card) {
            wrapper.appendChild(card);
            heroScrollContainer.appendChild(wrapper);
        }
    });

    heroData = validItems;
    slideIndex = 1;
    updateCarouselPosition(false); 
    startAutoSlide();
}

function updateCarouselPosition(animated = true) {
    if (!heroScrollContainer || !heroCarousel) return;
    
    // Obtener el ancho de la diapositiva. heroCarousel.offsetWidth ahora es el ancho correcto de la diapositiva.
    const slideWidth = heroCarousel.offsetWidth;
    
    // 1. Asegurar que cada diapositiva tiene el ancho correcto (importante para el resize)
    Array.from(heroScrollContainer.children).forEach(slide => {
        if (slide.classList.contains('hero-card-container')) {
            slide.style.width = `${slideWidth}px`;
        }
    });
    
    // 2. Aplicar la transición y el desplazamiento
    heroScrollContainer.style.transition = animated ? 'transform 0.5s ease-in-out' : 'none';
    
    // Calcular el desplazamiento en píxeles.
    const offset = -slideIndex * slideWidth;
    heroScrollContainer.style.transform = `translateX(${offset}px)`;

    // 3. Lógica para el bucle infinito
    if (slideIndex === heroData.length + 1 || slideIndex === 0) {
        setTimeout(() => {
            heroScrollContainer.style.transition = 'none';
            if (slideIndex === heroData.length + 1) {
                slideIndex = 1;
            } else if (slideIndex === 0) {
                slideIndex = heroData.length;
            }
            const newOffset = -slideIndex * slideWidth;
            heroScrollContainer.style.transform = `translateX(${newOffset}px)`;
        }, animated ? 500 : 0);
    }
}

function moveSlide(direction) {
    stopAutoSlide();
    isPausedByUser = true; 
    slideIndex += direction;
    updateCarouselPosition();
}

function startAutoSlide() {
    if (heroData.length > 0 && !isPausedByUser) { 
        stopAutoSlide(); 
        slideInterval = setInterval(() => {
            slideIndex++;
            updateCarouselPosition();
        }, SLIDE_INTERVAL);
    }
}

function stopAutoSlide() {
    clearInterval(slideInterval);
}

function handleCarouselClick() {
    if (isPausedByUser) return;
    stopAutoSlide();
    isPausedByUser = true;
}

function renderNewsGrid(newsItems) {
    newsItems.forEach((item) => {
        const card = createCardElement(item, '', false);
        if (card) {
            newsContainer.appendChild(card);
        }
    });
}

async function loadMoreNews(isInitialLoad = false) {
    if (isLoading || !hasMore) {
        return;
    }
    
    isLoading = true;
    if (!isInitialLoad) {
        updateStatus('Loading more stories...');
    }
    
    try {
        const fetchedNews = await fetchNews(page, limit);
        
        if (fetchedNews.length === 0) {
            hasMore = false;
            if (!isInitialLoad) {
                updateStatus('You have reached the end. No more stories for now!');
            }
            return;
        }

        const validNews = fetchedNews.filter(item => {
            return item && item.title && item.image && item.entity;
        });

        if (validNews.length === 0 && page === 0) {
             heroCarousel.style.display = 'none';
        }
        
        if (validNews.length === 0 && !isInitialLoad) {
            hasMore = false;
            updateStatus('No more valid stories found.');
            return;
        }


        let heroItems = [];
        let gridItems = validNews;

        if (isInitialLoad) {
            heroItems = validNews.slice(0, HERO_COUNT);
            gridItems = validNews.slice(HERO_COUNT);
            
            renderHeroCarousel(heroItems);
        }

        renderNewsGrid(gridItems);

        if (fetchedNews.length < limit) {
            hasMore = false;
            updateStatus('You have reached the end. No more stories for now!');
        } else {
            statusContainer.innerHTML = '';
        }
        
        page++;
    } catch (e) {
        console.error("Error loading news:", e);
        updateStatus('Error loading content. Please try again later.');
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

window.addEventListener('resize', debounce(() => {
    updateCarouselPosition(false); 
}, 250)); 


if (prevControl && nextControl) {
    prevControl.addEventListener('click', () => moveSlide(-1));
    nextControl.addEventListener('click', () => moveSlide(1));
}

if (heroCarousel) {
    heroCarousel.addEventListener('mouseenter', stopAutoSlide);
    heroCarousel.addEventListener('mouseleave', startAutoSlide);
    // Nuevo event listener para detener con un clic
    heroCarousel.addEventListener('click', handleCarouselClick);
}


window.addEventListener("scroll", debounce(() => {
    const documentHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    
    const scrollPosition = window.scrollY + window.innerHeight;
    
    const distanceToBottom = documentHeight - scrollPosition;
    
    if (distanceToBottom <= SCROLL_THRESHOLD) {
        loadMoreNews();
    }
}, 100));

(async () => {
    showLoader(true);
    await loadMoreNews(true);
})();