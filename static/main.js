document.addEventListener('DOMContentLoaded', () => {
    console.log("Éditeur BD - Script principal chargé");

    let draggedSrc = null;

    // --- Initialisation de l'éditeur ---
    function initializeEditor() {
        const editorArea = document.getElementById('editor-area');
        if (!editorArea) return;

        const templateImage = editorArea.querySelector('#template-image');
        if (!templateImage || !window.panelCoordinates || window.panelCoordinates.length === 0) {
            console.log("Pas de template ou de coordonnées de panels");
            return;
        }

        const setupDropZones = () => {
            // Attendre que l'image soit complètement chargée et ait ses dimensions
            if (!templateImage.naturalWidth || !templateImage.clientWidth) {
                console.log("Image pas encore chargée, retry...");
                setTimeout(setupDropZones, 100);
                return;
            }

            console.log(`Template: ${templateImage.naturalWidth}x${templateImage.naturalHeight}`);
            console.log(`Affiché: ${templateImage.clientWidth}x${templateImage.clientHeight}`);

            // Calculer le facteur d'échelle
            const scale = templateImage.clientWidth / templateImage.naturalWidth;
            console.log(`Échelle: ${scale}`);

            // Obtenir la position de l'image template
            const templateRect = templateImage.getBoundingClientRect();
            const editorRect = editorArea.getBoundingClientRect();

            // Décalage de l'image par rapport au conteneur
            const offsetX = templateRect.left - editorRect.left;
            const offsetY = templateRect.top - editorRect.top;

            // Supprimer les anciennes zones
            editorArea.querySelectorAll('.panel-drop-zone').forEach(zone => zone.remove());

            // Créer les nouvelles zones avec positionnement correct
            window.panelCoordinates.forEach((coords, index) => {
                const zone = document.createElement('div');
                zone.className = 'panel-drop-zone';
                zone.style.position = 'absolute';
                zone.style.left = `${offsetX + (coords.x * scale)}px`;
                zone.style.top = `${offsetY + (coords.y * scale)}px`;
                zone.style.width = `${coords.width * scale}px`;
                zone.style.height = `${coords.height * scale}px`;
                zone.style.zIndex = '10';

                // Stocker les coordonnées originales
                zone.dataset.originalX = coords.x;
                zone.dataset.originalY = coords.y;
                zone.dataset.originalW = coords.width;
                zone.dataset.originalH = coords.height;
                zone.dataset.index = index;

                // Ajouter les event listeners
                zone.addEventListener('dragover', handleDragOver);
                zone.addEventListener('drop', handleDrop);
                zone.addEventListener('click', () => {
                    console.log(`Zone ${index}: x=${coords.x}, y=${coords.y}, w=${coords.width}, h=${coords.height}`);
                });

                editorArea.appendChild(zone);
                console.log(`Zone ${index} créée: ${zone.style.left}, ${zone.style.top}, ${zone.style.width}x${zone.style.height}`);
            });

            attachSaveHandler();
        };

        // Lancer setup quand l'image est prête
        if (templateImage.complete && templateImage.naturalWidth > 0) {
            setupDropZones();
        } else {
            templateImage.addEventListener('load', setupDropZones);
            templateImage.addEventListener('error', () => {
                console.error("Erreur de chargement de l'image template");
            });
        }

        // Recalculer lors du redimensionnement
        window.addEventListener('resize', () => {
            setTimeout(setupDropZones, 100);
        });
    }

    // --- Gestion du Drag & Drop ---
    function handleDragStart(e) {
        draggedSrc = e.target.src;
        e.dataTransfer.setData('text/plain', draggedSrc);
        console.log('Drag started:', draggedSrc);
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    }

    function handleDrop(e) {
        e.preventDefault();
        const imgSrc = e.dataTransfer.getData('text/plain') || draggedSrc;
        if (!imgSrc) {
            console.log('Pas d\'image à dropper');
            return;
        }

        const dropZone = e.currentTarget;
        console.log('Drop dans zone:', dropZone.dataset.index);

        // Nettoyer la zone
        dropZone.innerHTML = '';

        // Créer la nouvelle image
        const newImg = document.createElement('img');
        newImg.src = imgSrc;
        newImg.style.position = 'absolute';
        newImg.style.cursor = 'move';

        // Attendre que l'image soit chargée pour la positionner
        newImg.onload = () => {
            // Taille initiale : fit dans la zone en gardant le ratio
            const zoneWidth = dropZone.clientWidth;
            const zoneHeight = dropZone.clientHeight;
            const imgRatio = newImg.naturalWidth / newImg.naturalHeight;
            const zoneRatio = zoneWidth / zoneHeight;

            let targetWidth, targetHeight;
            if (imgRatio > zoneRatio) {
                // Image plus large que la zone - ajuster à la largeur
                targetWidth = zoneWidth;
                targetHeight = zoneWidth / imgRatio;
            } else {
                // Image plus haute que la zone - ajuster à la hauteur
                targetHeight = zoneHeight;
                targetWidth = zoneHeight * imgRatio;
            }

            newImg.style.width = `${targetWidth}px`;
            newImg.style.height = `${targetHeight}px`;

            // Position initiale (centrée dans la zone)
            newImg.style.left = `${(zoneWidth - targetWidth) / 2}px`;
            newImg.style.top = `${(zoneHeight - targetHeight) / 2}px`;

            console.log(`Image placée: ${targetWidth}x${targetHeight} à ${newImg.style.left}, ${newImg.style.top}`);
        };

        dropZone.appendChild(newImg);
        makeImageInteractive(newImg);
    }

    // --- Interactivité de l'image (Pan & Zoom) ---
    function makeImageInteractive(img) {
        let isDragging = false;
        let startX, startY, startLeft, startTop;

        // Pan (déplacement)
        img.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = parseFloat(img.style.left) || 0;
            startTop = parseFloat(img.style.top) || 0;
            img.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            const newLeft = startLeft + dx;
            const newTop = startTop + dy;

            img.style.left = `${newLeft}px`;
            img.style.top = `${newTop}px`;

            // IMPORTANT: Pas de contraintes ici car l'overflow:hidden du CSS s'en charge
            // L'utilisateur peut déplacer l'image librement, mais elle sera clippée visuellement
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                img.style.cursor = 'move';
            }
        });

        // Zoom avec la molette
        img.addEventListener('wheel', (e) => {
            e.preventDefault();

            const zoomFactor = 1.1;
            const currentWidth = img.clientWidth;
            const currentHeight = img.clientHeight;

            let newWidth, newHeight;
            if (e.deltaY < 0) {
                // Zoom in
                newWidth = currentWidth * zoomFactor;
                newHeight = currentHeight * zoomFactor;
            } else {
                // Zoom out
                newWidth = currentWidth / zoomFactor;
                newHeight = currentHeight / zoomFactor;
            }

            // Limites de zoom raisonnables
            const minSize = 10;
            const maxSize = Math.max(img.parentElement.clientWidth, img.parentElement.clientHeight) * 5;

            if (newWidth < minSize || newWidth > maxSize) return;

            // Point de zoom (position de la souris relative à l'image)
            const imgRect = img.getBoundingClientRect();
            const mouseX = e.clientX - imgRect.left;
            const mouseY = e.clientY - imgRect.top;

            // Calculer la nouvelle position pour garder le point de zoom fixe
            const currentLeft = parseFloat(img.style.left) || 0;
            const currentTop = parseFloat(img.style.top) || 0;

            const newLeft = currentLeft + mouseX - (mouseX * newWidth / currentWidth);
            const newTop = currentTop + mouseY - (mouseY * newHeight / currentHeight);

            img.style.width = `${newWidth}px`;
            img.style.height = `${newHeight}px`;
            img.style.left = `${newLeft}px`;
            img.style.top = `${newTop}px`;

            // Pas de contraintes - le clipping CSS fait le travail
        });

        // Double-clic pour réinitialiser la position/taille
        img.addEventListener('dblclick', (e) => {
            e.preventDefault();
            const zone = img.parentElement;
            const zoneWidth = zone.clientWidth;
            const zoneHeight = zone.clientHeight;
            const imgRatio = img.naturalWidth / img.naturalHeight;
            const zoneRatio = zoneWidth / zoneHeight;

            let targetWidth, targetHeight;
            if (imgRatio > zoneRatio) {
                targetWidth = zoneWidth;
                targetHeight = zoneWidth / imgRatio;
            } else {
                targetHeight = zoneHeight;
                targetWidth = zoneHeight * imgRatio;
            }

            img.style.width = `${targetWidth}px`;
            img.style.height = `${targetHeight}px`;
            img.style.left = `${(zoneWidth - targetWidth) / 2}px`;
            img.style.top = `${(zoneHeight - targetHeight) / 2}px`;
        });
    }

    // --- Sauvegarde ---
    function attachSaveHandler() {
        const saveButton = document.getElementById('save-button');
        if (!saveButton) return;

        saveButton.onclick = async () => {
            const dropZones = document.querySelectorAll('.panel-drop-zone');
            await handleSaveWithQuality(dropZones);
        };
    }

    async function handleSaveWithQuality(dropZones) {
        const saveButton = document.getElementById('save-button');
        saveButton.textContent = '⏳ Génération...';
        saveButton.disabled = true;

        try {
            const blob = await generateOnClient(dropZones);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;

            const format = document.getElementById('output-format')?.value || 'PNG';
            const quality = document.getElementById('quality-slider')?.value || 95;
            const ext = format.toLowerCase() === 'jpeg' ? 'jpg' : format.toLowerCase();
            a.download = `planche_bd_q${quality}.${ext}`;

            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();

            showStatusMessage('✅ Planche générée localement !', 'success');
        } catch (error) {
            console.error('Erreur génération:', error);
            showStatusMessage('❌ Erreur génération', 'error');
        } finally {
            saveButton.textContent = '💾 Générer BD';
            saveButton.disabled = false;
        }
    }

    async function generateOnClient(dropZones) {
        return new Promise(async (resolve, reject) => {
            const templateImage = document.querySelector('#template-image');
            if (!templateImage || !templateImage.naturalWidth) {
                return reject("Template introuvable");
            }

            const canvas = document.createElement('canvas');
            canvas.width = templateImage.naturalWidth;
            canvas.height = templateImage.naturalHeight;
            const ctx = canvas.getContext('2d');

            // 1. Dessiner le template
            ctx.drawImage(templateImage, 0, 0);

            // 2. Dessiner chaque panel
            const scale = templateImage.clientWidth / templateImage.naturalWidth;

            for (const zone of dropZones) {
                const img = zone.querySelector('img');
                if (!img) continue;

                const filename = img.dataset.filename;
                const sourceFile = window.localImages[filename];

                // Charger l'image source (non compressée si possible ou celle du preview)
                const panelImg = new Image();
                panelImg.src = img.src; // Utilise l'ObjectURL local
                await new Promise(r => panelImg.onload = r);

                // Dimensions du panel sur le canvas réel
                const panelX = parseInt(zone.dataset.originalX);
                const panelY = parseInt(zone.dataset.originalY);
                const panelW = parseInt(zone.dataset.originalW);
                const panelH = parseInt(zone.dataset.originalH);

                // Rognage (Clipping)
                ctx.save();
                ctx.beginPath();
                ctx.rect(panelX, panelY, panelW, panelH);
                ctx.clip();

                // Position de l'image par rapport au panel (échelle réelle)
                const imgRealW = img.clientWidth / scale;
                const imgRealH = img.clientHeight / scale;
                const imgRealX = panelX + (parseFloat(img.style.left) / scale);
                const imgRealY = panelY + (parseFloat(img.style.top) / scale);

                // Option: Amélioration de la netteté si cochée
                if (document.getElementById('enhance-quality')?.checked) {
                    ctx.filter = 'contrast(1.1) saturate(1.1)';
                }

                ctx.drawImage(panelImg, imgRealX, imgRealY, imgRealW, imgRealH);
                ctx.restore();
            }

            // Exporter le résultat
            const format = document.getElementById('output-format')?.value || 'PNG';
            const quality = parseInt(document.getElementById('quality-slider')?.value) / 100 || 0.95;

            let mimeType = 'image/png';
            if (format === 'JPEG') mimeType = 'image/jpeg';
            if (format === 'WEBP') mimeType = 'image/webp';

            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject("Échec export canvas");
            }, mimeType, quality);
        });
    }

    // --- Upload d'images ---
    function setupUploads() {
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-input');
        const qualitySlider = document.getElementById('quality-slider');
        const qualityValue = document.getElementById('quality-value');
        const templateForm = document.querySelector('form[action="/upload_template"]');

        if (qualitySlider && qualityValue) {
            qualitySlider.addEventListener('input', (e) => {
                qualityValue.textContent = e.target.value;
            });
        }

        if (templateForm) {
            templateForm.onsubmit = async (e) => {
                e.preventDefault();
                const file = templateForm.querySelector('input[type="file"]').files[0];
                if (!file) return;

                const formData = new FormData();
                formData.append('template_file', file);

                try {
                    showStatusMessage('⏳ Analyse du template...', 'success');
                    const response = await fetch('/upload_template', {
                        method: 'POST',
                        body: formData,
                        headers: { 'X-Requested-With': 'XMLHttpRequest' }
                    });
                    const data = await response.json();
                    if (data.success) {
                        window.localTemplate = file;
                        const objectUrl = URL.createObjectURL(file);

                        // Mettre à jour l'image template dans l'éditeur
                        const editorArea = document.getElementById('editor-area');
                        let templateImage = document.getElementById('template-image');
                        if (!templateImage) {
                            editorArea.innerHTML = `<img src="${objectUrl}" alt="Planche de BD" id="template-image" />`;
                        } else {
                            templateImage.src = objectUrl;
                        }

                        initializeEditor(data.panel_coordinates, objectUrl);
                        showStatusMessage('✅ Template prêt !', 'success');
                    }
                } catch (err) {
                    console.error("Erreur template:", err);
                    showStatusMessage('❌ Erreur chargement template', 'error');
                }
            };
        }

        if (dropZone) {
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('drag-over');
            });

            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('drag-over');
            });

            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('drag-over');

                const files = Array.from(e.dataTransfer.files).filter(file =>
                    file.type.startsWith('image/')
                );

                if (files.length > 0) {
                    handleFileUpload(files);
                }
            });
        }

        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const files = Array.from(e.target.files);
                if (files.length > 0) {
                    handleFileUpload(files);
                }
            });
        }
    }

    async function handleFileUpload(files) {
        showProgress();
        const thumbnailsGrid = document.querySelector('.thumbnails-grid') || createThumbnailsGrid();

        let successCount = 0;
        let totalFiles = files.length;

        for (let i = 0; i < files.length; i++) {
            let file = files[i];
            updateProgressBar((i / totalFiles) * 100);

            // Instant preview local
            const objectUrl = URL.createObjectURL(file);
            const filename = `local_${Date.now()}_${file.name}`;
            window.localImages[filename] = file;

            // Ajouter à la grille immédiatement
            const img = document.createElement('img');
            img.src = objectUrl;
            img.className = 'thumbnail-item';
            img.dataset.filename = filename;
            img.draggable = true;
            img.addEventListener('dragstart', handleDragStart);
            thumbnailsGrid.appendChild(img);

            // On tente quand même l'upload en tâche de fond pour la détection future (optionnel)
            const formData = new FormData();
            formData.append('panel_file', file);
            fetch('/upload_panels', { method: 'POST', body: formData }).catch(() => { });

            successCount++;
        }

        updateProgressBar(100);
        setTimeout(hideProgress, 500);
        showStatusMessage(`✅ ${successCount} images ajoutées localement`, 'success');
    }

    function createThumbnailsGrid() {
        let section = document.querySelector('.thumbnails-section');
        if (!section) {
            section = document.createElement('div');
            section.className = 'thumbnails-section';
            section.innerHTML = '<h3>📸 Images</h3><div class="thumbnails-grid"></div>';
            const qualityControls = document.querySelector('.quality-controls');
            qualityControls.parentNode.insertBefore(section, qualityControls);
        }
        return section.querySelector('.thumbnails-grid');
    }

    function updateProgressBar(percent) {
        const fill = document.getElementById('progress-fill');
        if (fill) fill.style.width = `${percent}%`;
    }

    async function compressImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Si vraiment immense, on réduit les dimensions
                    const MAX_DIM = 1800; // Plus prudent pour Vercel (4.5 Mo)
                    if (width > MAX_DIM || height > MAX_DIM) {
                        if (width > height) {
                            height *= MAX_DIM / width;
                            width = MAX_DIM;
                        } else {
                            width *= MAX_DIM / height;
                            height = MAX_DIM;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Compression JPEG 0.7 (Plus agressif pour garantir < 4.5 Mo)
                    canvas.toBlob((blob) => {
                        if (blob) {
                            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                                type: 'image/jpeg',
                                lastModified: Date.now()
                            });
                            resolve(compressedFile);
                        } else {
                            reject(new Error("Canvas toBlob failed"));
                        }
                    }, 'image/jpeg', 0.7);
                };
                img.onerror = reject;
            };
            reader.onerror = reject;
        });
    }

    function showProgress() {
        const bar = document.getElementById('progress-bar');
        if (bar) bar.style.display = 'block';
        updateProgressBar(0);
    }

    function hideProgress() {
        const bar = document.getElementById('progress-bar');
        if (bar) bar.style.display = 'none';
    }

    function showStatusMessage(message, type) {
        const statusDiv = document.getElementById('status-message');
        if (statusDiv) {
            statusDiv.innerHTML = `<div class="status-message status-${type}">${message}</div>`;
            // On ne l'efface pas tout de suite si c'est un succès important
            if (type !== 'success' || !message.includes('patienter')) {
                setTimeout(() => {
                    if (statusDiv.innerHTML.includes(message)) statusDiv.innerHTML = '';
                }, 3000);
            }
        }
    }

    // --- Initialisation ---
    initializeEditor();
    setupUploads();

    // Drag sur les miniatures
    document.querySelectorAll('.thumbnail-item').forEach(thumb => {
        thumb.addEventListener('dragstart', handleDragStart);
    });

    console.log("Éditeur BD initialisé - avec clipping correct");
});