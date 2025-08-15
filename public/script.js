// Dados do livro
let bookData = {
    title: "Nossa História",
    coverPhoto: null,
    coverPhotoType: 'image',
    coverText: "Uma jornada de amor e momentos especiais...",
    coverStyle: {
        titleColor: '#FFD700',
        textColor: '#FFD700',
        background: 'classic',
        titleSize: 2.8
    },
    pages: [
        {
            elements: [
                {
                    type: 'text',
                    content: 'Era uma vez...',
                    x: 50,
                    y: 100,
                    width: 300,
                    height: 100
                }
            ]
        }
    ]
};

// Configuração da API
const API_BASE_URL = window.location.origin + '/api';
const USER_ID = 'default-user'; // Em uma aplicação real, isso viria da autenticação

let currentPage = 0;
let currentEditorPage = 0;
let selectedElement = null;
let dragOffset = { x: 0, y: 0 };
let isDragging = false;
let isResizing = false;
let resizeHandle = null;
let uploadTarget = null;

// Funções da API
async function loadBookFromAPI() {
    try {
        const response = await fetch(`${API_BASE_URL}/book/${USER_ID}`);
        if (response.ok) {
            const data = await response.json();
            bookData = data;
            console.log('Livro carregado do banco:', bookData);
            return true;
        }
    } catch (error) {
        console.error('Erro ao carregar livro:', error);
    }
    return false;
}

async function saveBookToAPI() {
    try {
        const response = await fetch(`${API_BASE_URL}/book/${USER_ID}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bookData)
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('Livro salvo:', result.message);
            return true;
        }
    } catch (error) {
        console.error('Erro ao salvar livro:', error);
    }
    return false;
}

// Inicialização
document.addEventListener('DOMContentLoaded', async function() {
    showLoading();
    try {
        const loaded = await loadBookFromAPI();
        if (loaded) {
            loadBookData();
        }
        generatePages();
        updatePageSelector();
    } catch (err) {
        console.error('Falha na inicialização:', err);
    } finally {
        hideLoading();
    }
});

function showLoading() {
    const loading = document.createElement('div');
    loading.id = 'loading';
    loading.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        color: white;
        font-size: 1.5em;
        z-index: 99999;
    `;
    loading.innerHTML = '<div>Carregando...</div>';
    document.body.appendChild(loading);
}

function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.remove();
    }
}

// Salvar e carregar dados (modificado)
async function saveBookData() {
    bookData.title = document.getElementById('coverTitle').textContent;
    bookData.coverText = document.getElementById('coverText').textContent;
    
    // Salvar no banco
    await saveBookToAPI();
}

function loadBookData() {
    document.getElementById('coverTitle').textContent = bookData.title;
    document.getElementById('coverText').textContent = bookData.coverText;
    
    // Aplicar estilos da capa
    applyCoverStyle();
    
    if (bookData.coverPhoto) {
        const coverPhoto = document.getElementById('coverPhoto');
        if (bookData.coverPhotoType === 'video') {
            coverPhoto.innerHTML = `<video src="${bookData.coverPhoto}" controls muted></video>`;
        } else {
            coverPhoto.innerHTML = `<img src="${bookData.coverPhoto}" alt="Foto da Capa">`;
        }
    }
}

function applyCoverStyle() {
    const cover = document.getElementById('bookCover');
    const title = document.getElementById('coverTitle');
    const text = document.getElementById('coverText');
    
    title.style.color = bookData.coverStyle.titleColor;
    title.style.fontSize = bookData.coverStyle.titleSize + 'em';
    text.style.color = bookData.coverStyle.textColor;
    
    const backgrounds = {
        classic: 'linear-gradient(145deg, #8B4513, #A0522D)',
        elegant: 'linear-gradient(145deg, #1e3c72, #2a5298)',   
        romantic: 'linear-gradient(135deg, #CF000E, #2b0307)',
        modern: 'linear-gradient(145deg, #2c3e50, #34495e)',
        vintage: 'linear-gradient(145deg, #556270, #4ecdc4)'
    };
    
    cover.style.background = backgrounds[bookData.coverStyle.background] || backgrounds.classic;
}

