# backend/app/main.py

from pathlib import Path
import json

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi import APIRouter

from sqlmodel import select
from app.database import create_db_and_tables, get_session
from app.models import Question, Category
from app.routes import router as quiz_router

app = FastAPI(title="Movie Quiz API")

# 1) CORS (для разработки с React-Admin на localhost, в продакшне можно оставить ["*"] или конкретный домен)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2) CRUD API для админки
admin_api = APIRouter(prefix="/admin/api", tags=["admin"])

# --- Category ---
@admin_api.get("/category/list")
def list_categories():
    with get_session() as session:
        return session.exec(select(Category)).all()

@admin_api.get("/category/{id}")
def get_category(id: int):
    with get_session() as session:
        cat = session.get(Category, id)
        if not cat:
            raise HTTPException(404, "Category not found")
        return cat

@admin_api.post("/category/create")
def create_category(cat: Category):
    with get_session() as session:
        session.add(cat)
        session.commit()
        session.refresh(cat)
        return cat

@admin_api.post("/category/update/{id}")
def update_category(id: int, data: Category):
    with get_session() as session:
        cat = session.get(Category, id)
        if not cat:
            raise HTTPException(404, "Category not found")
        cat.name = data.name
        session.add(cat)
        session.commit()
        return cat

@admin_api.delete("/category/delete/{id}")
def delete_category(id: int):
    with get_session() as session:
        cat = session.get(Category, id)
        if not cat:
            raise HTTPException(404, "Category not found")
        session.delete(cat)
        session.commit()
        return {"id": id}

# --- Question ---
@admin_api.get("/question/list")
def list_questions():
    with get_session() as session:
        return session.exec(select(Question)).all()

@admin_api.get("/question/{id}")
def get_question(id: int):
    with get_session() as session:
        q = session.get(Question, id)
        if not q:
            raise HTTPException(404, "Question not found")
        return q

@admin_api.post("/question/create")
def create_question(q: Question):
    with get_session() as session:
        session.add(q)
        session.commit()
        session.refresh(q)
        return q

@admin_api.post("/question/update/{id}")
def update_question(id: int, data: Question):
    with get_session() as session:
        q = session.get(Question, id)
        if not q:
            raise HTTPException(404, "Question not found")
        q.image_url = data.image_url
        q.correct_answer = data.correct_answer
        q.options_json = data.options_json
        q.category_id = data.category_id
        session.add(q)
        session.commit()
        return q

@admin_api.delete("/question/delete/{id}")
def delete_question(id: int):
    with get_session() as session:
        q = session.get(Question, id)
        if not q:
            raise HTTPException(404, "Question not found")
        session.delete(q)
        session.commit()
        return {"id": id}

# 3) Подключаем admin API и викторину
app.include_router(admin_api)
app.include_router(quiz_router)  # ваши /question и /answer

# 4) При старте создаём БД и seed-им вопросы
@app.on_event("startup")
def on_startup() -> None:
    create_db_and_tables()
    session = get_session()
    if not session.exec(select(Question)).first():
        RENDER_BASE = "https://movie-quiz-uybe.onrender.com/posters"
        questions = [
            ("1.png", "Матрица", ["Матрица","Начало","Терминатор","Дюна"]),
            ("2.png", "Побег из Шоушенка", ["Побег из Шоушенка","Зелёная миля","Форрест Гамп","Остров проклятых"]),
            ("3.png", "Начало", ["Начало","Интерстеллар","Престиж","Бегущий по лезвию"]),
            ("4.png", "Интерстеллар", ["Интерстеллар","Марсианин","Гравитация","Контакт"]),
            ("5.png", "Форрест Гамп", ["Форрест Гамп","Зелёная миля","Одержимость","1+1"]),
        ]
        for fname, correct, opts in questions:
            q = Question(
                image_url=f"{RENDER_BASE}/{fname}",
                correct_answer=correct,
                options_json=json.dumps(opts),
            )
            session.add(q)
        session.commit()
    session.close()

# 5) Статика
BASE_DIR = Path(__file__).parent.parent

# 5.1) Картинки (постеры)
app.mount(
    "/posters",
    StaticFiles(directory=BASE_DIR/"static"/"posters"),
    name="posters",
)

# 5.2) Admin UI (React-Admin) — по /admin/*
app.mount(
    "/admin",
    StaticFiles(directory=BASE_DIR/"static"/"admin", html=True),
    name="admin-ui",
)

# 5.3) Фронтенд игры — по всем остальным путям
app.mount(
    "/",
    StaticFiles(directory=BASE_DIR/"static", html=True),
    name="frontend",
)
