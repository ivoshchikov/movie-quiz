from sqlmodel import SQLModel, Field
from typing import Optional
import json

class Category(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)

class Question(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    image_url: str
    correct_answer: str
    options_json: str  # JSON-строка вместо списка
    category_id: Optional[int] = Field(default=None, foreign_key="category.id")

    def get_options(self):
        return json.loads(self.options_json)
