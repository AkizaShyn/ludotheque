from flask import Flask
from .config import load_config
from .db_init import ensure_schema
from .extensions import db


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_mapping(load_config())

    db.init_app(app)

    from . import models  # noqa: F401
    from .routes import main_bp

    app.register_blueprint(main_bp)

    with app.app_context():
        db.create_all()
        ensure_schema()

    return app
