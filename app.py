import os
import io

from flask import (
    Flask, render_template, request, redirect,
    url_for, send_from_directory, session, jsonify, send_file
)
from werkzeug.utils import secure_filename
from werkzeug.exceptions import RequestEntityTooLarge
from PIL import Image, ImageEnhance, ImageDraw

IS_VERCEL = "VERCEL" in os.environ

if IS_VERCEL:
    UPLOAD_FOLDER = "/tmp/uploads"
    CACHE_FOLDER = "/tmp/cache"
else:
    UPLOAD_FOLDER = "uploads"
    CACHE_FOLDER = "cache"

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp", "bmp", "tiff"}

app = Flask(__name__)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["CACHE_FOLDER"] = CACHE_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 100 * 1024 * 1024
app.secret_key = "super-secret-key"

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(CACHE_FOLDER, exist_ok=True)

if not IS_VERCEL:
    os.makedirs("templates", exist_ok=True)
    os.makedirs("static", exist_ok=True)


@app.errorhandler(RequestEntityTooLarge)
def handle_file_too_large(e):
    return jsonify({"error": "Fichier trop volumineux. Limite: 100MB"}), 413


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def detect_panels(image_path: str):
    # Version sans OpenCV pour Vercel : pas de détection auto, juste liste vide
    print("detect_panels() sans OpenCV → retourne [].")
    return []


@app.route("/")
def index():
    template_image = session.get("template_image", None)
    panel_images = session.get("panel_images", [])
    panel_coordinates = session.get("panel_coordinates", [])

    return render_template(
        "index.html",
        template_image=template_image,
        panel_images=panel_images,
        panel_coordinates=panel_coordinates,
    )


@app.route("/upload_template", methods=["POST"])
def upload_template():
    if "template_file" not in request.files:
        return jsonify({"error": "Aucun fichier template envoyé"}), 400

    file = request.files["template_file"]

    if file.filename == "":
        return jsonify({"error": "Aucun fichier sélectionné"}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "Format de fichier non supporté"}), 400

    filename = secure_filename(file.filename)
    file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    file.save(file_path)

    session["template_image"] = filename

    panel_coords = detect_panels(file_path)
    session["panel_coordinates"] = panel_coords
    session.pop("panel_images", None)

    if (
        request.headers.get("X-Requested-With") == "XMLHttpRequest"
        or request.is_json
        or "json" in request.accept_mimetypes.content_types
    ):
        return jsonify(
            {
                "success": True,
                "template_image": filename,
                "panel_coordinates": panel_coords,
            }
        )

    return redirect(url_for("index"))


@app.route("/uploads/<path:filename>")
def uploaded_file(filename):
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)


@app.route("/upload_panels", methods=["POST"])
def upload_panels():
    files = request.files.getlist("panel_files[]")
    if not files:
        files = request.files.getlist("panel_file")

    panel_filenames = session.get("panel_images", [])
    uploaded_count = 0
    errors = []

    for file in files:
        if file and allowed_file(file.filename):
            try:
                filename = secure_filename(file.filename)
                file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)

                img = Image.open(file)
                img.verify()
                file.seek(0)
                file.save(file_path)

                if filename not in panel_filenames:
                    panel_filenames.append(filename)

                uploaded_count += 1
            except Exception as e:
                errors.append(f"Erreur avec {file.filename}: {str(e)}")
        else:
            errors.append(f"Format non supporté: {file.filename}")

    session["panel_images"] = panel_filenames

    return jsonify(
        {
            "success": uploaded_count > 0,
            "uploaded_count": uploaded_count,
            "total_images": len(panel_filenames),
            "panel_filenames": panel_filenames,
            "errors": errors,
        }
    )


