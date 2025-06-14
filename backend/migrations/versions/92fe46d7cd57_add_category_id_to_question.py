from alembic import op
import sqlalchemy as sa

revision = '92fe46d7cd57'
down_revision = 'fabfd6124c46'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # добавляем колонку
    op.add_column(
        'question',
        sa.Column('category_id', sa.Integer(), nullable=True),
    )
    # накладываем внешний ключ
    op.create_foreign_key(
        'fk_question_category',
        'question', 'category',
        ['category_id'], ['id'],
    )

def downgrade() -> None:
    # откатываем внешний ключ и колонку
    op.drop_constraint('fk_question_category', 'question', type_='foreignkey')
    op.drop_column('question', 'category_id')
