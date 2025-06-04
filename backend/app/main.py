from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from app.routes import router
from app.database import create_db_and_tables

# ── Создаём приложение ─────────────────────────────────────────
app = FastAPI(title="Movie Quiz API")

# ── Инициализируем БД при старте ───────────────────────────────
@app.on_event("startup")
def on_startup() -> None:
    create_db_and_tables()

# ── Подключаем маршруты API (/question, /answer) ──────────────
app.include_router(router)

# ── Пинг для быстрой проверки ─────────────────────────────────
@app.get("/ping")
def ping():
    return {"ok": True}

# ── Папка со статикой ─────────────────────────────────────────
BASE_DIR = Path(__file__).parent.parent  # …/backend

# 1) HTML-интерфейс (index.html + JS/CSS)
app.mount(
    "/",
    StaticFiles(directory=BASE_DIR / "static", html=True),
    name="static",
)
