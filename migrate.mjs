// migrate.mjs - Jalankan: node migrate.mjs
// Membuat tabel app_variables, app_tables, app_table_records di Supabase

const SUPABASE_URL = 'https://dfaqnisudeyjsycnqcyl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmYXFuaXN1ZGV5anN5Y25xY3lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMTgxODcsImV4cCI6MjA4ODg5NDE4N30.1hTEq6KAtcuKfofsDtKo65VVqT-EzrGM5ayVIDcnuhw';

const SQL = `
-- Tabel untuk Variables
CREATE TABLE IF NOT EXISTS app_variables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'TEXT',
    default_value TEXT,
    clear_on_completion BOOLEAN DEFAULT TRUE,
    save_for_analysis BOOLEAN DEFAULT TRUE,
    where_used TEXT DEFAULT '-',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'app_variables_name_unique'
  ) THEN
    ALTER TABLE app_variables ADD CONSTRAINT app_variables_name_unique UNIQUE (name);
  END IF;
END $$;

-- Tabel untuk Tables (metadata + fields)
CREATE TABLE IF NOT EXISTS app_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    fields JSONB DEFAULT '[]',
    archived_field_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel untuk Records di setiap Table
CREATE TABLE IF NOT EXISTS app_table_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id UUID NOT NULL REFERENCES app_tables(id) ON DELETE CASCADE,
    record_id TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(table_id, record_id)
);
`;

async function runMigration() {
    console.log('🚀 Running Supabase migration...');

    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ sql: SQL }),
    });

    if (!res.ok) {
        // Anon key doesn't have exec_sql - try the management API approach
        console.log('⚠ exec_sql not available with anon key (expected).');
        console.log('');
        console.log('📋 Jalankan SQL berikut di Supabase SQL Editor:');
        console.log('   https://supabase.com/dashboard/project/dfaqnisudeyjsycnqcyl/sql/new');
        console.log('');
        console.log(SQL);
        return;
    }

    const data = await res.json();
    console.log('✅ Migration berhasil!', data);
}

runMigration().catch(console.error);
