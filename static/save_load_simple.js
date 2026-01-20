// === SYSTÈME DE SAUVEGARDE / CHARGEMENT - VERSION SIMPLE ===
// Fichier: save_load_simple.js
// Intégration: Ajouter <script src="{{ url_for('static', filename='save_load_simple.js') }}"></script> avant </body>

const StateManager = {
    STORAGE_KEY: 'bd_editor_state',

    // Sauvegarder l'état actuel
    save: function() {
        const state = {
            timestamp: new Date().toLocaleString('fr-FR'),
            panels: []
        };

        // Récupérer les données de chaque panel
        document.querySelectorAll('.panel-drop-zone').forEach((zone, idx) => {
            const img = zone.querySelector('img');
            if (img) {
                state.panels.push({
                    index: idx,
                    src: img.src,
                    filename: img.dataset.filename || '',
                    styles: {
                        width: img.style.width,
                        height: img.style.height,
                        left: img.style.left,
                        top: img.style.top
                    },
                    rounded: zone.classList.contains('rounded')
                });
            }
        });

        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
            showStatusMessage(`✅ Sauvegarde du ${state.timestamp}`, 'success');
            console.log('💾 État sauvegardé:', state);
            return true;
        } catch (e) {
            console.error('Erreur sauvegarde:', e);
            showStatusMessage('❌ Erreur lors de la sauvegarde', 'error');
            return false;
        }
    },

    // Charger l'état précédent
    load: function() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (!saved) {
                showStatusMessage('ℹ️ Aucune sauvegarde trouvée', 'info');
                return false;
            }

            const state = JSON.parse(saved);
            const zones = document.querySelectorAll('.panel-drop-zone');

            state.panels.forEach(panelData => {
                const zone = zones[panelData.index];
                if (!zone) return;

                // Nettoyer la zone
                zone.innerHTML = '';

                // Créer la nouvelle image
                const img = document.createElement('img');
                img.src = panelData.src;
                img.dataset.filename = panelData.filename;
                img.style.position = 'absolute';
                img.style.cursor = 'move';

                // Appliquer les styles sauvegardés
                Object.assign(img.style, panelData.styles);

                zone.appendChild(img);

                // Restaurer l'état arrondi
                if (panelData.rounded) {
                    zone.classList.add('rounded');
                }

                // Réappliquer l'interactivité
                if (typeof makeImageInteractive === 'function') {
                    makeImageInteractive(img);
                }
            });

            showStatusMessage(`✅ Restauration du ${state.timestamp}`, 'success');
            console.log('📂 État restauré:', state);
            return true;
        } catch (e) {
            console.error('Erreur chargement:', e);
            showStatusMessage('❌ Erreur lors du chargement', 'error');
            return false;
        }
    },

    // Effacer la sauvegarde
    clear: function() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            showStatusMessage('✅ Sauvegarde supprimée', 'success');
            console.log('🗑️ Sauvegarde effacée');
            return true;
        } catch (e) {
            console.error('Erreur suppression:', e);
            showStatusMessage('❌ Erreur lors de la suppression', 'error');
            return false;
        }
    },

    // Vérifier s'il y a une sauvegarde
    exists: function() {
        return localStorage.getItem(this.STORAGE_KEY) !== null;
    },

    // Récupérer la date de sauvegarde
    getDate: function() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (!saved) return null;
            const state = JSON.parse(saved);
            return state.timestamp || null;
        } catch (e) {
            return null;
        }
    }
};

// Fonction pour afficher les boutons automatiquement
function addSaveLoadButtons() {
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

    // ===== BOUTON SAUVEGARDER =====
    const saveBtn = document.createElement('button');
    saveBtn.id = 'save-state-btn';
    saveBtn.textContent = '💾 Sauvegarder';
    saveBtn.type = 'button';
    saveBtn.style.cssText = `
        padding: 10px 20px;
        background-color: #4CAF50;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
        transition: all 0.3s ease;
    `;
    saveBtn.onmouseover = () => saveBtn.style.backgroundColor = '#45a049';
    saveBtn.onmouseout = () => saveBtn.style.backgroundColor = '#4CAF50';
    saveBtn.onclick = () => StateManager.save();

    // ===== BOUTON CHARGER =====
    const loadBtn = document.createElement('button');
    loadBtn.id = 'load-state-btn';
    loadBtn.textContent = '📂 Charger';
    loadBtn.type = 'button';
    loadBtn.style.cssText = `
        padding: 10px 20px;
        background-color: #2196F3;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
        transition: all 0.3s ease;
    `;
    loadBtn.onmouseover = () => loadBtn.style.backgroundColor = '#0b7dda';
    loadBtn.onmouseout = () => loadBtn.style.backgroundColor = '#2196F3';
    loadBtn.onclick = () => {
        if (!StateManager.exists()) {
            showStatusMessage('ℹ️ Aucune sauvegarde trouvée', 'info');
            return;
        }
        const saveDate = StateManager.getDate();
        if (confirm(`📂 Charger la sauvegarde du ${saveDate || 'dernière session'} ?`)) {
            StateManager.load();
        }
    };

    // ===== BOUTON VIDER =====
    const clearBtn = document.createElement('button');
    clearBtn.id = 'reset-state-btn';
    clearBtn.textContent = '🗑️ Vider';
    clearBtn.type = 'button';
    clearBtn.style.cssText = `
        padding: 10px 20px;
        background-color: #f44336;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
        transition: all 0.3s ease;
    `;
    clearBtn.onmouseover = () => clearBtn.style.backgroundColor = '#da190b';
    clearBtn.onmouseout = () => clearBtn.style.backgroundColor = '#f44336';
    clearBtn.onclick = () => {
        if (confirm('🗑️ Êtes-vous sûr de vouloir supprimer la sauvegarde ?')) {
            StateManager.clear();
        }
    };

    // ===== LABEL INFO =====
    const infoLabel = document.createElement('span');
    infoLabel.id = 'save-info-label';
    infoLabel.style.cssText = 'color: #666; font-size: 12px; margin-left: 10px;';

    if (StateManager.exists()) {
        infoLabel.textContent = `📌 Sauvegarde: ${StateManager.getDate()}`;
    }

    // Ajouter les boutons au conteneur
    controlsContainer.appendChild(saveBtn);
    controlsContainer.appendChild(loadBtn);
    controlsContainer.appendChild(clearBtn);
    controlsContainer.appendChild(infoLabel);

    console.log('✅ Boutons sauvegarde/chargement créés');
}

// Initialiser quand le DOM est prêt
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(addSaveLoadButtons, 500);
});

// Également essayer après un délai supplémentaire au cas où
window.addEventListener('load', () => {
    setTimeout(addSaveLoadButtons, 1000);
});
