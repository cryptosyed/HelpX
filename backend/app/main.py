import logging
logging.basicConfig(level=logging.INFO)

from fastapi.security import HTTPBearer
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, bookings, services, admin, user, provider, match, reports, reviews, provider_services
from app.api.provider import earnings_router
from app.db.schema_guard import ensure_schema, schema_health

logger = logging.getLogger(__name__)

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app = FastAPI(
    title="HelpX MVP API",
    swagger_ui_parameters={"persistAuthorization": True}
)

def add_cors(app: FastAPI) -> None:
    # Must be first middleware to ensure CORS on errors
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.on_event("startup")
def startup_log() -> None:
    """
    App startup hook.
    Attempt to ensure tables exist; log failures without crashing so app boots.
    """
    logger.info("HelpX API starting up")
    try:
        from app.db.session import engine
        import app.models  # noqa: F401
        from app.db.base import Base

        ensure_schema(engine)
        Base.metadata.create_all(bind=engine, checkfirst=True)
        logger.info("Metadata ensured (tables=%s)", ", ".join(sorted(Base.metadata.tables.keys())))
    except Exception as exc:
        logger.warning("Database not available at startup: %s", exc)


# CORS (dev)
add_cors(app)

# Routers
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(services.router, prefix="/services", tags=["services"])
app.include_router(bookings.router, prefix="/bookings", tags=["bookings"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])
app.include_router(user.router, prefix="/user", tags=["user"])
app.include_router(provider.router, prefix="/provider", tags=["provider"])
app.include_router(provider_services.router, tags=["provider-services"])
app.include_router(reports.router, prefix="/reports", tags=["reports"])
app.include_router(earnings_router, tags=["provider"])
app.include_router(match.router, tags=["matching"])
app.include_router(reviews.router, tags=["reviews"])


@app.get("/")
def root():
    return {"msg": "HelpX API - up"}


@app.get("/health/schema")
def health_schema():
    from app.db.session import engine

    issues = schema_health(engine)
    if issues:
        return FastAPI.responses.JSONResponse(
            status_code=500, content={"status": "error", "issues": issues}
        )
    return {"status": "ok"}