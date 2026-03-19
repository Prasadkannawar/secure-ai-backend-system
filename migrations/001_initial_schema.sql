-- ============================================================
-- Migration: 001_initial_schema.sql
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------
-- Table: users
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email            TEXT UNIQUE NOT NULL,
    hashed_password  TEXT NOT NULL,
    role             TEXT NOT NULL DEFAULT 'user',
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast email lookups (login / duplicate-check)
CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON public.users (email);

-- Row-Level Security: service-role key bypasses RLS automatically
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can only read their own row
CREATE POLICY "Users can view own record"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

-- ------------------------------------------------------------
-- Table: api_logs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.api_logs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID REFERENCES public.users (id) ON DELETE SET NULL,
    endpoint     TEXT NOT NULL,
    status_code  INTEGER NOT NULL,
    timestamp    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for per-user log queries
CREATE INDEX IF NOT EXISTS api_logs_user_id_idx ON public.api_logs (user_id);
CREATE INDEX IF NOT EXISTS api_logs_timestamp_idx ON public.api_logs (timestamp DESC);

-- Row-Level Security
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;

-- Policy: users can only view their own logs
CREATE POLICY "Users can view own logs"
    ON public.api_logs FOR SELECT
    USING (auth.uid() = user_id);
