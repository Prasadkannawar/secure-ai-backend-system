from supabase import create_client, Client

from app.config import settings

# Single shared Supabase client — thread-safe for concurrent async usage
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)


def get_db() -> Client:
    """FastAPI dependency that returns the shared Supabase client."""
    return supabase
