// Dados do livro
        let bookData = {
            title: "Nossa História",
            coverPhoto: null,
            coverText: "Uma jornada de amor e momentos especiais...",
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

        let currentPage = 0;
        let currentEditorPage = 0;
        let selectedElement = null;
        let dragOffset = { x: 0, y: 0 };
        let isDragging = false;

        // Inicialização
        document.addEventListener('DOMContentLoaded', function() {
            loadBookData();
            generatePages();
            updatePageSelector();
        });

        // Salvar e carregar dados
        function saveBookData() {
            bookData.title = document.getElementById('coverTitle').textContent;
            bookData.coverText = document.getElementById('coverText').textContent;
            
            // Aqui você pode implementar persistência real
            console.log('Dados salvos:', bookData);
        }

        function loadBookData() {
            document.getElementById('coverTitle').textContent = bookData.title;
            document.getElementById('coverText').textContent = bookData.coverText;
            
            if (bookData.coverPhoto) {
                const coverPhoto = document.getElementById('coverPhoto');
                coverPhoto.innerHTML = `<img src="${bookData.coverPhoto}" alt="Foto da Capa">`;
            }
        }

        // Upload de foto da capa
        function uploadCoverPhoto() {
            const input = document.getElementById('fileInput');
            input.onchange = function(e) {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        bookData.coverPhoto = e.target.result;
                        const coverPhoto = document.getElementById('coverPhoto');
                        coverPhoto.innerHTML = `<img src="${e.target.result}" alt="Foto da Capa">`;
                    };
                    reader.readAsDataURL(file);
                }
            };
            input.click();
        }

        // Navegação
        function openBook() {
            saveBookData();
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

        function openEditor() {
            saveBookData();
            document.getElementById('editor').style.display = 'block';
            loadEditorPage(currentEditorPage);
            updatePageSelector();
        }

        function closeEditor() {
            document.getElementById('editor').style.display = 'none';
            generatePages();
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
                    if (element.x < 400) {
                        leftSide.appendChild(el);
                    } else {
                        rightSide.appendChild(el);
                        el.style.left = (element.x - 400) + 'px';
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
            }

            makeDraggable(el);
            return el;
        }

        function addTextElement() {
            const elementData = {
                type: 'text',
                content: 'Digite seu texto aqui...',
                x: 100,
                y: 100,
                width: 200,
                height: 80,
                fontSize: 16,
                color: '#333'
            };

            const el = createDraggableElement(elementData);
            document.getElementById('editorPage').appendChild(el);
        }

        function addImageElement() {
            const input = document.getElementById('fileInput');
            input.onchange = function(e) {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        const elementData = {
                            type: 'image',
                            src: e.target.result,
                            alt: file.name,
                            x: 100,
                            y: 100,
                            width: 200,
                            height: 150
                        };

                        const el = createDraggableElement(elementData);
                        document.getElementById('editorPage').appendChild(el);
                    };
                    reader.readAsDataURL(file);
                }
            };
            input.click();
        }

        // Sistema de drag and drop
        function makeDraggable(element) {
            element.addEventListener('mousedown', startDrag);
            element.addEventListener('click', selectElement);
        }

        function selectElement(e) {
            e.stopPropagation();
            if (selectedElement) {
                selectedElement.classList.remove('selected');
            }
            selectedElement = e.target.closest('.draggable-element');
            selectedElement.classList.add('selected');
        }

        function startDrag(e) {
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
            selectedElement.style.top = Math.max(0, Math.min(newY, editorRect.height - selectedElement.offsetHeight)) + 'px';
        }

        function stopDrag() {
            isDragging = false;
            document.removeEventListener('mousemove', drag);
            document.removeEventListener('mouseup', stopDrag);
        }

        // Event listeners
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Delete' && selectedElement && document.getElementById('editor').style.display === 'block') {
                selectedElement.remove();
                selectedElement = null;
            }
        });

        // Clique fora para deselecionar
        document.getElementById('editorPage').addEventListener('click', function(e) {
            if (e.target === this) {
                if (selectedElement) {
                    selectedElement.classList.remove('selected');
                    selectedElement = null;
                }
            }
        });

        // Auto-save
        setInterval(() => {
            if (document.getElementById('editor').style.display === 'block') {
                saveCurrentEditorPage();
            }
            saveBookData();
        }, 5000);
