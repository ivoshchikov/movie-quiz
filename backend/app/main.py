# backend/app/main.py

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
    # 1) Создаем таблицы (если их ещё нет)
    create_db_and_tables()

    # 2) Проверяем, есть ли в таблице хотя бы один вопрос
    session = get_session()
    existing = session.exec(select(Question)).first()
    if existing is None:
        # Таблица пуста — добавляем 5 “ручных” вопросов с правильными URL на ваш Render-домен
        questions = [
            ("1.png", "Матрица",         ["Матрица", "Начало", "Терминатор", "Дюна"]),
            ("2.png", "Побег из Шоушенка", ["Побег из Шоушенка", "Зелёная миля", "Форрест Гамп", "Остров проклятых"]),
            ("3.png", "Начало",          ["Начало", "Интерстеллар", "Престиж", "Бегущий по лезвию"]),
            ("4.png", "Интерстеллар",    ["Интерстеллар", "Марсианин", "Гравитация", "Контакт"]),
            ("5.png", "Форрест Гамп",    ["Форрест Гамп", "Зелёная миля", "Одержимость", "1+1"])
        ]
        # Базовый URL, откуда фронтенд берёт картинки на проде:
        RENDER_BASE = "https://movie-quiz-uybe.onrender.com/posters"

        # Добавляем все 5 вопросов сразу
        for fname, correct, opts in questions:
            q = Question(
                image_url      = f"{RENDER_BASE}/{fname}",
                correct_answer = correct,
                options_json   = json.dumps(opts)
            )
            session.add(q)
        session.commit()
    session.close()

# Подключаем роуты API
app.include_router(router)

@app.get("/ping")
def ping():
    return {"ok": True}

# Определяем корень backend (чтобы собрать правильный путь)
BASE_DIR = Path(__file__).parent.parent  # …/backend

# 1) Сначала «отдаём» все файлы из backend/static/posters по URL /posters/*
app.mount(
    "/posters",
    StaticFiles(directory = BASE_DIR / "static" / "posters"),
    name = "posters_files"
)

# 2) Затем всё, что лежит в backend/static (index.html, JS, CSS и т.д.)
app.mount(
    "/",
    StaticFiles(directory = BASE_DIR / "static", html=True),
    name = "static"
)
