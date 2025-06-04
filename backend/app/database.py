import os
from sqlmodel import SQLModel, create_engine, Session
from pathlib import Path

# ── Определяем строку подключения:
#    Если в окружении задана переменная DATABASE_URL (например, на Render), она будет использована.
#    Иначе, для локальной разработки, fallback на SQLite-файл quiz.db.
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"sqlite:///{Path(__file__).resolve().parent.parent / 'quiz.db'}"
)

# Если Render прислал URL в формате "postgres://", заменим на "postgresql://"
# (SQLAlchemy/SQLModel ожидают именно postgresql://)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL, echo=True)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    return Session(engine)
