import os
from dotenv import load_dotenv

# Load environment from current working directory / project root
load_dotenv()


class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-this-secret")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60 * 24))
    SUPER_ADMIN_EMAIL: str = os.getenv("SUPER_ADMIN_EMAIL", "admin@helpx.com")


settings = Settings()

if not settings.DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set. Provide it via environment/.env.")