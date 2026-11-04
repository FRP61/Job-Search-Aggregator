"""one vacancy row per country

EURES lists one job under several countries, so source + external_id is not unique.

Revision ID: 0002
Revises: 0001
"""
from collections.abc import Sequence

from alembic import op


revision: str = '0002'
down_revision: str | None = '0001'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table('vacancies') as batch:
        batch.drop_constraint('uq_vacancy_source_external', type_='unique')
        batch.create_unique_constraint(
            'uq_vacancy_source_external_country', ['source', 'external_id', 'country_code']
        )


def downgrade() -> None:
    with op.batch_alter_table('vacancies') as batch:
        batch.drop_constraint('uq_vacancy_source_external_country', type_='unique')
        batch.create_unique_constraint('uq_vacancy_source_external', ['source', 'external_id'])
