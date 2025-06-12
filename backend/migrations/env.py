"""Alembic configuration for Movie-Quiz.

Запускается как `alembic revision / upgrade`.
Берёт DATABASE_URL из app.database, чтобы одинаково работать
локально (SQLite) и на Render (PostgreSQL).
"""
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parents[1]))

from logging.config import fileConfig
from alembic import context
from sqlalchemy import create_engine, pool

from app.database import DATABASE_URL        # <-- наша строка подключения
from app.models import SQLModel              # <-- все модели (metadata)

# ────────────────────────── Alembic config ──────────────────────────
config = context.config
# подменяем значение из alembic.ini
config.set_main_option("sqlalchemy.url", DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = SQLModel.metadata         # для autogenerate

# ───────────────────────────── offline ──────────────────────────────
def run_migrations_offline() -> None:
    """`alembic upgrade` с флагом --sql (генерация pure SQL)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()

# ───────────────────────────── online ───────────────────────────────
def run_migrations_online() -> None:
    """Нормальный режим: создаём Engine и подключение."""
    connectable = create_engine(
        DATABASE_URL,
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,            # дифф по типам колонок
            compare_server_default=True,  # дифф по default'ам
        )

        with context.begin_transaction():
            context.run_migrations()

# ────────────────────────────────────────────────────────────────────
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
