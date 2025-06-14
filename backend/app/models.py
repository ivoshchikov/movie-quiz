# backend/app/models.py

import json
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship

class Category(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str

    
    # «обратная» сторона отношения (список вопросов в категории)  +
    questions: List["Question"] = Relationship(
        back_populates="category", sa_relationship_kwargs={"lazy": "selectin"}
    )

class Question(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    image_url: str
    correct_answer: str
    options_json: str
    category_id: Optional[int] = Field(
        default=None,
        foreign_key="category.id",
    )

    # сам объект Category (удобно и для SQLAdmin, и для кода)      +
    category: Optional[Category] = Relationship(
        back_populates="questions", sa_relationship_kwargs={"lazy": "selectin"}
    )
    def get_options(self) -> list[str]:
        return json.loads(self.options_json)
