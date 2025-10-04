document.addEventListener('DOMContentLoaded', () => {
    // --- STATE & CONSTANTS ---
    const state = {
        currentPage: 0,
        isLoading: false,
        isDesktop: window.innerWidth > 768,
        activeMobileVideo: null,
        fullScreenVideoItem: null,
        theme: localStorage.getItem('theme') || 'light' // Se mantiene la lógica de tema para el spinner, aunque el CSS esté fixed en light
    };
    const config = {
        videosPerPage: 9,
        totalVideos: 49,
        baseVideoUrl: 'https://quelora.github.io/media/video'
    };

    // --- DOM ELEMENTS CACHE ---
    const elements = {
        pageHeader: document.getElementById('pageHeader'),
        videoGrid: document.getElementById('videoGrid'),
        loadingIndicator: document.getElementById('loadingIndicator'),
        videoModal: document.getElementById('videoModal'),
        modalVideo: document.getElementById('modalVideo'),
        closeModal: document.getElementById('closeModal'),
        // themeSwitch: document.getElementById('themeSwitch'), // Eliminado del DOM, no se usa
        html: document.documentElement
    };

    // --- INITIALIZATION ---
    function init() {
        setTheme(state.theme);
        setupEventListeners();
        loadVideos();
        setupIntersectionObserver();
    }

    // --- THEME ---
    // Mantenemos la función setTheme para que el código no se rompa, aunque el botón se oculte.
    function setTheme(theme) {
        state.theme = theme;
        elements.html.setAttribute('data-theme', theme);
        // elements.themeSwitch.textContent = theme === 'light' ? '🌙' : '☀️';
        localStorage.setItem('theme', theme);
    }

    function toggleTheme() {
        const newTheme = state.theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
    }
    
    // --- EVENT LISTENERS ---
    function setupEventListeners() {
        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleScroll);
        // elements.themeSwitch.addEventListener('click', toggleTheme); // Eliminado
        elements.videoGrid.addEventListener('click', handleGridClick);
        elements.closeModal.addEventListener('click', hideModal);
        elements.videoModal.addEventListener('click', (e) => {
            if (e.target === elements.videoModal) hideModal();
        });
        window.addEventListener('keydown', handleKeyboard);
    }
    
    function handleResize() {
        const wasDesktop = state.isDesktop;
        state.isDesktop = window.innerWidth > 768;
        if (wasDesktop !== state.isDesktop) {
            stopAllVideos();
            if (state.fullScreenVideoItem) {
                exitFullVideoMode(state.fullScreenVideoItem);
            }
            setTimeout(autoplayVisibleVideo, 200);
        }
    }

    function handleScroll() {
        elements.pageHeader.classList.toggle('scrolled', window.scrollY > 10);
    }
    
    function handleKeyboard(e) {
        if (!elements.videoModal.classList.contains('active')) return;
        if (e.key === 'Escape') hideModal();
        if (e.key === ' ') {
            e.preventDefault();
            elements.modalVideo.paused ? elements.modalVideo.play() : elements.modalVideo.pause();
        }
    }

    // --- VIDEO GRID LOGIC ---
    function handleGridClick(e) {
        const videoItem = e.target.closest('.video-item');
        if (!videoItem) return;

        if (e.target.closest('.action-btn')) {
            // Lógica para los botones de acción (like, comment, etc.)
            return;
        }

        const action = e.target.dataset.action;
        if (action === 'exit') {
            exitFullVideoMode(videoItem);
            return;
        }
        if (e.target.closest('.sound-toggle')) {
            toggleSound(videoItem);
            return;
        }
        
        if (state.isDesktop) {
            showModal(videoItem);
        } else {
            if (videoItem.classList.contains('playing-full')) {
                const video = videoItem.querySelector('video');
                video.paused ? video.play() : video.pause();
            } else {
                playFullVideoInContainer(videoItem);
            }
        }
    }

    // --- MODAL (DESKTOP) ---
    function showModal(videoItem) {
        const video = videoItem.querySelector('video');
        elements.modalVideo.src = `${config.baseVideoUrl}/${video.dataset.id}.mp4`;
        elements.videoModal.classList.add('active');
        elements.modalVideo.play().catch(() => {});
        stopAllVideos();
    }

    function hideModal() {
        elements.modalVideo.pause();
        elements.videoModal.classList.remove('active');
        setTimeout(autoplayVisibleVideo, 200);
    }

    // --- INTERSECTION OBSERVER ---
    function setupIntersectionObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.target === elements.loadingIndicator && entry.isIntersecting) {
                    loadVideos();
                    return;
                }
                if (entry.target.classList.contains('video-item') && !state.isDesktop) {
                    if (state.fullScreenVideoItem) {
                        if (entry.target === state.fullScreenVideoItem && entry.intersectionRatio < 0.5) {
                            exitFullVideoMode(state.fullScreenVideoItem);
                        }
                    } 
                    else {
                        const video = entry.target.querySelector('video');
                        if (entry.intersectionRatio > 0.75) {
                            if (state.activeMobileVideo !== video) {
                                stopAllVideos();
                                playVideo(entry.target, true);
                                state.activeMobileVideo = video;
                            }
                        }
                    }
                }
            });
        }, { 
            threshold: [0.5, 0.75], 
            rootMargin: '0px 0px -50px 0px' 
        });
        
        observer.observe(elements.loadingIndicator);
        return observer;
    }
    const intersectionObserver = setupIntersectionObserver();

    async function loadVideos() {
        if (state.isLoading || (state.currentPage * config.videosPerPage >= config.totalVideos)) return;
        state.isLoading = true;
        elements.loadingIndicator.style.display = 'flex';

        const fragment = document.createDocumentFragment();
        const start = state.currentPage * config.videosPerPage + 1;
        const end = Math.min(start + config.videosPerPage - 1, config.totalVideos);
        
        for (let i = start; i <= end; i++) {
            const videoItem = createVideoItem(i);
            fragment.appendChild(videoItem);
            intersectionObserver.observe(videoItem);
        }
        elements.videoGrid.appendChild(fragment);

        state.currentPage++;
        state.isLoading = false;
        if (state.currentPage * config.videosPerPage >= config.totalVideos) {
            elements.loadingIndicator.style.display = 'none';
            intersectionObserver.unobserve(elements.loadingIndicator);
        }
        setTimeout(autoplayVisibleVideo, 300);
    }
    
    function createVideoItem(id) {
        const videoItem = document.createElement('div');
        videoItem.className = 'video-item';
        videoItem.dataset.id = id;
        
        const thumbUrl = `${config.baseVideoUrl}/thumbs/${id}_thumb.mp4`;
        const posterUrl = `${config.baseVideoUrl}/posters/${id}.webp`;

        // Añadimos la barra de interacción de Quelora
        const interactionBar = `
            <div class="community-interaction-bar">
                <div class="interaction-actions">
                    <div class="interaction-item">
                        <span class="interaction-icon">
                            <svg viewBox="0 0 24 24" width="24px" height="24px" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                        </span>
                        <span class="interaction-count">99</span>
                    </div>
                    <div class="interaction-item">
                        <span class="interaction-icon">
                            <svg viewBox="0 0 24 24" width="24px" height="24px" fill="currentColor"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM17 14H7v-2h10v2zm0-3H7V9h10v2zm0-3H7V6h10v2z"/></svg>
                        </span>
                        <span class="interaction-count">42</span>
                    </div>
                    <div class="interaction-item">
                        <span class="interaction-icon">
                            <svg viewBox="0 0 24 24" width="24px" height="24px" fill="currentColor"><path d="M14 6V4h-4v2H3v2l2 12h14l2-12v-2h-7zm-4-2h4v2h-4V4zm-6 3h16l-1.72 10H6.72L5 7z"/></svg>
                        </span>
                        <span class="interaction-count">8</span>
                    </div>
                </div>
            </div>
        `;
        
        videoItem.innerHTML = `
            <img src="${posterUrl}" class="poster" alt="Video thumbnail" loading="lazy">
            <video preload="metadata" playsinline muted loop poster="${posterUrl}" data-id="${id}">
                <source src="${thumbUrl}" type="video/mp4">
            </video>
            
            <div class="video-actions-bar">
                </div>
            
            ${interactionBar} <div class="play-pause-overlay">
                <svg viewBox="0 0 24 24"><path fill="white" d="M8,5.14V19.14L19,12.14L8,5.14Z" /></svg>
            </div>
            <div class="fullscreen-controls">
                <button class="fs-button" data-action="exit" aria-label="Exit fullscreen">✕</button>
            </div>
            <button class="sound-toggle" style="display: none;" aria-label="Toggle sound">🔇</button>
            <div class="video-loading"><div class="spinner"></div></div>
        `;
        
        const video = videoItem.querySelector('video');
        video.addEventListener('play', () => videoItem.classList.remove('is-paused'));
        video.addEventListener('pause', () => videoItem.classList.add('is-paused'));
        video.addEventListener('ended', () => {
            if (videoItem.classList.contains('playing-full')) exitFullVideoMode(videoItem);
        });
        return videoItem;
    }
    
    function playVideo(videoItem, isMuted) {
        const video = videoItem.querySelector('video');
        const poster = videoItem.querySelector('.poster');
        video.muted = isMuted;
        const playPromise = video.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                poster.style.opacity = '0';
            }).catch(() => {
                poster.style.opacity = '1';
            });
        }
    }
    
    function stopAllVideos() {
        document.querySelectorAll('.video-item video').forEach(video => {
            video.pause();
            const poster = video.parentElement.querySelector('.poster');
            if (poster) poster.style.opacity = '1';
        });
        state.activeMobileVideo = null;
    }
    
    function autoplayVisibleVideo() {
        if (state.fullScreenVideoItem) return;

        if (state.isDesktop) {
            document.querySelectorAll('.video-item').forEach(item => {
                item.onmouseenter = () => { if (!state.fullScreenVideoItem && !elements.videoModal.classList.contains('active')) playVideo(item, true) };
                item.onmouseleave = () => {
                    const video = item.querySelector('video');
                    video.pause();
                    video.currentTime = 0;
                };
            });
        } else {
            stopAllVideos();
            const videoItems = Array.from(document.querySelectorAll('.video-item'));
            let mostVisibleItem = null;
            let maxVisibility = 0;
            
            videoItems.forEach(item => {
                const rect = item.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                if (rect.top >= 0 && rect.bottom <= viewportHeight) {
                    const visibleHeight = Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);
                    const visibilityRatio = visibleHeight / rect.height;
                    if (visibilityRatio > maxVisibility) {
                        maxVisibility = visibilityRatio;
                        mostVisibleItem = item;
                    }
                }
            });
            
            if (mostVisibleItem) {
                playVideo(mostVisibleItem, true);
                state.activeMobileVideo = mostVisibleItem.querySelector('video');
            }
        }
    }

    function playFullVideoInContainer(videoItem) {
        if (state.fullScreenVideoItem) exitFullVideoMode(state.fullScreenVideoItem);
        stopAllVideos();

        const video = videoItem.querySelector('video');
        const soundToggle = videoItem.querySelector('.sound-toggle');
        const fullUrl = `${config.baseVideoUrl}/${video.dataset.id}.mp4`;

        state.fullScreenVideoItem = videoItem;
        videoItem.classList.add('playing-full', 'loading');
        soundToggle.style.display = 'flex';
        soundToggle.textContent = '🔇';
        
        video.src = fullUrl;
        video.loop = false;
        
        video.addEventListener('loadeddata', function onLoaded() {
            videoItem.classList.remove('loading');
            video.muted = false;
            soundToggle.textContent = '🔊';
            playVideo(videoItem, false);
            video.removeEventListener('loadeddata', onLoaded);
        }, { once: true });
        
        video.load();
    }

    function exitFullVideoMode(videoItem) {
        const video = videoItem.querySelector('video');
        const soundToggle = videoItem.querySelector('.sound-toggle');
        const thumbUrl = `${config.baseVideoUrl}/thumbs/${video.dataset.id}_thumb.mp4`;

        video.pause();
        videoItem.classList.remove('playing-full', 'loading', 'is-paused');
        soundToggle.style.display = 'none';
        state.fullScreenVideoItem = null;
        
        video.src = thumbUrl;
        video.loop = true;
        video.muted = true;
        video.load();

        setTimeout(autoplayVisibleVideo, 200);
    }

    function toggleSound(videoItem) {
        const video = videoItem.querySelector('video');
        const soundToggle = videoItem.querySelector('.sound-toggle');
        video.muted = !video.muted;
        soundToggle.textContent = video.muted ? '🔇' : '🔊';
    }

    // --- START THE APP ---
    init();
});