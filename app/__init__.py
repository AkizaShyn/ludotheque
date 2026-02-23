import os
from flask import Flask
from sqlalchemy import inspect, text
from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy()


def create_app() -> Flask:
    app = Flask(__name__)

    database_url = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://games_user:games_password@db:5432/games_db",
    )

    app.config["SQLALCHEMY_DATABASE_URI"] = database_url
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["IGDB_CLIENT_ID"] = os.getenv("IGDB_CLIENT_ID", "")
    app.config["IGDB_CLIENT_SECRET"] = os.getenv("IGDB_CLIENT_SECRET", "")

    db.init_app(app)

    from . import models  # noqa: F401
    from .routes import main_bp

    app.register_blueprint(main_bp)

    with app.app_context():
        db.create_all()
        inspector = inspect(db.engine)
        columns = {column["name"] for column in inspector.get_columns("games")}
        if "ownership_type" not in columns:
            with db.engine.begin() as connection:
                connection.execute(
                    text("ALTER TABLE games ADD COLUMN ownership_type VARCHAR(20) NOT NULL DEFAULT 'unknown'")
                )

    return app
