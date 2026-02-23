from datetime import datetime
import json
from . import db


class Game(db.Model):
    __tablename__ = "games"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    platform = db.Column(db.String(100), nullable=False)
    completed = db.Column(db.Boolean, nullable=False, default=False)
    ownership_type = db.Column(db.String(20), nullable=False, default="unknown")

    genre = db.Column(db.String(255), nullable=True)
    release_date = db.Column(db.String(50), nullable=True)
    cover_url = db.Column(db.String(512), nullable=True)
    description = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "platform": self.platform,
            "completed": self.completed,
            "ownership_type": self.ownership_type,
            "genre": self.genre,
            "release_date": self.release_date,
            "cover_url": self.cover_url,
            "description": self.description,
            "created_at": self.created_at.isoformat(),
        }


class GameSheetCache(db.Model):
    __tablename__ = "game_sheet_cache"

    id = db.Column(db.Integer, primary_key=True)
    game_id = db.Column(db.Integer, db.ForeignKey("games.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    source_fingerprint = db.Column(db.String(128), nullable=False, default="")

    igdb_id = db.Column(db.Integer, nullable=True)
    title = db.Column(db.String(255), nullable=True)
    release_date = db.Column(db.String(50), nullable=True)
    release_year = db.Column(db.Integer, nullable=True)
    publisher = db.Column(db.String(255), nullable=True)
    cover_url = db.Column(db.String(512), nullable=True)
    description = db.Column(db.Text, nullable=True)
    description_fr = db.Column(db.Text, nullable=True)
    images_json = db.Column(db.Text, nullable=True)
    videos_json = db.Column(db.Text, nullable=True)
    cached_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def set_images(self, images: list[str]) -> None:
        self.images_json = json.dumps(images or [])

    def get_images(self) -> list[str]:
        try:
            data = json.loads(self.images_json or "[]")
            return data if isinstance(data, list) else []
        except Exception:
            return []

    def set_videos(self, videos: list[dict]) -> None:
        self.videos_json = json.dumps(videos or [])

    def get_videos(self) -> list[dict]:
        try:
            data = json.loads(self.videos_json or "[]")
            return data if isinstance(data, list) else []
        except Exception:
            return []
