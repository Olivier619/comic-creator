# 🔍 Script de Vérification - verification.py

import os
import sys

print("🔍 VÉRIFICATION DE VOTRE PROJET")
print("=" * 50)

# 1. Vérifier la structure des fichiers
required_files = {
    'app.py': 'Fichier principal Flask',
    'requirements.txt': 'Liste des dépendances',
    'templates/index.html': 'Interface utilisateur (dans templates/)',
    'index.html': 'Interface utilisateur (racine - optionnel)'
}

optional_files = {
    'main.js': 'JavaScript existant (à intégrer)',
    'uploads/': 'Dossier pour images uploadées',
    'cache/': 'Dossier pour cache (nouveau)',
    'templates/': 'Dossier Flask templates'
}

print("\n📁 FICHIERS REQUIS:")
for file, description in required_files.items():
    exists = os.path.exists(file)
    status = "✅" if exists else "❌"
    print(f"  {status} {file:25} - {description}")

print("\n📁 FICHIERS OPTIONNELS:")
for file, description in optional_files.items():
    exists = os.path.exists(file)
    status = "✅" if exists else "⚠️"
    print(f"  {status} {file:25} - {description}")

# 2. Vérifier les imports Python
print("\n🐍 VÉRIFICATION DES IMPORTS PYTHON:")
try:
    import flask
    print("  ✅ Flask installé")
except ImportError:
    print("  ❌ Flask manquant - pip install flask")

try:
    import PIL
    print("  ✅ Pillow installé")
except ImportError:
    print("  ❌ Pillow manquant - pip install Pillow")

try:
    import cv2
    print("  ✅ OpenCV installé")
except ImportError:
    print("  ❌ OpenCV manquant - pip install opencv-python-headless")

# 3. Vérifier la version Python
print(f"\n🐍 VERSION PYTHON: {sys.version}")
if sys.version_info >= (3, 8):
    print("  ✅ Version Python compatible")
else:
    print("  ⚠️ Python 3.8+ recommandé")

# 4. Recommandations
print("\n💡 PROCHAINES ÉTAPES:")

if not os.path.exists('templates/'):
    print("  1. Créer le dossier 'templates/'")

if not os.path.exists('templates/index.html') and not os.path.exists('index.html'):
    print("  2. Ajouter le fichier index.html")

if not os.path.exists('cache/'):
    print("  3. Créer le dossier 'cache/'")

print("\n🚀 POUR LANCER L'APPLICATION:")
print("  python app.py")
print("  Puis ouvrir: http://127.0.0.1:5004")

print("\n" + "=" * 50)
print("✅ Vérification terminée !")