// === SYSTÈME DE SAUVEGARDE / CHARGEMENT - VERSION COMPLÈTE ===
// Fichier: save_load.js
// Intégration: Ajouter <script src="{{ url_for('static', filename='save_load.js') }}"></script> avant </body>

class EditorStateManager {
    constructor() {
        this.STORAGE_KEY = 'bd_editor_state';
        this.VERSION = '1.0';
    }

    /**
     * Sauvegarder l'état actuel de l'éditeur
     */
    saveState() {
        const state = {
            version: this.VERSION,
            timestamp: Date.now(),
            timestampFormatted: new Date().toLocaleString('fr-FR'),
            panels: [],
            template: {
                name: window.localTemplate?.name || ''
            }
        };

        // Récupérer les données de chaque panel
        const dropZones = document.querySelectorAll('.panel-drop-zone');
        dropZones.forEach((zone, index) => {
            const img = zone.querySelector('img');
            if (img) {
                state.panels.push({
                    index: index,
                    src: img.src,
                    filename: img.dataset.filename || '',
                    width: img.style.width,
                    height: img.style.height,
                    left: img.style.left,
                    top: img.style.top,
                    isRounded: zone.classList.contains('rounded')
                });
            }
        });

        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
            console.log('✅ État sauvegardé:', state);
            return { success: true, state };
        } catch (e) {
            console.error('Erreur sauvegarde:', e);
            return { success: false, error: e.message };
        }
    }

    /**
     * Charger l'état précédent
     */
    loadState() {
        try {
            const savedState = localStorage.getItem(this.STORAGE_KEY);
            if (!savedState) {
                console.log('Aucune sauvegarde trouvée');
                return { success: false, message: 'Aucune sauvegarde trouvée' };
            }

            const state = JSON.parse(savedState);
            console.log('📂 État chargé:', state);

            // Restaurer chaque panel
            const dropZones = document.querySelectorAll('.panel-drop-zone');

            state.panels.forEach(panelData => {
                const zone = dropZones[panelData.index];
                if (!zone) return;

                // Nettoyer la zone
                zone.innerHTML = '';

                // Créer la nouvelle image
                const newImg = document.createElement('img');
                newImg.src = panelData.src;
                newImg.dataset.filename = panelData.filename;
                newImg.style.position = 'absolute';
                newImg.style.cursor = 'move';
                newImg.style.width = panelData.width;
                newImg.style.height = panelData.height;
                newImg.style.left = panelData.left;
                newImg.style.top = panelData.top;

                zone.appendChild(newImg);

                // Restaurer l'état arrondi
                if (panelData.isRounded) {
                    zone.classList.add('rounded');
                }

                // Réappliquer l'interactivité
                if (typeof makeImageInteractive === 'function') {
                    makeImageInteractive(newImg);
                }
            });

            return { success: true, state };
        } catch (e) {
            console.error('Erreur chargement:', e);
            return { success: false, error: e.message };
        }
    }

    /**
     * Effacer la sauvegarde
     */
    clearState() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            console.log('✅ Données sauvegardées supprimées');
            return { success: true };
        } catch (e) {
            console.error('Erreur suppression:', e);
            return { success: false, error: e.message };
        }
    }

    /**
     * Vérifier s'il y a une sauvegarde
     */
    hasSavedState() {
        return localStorage.getItem(this.STORAGE_KEY) !== null;
    }

    /**
     * Récupérer la date de sauvegarde
     */
    getSaveDate() {
        try {
            const savedState = localStorage.getItem(this.STORAGE_KEY);
            if (!savedState) return null;

            const state = JSON.parse(savedState);
            return new Date(state.timestamp);
        } catch (e) {
            return null;
        }
    }

    /**
     * Récupérer la date formatée
     */
    getSaveDateFormatted() {
        try {
            const savedState = localStorage.getItem(this.STORAGE_KEY);
            if (!savedState) return null;

            const state = JSON.parse(savedState);
            return state.timestampFormatted || null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Exporter l'état en JSON (pour téléchargement)
     */
    exportState() {
        try {
            const savedState = localStorage.getItem(this.STORAGE_KEY);
            if (!savedState) {
                return { success: false, message: 'Aucune sauvegarde à exporter' };
            }

            const state = JSON.parse(savedState);
            const dataStr = JSON.stringify(state, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `bd_editor_${state.timestampFormatted.replace(/[\/\s:]/g, '-')}.json`;
            link.click();
            URL.revokeObjectURL(url);

            return { success: true, message: 'Export téléchargé' };
        } catch (e) {
            console.error('Erreur export:', e);
            return { success: false, error: e.message };
        }
    }

    /**
     * Importer un état à partir d'un fichier JSON
     */
    importState(jsonString) {
        try {
            const state = JSON.parse(jsonString);
            if (!state.panels || !Array.isArray(state.panels)) {
                return { success: false, message: 'Format JSON invalide' };
            }

            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
            console.log('✅ État importé:', state);
            return { success: true, state };
        } catch (e) {
            console.error('Erreur import:', e);
            return { success: false, error: e.message };
        }
    }

    /**
     * Obtenir des statistiques sur la sauvegarde
     */
    getStats() {
        try {
            const savedState = localStorage.getItem(this.STORAGE_KEY);
            if (!savedState) {
                return { saved: false };
            }

            const state = JSON.parse(savedState);
            return {
                saved: true,
                panelCount: state.panels.length,
                timestamp: state.timestampFormatted,
                size: new Blob([savedState]).size
            };
        } catch (e) {
            return { error: e.message };
        }
    }
}

// Créer une instance globale
window.stateManager = new EditorStateManager();

/**
 * Initialiser les boutons de sauvegarde/chargement
 */
function initializeSaveLoadButtons() {
    // Chercher le conteneur des contrôles
    let controlsContainer = document.querySelector('.controls-section') ||
                           document.querySelector('.editor-controls');

    // Si pas trouvé, créer un conteneur après l'éditeur
    if (!controlsContainer) {
        const editorArea = document.getElementById('editor-area');
        if (!editorArea) {
            console.warn('editor-area non trouvé, boutons non créés');
            return;
        }

        controlsContainer = document.createElement('div');
        controlsContainer.className = 'save-load-controls';
        controlsContainer.style.cssText = 'display: flex; gap: 10px; margin-top: 15px; flex-wrap: wrap; align-items: center;';
        editorArea.parentElement.insertBefore(controlsContainer, editorArea.nextSibling);
    }

    // Vérifier que les boutons n'existent pas déjà
    if (document.getElementById('save-state-btn')) {
        return;
    }

    // ===== STYLE COMMUN =====
    const buttonStyle = {
        saveBtn: 'padding: 10px 20px; background-color: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: bold; transition: all 0.3s ease;',
        loadBtn: 'padding: 10px 20px; background-color: #2196F3; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: bold; transition: all 0.3s ease;',
        clearBtn: 'padding: 10px 20px; background-color: #f44336; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: bold; transition: all 0.3s ease;'
    };

    // ===== BOUTON SAUVEGARDER =====
    const saveBtn = document.createElement('button');
    saveBtn.id = 'save-state-btn';
    saveBtn.textContent = '💾 Sauvegarder';
    saveBtn.type = 'button';
    saveBtn.style.cssText = buttonStyle.saveBtn;
    saveBtn.title = 'Sauvegarder l\'état actuel';
    saveBtn.onmouseover = () => saveBtn.style.backgroundColor = '#45a049';
    saveBtn.onmouseout = () => saveBtn.style.backgroundColor = '#4CAF50';
    saveBtn.onclick = () => {
        const result = window.stateManager.saveState();
        if (result.success) {
            showStatusMessage(`✅ Sauvegarde du ${result.state.timestampFormatted}`, 'success');
            updateSaveInfo();
        } else {
            showStatusMessage('❌ Erreur lors de la sauvegarde', 'error');
        }
    };

    // ===== BOUTON CHARGER =====
    const loadBtn = document.createElement('button');
    loadBtn.id = 'load-state-btn';
    loadBtn.textContent = '📂 Charger';
    loadBtn.type = 'button';
    loadBtn.style.cssText = buttonStyle.loadBtn;
    loadBtn.title = 'Charger la dernière sauvegarde';
    loadBtn.onmouseover = () => loadBtn.style.backgroundColor = '#0b7dda';
    loadBtn.onmouseout = () => loadBtn.style.backgroundColor = '#2196F3';
    loadBtn.onclick = () => {
        if (!window.stateManager.hasSavedState()) {
            showStatusMessage('ℹ️ Aucune sauvegarde trouvée', 'info');
            return;
        }
        const saveDate = window.stateManager.getSaveDateFormatted();
        if (confirm(`📂 Charger la sauvegarde du ${saveDate} ?`)) {
            const result = window.stateManager.loadState();
            if (result.success) {
                showStatusMessage('✅ Progression restaurée !', 'success');
            } else {
                showStatusMessage('❌ Erreur lors du chargement', 'error');
            }
        }
    };

    // ===== BOUTON VIDER =====
    const clearBtn = document.createElement('button');
    clearBtn.id = 'reset-state-btn';
    clearBtn.textContent = '🗑️ Vider';
    clearBtn.type = 'button';
    clearBtn.style.cssText = buttonStyle.clearBtn;
    clearBtn.title = 'Supprimer la sauvegarde';
    clearBtn.onmouseover = () => clearBtn.style.backgroundColor = '#da190b';
    clearBtn.onmouseout = () => clearBtn.style.backgroundColor = '#f44336';
    clearBtn.onclick = () => {
        if (confirm('🗑️ Êtes-vous sûr de vouloir supprimer la sauvegarde définitivement ?')) {
            const result = window.stateManager.clearState();
            if (result.success) {
                showStatusMessage('✅ Sauvegarde supprimée !', 'success');
                updateSaveInfo();
            } else {
                showStatusMessage('❌ Erreur lors de la suppression', 'error');
            }
        }
    };

    // ===== LABEL INFO =====
    const infoLabel = document.createElement('span');
    infoLabel.id = 'save-info-label';
    infoLabel.style.cssText = 'color: #666; font-size: 12px; margin-left: 10px; font-style: italic;';
    updateSaveInfo();

    // Fonction pour mettre à jour le label info
    function updateSaveInfo() {
        if (window.stateManager.hasSavedState()) {
            const dateStr = window.stateManager.getSaveDateFormatted();
            infoLabel.textContent = `📌 Sauvegarde: ${dateStr}`;
            infoLabel.style.color = '#4CAF50';
        } else {
            infoLabel.textContent = '(Aucune sauvegarde)';
            infoLabel.style.color = '#999';
        }
    }

    // Rendre updateSaveInfo disponible globalement
    window.updateSaveInfo = updateSaveInfo;

    // Ajouter les boutons au conteneur
    controlsContainer.appendChild(saveBtn);
    controlsContainer.appendChild(loadBtn);
    controlsContainer.appendChild(clearBtn);
    controlsContainer.appendChild(infoLabel);

    console.log('✅ Boutons sauvegarde/chargement créés avec succès');
}

// Initialiser quand le DOM est prêt
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initializeSaveLoadButtons, 500);
});

// Également essayer après un délai supplémentaire au cas où
window.addEventListener('load', () => {
    setTimeout(() => {
        if (!document.getElementById('save-state-btn')) {
            initializeSaveLoadButtons();
        }
    }, 1000);
});
