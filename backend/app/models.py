# backend/app/models.py
from __future__ import annotations

import json
from typing import Optional

from sqlmodel import SQLModel, Field

class Category(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str

class Question(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    image_url: str
    correct_answer: str
    options_json: str
    category_id: Optional[int] = Field(default=None, foreign_key="category.id")

    def get_options(self) -> list[str]:
        return json.loads(self.options_json)
