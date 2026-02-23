from datetime import datetime
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