@app.route("/generate", methods=["POST"])
def generate_image():
    data = request.json
    template_image_name = session.get("template_image")

    if not template_image_name:
        return jsonify({"error": "Pas d'image template trouvée"}), 400

    quality = data.get("quality", 95)
    resize_algorithm = data.get("resize_algorithm", "LANCZOS")
    output_format = data.get("output_format", "PNG")
    optimize = data.get("optimize", True)
    enhance_quality = data.get("enhance_quality", False)

    algorithms = {
        "NEAREST": Image.Resampling.NEAREST,
        "BILINEAR": Image.Resampling.BILINEAR,
        "BICUBIC": Image.Resampling.BICUBIC,
        "LANCZOS": Image.Resampling.LANCZOS,
    }

    selected_algorithm = algorithms.get(
        resize_algorithm, Image.Resampling.LANCZOS
    )

    base_path = os.path.join(app.config["UPLOAD_FOLDER"], template_image_name)
    base_image = Image.open(base_path).convert("RGBA")
    final_image = base_image.copy()

    for img_data in data.get("images", []):
        margin = 2
        adjusted_panel_x = img_data["panel_x"] + margin
        adjusted_panel_y = img_data["panel_y"] + margin
        adjusted_panel_w = img_data["panel_w"] - (2 * margin)
        adjusted_panel_h = img_data["panel_h"] - (2 * margin)

        panel_canvas = Image.new(
            "RGBA", (adjusted_panel_w, adjusted_panel_h), (0, 0, 0, 0)
        )
        panel_path = os.path.join(app.config["UPLOAD_FOLDER"], img_data["src"])
        source_img = Image.open(panel_path).convert("RGBA")

        if enhance_quality:
            enhancer = ImageEnhance.Sharpness(source_img)
            source_img = enhancer.enhance(1.2)

        original_w, original_h = source_img.size
        new_w = int(img_data["img_w"])
        new_h = int(original_h * (new_w / original_w))
        resized_img = source_img.resize((new_w, new_h), selected_algorithm)

        paste_x = int(img_data["img_left"])
        paste_y = int(img_data["img_top"])

        if img_data.get("rounded", False):
            mask = Image.new("L", (adjusted_panel_w, adjusted_panel_h), 0)
            draw = ImageDraw.Draw(mask)
            draw.rounded_rectangle(
                (0, 0, adjusted_panel_w, adjusted_panel_h),
                radius=25,
                fill=255,
            )
            panel_canvas.paste(resized_img, (paste_x, paste_y))
            panel_canvas = Image.composite(
                panel_canvas,
                Image.new("RGBA", panel_canvas.size, (0, 0, 0, 0)),
                mask,
            )
        else:
            mask_draw = Image.new("L", (adjusted_panel_w, adjusted_panel_h), 255)
            panel_canvas.paste(resized_img, (paste_x, paste_y))
            panel_canvas = Image.composite(
                panel_canvas,
                Image.new("RGBA", panel_canvas.size, (0, 0, 0, 0)),
                mask_draw,
            )

        final_image.paste(
            panel_canvas, (adjusted_panel_x, adjusted_panel_y), panel_canvas
        )

    img_io = io.BytesIO()

    if output_format.upper() == "JPEG":
        if final_image.mode in ("RGBA", "LA"):
            background = Image.new("RGB", final_image.size, (255, 255, 255))
            background.paste(final_image, mask=final_image.split()[-1])
            final_image = background
        final_image.save(img_io, "JPEG", quality=quality, optimize=optimize)
        mimetype = "image/jpeg"
        filename = "ma_planche_de_bd.jpg"
    elif output_format.upper() == "WEBP":
        final_image.save(img_io, "WebP", quality=quality, optimize=optimize)
        mimetype = "image/webp"
        filename = "ma_planche_de_bd.webp"
    else:
        final_image.save(img_io, "PNG", optimize=optimize)
        mimetype = "image/png"
        filename = "ma_planche_de_bd.png"

    img_io.seek(0)
    return send_file(
        img_io, mimetype=mimetype, as_attachment=True, download_name=filename
    )


@app.route("/static/<path:filename>")
def serve_static(filename):
    return send_from_directory("static", filename)


@app.route("/favicon.ico")
def favicon():
    return "", 204


if __name__ == "__main__":
    app.run(debug=True, port=5004)
