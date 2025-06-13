# backend/app/models.py

from __future__ import annotations
import json
from typing import Optional
from sqlmodel import SQLModel, Field, Relationship

class Category(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    # связь «одна категория — много вопросов»
    questions: list[Question] = Relationship(back_populates="category")

class Question(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    image_url: str
    correct_answer: str
    options_json: str  # JSON-строка вместо списка вариантов
    category_id: Optional[int] = Field(default=None, foreign_key="category.id")
    category: Optional[Category] = Relationship(back_populates="questions")

    def get_options(self) -> list[str]:
        return json.loads(self.options_json)
