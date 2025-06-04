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

# ── Обратите внимание: мы прибавляем "/posters" после R2_BASE ──
R2_BASE = "https://movie-quiz-uybe.onrender.com/posters"
# Пример: полный адрес будет "https://pub-…r2.dev/posters/1.png"

with Session(engine) as s:
    # 1) Удаляем все старые записи
    s.exec(delete(Question))
    s.commit()

    # 2) Вставляем новые вопросы, каждое image_url = R2_BASE + "/" + fname
    for fname, correct, opts in questions:
        q = Question(
            image_url      = f"{R2_BASE}/{fname}",
            correct_answer = correct,
            options_json   = json.dumps(opts)
        )
        s.add(q)

    s.commit()

print("✅ 5 вопросов добавлены")
