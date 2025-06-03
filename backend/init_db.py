from app.database import create_db_and_tables
from app.models import Question  

if __name__ == "__main__":
    create_db_and_tables()
    print("✅ Таблицы успешно созданы.")