const heroScrollContainer = document.getElementById("heroScrollContainer");
const newsContainer = document.getElementById("newsContainer");
const statusContainer = document.getElementById("statusContainer");
const loaderOverlay = document.getElementById("loader-overlay");
const prevControl = document.getElementById("prevControl");
const nextControl = document.getElementById("nextControl");
const heroCarousel = document.getElementById("heroCarousel");
const inliveSection = document.getElementById("inliveSection");

const statPosts = document.getElementById('statPosts');
const statComments = document.getElementById('statComments');
const statLikes = document.getElementById('statLikes');
const statProfiles = document.getElementById('statProfiles');

const iframeViewer = document.getElementById('iframeViewer');
const iframeContainer = document.getElementById('externalIframe');
const iframeHeader = document.getElementById('iframeHeader');
const iframeLinkText = document.getElementById('iframeLinkText');
const iframeMessage = document.getElementById('iframeMessage');

const iframeNewTabButton = document.getElementById('iframeNewTabButton');
const iframeCloseButton = document.getElementById('iframeCloseButton');
const iframeCommentButton = document.getElementById('iframeCommentButton');

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

const STATS_INTERVAL = 30000;
let statsIntervalId = null;
let statsAbortController = null;

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

function hideBlockMessage() {
    if (iframeMessage) {
        iframeMessage.classList.add('hidden');
        iframeContainer.classList.remove('hidden');
    }
}

async function checkIfFramingAllowed(link) {
    try {
        const response = await fetch(link, { method: 'HEAD', mode: 'no-cors' });
        return false;
    } catch (error) {
        return true;
    }
}

async function openIframeViewer(link, entityId) {
    if (!iframeViewer || !iframeContainer || !iframeHeader) return;

    hideBlockMessage();

    iframeViewer.classList.remove('hidden');
    document.body.classList.add('iframe-open');
    iframeViewer.dataset.entity = entityId;

    iframeLinkText.textContent = link.length > 80 ? link.substring(0, 77) + '...' : link;
    iframeNewTabButton.href = link;

    const likelyBlocked = await checkIfFramingAllowed(link);

    if (likelyBlocked) {
        showBlockMessage(link);
        iframeContainer.src = 'about:blank';
    } else {
        iframeContainer.src = link;

        let timeout = setTimeout(() => {
            if (!iframeViewer.classList.contains('hidden') &&
                (!iframeContainer.contentWindow || iframeContainer.contentWindow.document.body.childNodes.length === 0)) {

                showBlockMessage(link);
                iframeContainer.src = 'about:blank';
            }
        }, 1500);

        iframeContainer.onload = () => {
            clearTimeout(timeout);
            hideBlockMessage();
        };
    }

    const targetCard = document.querySelector(`.news-card[data-entity="${entityId}"]`);
    const commentsBox = document.getElementById('quelora-comments');
    const commentIcon = targetCard ? targetCard.querySelector('.interaction-icon.comment-icon') : null;

    if (commentsBox && commentIcon) {
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
        if (iframeCommentButton) iframeCommentButton.classList.add('hidden');
        if (mobileCommentButton) mobileCommentButton.classList.add('hidden');
    }
}

