# backend/app/database.py

import os
from dotenv import load_dotenv
from sqlmodel import SQLModel, create_engine, Session

# 1) Загружаем .env
load_dotenv()

# 2) Берём URL из .env
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set in .env")

# 3) Создаём engine именно для Postgres
engine = create_engine(DATABASE_URL, echo=True)

def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)

def get_session() -> Session:
    return Session(engine)
