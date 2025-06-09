# backend/clear_questions.py

import os
from sqlmodel import Session, delete
from app.database import get_session
from app.models import Question

def main():
    # Берём строку подключения из переменной окружения DATABASE_URL
    # Если её нет, код упадёт (нужно именно PROD-строка, иначе очистит локальную SQLite).
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("❌ Не найдена переменная DATABASE_URL. Экспортируйте её перед запуском.")
        return

    session = get_session()
    # Удаляем все строки из таблицы question
    session.exec(delete(Question))
    session.commit()
    session.close()
    print("✅ Все записи в таблице question успешно удалены.")

if __name__ == "__main__":
    main()
