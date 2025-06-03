from fastapi import APIRouter, HTTPException
from sqlmodel import Session, select
from app.models import Question
from app.database import engine
from pydantic import BaseModel
import random
import json

router = APIRouter()

@router.get("/question")
def get_question():
    with Session(engine) as session:
        questions = session.exec(select(Question)).all()
        if not questions:
            raise HTTPException(status_code=404, detail="No questions found")

        question = random.choice(questions)

        return {
            "id": question.id,
            "image_url": question.image_url,
            "options": json.loads(question.options_json)
        }

# 👇 Добавляем схему для входящих данных
class AnswerRequest(BaseModel):
    question_id: int
    answer: str

@router.post("/answer")
def check_answer(data: AnswerRequest):
    with Session(engine) as session:
        question = session.get(Question, data.question_id)
        if not question:
            raise HTTPException(status_code=404, detail="Question not found")

        is_correct = (data.answer == question.correct_answer)

        return {
            "correct": is_correct,
            "correct_answer": question.correct_answer
        }
