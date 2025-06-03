from fastapi import FastAPI
from app.routes import router
from app.database import create_db_and_tables
from fastapi.staticfiles import StaticFiles
from pathlib import Path

app = FastAPI(title="Movie Quiz API")

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

app.include_router(router)

@app.get("/ping")
def ping():
    return {"ok": True}
app.mount("/", StaticFiles(directory=Path(__file__).parent.parent / "static", html=True), name="static")

