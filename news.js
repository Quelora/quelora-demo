const heroScrollContainer = document.getElementById("heroScrollContainer");
const newsContainer = document.getElementById("newsContainer");
const statusContainer = document.getElementById("statusContainer");
const loaderOverlay = document.getElementById("loader-overlay");
const prevControl = document.getElementById("prevControl");
const nextControl = document.getElementById("nextControl");
const heroCarousel = document.getElementById("heroCarousel");

// Nuevo contenedor principal para el iframe y el header
const iframeViewer = document.getElementById('iframeViewer');
const iframeContainer = document.getElementById('externalIframe');
const iframeHeader = document.getElementById('iframeHeader');
const iframeLinkText = document.getElementById('iframeLinkText');
const iframeMessage = document.getElementById('iframeMessage'); // Elemento para el mensaje de error

// REFERENCIAS A LOS BOTONES DENTRO DEL HEADER (USANDO IDs):
const iframeNewTabButton = document.getElementById('iframeNewTabButton'); 
const iframeCloseButton = document.getElementById('iframeCloseButton');
const iframeCommentButton = document.getElementById('iframeCommentButton');

// Nuevo botón flotante para móvil (Comentarios)
const mobileCommentButton = document.getElementById('mobileCommentButton');

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

// --- Funciones del Visor de Iframe ---

/**
 * Muestra el mensaje de error de bloqueo en el visor.
 */
function showBlockMessage(link) {
    if (iframeMessage) {
        iframeMessage.innerHTML = `
            <div class="block-message-content">
                <h3>🚫 Content Blocked</h3>
                <p>This website uses strict security policies and prevents its content from being embedded.</p>
                <p>Please click the button below to view the content directly in a new tab.</p>
                <a href="${link}" target="_blank" class="news-btn primary-btn">Open in New Tab</a>
            </div>
        `;
        iframeMessage.classList.remove('hidden');
        iframeContainer.classList.add('hidden');
    }
}

/**
 * Oculta el mensaje de bloqueo.
 */
function hideBlockMessage() {
    if (iframeMessage) {
        iframeMessage.classList.add('hidden');
        iframeContainer.classList.remove('hidden');
    }
}

/**
 * Heurística: Intenta hacer una petición HEAD en modo no-cors.
 * Si falla debido a que el modo no-cors fuerza un "Opaque Response", 
 * es una fuerte indicación de que el sitio está protegido contra X-Frame-Options/CSP.
 * @param {string} link - URL a verificar.
 * @returns {Promise<boolean>} Resuelve a true si la incrustación probablemente fallará.
 */
async function checkIfFramingAllowed(link) {
    try {
        // Usamos HEAD para ser eficientes, pero algunos sitios necesitan GET.
        const response = await fetch(link, { method: 'HEAD', mode: 'no-cors' });
        
        // Si el fetch en modo 'no-cors' es exitoso pero resulta en un "Opaque Response", 
        // no podemos leer las cabeceras, pero la incrustación directa podría ser bloqueada
        // si el sitio no devuelve un Content-Type válido para incrustación. 
        // Sin embargo, si la respuesta es tipo 'opaque' es un buen signo para intentarlo.
        
        // Más simple y más seguro: si la solicitud HEAD tiene éxito (incluso si es opaca), 
        // intentamos el iframe para no bloquear contenido válido.
        return false; 

    } catch (error) {
        // Si hay un error de red o timeout, asumimos que fallará.
        return true;
    }
}

/**
 * Abre el visor de iframe y carga el enlace.
 * @param {string} link - URL del enlace externo.
 * @param {string} entityId - ID de la entidad para encontrar el icono de comentarios.
 */
async function openIframeViewer(link, entityId) {
    if (!iframeViewer || !iframeContainer || !iframeHeader) return;

    hideBlockMessage(); 

    // 1. Mostrar el visor y guardar la entidad
    iframeViewer.classList.remove('hidden');
    document.body.classList.add('iframe-open');
    iframeViewer.dataset.entity = entityId; 

    iframeLinkText.textContent = link.length > 80 ? link.substring(0, 77) + '...' : link;
    iframeNewTabButton.href = link;
    
    // =================================================================
    // 2. VERIFICACIÓN PREDICTIVA (Antes de cargar el iframe)
    // =================================================================
    const likelyBlocked = await checkIfFramingAllowed(link);

    if (likelyBlocked) {
        // Bloqueo detectado o error de red: Mostramos el mensaje elegante al instante.
        showBlockMessage(link);
        iframeContainer.src = 'about:blank'; // Aseguramos que no se intente cargar el iframe
    } else {
        // La verificación pasó o no es concluyente: Intentamos la carga directa.
        iframeContainer.src = link; 
        
        // 3. Monitoreo de carga (Fallback al método de Timeout)
        // Usamos el timeout como una red de seguridad contra bloqueos silenciosos (CSP)
        let timeout = setTimeout(() => {
            if (!iframeViewer.classList.contains('hidden') && 
                (!iframeContainer.contentWindow || iframeContainer.contentWindow.document.body.childNodes.length === 0)) {
                   
                showBlockMessage(link);
                iframeContainer.src = 'about:blank'; 
            }
        }, 1500); 

        // Limpiar el timeout si la carga es exitosa
        iframeContainer.onload = () => {
            clearTimeout(timeout);
            hideBlockMessage();
        };
    }
    // =================================================================

    // 4. Lógica para abrir/conectar el panel de comentarios
    const targetCard = document.querySelector(`.news-card[data-entity="${entityId}"]`);
    const commentsBox = document.getElementById('quelora-comments'); 
    const commentIcon = targetCard ? targetCard.querySelector('.interaction-icon.comment-icon') : null;

    if (commentsBox && commentIcon) {
        // Ejecutar el clic en el ícono de comentarios de la tarjeta para abrirlo inicialmente
        commentIcon.click();

        setTimeout(() => {
             if (!commentsBox.classList.contains('hidden')) {
                document.body.classList.add('quelora-open');
            } else {
                document.body.classList.remove('quelora-open');
            }
        }, 50);

        const commentButtonClickHandler = (e) => {
            e.preventDefault(); 
            e.stopPropagation();
            commentIcon.click();
            
            setTimeout(() => {
                if (commentsBox.classList.contains('hidden')) {
                     document.body.classList.remove('quelora-open');
                } else {
                     document.body.classList.add('quelora-open');
                }
            }, 100); 
        };

        const replaceAndAssign = (element, handler) => {
            if (element) {
                element.replaceWith(element.cloneNode(true));
                const newElement = document.getElementById(element.id);
                newElement.addEventListener('click', handler);
                newElement.classList.remove('hidden');
                return newElement;
            }
            return null;
        };

        replaceAndAssign(iframeCommentButton, commentButtonClickHandler);
        replaceAndAssign(mobileCommentButton, commentButtonClickHandler);

    } else {
        document.body.classList.remove('quelora-open');
        if(iframeCommentButton) iframeCommentButton.classList.add('hidden');
        if(mobileCommentButton) mobileCommentButton.classList.add('hidden');
    }
}

