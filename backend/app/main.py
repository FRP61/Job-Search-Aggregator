from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import cost_of_living, countries, health, industries
from app.config import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="Vacancies from European job boards with cost of living and net income context.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

API_PREFIX = "/api/v1"
app.include_router(health.router, prefix=API_PREFIX)
app.include_router(countries.router, prefix=API_PREFIX)
app.include_router(industries.router, prefix=API_PREFIX)
app.include_router(cost_of_living.router, prefix=API_PREFIX)
