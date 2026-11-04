"""fingerprint without the city

Finds the same job on a board that gives no city, like EURES search results.

Revision ID: 0003
Revises: 0002
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = '0003'
down_revision: str | None = '0002'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column('vacancies', sa.Column('loose_fingerprint', sa.String(length=40), nullable=True))
    op.create_index(op.f('ix_vacancies_loose_fingerprint'), 'vacancies', ['loose_fingerprint'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_vacancies_loose_fingerprint'), table_name='vacancies')
    op.drop_column('vacancies', 'loose_fingerprint')