// Upload de arquivos
function uploadCoverPhoto() {
    uploadTarget = 'cover';
    document.getElementById('fileInput').click();
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const isVideo = file.type.startsWith('video/');
        
        if (uploadTarget === 'cover') {
            bookData.coverPhoto = e.target.result;
            bookData.coverPhotoType = isVideo ? 'video' : 'image';
            const coverPhoto = document.getElementById('coverPhoto');
            
            if (isVideo) {
                coverPhoto.innerHTML = `<video src="${e.target.result}" controls muted></video>`;
            } else {
                coverPhoto.innerHTML = `<img src="${e.target.result}" alt="Foto da Capa">`;
            }
        } else if (uploadTarget === 'element') {
            const elementData = {
                type: isVideo ? 'video' : 'image',
                src: e.target.result,
                alt: file.name,
                x: 100,
                y: 100,
                width: 250,
                height: isVideo ? 180 : 200
            };

            const el = createDraggableElement(elementData);
            document.getElementById('editorPage').appendChild(el);
        } else if (uploadTarget === 'cover-editor') {
            bookData.coverPhoto = e.target.result;
            bookData.coverPhotoType = isVideo ? 'video' : 'image';
            updateCoverPreview();
        }
    };
    reader.readAsDataURL(file);
    
    // Resetar o input
    event.target.value = '';
}

// Navegação
async function openBook() {
    await saveBookData();
    document.getElementById('coverContainer').style.display = 'none';
    document.getElementById('bookContainer').style.display = 'flex';
    generatePages();
    currentPage = 0;
    updatePageIndicator();
}

function closebook() {
    document.getElementById('bookContainer').style.display = 'none';
    document.getElementById('coverContainer').style.display = 'flex';
}

async function openEditor() {
    await saveBookData();
    document.getElementById('editor').style.display = 'block';
    loadEditorPage(currentEditorPage);
    updatePageSelector();
}

function closeEditor() {
    document.getElementById('editor').style.display = 'none';
    generatePages();
}

// Editor da Capa
function openCoverEditor() {
    document.getElementById('coverEditor').style.display = 'block';
    
    // Carregar valores atuais
    document.getElementById('titleInput').value = bookData.title;
    document.getElementById('textInput').value = bookData.coverText;
    document.getElementById('titleColor').value = bookData.coverStyle.titleColor;
    document.getElementById('textColor').value = bookData.coverStyle.textColor;
    document.getElementById('backgroundStyle').value = bookData.coverStyle.background;
    document.getElementById('titleSize').value = bookData.coverStyle.titleSize;
    
    updateCoverPreview();
}

function closeCoverEditor() {
    document.getElementById('coverEditor').style.display = 'none';
}

function updateCoverPreview() {
    const preview = document.getElementById('coverPreview');
    const previewTitle = document.getElementById('previewTitle');
    const previewText = document.getElementById('previewText');
    const previewPhoto = document.getElementById('previewPhoto');
    
    previewTitle.textContent = document.getElementById('titleInput').value;
    previewText.textContent = document.getElementById('textInput').value;
    
    const titleColor = document.getElementById('titleColor').value;
    const textColor = document.getElementById('textColor').value;
    const backgroundStyle = document.getElementById('backgroundStyle').value;
    const titleSize = document.getElementById('titleSize').value;
    
    previewTitle.style.color = titleColor;
    previewTitle.style.fontSize = titleSize + 'em';
    previewText.style.color = textColor;
    
    const backgrounds = {
        classic: 'linear-gradient(145deg, #8B4513, #A0522D)',
        elegant: 'linear-gradient(145deg, #1e3c72, #2a5298)',
        romantic: 'linear-gradient(135deg, #CF000E, #2b0307)',
        modern: 'linear-gradient(145deg, #2c3e50, #34495e)',
        vintage: 'linear-gradient(145deg, #556270, #4ecdc4)'
    };
    
    preview.style.background = backgrounds[backgroundStyle] || backgrounds.classic;
    
    if (bookData.coverPhoto) {
        if (bookData.coverPhotoType === 'video') {
            previewPhoto.innerHTML = `<video src="${bookData.coverPhoto}" controls muted></video>`;
        } else {
            previewPhoto.innerHTML = `<img src="${bookData.coverPhoto}" alt="Foto da Capa">`;
        }
    } else {
        previewPhoto.innerHTML = '<span>Clique para adicionar foto/vídeo</span>';
    }
}

function changeCoverMedia() {
    uploadTarget = 'cover-editor';
    document.getElementById('fileInput').click();
}

