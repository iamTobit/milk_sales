from flask import Flask
from models import db
from routes import bp
from flask_cors import CORS

def create_app(db_uri="sqlite:///milk.db"):
    app = Flask(__name__)

    CORS(app)

    app.config["SQLALCHEMY_DATABASE_URI"] = db_uri
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JSON_SORT_KEYS"] = False

    db.init_app(app)
    app.register_blueprint(bp)

    @app.get("/")
    def index():
        return {"status": "ok", "service": "milk-tracker"}

    with app.app_context():
        db.create_all()

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=5000)