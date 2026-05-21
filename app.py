from flask import Flask, render_template, request, redirect, session, flash, url_for
import os
import numpy as np
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
import mysql.connector

app = Flask(__name__)
app.secret_key = "your_secret_key_here_change_in_production"

UPLOAD_FOLDER = "static/uploads/"
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Database connection
db = mysql.connector.connect(
    host="localhost",
    port=3307,
    user="root",
    password="",
    database="skin_cancer_db"
)
cursor = db.cursor(dictionary=True)

# Load model
model = load_model("model/vgg16_skin_cancer.h5")

# ---------- PUBLIC ROUTES ----------
@app.route("/")
def home():
    """Landing page - no login required"""
    return render_template("home.html")

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        user = request.form["username"]
        pwd = request.form["password"]
        cursor.execute("SELECT * FROM users WHERE username = %s AND password = %s", (user, pwd))
        result = cursor.fetchone()
        if result:
            session["logged_in"] = True
            session["username"] = user
            flash("Login réussi ✓", "success")
            return redirect("/dashboard")
        else:
            flash("Erreur login ✗", "danger")
    return render_template("login.html")

@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        username = request.form["username"].strip()
        password = request.form["password"]
        confirm = request.form["confirm_password"]

        if len(username) < 3:
            flash("Le nom d'utilisateur doit contenir au moins 3 caractères.", "danger")
            return render_template("register.html")
        if len(password) < 4:
            flash("Le mot de passe doit contenir au moins 4 caractères.", "danger")
            return render_template("register.html")
        if password != confirm:
            flash("Les mots de passe ne correspondent pas.", "danger")
            return render_template("register.html")

        cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
        if cursor.fetchone():
            flash("Ce nom d'utilisateur est déjà pris.", "danger")
            return render_template("register.html")

        cursor.execute("INSERT INTO users (username, password) VALUES (%s, %s)", (username, password))
        db.commit()
        flash("Compte créé avec succès !", "success")
        return redirect("/login")

    return render_template("register.html")

# ---------- PROTECTED ROUTES ----------
@app.route("/dashboard")
def dashboard():
    if not session.get("logged_in"):
        return redirect("/login")
    return render_template("dashboard.html", demo_mode=False)

@app.route("/predict", methods=["GET", "POST"])
def predict():
    if not session.get("logged_in"):
        return redirect("/login")

    if request.method == "POST":
        name = request.form["name"]
        age = request.form["age"]
        file = request.files["image"]

        if file.filename == "":
            flash("Veuillez sélectionner une image.", "warning")
            return redirect("/predict")

        # Save file
        filename = file.filename
        path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(path)

        # Prediction
        img = image.load_img(path, target_size=(224, 224))
        img = image.img_to_array(img) / 255.0
        img = np.expand_dims(img, axis=0)
        pred = model.predict(img)[0][0]
        result = "Malin" if pred > 0.5 else "Bénin"
        confidence = pred * 100 if result == "Malin" else (1 - pred) * 100

        # Store in DB
        cursor.execute("""
            INSERT INTO patients (name, age, result, probability, image_path)
            VALUES (%s, %s, %s, %s, %s)
        """, (name, age, result, float(pred), f"uploads/{filename}"))
        db.commit()

        flash("Analyse réussie ✓", "success")
        return render_template("result.html",
                               result=result,
                               prob=round(confidence, 2),
                               img_url=url_for('static', filename=f"uploads/{filename}"))

    return render_template("predict.html", demo_mode=False)

@app.route("/patients")
def patients():
    if not session.get("logged_in"):
        return redirect("/login")
    cursor.execute("SELECT * FROM patients ORDER BY created_at DESC")
    data = cursor.fetchall()
    return render_template("patients.html", patients=data)

@app.route("/logout")
def logout():
    session.clear()
    flash("Déconnecté", "info")
    return redirect("/")

if __name__ == "__main__":
    app.run(debug=True)