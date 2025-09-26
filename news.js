// ./news.js
const newsContainer = document.getElementById("newsContainer");
const loading = document.getElementById("loading");
const error = document.getElementById("error");

let page = 0;
let isLoading = false;
const limit = 10;

async function fetchNews(page, limit) {
  const res = await fetch(`/api/posts?page=${page}&limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch news");
  return await res.json();
}

function renderNews(newsItems) {
  newsItems.forEach((item) => {
    const card = document.createElement("div");
    card.className = "news-card";
    card.dataset.id = item.entity;
    card.dataset.entity = item.entity;

    // Determinar si es un video de YouTube
    let mediaHTML = '';
    if (item.image.includes("youtube.com") || item.image.includes("youtu.be")) {
      // Extraer el ID del video
      let videoId = null;
      if (item.image.includes("youtube.com")) {
        const urlParams = new URL(item.image).searchParams;
        videoId = urlParams.get("v");
      } else if (item.image.includes("youtu.be")) {
        videoId = item.image.split("/").pop();
      }
      if (videoId) {
        mediaHTML = `
          <div class="news-image-wrapper">
            <iframe 
              width="100%" 
              height="200" 
              src="https://www.youtube.com/embed/${videoId}" 
              frameborder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowfullscreen>
            </iframe>
            <div class="watermark">YouTube</div>
          </div>
        `;
      }
    } else {
      mediaHTML = `
        <div class="news-image-wrapper">
          <img src="${item.image}" alt="${item.title}" class="news-image">
          <div class="watermark">Source</div>
        </div>
      `;
    }

    card.innerHTML = `
      ${mediaHTML}
      <div class="card-info">
        <h3 class="news-title">${item.title}</h3>
        <p>${item.description || item.metadata?.subreddit || ""}</p>
        <div class="news-meta">
          <span>By ${item.metadata?.author || "Unknown"}</span>
          <span>${new Date(item.created_at).toLocaleDateString("en-US")}</span>
        </div>
      </div>
    `;

    // Clicks solo para imágenes, no iframe
    const image = card.querySelector(".news-image");
    const title = card.querySelector(".news-title");
    if (image) {
      image.addEventListener("click", () => {
        window.location.href = `article.html?id=${card.dataset.id}`;
      });
    }
    title.addEventListener("click", () => {
      window.location.href = `article.html?id=${card.dataset.id}`;
    });

    newsContainer.appendChild(card);
  });
}


async function loadMoreNews() {
  if (isLoading) return;
  isLoading = true;
  loading.style.display = "block";
  error.style.display = "none";

  try {
    const newNews = await fetchNews(page, limit);
    if (newNews.length > 0) {
      renderNews(newNews);
      page++;
    }
    loading.style.display = "none";
  } catch (e) {
    console.error(e);
    loading.style.display = "none";
    error.style.display = "block";
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
  if (scrollPosition >= documentHeight - 300) {
    loadMoreNews();
  }
}, 200));

// Inicial
(async () => {
  await loadMoreNews();
})();
