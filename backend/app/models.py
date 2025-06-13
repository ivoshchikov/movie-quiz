from sqlmodel import SQLModel, Field
from typing import List, Optional
import json
from sqlmodel import SQLModel, Field, Relationship

class Category(SQLModel, table=True):
    id:      Optional[int]    = Field(default=None, primary_key=True)
    name:    str
    # связь «одна категория — много вопросов»
    questions: List["Question"] = Relationship(back_populates="category")

class Question(SQLModel, table=True):
    id:           Optional[int] = Field(default=None, primary_key=True)
    image_url: str
    correct_answer: str
    options_json: str  # JSON-строка вместо списка
    category_id:    Optional[int]    = Field(default=None, foreign_key="category.id")
    category:       Optional[Category] = Relationship(back_populates="questions")

    def get_options(self):
        return json.loads(self.options_json)
