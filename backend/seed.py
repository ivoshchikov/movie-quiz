from sqlmodel import Session
from app.models import Question
from app.database import engine
import json

questions = [
    Question(
        image_url="https://upload.wikimedia.org/wikipedia/en/8/81/ShawshankRedemptionMoviePoster.jpg",
        correct_answer="Побег из Шоушенка",
        options_json=json.dumps([
            "Побег из Шоушенка",
            "Зелёная миля",
            "Остров проклятых",
            "Форрест Гамп"
        ])
    ),
    Question(
        image_url="https://upload.wikimedia.org/wikipedia/en/c/c1/The_Matrix_Poster.jpg",
        correct_answer="Матрица",
        options_json=json.dumps([
            "Матрица",
            "Начало",
            "Бегущий по лезвию",
            "Джон Уик"
        ])
    )
]

with Session(engine) as session:
    for q in questions:
        session.add(q)
    session.commit()

print("✅ Вопросы добавлены.")
