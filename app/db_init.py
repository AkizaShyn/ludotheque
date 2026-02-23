from sqlalchemy import inspect, text

from .extensions import db


def ensure_schema() -> None:
    inspector = inspect(db.engine)
    table_names = set(inspector.get_table_names())
    if "games" not in table_names:
        return

    columns = {column["name"] for column in inspector.get_columns("games")}
    if "ownership_type" not in columns:
        with db.engine.begin() as connection:
            connection.execute(
                text("ALTER TABLE games ADD COLUMN ownership_type VARCHAR(20) NOT NULL DEFAULT 'unknown'")
            )
