# backend/app/models.py

from __future__ import annotations
import json
from typing import List, Optional
from sqlmodel import SQLModel, Field, Relationship

class Category(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    # Явно указываем, что это связь к модели Question
    questions: List["Question"] = Relationship(
        back_populates="category"
    )

class Question(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    image_url: str
    correct_answer: str
    options_json: str
    category_id: Optional[int] = Field(default=None, foreign_key="category.id")
    # Явно указываем, что это связь к модели Category
    category: Optional["Category"] = Relationship(
        back_populates="questions"
    )

    def get_options(self) -> list[str]:
        return json.loads(self.options_json)
