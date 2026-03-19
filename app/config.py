from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Supabase configuration
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""

    # JWT configuration
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # TODO: Add additional environment variables as needed

    class Config:
        env_file = ".env"
        case_sensitive = True


# Singleton settings instance
settings = Settings()
