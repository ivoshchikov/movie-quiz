from typing import List, Optional
import random, json

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import Session, select

from app.models import Question
from app.database import engine

router = APIRouter()

# ─────────────────────────  GET /question  ──────────────────────────
@router.get("/question")
def get_question(exclude: Optional[str] = Query(None)):
    """Вернёт случайный вопрос, НЕ входящий в exclude"""
    exclude_ids: List[int] = [int(x) for x in exclude.split(',')] if exclude else []

    with Session(engine) as session:
        stmt = select(Question).where(Question.id.not_in(exclude_ids))
        qlist = session.exec(stmt).all()

        if not qlist:
            raise HTTPException(status_code=404, detail="no-more-questions")

        q = random.choice(qlist)
        return {
            "id": q.id,
            "image_url": q.image_url,
            "options": json.loads(q.options_json)
        }

# ─────────────────────────  POST /answer  ──────────────────────────
from pydantic import BaseModel

class AnswerRequest(BaseModel):
    question_id: int
    answer: str

class AnswerResponse(BaseModel):
    correct: bool
    correct_answer: str

@router.post("/answer", response_model=AnswerResponse)
def check_answer(data: AnswerRequest):
    with Session(engine) as session:
        q = session.get(Question, data.question_id)
        if not q:
            raise HTTPException(404, "Question not found")
        correct = (data.answer.strip() == q.correct_answer.strip())
        return {"correct": correct, "correct_answer": q.correct_answer}
