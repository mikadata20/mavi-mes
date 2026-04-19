-- SUPABASE SETUP SCRIPT
-- =====================================================
-- Run this in your Supabase SQL Editor to create the
-- necessary tables for the MES Application.
-- =====================================================

-- 1. Table: manuals
CREATE TABLE IF NOT EXISTS public.manuals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    document_number TEXT,
    version TEXT DEFAULT '1.0',
    status TEXT DEFAULT 'DRAFT',
    author TEXT,
    summary TEXT,
    difficulty TEXT DEFAULT 'Moderate',
    time_required TEXT,
    category TEXT DEFAULT 'Work Instruction',
    industry TEXT,
    type TEXT DEFAULT 'manual',
    content_json JSONB DEFAULT '{}',
    steps JSONB DEFAULT '{}', -- Fallback column
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Table: frontline_apps
CREATE TABLE IF NOT EXISTS public.frontline_apps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT DEFAULT 'Shop Floor',
    config JSONB DEFAULT '{"components": []}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Table: production_queue
CREATE TABLE IF NOT EXISTS public.production_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order TEXT NOT NULL,
    app_id UUID REFERENCES public.frontline_apps(id),
    target_qty INTEGER DEFAULT 0,
    status TEXT DEFAULT 'PENDING',
    priority TEXT DEFAULT 'P2', -- P1 (High), P2 (Normal)
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Table: audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_type TEXT NOT NULL,
    operator_id TEXT DEFAULT 'anonymous',
    station_id TEXT DEFAULT 'N/A',
    work_order TEXT DEFAULT 'N/A',
    payload JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Table: dynamic_translations
CREATE TABLE IF NOT EXISTS public.dynamic_translations (
    key_string TEXT PRIMARY KEY,
    translations JSONB DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Storage bucket for images (required by IMAGE widget upload)
-- NOTE: run with a role that can manage storage (SQL Editor as project owner)
INSERT INTO storage.buckets (id, name, public)
VALUES ('manual-media', 'manual-media', true)
ON CONFLICT (id) DO NOTHING;

-- Optional compatibility buckets (app now tries fallback names too)
INSERT INTO storage.buckets (id, name, public)
VALUES ('manuals', 'manuals', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (so anon key from frontend can upload/read)
-- Re-runnable: drop then recreate policies.
DROP POLICY IF EXISTS "Public read manual-media" ON storage.objects;
CREATE POLICY "Public read manual-media"
ON storage.objects
FOR SELECT
USING (bucket_id = 'manual-media');

DROP POLICY IF EXISTS "Anon insert manual-media" ON storage.objects;
CREATE POLICY "Anon insert manual-media"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (bucket_id = 'manual-media');

DROP POLICY IF EXISTS "Anon update manual-media" ON storage.objects;
CREATE POLICY "Anon update manual-media"
ON storage.objects
FOR UPDATE
TO anon
USING (bucket_id = 'manual-media')
WITH CHECK (bucket_id = 'manual-media');

DROP POLICY IF EXISTS "Anon delete manual-media" ON storage.objects;
CREATE POLICY "Anon delete manual-media"
ON storage.objects
FOR DELETE
TO anon
USING (bucket_id = 'manual-media');

-- Enable RLS (Optional but recommended - currently set to public access for development)
-- ALTER TABLE public.manuals ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.frontline_apps ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.production_queue ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.dynamic_translations ENABLE ROW LEVEL SECURITY;

-- Note: In a production environment, you should add RLS policies.
-- For now, ensure your Anon Key has permission to read/write these tables.

-- =====================================================
-- NEW TABLES - Copy below and run in Supabase SQL Editor
-- =====================================================

-- 7. Table: app_variables (Global variables for the app builder)
CREATE TABLE IF NOT EXISTS public.app_variables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'TEXT',
    default_value TEXT,
    clear_on_completion BOOLEAN DEFAULT TRUE,
    save_for_analysis BOOLEAN DEFAULT TRUE,
    where_used TEXT DEFAULT '-',
    validation_rules JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'app_variables_name_unique'
  ) THEN
    ALTER TABLE public.app_variables ADD CONSTRAINT app_variables_name_unique UNIQUE (name);
  END IF;
END $$;

ALTER TABLE public.app_variables
ADD COLUMN IF NOT EXISTS validation_rules JSONB DEFAULT '{}';

-- 8. Table: app_tables (Tulip-style table definitions)
CREATE TABLE IF NOT EXISTS public.app_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    fields JSONB DEFAULT '[]',
    queries JSONB DEFAULT '[]',
    aggregations JSONB DEFAULT '[]',
    archived_field_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure columns exist if table was created without them
ALTER TABLE public.app_tables ADD COLUMN IF NOT EXISTS queries JSONB DEFAULT '[]';
ALTER TABLE public.app_tables ADD COLUMN IF NOT EXISTS aggregations JSONB DEFAULT '[]';


-- 9. Table: app_table_records (Records for each app_table)
CREATE TABLE IF NOT EXISTS public.app_table_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id UUID NOT NULL REFERENCES public.app_tables(id) ON DELETE CASCADE,
    record_id TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(table_id, record_id)
);

-- 10. Grants & RLS policies for app_tables / app_table_records
--    Needed so frontend (anon key) can read/write when RLS is enabled.

-- Basic grants
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.app_tables TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.app_table_records TO anon, authenticated;

-- Enable RLS (safe to rerun)
ALTER TABLE public.app_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_table_records ENABLE ROW LEVEL SECURITY;

-- Recreate policies (rerunnable)
DROP POLICY IF EXISTS "Allow read app_tables" ON public.app_tables;
CREATE POLICY "Allow read app_tables"
ON public.app_tables
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Allow insert app_tables" ON public.app_tables;
CREATE POLICY "Allow insert app_tables"
ON public.app_tables
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update app_tables" ON public.app_tables;
CREATE POLICY "Allow update app_tables"
ON public.app_tables
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete app_tables" ON public.app_tables;
CREATE POLICY "Allow delete app_tables"
ON public.app_tables
FOR DELETE
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Allow read app_table_records" ON public.app_table_records;
CREATE POLICY "Allow read app_table_records"
ON public.app_table_records
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Allow insert app_table_records" ON public.app_table_records;
CREATE POLICY "Allow insert app_table_records"
ON public.app_table_records
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update app_table_records" ON public.app_table_records;
CREATE POLICY "Allow update app_table_records"
ON public.app_table_records
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete app_table_records" ON public.app_table_records;
CREATE POLICY "Allow delete app_table_records"
ON public.app_table_records
FOR DELETE
TO anon, authenticated
USING (true);
