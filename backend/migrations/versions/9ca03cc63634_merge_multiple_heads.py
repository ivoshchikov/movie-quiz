"""Merge multiple heads

Revision ID: 9ca03cc63634
Revises: 1787e784a263, cb5ab6432dd4
Create Date: 2025-06-14 12:10:44.518687

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9ca03cc63634'
down_revision: Union[str, None] = ('1787e784a263', 'cb5ab6432dd4')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