async function applyCoverChanges() {
    bookData.title = document.getElementById('titleInput').value;
    bookData.coverText = document.getElementById('textInput').value;
    bookData.coverStyle.titleColor = document.getElementById('titleColor').value;
    bookData.coverStyle.textColor = document.getElementById('textColor').value;
    bookData.coverStyle.background = document.getElementById('backgroundStyle').value;
    bookData.coverStyle.titleSize = parseFloat(document.getElementById('titleSize').value);
    
    loadBookData();
    await saveBookData();
    closeCoverEditor();
}

// Geração de páginas
function generatePages() {
    const book = document.getElementById('book');
    book.innerHTML = '';

    bookData.pages.forEach((pageData, index) => {
        const page = document.createElement('div');
        page.className = 'page';
        page.style.zIndex = bookData.pages.length - index;
        
        const pageContent = document.createElement('div');
        pageContent.className = 'page-content';
        
        const leftSide = document.createElement('div');
        leftSide.className = 'page-left';
        
        const rightSide = document.createElement('div');
        rightSide.className = 'page-right';
        
        // Renderizar elementos na página
        pageData.elements.forEach(element => {
            const el = createPageElement(element);
            if (element.x < 500) {
                leftSide.appendChild(el);
            } else {
                rightSide.appendChild(el);
                el.style.left = (element.x - 500) + 'px';
            }
        });
        
        // Número da página
        const pageNumber = document.createElement('div');
        pageNumber.className = 'page-number';
        pageNumber.textContent = index + 1;
        rightSide.appendChild(pageNumber);
        
        pageContent.appendChild(leftSide);
        pageContent.appendChild(rightSide);
        page.appendChild(pageContent);
        book.appendChild(page);
    });
}

function createPageElement(elementData) {
    const el = document.createElement('div');
    el.style.position = 'absolute';
    el.style.left = elementData.x + 'px';
    el.style.top = elementData.y + 'px';
    el.style.width = elementData.width + 'px';
    el.style.height = elementData.height + 'px';

    if (elementData.type === 'text') {
        el.className = 'text-element';
        el.textContent = elementData.content;
        el.style.fontSize = (elementData.fontSize || 16) + 'px';
        el.style.color = elementData.color || '#333';
    } else if (elementData.type === 'image') {
        el.className = 'image-element';
        el.innerHTML = `<img src="${elementData.src}" alt="${elementData.alt || ''}">`;
    } else if (elementData.type === 'video') {
        el.className = 'video-element';
        el.innerHTML = `<video src="${elementData.src}" controls muted></video>`;
    }

    return el;
}

// Navegação entre páginas
function nextPage() {
    if (currentPage < bookData.pages.length - 1) {
        const pages = document.querySelectorAll('.page');
        pages[currentPage].classList.add('turned');
        currentPage++;
        updatePageIndicator();
    }
}

function prevPage() {
    if (currentPage > 0) {
        currentPage--;
        const pages = document.querySelectorAll('.page');
        pages[currentPage].classList.remove('turned');
        updatePageIndicator();
    }
}

function updatePageIndicator() {
    document.getElementById('pageIndicator').textContent = `Página ${currentPage + 1} de ${bookData.pages.length}`;
}

// Editor
function addPage() {
    bookData.pages.push({ elements: [] });
    updatePageSelector();
    currentEditorPage = bookData.pages.length - 1;
    document.getElementById('pageSelector').value = currentEditorPage;
    loadEditorPage(currentEditorPage);
}

function deletePage() {
    if (bookData.pages.length > 1) {
        bookData.pages.splice(currentEditorPage, 1);
        if (currentEditorPage >= bookData.pages.length) {
            currentEditorPage = bookData.pages.length - 1;
        }
        updatePageSelector();
        loadEditorPage(currentEditorPage);
    }
}

function updatePageSelector() {
    const selector = document.getElementById('pageSelector');
    selector.innerHTML = '';
    bookData.pages.forEach((_, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `Página ${index + 1}`;
        selector.appendChild(option);
    });
    selector.value = currentEditorPage;
}

function switchEditorPage() {
    saveCurrentEditorPage();
    currentEditorPage = parseInt(document.getElementById('pageSelector').value);
    loadEditorPage(currentEditorPage);
}