/**
 * Cierra el visor de iframe.
 */
function closeIframeViewer() {
    if (iframeViewer) {
        iframeViewer.classList.add('hidden');
        document.body.classList.remove('iframe-open');
        
        // Lógica de Cierre Garantizado para quelora-comments (SOLUCIÓN APLICADA)
        const commentsBox = document.getElementById('quelora-comments');
        // Buscar el botón de cierre dentro del panel de comentarios
        const closeBtn = commentsBox ? commentsBox.querySelector('.drawer-close-btn') : null;

        // Si el panel de comentarios existe y NO está oculto, haz clic en su botón de cierre interno.
        if (commentsBox && !commentsBox.classList.contains('hidden') && closeBtn) {
            closeBtn.click(); 
        }
        
        document.body.classList.remove('quelora-open');
        iframeContainer.src = 'about:blank'; // Detener carga
        hideBlockMessage(); // Asegurar que el mensaje de bloqueo se oculte
        if(mobileCommentButton) mobileCommentButton.classList.add('hidden');
    }
}

function setupIframeViewer() {
    if (iframeCloseButton) {
        iframeCloseButton.addEventListener('click', (e) => {
             e.preventDefault(); 
             e.stopPropagation(); 
             closeIframeViewer();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !iframeViewer.classList.contains('hidden')) {
            closeIframeViewer();
        }
    });

    if (iframeViewer) {
         iframeViewer.addEventListener('click', (e) => {
             if (e.target === iframeViewer) {
                 e.stopPropagation();
             }
           });
    }
}

// --- Resto de las funciones (sin cambios) ---

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
    
    const buttonsHTML = `
        <div class="news-buttons">
            <a href="${item?.reference || '#'}" target="_blank" class="news-btn reddit-btn" ${item?.reference ? '' : 'style="pointer-events: none; opacity: 0.5;"'}>
                Reddit Post
            </a>
            <button class="news-btn link-btn" data-link="${item?.link || '#'}" data-entity="${item.entity}" ${item?.link ? '' : 'disabled'}>
                Original Link
            </button>
        </div>
    `;

    if (isHero) {
        // Hero card retiene el <a> wrapper para el click principal
        card.innerHTML = `
                <div class="hero-image-bg" style="background-image: url('${imageSrc}');"></div>
                <div class="hero-overlay">
                    <div class="watermark">${watermarkText}</div>
                    <h2 class="title">${item.title}</h2>

                </div>
                <div class="news-buttons">
                    <a href="${item?.reference || '#'}" target="_blank" class="news-btn reddit-btn" ${item?.reference ? '' : 'style="pointer-events: none; opacity: 0.5;"'}>
                        Reddit Post
                    </a>
                    <div class="news-meta"></div>
                    <button class="news-btn link-btn" data-link="${item?.link || '#'}" data-entity="${item.entity}" ${item?.link ? '' : 'disabled'}>
                        Original Link
                    </button>
                </div>`;
    } else {
        const mediaHTML = `<img src="${imageSrc}" alt="${item.title}" class="news-image">`;
        card.innerHTML = `
            <div class="card-image-wrapper"> 
                ${mediaHTML}
                <div class="watermark">${watermarkText}</div>
                ${buttonsHTML} 
            </div>
            <div class="card-content-area">
                    <div class="card-info">
                        <h3 class="news-title">${item.title}</h3>
                        <p>${item.description || item.metadata?.subreddit || ""}</p>
                        <div class="news-meta">
                            <span>${item.metadata?.author || "Unknown"}</span>
                            <span>${new Date(item.created_at).toLocaleDateString("en-US")}</span>
                            </div>
                    </div>
            </div>`;
    }
    
    // Event listener para el botón "Original Link" para abrir el iframe
    const linkButton = card.querySelector('.link-btn');
    if (linkButton && item?.link) {
        linkButton.addEventListener('click', (event) => {
            event.preventDefault(); 
            event.stopPropagation(); 
            openIframeViewer(item.link, item.entity);
        });
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

// --- Event Listeners and Initial Load ---

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
    heroCarousel.addEventListener('click', handleCarouselClick);
}

// Setup Iframe Viewer Listeners
setupIframeViewer(); 

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