function closeIframeViewer() {
    if (iframeViewer) {
        iframeViewer.classList.add('hidden');
        document.body.classList.remove('iframe-open');

        const commentsBox = document.getElementById('quelora-comments');
        const closeBtn = commentsBox ? commentsBox.querySelector('.drawer-close-btn') : null;

        if (commentsBox && !commentsBox.classList.contains('hidden') && closeBtn) {
            closeBtn.click();
        }

        document.body.classList.remove('quelora-open');
        iframeContainer.src = 'about:blank';
        hideBlockMessage();
        if (mobileCommentButton) mobileCommentButton.classList.add('hidden');
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

    if (iframeViewer) {
        iframeViewer.addEventListener('click', (e) => {
            if (e.target === iframeViewer) {
                e.stopPropagation();
            }
        });
    }
}

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

async function fetchInlivePosts() {
    try {
        const res = await fetch(`/api/posts/inlive`);
        if (!res.ok) throw new Error("Failed to fetch inlive posts");
        return await res.json();
    } catch (e) {
        console.error(e);
        return [];
    }
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
                const queryIndex = videoId.indexOf('?');
                if (queryIndex !== -1) {
                    videoId = videoId.substring(0, queryIndex);
                }
                videoId = videoId.trim();
                imageSrc = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
            }
        } catch (e) { }
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
        const isLive = item.config?.liveMode?.isLiveActive === true;
        const liveBadgeHTML = isLive ? '<div class="live-badge"><span></span>LIVE</div>' : '';

        const mediaHTML = `<img src="${imageSrc}" alt="${item.title}" class="news-image">`;
        card.innerHTML = `
            <div class="card-image-wrapper"> 
                ${mediaHTML}
                ${liveBadgeHTML}
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

    const slideWidth = heroCarousel.offsetWidth;

    Array.from(heroScrollContainer.children).forEach(slide => {
        if (slide.classList.contains('hero-card-container')) {
            slide.style.width = `${slideWidth}px`;
        }
    });

    heroScrollContainer.style.transition = animated ? 'transform 0.5s ease-in-out' : 'none';

    const offset = -slideIndex * slideWidth;
    heroScrollContainer.style.transform = `translateX(${offset}px)`;

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

function renderInlivePosts(items) {
    if (!inliveSection || !items || items.length === 0) {
        if (inliveSection) inliveSection.classList.add('hidden');
        return;
    }

    const cardWrapper = document.createElement('div');
    cardWrapper.className = 'inlive-card-wrapper';

    items.forEach((item) => {
        const card = createCardElement(item, 'inlive-card', false);
        if (card) {
            cardWrapper.appendChild(card);
        }
    });

    inliveSection.appendChild(cardWrapper);
    inliveSection.classList.remove('hidden');
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

function animateCounter(element, targetValue, duration = 1500) {
    const startText = element.textContent.replace(/[^0-9.]/g, '');
    const startValue = parseFloat(startText) || 0;

    if (targetValue <= startValue) {
        element.textContent = targetValue.toLocaleString();
        return;
    }

    if (targetValue - startValue < 100) {
        element.textContent = targetValue.toLocaleString();
        return;
    }

    let startTime = null;

    const step = (timestamp) => {
        if (!startTime) startTime = timestamp;

        const progress = timestamp - startTime;
        const percentage = Math.min(progress / duration, 1);

        const easedPercentage = 1 - Math.pow(1 - percentage, 3);

        const currentValue = Math.floor(startValue + (targetValue - startValue) * easedPercentage);

        element.textContent = currentValue.toLocaleString();

        if (percentage < 1) {
            requestAnimationFrame(step);
        } else {
            element.textContent = targetValue.toLocaleString();
        }
    };

    requestAnimationFrame(step);
}

async function fetchStats(signal) {
    try {
        const res = await fetch('/api/stats', { signal });
        if (!res.ok) {
            if (signal.aborted) return;
            throw new Error("Failed to fetch statistics");
        }

        const stats = await res.json();

        if (!signal.aborted) {
            if (statPosts) animateCounter(statPosts, stats.posts || 0);
            if (statComments) animateCounter(statComments, stats.comments || 0);
            if (statLikes) animateCounter(statLikes, stats.likes || 0);
            if (statProfiles) animateCounter(statProfiles, stats.profiles || 0);
        }

    } catch (e) {
        if (e.name === 'AbortError') return;

        console.error("Error fetching and animating stats:", e);
        if (statPosts) statPosts.textContent = 'N/A';
        if (statComments) statComments.textContent = 'N/A';
        if (statLikes) statLikes.textContent = 'N/A';
        if (statProfiles) statProfiles.textContent = 'N/A';
    }
}

async function executeStatsFetch() {
    if (statsAbortController) {
        statsAbortController.abort();
    }

    statsAbortController = new AbortController();
    const signal = statsAbortController.signal;

    await fetchStats(signal);

    if (!signal.aborted) {
        statsAbortController = null;
    }
}

function startStatsUpdate() {
    executeStatsFetch();

    statsIntervalId = setInterval(executeStatsFetch, STATS_INTERVAL);
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
    heroCarousel.addEventListener('click', handleCarouselClick);
}

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
    startStatsUpdate();
    showLoader(true);

    try {
        const inlivePosts = await fetchInlivePosts();
        renderInlivePosts(inlivePosts);
    } catch (e) {
        console.error("Failed to load inlive posts:", e);
        if (inliveSection) inliveSection.classList.add('hidden');
    }

    await loadMoreNews(true);
})();


const contactLink = document.getElementById('contactLink');
const contactModalOverlay = document.getElementById('contactModalOverlay');
const closeContactModalBtn = document.getElementById('closeContactModal');
const contactForm = document.getElementById('contactForm');
const contactStatus = document.getElementById('contactStatus');
const contactSubmitButton = document.getElementById('contactSubmitButton');

function openContactModal() {
    if (contactModalOverlay) {
        contactModalOverlay.classList.remove('hidden');
        document.body.classList.add('iframe-open');
    }
}

function closeContactModal() {
    if (contactModalOverlay) {
        contactModalOverlay.classList.add('hidden');
        if (iframeViewer.classList.contains('hidden')) {
            document.body.classList.remove('iframe-open');
        }
        contactForm.reset();
        contactStatus.textContent = '';
        contactStatus.className = 'contact-status';
        contactSubmitButton.disabled = false;
    }
}

async function handleContactSubmit(event) {
    event.preventDefault();
    if (!contactForm) return;

    contactSubmitButton.disabled = true;
    contactStatus.textContent = 'Enviando...';
    contactStatus.className = 'contact-status';

    const formData = new FormData(contactForm);
    const data = {
        name: formData.get('name'),
        email: formData.get('email'),
        company: formData.get('company'),
        subject: formData.get('subject'),
        message: formData.get('message'),
    };

    try {
        const response = await fetch('/api/contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        const result = await response.json();

        if (response.ok) {
            contactStatus.textContent = '¡Mensaje enviado con éxito! Gracias.';
            contactStatus.className = 'contact-status success';
            contactForm.reset();
        } else {
            throw new Error(result.error || 'Error desconocido.');
        }

    } catch (error) {
        contactStatus.textContent = `Error: ${error.message}`;
        contactStatus.className = 'contact-status error';
    } finally {
        contactSubmitButton.disabled = false;
    }
}

if (contactLink) {
    contactLink.addEventListener('click', (e) => {
        e.preventDefault();
        openContactModal();
    });
}

if (closeContactModalBtn) {
    closeContactModalBtn.addEventListener('click', closeContactModal);
}

if (contactModalOverlay) {
    contactModalOverlay.addEventListener('click', (e) => {
        if (e.target === contactModalOverlay) {
            closeContactModal();
        }
    });
}

if (contactForm) {
    contactForm.addEventListener('submit', handleContactSubmit);
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (!iframeViewer.classList.contains('hidden')) {
            closeIframeViewer();
        } 
        else if (contactModalOverlay && !contactModalOverlay.classList.contains('hidden')) {
            closeContactModal();
        }
    }
});