function saveCurrentEditorPage() {
    const editorPage = document.getElementById('editorPage');
    const elements = editorPage.querySelectorAll('.draggable-element');
    
    bookData.pages[currentEditorPage].elements = [];
    
    elements.forEach(el => {
        const elementData = {
            type: el.dataset.type,
            x: parseInt(el.style.left),
            y: parseInt(el.style.top),
            width: parseInt(el.style.width),
            height: parseInt(el.style.height)
        };

        if (el.dataset.type === 'text') {
            elementData.content = el.textContent;
            elementData.fontSize = parseInt(el.style.fontSize) || 16;
            elementData.color = el.style.color || '#333';
        } else if (el.dataset.type === 'image') {
            const img = el.querySelector('img');
            elementData.src = img.src;
            elementData.alt = img.alt;
        } else if (el.dataset.type === 'video') {
            const video = el.querySelector('video');
            elementData.src = video.src;
        }

        bookData.pages[currentEditorPage].elements.push(elementData);
    });
}

function loadEditorPage(pageIndex) {
    const editorPage = document.getElementById('editorPage');
    editorPage.innerHTML = '';

    if (bookData.pages[pageIndex]) {
        bookData.pages[pageIndex].elements.forEach(elementData => {
            const el = createDraggableElement(elementData);
            editorPage.appendChild(el);
        });
    }
}

function createDraggableElement(elementData) {
    const el = document.createElement('div');
    el.className = 'draggable-element';
    el.dataset.type = elementData.type;
    el.style.left = elementData.x + 'px';
    el.style.top = elementData.y + 'px';
    el.style.width = elementData.width + 'px';
    el.style.height = elementData.height + 'px';

    if (elementData.type === 'text') {
        el.className += ' text-element';
        el.contentEditable = true;
        el.textContent = elementData.content;
        el.style.fontSize = (elementData.fontSize || 16) + 'px';
        el.style.color = elementData.color || '#333';
    } else if (elementData.type === 'image') {
        el.className += ' image-element';
        el.innerHTML = `<img src="${elementData.src}" alt="${elementData.alt || ''}">`;
    } else if (elementData.type === 'video') {
        el.className += ' video-element';
        el.innerHTML = `<video src="${elementData.src}" controls muted></video>`;
    }

    makeDraggable(el);
    addResizeHandles(el);
    return el;
}

function addTextElement() {
    const elementData = {
        type: 'text',
        content: 'Digite seu texto aqui...',
        x: 100,
        y: 100,
        width: 250,
        height: 100,
        fontSize: 16,
        color: '#333'
    };

    const el = createDraggableElement(elementData);
    document.getElementById('editorPage').appendChild(el);
}

function addImageElement() {
    uploadTarget = 'element';
    document.getElementById('fileInput').accept = 'image/*';
    document.getElementById('fileInput').click();
}

function addVideoElement() {
    uploadTarget = 'element';
    document.getElementById('fileInput').accept = 'video/*';
    document.getElementById('fileInput').click();
}

// Sistema de drag and drop

// Event listeners
document.addEventListener('keydown', function(e) {
    if (e.key === 'Delete' && selectedElement && document.getElementById('editor').style.display === 'block') {
        selectedElement.remove();
        selectedElement = null;
    }
});

// Clique fora para deselecionar
document.getElementById('editorPage')?.addEventListener('click', function(e) {
    if (e.target === this) {
        if (selectedElement) {
            selectedElement.classList.remove('selected');
            hideResizeHandles(selectedElement);
            selectedElement = null;
        }
    }
});

// Auto-save com API
setInterval(async () => {
    if (document.getElementById('editor')?.style.display === 'block') {
        saveCurrentEditorPage();
    }
    await saveBookData();
}, 10000); // Salvar a cada 10 segundos

// Inicializar handles ocultos
document.addEventListener('DOMContentLoaded', function() {
    const style = document.createElement('style');
    style.textContent = '.resize-handle { display: none; }';
    document.head.appendChild(style);
});
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;
    
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);

function drag(e) {
    if (!isDragging || !selectedElement) return;
    
    const editorRect = document.getElementById('editorPage').getBoundingClientRect();
    const newX = e.clientX - editorRect.left - dragOffset.x;
    const newY = e.clientY - editorRect.top - dragOffset.y;
    
    selectedElement.style.left = Math.max(0, Math.min(newX, editorRect.width - selectedElement.offsetWidth)) + 'px';
    selectedElement.style.top = Math.max(0, Math.min(newY, editorRect.height - selectedElement.offsetHeight)) + 'px';
}

function stopDrag() {
    isDragging = false;
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', stopDrag);
}

// Sistema de redimensionamento
function addResizeHandles(element) {
    const handles = ['nw', 'ne', 'sw', 'se'];
    handles.forEach(position => {
        const handle = document.createElement('div');
        handle.className = `resize-handle ${position}`;
        handle.dataset.position = position;
        element.appendChild(handle);
    });
}

