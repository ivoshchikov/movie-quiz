from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from sqlmodel import select
from app.routes import router
from app.database import create_db_and_tables, get_session
from app.models import Question
import json

app = FastAPI(title="Movie Quiz API")

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

app.include_router(router)

@app.get("/ping")
def ping():
    return {"ok": True}

BASE_DIR = Path(__file__).parent.parent

app.mount(
    "/posters",
    StaticFiles(directory=BASE_DIR/"static"/"posters"),
    name="posters",
)
app.mount(
    "/admin",
    StaticFiles(directory=BASE_DIR/"static"/"admin", html=True),
    name="admin-ui",
)
app.mount(
    "/",
    StaticFiles(directory=BASE_DIR/"static", html=True),
    name="static",
)
