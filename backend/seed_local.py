import json
from sqlmodel import Session
from app.models import Question
from app.database import engine

questions = [
    ("1.png",        "Матрица",        ["Матрица","Начало","Терминатор","Дюна"]),
    ("2.png",     "Побег из Шоушенка",["Побег из Шоушенка","Зелёная миля","Форрест Гамп","Остров проклятых"]),
    ("3.png",     "Начало",         ["Начало","Интерстеллар","Престиж","Бегущий по лезвию"]),
    ("4.png",  "Интерстеллар",   ["Интерстеллар","Марсианин","Гравитация","Контакт"]),
    ("5.png",       "Форрест Гамп",   ["Форрест Гамп","Зелёная миля","Одержимость","1+1"])
]

with Session(engine) as s:
    for fname, correct, opts in questions:
        q = Question(
            image_url=f"/media/posters/{fname}",
            correct_answer=correct,
            options_json=json.dumps(opts)
        )
        s.add(q)
    s.commit()
print("✅ 5 вопросов добавлены")