function showResizeHandles(element) {
    const handles = element.querySelectorAll('.resize-handle');
    handles.forEach(handle => handle.style.display = 'block');
}

function hideResizeHandles(element) {
    const handles = element.querySelectorAll('.resize-handle');
    handles.forEach(handle => handle.style.display = 'none');
}

function startResize(e) {
    e.preventDefault();
    e.stopPropagation();
    
    isResizing = true;
    resizeHandle = e.target.dataset.position;
    selectedElement = e.target.closest('.draggable-element');
    
    const rect = selectedElement.getBoundingClientRect();
    const editorRect = document.getElementById('editorPage').getBoundingClientRect();}

function makeDraggable(element) {
    element.addEventListener('mousedown', startDrag);
    element.addEventListener('click', selectElement);
}

function startDrag(e) {
    if (e.target.classList.contains('resize-handle')) {
        startResize(e);
        return;
    }

    e.preventDefault();
    isDragging = true;
    selectedElement = e.target.closest('.draggable-element');

    const rect = selectedElement.getBoundingClientRect();
    const editorRect = document.getElementById('editorPage').getBoundingClientRect();

    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;

    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);
}

function drag(e) {
    if (!isDragging || !selectedElement) return;

    const editorRect = document.getElementById('editorPage').getBoundingClientRect();
    const newX = e.clientX - editorRect.left - dragOffset.x;
    const newY = e.clientY - editorRect.top - dragOffset.y;

    selectedElement.style.left = Math.max(0, Math.min(newX, editorRect.width - selectedElement.offsetWidth)) + 'px';
    selectedElement.style.top  = Math.max(0, Math.min(newY, editorRect.height - selectedElement.offsetHeight)) + 'px';
}

function stopDrag() {
    isDragging = false;
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', stopDrag);
}

function startResize(e) {
    e.preventDefault();
    e.stopPropagation();

    isResizing = true;
    resizeHandle = e.target.dataset.position;
    selectedElement = e.target.closest('.draggable-element');

    const rect = selectedElement.getBoundingClientRect();
    const editorRect = document.getElementById('editorPage').getBoundingClientRect();

    dragOffset.startX = e.clientX;
    dragOffset.startY = e.clientY;
    dragOffset.startWidth  = rect.width;
    dragOffset.startHeight = rect.height;
    dragOffset.startLeft   = rect.left - editorRect.left;
    dragOffset.startTop    = rect.top  - editorRect.top;

    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
}

function resize(e) {
    if (!isResizing || !selectedElement) return;

    const deltaX = e.clientX - dragOffset.startX;
    const deltaY = e.clientY - dragOffset.startY;

    let newWidth  = dragOffset.startWidth;
    let newHeight = dragOffset.startHeight;
    let newLeft   = dragOffset.startLeft;
    let newTop    = dragOffset.startTop;

    switch (resizeHandle) {
        case 'se':
            newWidth  = Math.max(50, dragOffset.startWidth  + deltaX);
            newHeight = Math.max(30, dragOffset.startHeight + deltaY);
            break;
        case 'sw':
            newWidth  = Math.max(50, dragOffset.startWidth  - deltaX);
            newHeight = Math.max(30, dragOffset.startHeight + deltaY);
            newLeft   = dragOffset.startLeft + deltaX;
            break;
        case 'ne':
            newWidth  = Math.max(50, dragOffset.startWidth  + deltaX);
            newHeight = Math.max(30, dragOffset.startHeight - deltaY);
            newTop    = dragOffset.startTop + deltaY;
            break;
        case 'nw':
            newWidth  = Math.max(50, dragOffset.startWidth  - deltaX);
            newHeight = Math.max(30, dragOffset.startHeight - deltaY);
            newLeft   = dragOffset.startLeft + deltaX;
            newTop    = dragOffset.startTop  + deltaY;
            break;
    }

    selectedElement.style.width  = newWidth + 'px';
    selectedElement.style.height = newHeight + 'px';
    selectedElement.style.left   = Math.max(0, newLeft) + 'px';
    selectedElement.style.top    = Math.max(0, newTop)  + 'px';
}

function stopResize() {
    isResizing = false;
    resizeHandle = null;
    document.removeEventListener('mousemove', resize);
    document.removeEventListener('mouseup', stopResize);
}
