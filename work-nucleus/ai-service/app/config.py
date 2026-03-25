from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Anthropic
    ANTHROPIC_API_KEY: str

    # Database (for ai_agent_logs)
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/work_nucleus"

    # Internal API key for backend -> AI service calls
    INTERNAL_API_KEY: str = "dev-internal-key"

    # Server
    PORT: int = 8000

    # Claude model
    CLAUDE_MODEL: str = "claude-sonnet-4-20250514"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
