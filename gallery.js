const gallery = document.getElementById('gallery');
let imageIndex = 20;

function createImageCard(id) {
    const card = document.createElement('div');
    card.className = 'card';
    card.id = `card-${id}`;

    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'card-image-wrapper';
    
    const img = document.createElement('img');
    img.src = `https://picsum.photos/id/${id}/500/400`;
    img.alt = `Image ${id}`;
    img.loading = 'lazy';
    
    // MODIFICADO: Contenedor para el enlace del watermark
    const watermark = document.createElement('div');
    watermark.className = 'watermark';
    
    const watermarkLink = document.createElement('a');
    watermarkLink.href = 'https://picsum.photos/'; // Enlace a Picsum.photos
    watermarkLink.target = '_blank';
    watermarkLink.rel = 'noopener noreferrer';
    watermarkLink.textContent = 'Credits: Picsum'; 
    
    watermark.appendChild(watermarkLink); // Agregamos el enlace al div watermark
    
    imageWrapper.appendChild(img);
    imageWrapper.appendChild(watermark);

    const cardInfo = document.createElement('div');
    cardInfo.className = 'card-info';

    const labelText = document.createElement('p');
    labelText.className = 'label-text';
    labelText.textContent = `Imagen #${id}`;

    const interactionBox = document.createElement('div');
    interactionBox.className = 'interaction';
    
    const optionsWrapper = document.createElement('div');
    optionsWrapper.className = 'options-wrapper';

    const optionsButton = document.createElement('button');
    optionsButton.className = 'options-button';
    optionsButton.setAttribute('aria-label', 'Más opciones');
    // SVG de tres puntos verticales
    optionsButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>`;

    const dropdownMenu = document.createElement('ul');
    dropdownMenu.className = 'dropdown-menu';
    
    const viewSourceLink = document.createElement('a');
    viewSourceLink.href = img.src;
    viewSourceLink.target = '_blank';
    viewSourceLink.rel = 'noopener noreferrer';
    viewSourceLink.textContent = 'Ver en origen';

    const listItem = document.createElement('li');
    listItem.appendChild(viewSourceLink);
    dropdownMenu.appendChild(listItem);

    // Lógica para mostrar/ocultar el dropdown
    optionsButton.addEventListener('click', (event) => {
        event.stopPropagation();
        // Cierra otros menús abiertos
        document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
            if (menu !== dropdownMenu) {
                menu.classList.remove('show');
            }
        });
        dropdownMenu.classList.toggle('show');
    });

    optionsWrapper.appendChild(optionsButton);
    optionsWrapper.appendChild(dropdownMenu);
    cardInfo.appendChild(labelText);
    cardInfo.appendChild(interactionBox);
    cardInfo.appendChild(optionsWrapper);

    card.appendChild(imageWrapper);
    card.appendChild(cardInfo);

    // Eliminar la tarjeta si la imagen no carga
    img.onerror = () => {
        card.remove();
    };

    return card;
}

// Lógica de cierre para el menú de opciones
window.addEventListener('click', (event) => {
    // Asegurarse de que solo se cierren los menús de opciones (dropdown-menu)
    if (!event.target.closest('.options-button')) {
        document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
            menu.classList.remove('show');
        });
    }
});


function loadImages(count = 18) {
    for (let i = 0; i < count; i++) {
        const card = createImageCard(imageIndex);
        gallery.appendChild(card);
        imageIndex++;
    }
}

// Función de debounce para optimizar el evento scroll
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

const debouncedLoadImages = debounce(() => {
    const gallery = document.getElementById('gallery');
    const lastCard = gallery.lastElementChild;
    // Carga más imágenes si la última tarjeta está visible (o casi visible)
    if (lastCard) {
        const rect = lastCard.getBoundingClientRect();
        const isVisible = rect.top <= window.innerHeight + 100 && rect.bottom >= -100;
        if (isVisible) {
            loadImages(18);
        }
    }
}, 300);

// Iniciar la carga inicial y el evento de scroll
window.addEventListener('scroll', debouncedLoadImages);
loadImages(24);