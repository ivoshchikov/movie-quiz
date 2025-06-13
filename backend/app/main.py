# backend/app/main.py

from dotenv import load_dotenv
load_dotenv()

from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import os
import json

from sqladmin import Admin, ModelView
from sqladmin.authentication import AuthenticationBackend
from sqlmodel import select
from starlette.requests import Request

from app.routes import router
from app.database import create_db_and_tables, get_session, engine
from app.models import Question, Category

app = FastAPI(title="Movie Quiz API")


# --- Админка через sqladmin без реальной аутентификации ---
class DummyAuth(AuthenticationBackend):
    async def login(self, request: Request) -> bool:
        return True

    async def logout(self, request: Request) -> bool:
        request.session.clear()
        return True

    async def authenticate(self, request: Request) -> bool:
        return True


auth_backend = DummyAuth(secret_key=os.getenv("SECRET_KEY"))
admin = Admin(
    app,
    engine,
    authentication_backend=auth_backend,
    base_url="/admin"  # по умолчанию "/admin"
)


class CategoryAdmin(ModelView, model=Category):
    column_list = [Category.id, Category.name]
    column_searchable_list = [Category.name]


class QuestionAdmin(ModelView, model=Question):
    column_list = [
        Question.id,
        Question.image_url,
        Question.options_json,
        Question.correct_answer,
        Question.category_id,
    ]
    column_searchable_list = [Question.correct_answer]
    column_filters = [Question.category_id]


admin.add_view(CategoryAdmin)
admin.add_view(QuestionAdmin)


# --- Инициализация БД и сидирование вопросов при старте ---
@app.on_event("startup")
def on_startup() -> None:
    create_db_and_tables()
    session = get_session()
    first = session.exec(select(Question)).first()
    if not first:
        RENDER_BASE = "https://movie-quiz-uybe.onrender.com/posters"
        questions = [
            ("1.png", "Матрица",         ["Матрица", "Начало", "Терминатор", "Дюна"]),
            ("2.png", "Побег из Шоушенка", ["Побег из Шоушенка", "Зелёная миля", "Форрест Гамп", "Остров проклятых"]),
            ("3.png", "Начало",          ["Начало", "Интерстеллар", "Престиж", "Бегущий по лезвию"]),
            ("4.png", "Интерстеллар",    ["Интерстеллар", "Марсианин", "Гравитация", "Контакт"]),
            ("5.png", "Форрест Гамп",    ["Форрест Гамп", "Зелёная миля", "Одержимость", "1+1"]),
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


# --- Основные маршруты API ---
app.include_router(router)


@app.get("/ping")
def ping():
    return {"ok": True}


# --- Статика для фронтенда квиза ---
BASE_DIR = Path(__file__).parent.parent

# Раздаём плакаты
app.mount(
    "/posters",
    StaticFiles(directory=BASE_DIR / "static" / "posters"),
    name="posters"
)

# SPA фронтенд (index.html, JS, CSS и т.д.)
app.mount(
    "/",
    StaticFiles(directory=BASE_DIR / "static", html=True),
    name="static"
)
