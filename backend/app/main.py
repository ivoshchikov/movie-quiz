from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from app.routes import router
from app.database import create_db_and_tables

app = FastAPI(title="Movie Quiz API")

@app.on_event("startup")
def on_startup() -> None:
    create_db_and_tables()

app.include_router(router)

@app.get("/ping")
def ping():
    return {"ok": True}

BASE_DIR = Path(__file__).parent.parent  # …/backend

# 1) Первым делом «отдаём» всё, что лежит в backend/static/posters,
#    по адресу /posters/* 
app.mount(
    "/posters",
    StaticFiles(directory = BASE_DIR / "static" / "posters"),
    name = "posters_files"
)

# 2) Затем — всё остальное из backend/static (index.html, JS, CSS и т.д.)
app.mount(
    "/",
    StaticFiles(directory = BASE_DIR / "static", html=True),
    name = "static"
)
