from sqlmodel import SQLModel, Field
from typing import Optional
import json

class Question(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    image_url: str
    correct_answer: str
    options_json: str  # JSON-строка вместо списка

    def get_options(self):
        return json.loads(self.options_json)
