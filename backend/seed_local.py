import json
from sqlmodel import Session, delete
from app.models import Question
from app.database import engine

# Ваш список файлов и вариантов ответов
questions = [
    ("1.png", "Матрица",         ["Матрица", "Начало", "Терминатор", "Дюна"]),
    ("2.png", "Побег из Шоушенка", ["Побег из Шоушенка", "Зелёная миля", "Форрест Гамп", "Остров проклятых"]),
    ("3.png", "Начало",          ["Начало", "Интерстеллар", "Престиж", "Бегущий по лезвию"]),
    ("4.png", "Интерстеллар",    ["Интерстеллар", "Марсианин", "Гравитация", "Контакт"]),
    ("5.png", "Форрест Гамп",    ["Форрест Гамп", "Зелёная миля", "Одержимость", "1+1"])
]

# ───────────────────────────────────────────────────────────────────────────
# Заменяем <Public_Dev_URL> на ваш Public Development URL R2 (r2.dev)
R2_BASE = "https://pub-80682570ed594b069e491bc7f2184f75.r2.dev"
# Например, полный адрес для 1.png будет:
# https://pub-80682570ed594b069e491bc7f2184f75.r2.dev/1.png

with Session(engine) as s:
    # 1) Очищаем все старые записи в таблице question
    s.exec(delete(Question))
    s.commit()

    # 2) Вставляем новые вопросы с R2 URL
    for fname, correct, opts in questions:
        q = Question(
            image_url     = f"{R2_BASE}/{fname}",
            correct_answer = correct,
            options_json  = json.dumps(opts)
        )
        s.add(q)

    s.commit()

print("✅ 5 вопросов добавлены")
