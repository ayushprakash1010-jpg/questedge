from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Gemini
    GEMINI_API_KEY: str

    # Database (for ai_agent_logs)
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/questedge"

    # Internal API key for backend -> AI service calls
    INTERNAL_API_KEY: str = "dev-internal-key"

    # Server
    PORT: int = 8000

    # Gemini model
    GEMINI_MODEL: str = "gemini-2.5-flash"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
