-- ============================================================
-- Migration: 002_analyses_table.sql
-- Run AFTER 001_initial_schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.analyses (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        REFERENCES public.users(id) ON DELETE CASCADE,
    mode        TEXT        NOT NULL CHECK (mode IN ('sentiment', 'emotion', 'full', 'batch')),
    input_text  TEXT        NOT NULL,
    result      JSONB       NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS analyses_user_created_idx
    ON public.analyses (user_id, created_at DESC);

ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_analyses"
    ON public.analyses FOR ALL
    USING (auth.uid() = user_id);
