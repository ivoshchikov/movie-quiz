# backend/app/main.py

from dotenv import load_dotenv
load_dotenv()
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import os
from sqladmin import Admin, ModelView
from sqladmin.authentication import AuthenticationBackend
from sqlmodel import Session, select
from app.routes import router
from app.database import create_db_and_tables, get_session
from app.models import Question
from app.database import engine
from app.models import Category
from starlette.requests import Request
import json

app = FastAPI(title="Movie Quiz API")

class DummyAuth(AuthenticationBackend):
    async def login(self, request: Request) -> bool:
        # здесь по-хорошему формируем сессию: request.session.update({"token": "..."})
        return True

    async def logout(self, request: Request) -> bool:
        # очистка сессии
        request.session.clear()
        return True

    async def authenticate(self, request: Request) -> bool:
        # если хотите всегда пропускать:
        return True
    
# инициализируем админку — только секретный ключ
auth_backend = DummyAuth(secret_key=os.getenv("SECRET_KEY"))

# создаём админку с префиксом /admin
admin = Admin(
     app,
     engine,
     authentication_backend=auth_backend,
     base_url="/admin"   # этот параметр по умолчанию и так "/admin"
 )

# создаём «CRUD»-вьюхи для моделей
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


@app.on_event("startup")
def on_startup() -> None:
    # 1) Создаем таблицы (если их ещё нет)
    create_db_and_tables()

    # 2) Проверяем, есть ли в таблице хотя бы один вопрос
    session = get_session()
    existing = session.exec(select(Question)).first()
    if existing is None:
        # Таблица пуста — добавляем 5 «ручных» вопросов с правильными URL на ваш Render-домен
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


# Подключаем маршруты API (/question, /answer)
app.include_router(router)


@app.get("/ping")
def ping():
    return {"ok": True}


# Определяем корень backend (чтобы собрать правильный путь к статике)
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
