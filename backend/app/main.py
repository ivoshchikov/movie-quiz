# файл: backend/app/main.py

from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session, select
from app.routes import router
from app.database import create_db_and_tables, get_session
from app.models import Question
import json

app = FastAPI(title="Movie Quiz API")

@app.on_event("startup")
def on_startup() -> None:
    # 1) создаём таблицы, если их ещё нет
    create_db_and_tables()

    # 2) проверяем, есть ли хоть один вопрос в продакшен-базе
    session = get_session()
    existing = session.exec(select(Question)).first()
    if existing is None:
        # Таблица пуста → вставляем «ручной» набор из 5 вопросов
        questions = [
            ("1.png", "Матрица",        ["Матрица","Начало","Терминатор","Дюна"]),
            ("2.png", "Побег из Шоушенка", ["Побег из Шоушенка","Зелёная миля","Форрест Гамп","Остров проклятых"]),
            ("3.png", "Начало",         ["Начало","Интерстеллар","Престиж","Бегущий по лезвию"]),
            ("4.png", "Интерстеллар",   ["Интерстеллар","Марсианин","Гравитация","Контакт"]),
            ("5.png", "Форрест Гамп",   ["Форрест Гамп","Зелёная миля","Одержимость","1+1"])
        ]
        # Базовый URL для изображений уже на вашем сервисе Render:
        RENDER_BASE = "https://movie-quiz-uybe.onrender.com/posters"
        for fname, correct, opts in questions:
            q = Question(
                image_url      = f"{RENDER_BASE}/{fname}",
                correct_answer = correct,
                options_json   = json.dumps(opts)
            )
            session.add(q)
        session.commit()
    session.close()

app.include_router(router)

@app.get("/ping")
def ping():
    return {"ok": True}

BASE_DIR = Path(__file__).parent.parent  # …/backend

# 1) Отдаём всё, что лежит в backend/static/posters по /posters/*
app.mount(
    "/posters",
    StaticFiles(directory = BASE_DIR / "static" / "posters"),
    name = "posters_files"
)

# 2) Всё остальное из backend/static (index.html и т. д.)
app.mount(
    "/",
    StaticFiles(directory = BASE_DIR / "static", html=True),
    name = "static"
)
