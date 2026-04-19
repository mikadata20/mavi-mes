/**
 * supabaseManualDB.js
 * =====================================================
 * Single storage layer for Manual Creation using Supabase.
 * Replaces: tursoAPI.js + knowledgeBaseDB.js + tursoClient.js
 * =====================================================
 */
import { createClient } from '@supabase/supabase-js';

const MANUAL_SUMMARY_COLUMNS = [
    'id',
    'title',
    'document_number',
    'version',
    'status',
    'author',
    'summary',
    'difficulty',
    'time_required',
    'category',
    'industry',
    'type',
    'created_at',
    'updated_at'
].join(',');

const normalizeWorkflowStatus = (status) => {
    const value = String(status || '').trim().toUpperCase();
    if (!value) return 'DRAFT';
    if (['DRAFT', 'REVIEW', 'PUBLISHED'].includes(value)) return value;
    if (['IN REVIEW', 'IN_REVIEW', 'PROPOSED'].includes(value)) return 'REVIEW';
    if (['APPROVED', 'RELEASED'].includes(value)) return 'PUBLISHED';
    return 'DRAFT';
};

// ── Singleton client ──────────────────────────────────
let _client = null;

/**
 * Reads Supabase credentials from:
 *   1. Vite env variables (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
 *   2. localStorage (supabase_storage_settings, saved by Settings UI)
 */
function getCredentials() {
    // Standard Vite/Vite-based frameworks environment variables
    const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

    const isPlaceholder = (val) =>
        !val ||
        val === 'https://your-project-ref.supabase.co' ||
        val === 'your_anon_key_here';

    // Log status for easier debugging in browser console
    if (import.meta.env.DEV) {
        console.log('[Supabase] Env Check:', {
            hasUrl: !!envUrl,
            hasKey: !!envKey,
            isUrlPlaceholder: isPlaceholder(envUrl)
        });
    }

    if (envUrl && envKey && !isPlaceholder(envUrl) && !isPlaceholder(envKey)) {
        return { url: envUrl.trim(), anonKey: envKey.trim() };
    }

    // Fallback to localStorage (set via Settings UI)
    try {
        const raw = localStorage.getItem('supabase_storage_settings');
        if (raw) {
            const parsed = JSON.parse(raw);
            const localAnonKey = parsed?.anonKey || parsed?.anon_key || parsed?.apikey || parsed?.apiKey || '';
            let rawUrl = String(parsed.url || '').trim();

            // Automatic Fix: Convert Dashboard URL to API URL if user accidentally pastes it
            if (rawUrl.includes('supabase.com/dashboard')) {
                const match = rawUrl.match(/\/project\/([a-z0-9]+)/);
                if (match && match[1]) {
                    rawUrl = `https://${match[1]}.supabase.co`;
                }
            }

            if (rawUrl && localAnonKey) {
                return {
                    url: rawUrl,
                    anonKey: String(localAnonKey).trim()
                };
            }
        }
    } catch (e) {
        console.warn('[Supabase] Failed to read localStorage:', e);
    }

    return { url: '', anonKey: '' };
}

/**
 * Returns the Supabase JS client (singleton).
 * Throws if credentials are not configured.
 */
export function getSupabaseClient() {
    if (_client) return _client;

    const { url, anonKey } = getCredentials();

    if (!url || !anonKey) {
        throw new Error(
            'Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY ' +
            'or configure them in the App Settings.'
        );
    }

    _client = createClient(url, anonKey, {
        auth: { persistSession: false }
    });

    return _client;
}

/**
 * Returns true if Supabase credentials are available.
 */
export function isSupabaseReady() {
    const { url, anonKey } = getCredentials();
    return Boolean(url && anonKey);
}

// ── Schema columns (mirrors supabase_setup.sql) ───────
// manuals table columns:
//   id            UUID  PK  (gen_random_uuid())
//   title         TEXT  NOT NULL
//   document_number TEXT
//   version       TEXT  DEFAULT '1.0'
//   status        TEXT  DEFAULT 'Draft'
//   author        TEXT
//   summary       TEXT
//   difficulty    TEXT  DEFAULT 'Moderate'
//   time_required TEXT
//   category      TEXT
//   industry      TEXT
//   type          TEXT  DEFAULT 'manual'
//   content_json  JSONB           ← full guide snapshot
//   created_at    TIMESTAMPTZ
//   updated_at    TIMESTAMPTZ

/**
 * Insert or update a manual.
 * If `id` is provided and exists, performs an UPDATE.
 * Otherwise inserts a new row.
 *
 * @param {object} manual - Guide data from ManualCreation
 * @returns {{ id: string, updatedAt: string }}
 */
export async function upsertManual(manual) {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    const row = {
        title: String(manual.title || 'Untitled Manual'),
        document_number: String(manual.documentNumber || ''),
        version: String(manual.version || '1.0'),
        status: normalizeWorkflowStatus(manual.status || 'DRAFT'),
        author: String(manual.author || ''),
        summary: String(manual.description || manual.summary || ''),
        difficulty: String(manual.difficulty || 'Moderate'),
        time_required: String(manual.timeRequired || ''),
        category: String(manual.category || 'Work Instruction'),
        industry: String(manual.industry || ''),
        type: 'manual',
        content_json: manual.content || {}, // Primary column
        updated_at: now
    };

    // Helper to perform the actual Supabase call
    const performUpsert = async (payload) => {
        if (manual.id && manual.id.includes('-')) {
            return await supabase
                .from('manuals')
                .upsert({ id: manual.id, ...payload, created_at: manual.createdAt || now }, { onConflict: 'id' })
                .select('id, updated_at')
                .single();
        } else {
            return await supabase
                .from('manuals')
                .insert({ ...payload, created_at: now })
                .select('id, updated_at')
                .single();
        }
    };

    try {
        const { data, error } = await performUpsert(row);
        if (error) {
            // Check if error is "column does not exist" for content_json
            if (error.code === '42703' && error.message?.includes('content_json')) {
                console.warn('[supabaseManualDB] content_json missing, retrying with steps column');
                const fallbackRow = { ...row, steps: manual.content || {} };
                delete fallbackRow.content_json;
                const retry = await performUpsert(fallbackRow);
                if (retry.error) throw retry.error;
                return { id: retry.data.id, updatedAt: retry.data.updated_at };
            }
            throw error;
        }
        return { id: data.id, updatedAt: data.updated_at };
    } catch (err) {
        console.error('[supabaseManualDB] Upsert failed:', err);
        throw err;
    }
}

/**
 * Fetch all manuals ordered by most recently updated.
 * @returns {Array}
 */
export async function listManuals() {
    const supabase = getSupabaseClient();

    // IMPORTANT:
    // Avoid selecting large JSON payload columns (content_json / steps) for list views.
    // Fetching full rows for many manuals can trigger Postgres statement timeout (57014)
    // when manuals contain large embedded media/content snapshots.
    const { data, error } = await supabase
        .from('manuals')
        .select(MANUAL_SUMMARY_COLUMNS)
        .order('updated_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(normalizeRow);
}

/**
 * Fetch lightweight manual rows for list/search views.
 * Excludes large JSON columns (content_json/steps) to reduce query cost.
 * @returns {Array}
 */
export async function listManualSummaries() {
    const supabase = getSupabaseClient();

    try {
        const { data, error } = await supabase
            .from('manuals')
            .select(MANUAL_SUMMARY_COLUMNS)
            .order('updated_at', { ascending: false });

        if (error) {
            console.warn('[Offline Mode] Supabase query failed for Manual Summaries, trying cache...', error);
            throw error;
        }

        const normalized = (data || []).map(normalizeRow);
        if (typeof window !== 'undefined') {
            localStorage.setItem('offline_manual_summaries_cache', JSON.stringify(normalized));
        }
        return normalized;
    } catch (err) {
        if (typeof window !== 'undefined') {
            try {
                const cached = localStorage.getItem('offline_manual_summaries_cache');
                if (cached) {
                    console.log('[Offline Mode] Successfully returned Manual Summaries from local storage cache.');
                    return JSON.parse(cached);
                }
            } catch (e) {
                console.error('[Offline Mode] Failed to parse local storage cache for manual summaries', e);
            }
        }
        throw err;
    }
}

/**
 * Fetch a single manual by its UUID.
 * @param {string} id
 * @returns {object|null}
 */
export async function getManualById(id) {
    const supabase = getSupabaseClient();

    try {
        const { data, error } = await supabase
            .from('manuals')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error) {
            console.warn(`[Offline Mode] Supabase query failed for Manual ${id}, trying cache...`, error);
            throw error;
        }
        
        const normalized = normalizeRow(data);
        if (typeof window !== 'undefined' && normalized) {
            localStorage.setItem(`offline_manual_cache_${id}`, JSON.stringify(normalized));
        }
        return normalized;
    } catch (err) {
        if (typeof window !== 'undefined') {
            try {
                const cached = localStorage.getItem(`offline_manual_cache_${id}`);
                if (cached) {
                    console.log(`[Offline Mode] Successfully returned Manual ${id} from local storage cache.`);
                    return JSON.parse(cached);
                }
            } catch (e) {
                console.error(`[Offline Mode] Failed to parse local storage cache for manual ${id}`, e);
            }
        }
        throw err;
    }
}

/**
 * Delete a manual by ID.
 * @param {string} id
 */
export async function deleteManual(id) {
    const supabase = getSupabaseClient();
    const { error } = await supabase
        .from('manuals')
        .delete()
        .eq('id', id);

    if (error) throw error;
    return true;
}

export const getManualByCloudId = getManualById;

/**
 * Append an acknowledgement to a manual's content.
 */
export async function appendManualAcknowledgement(id, ack) {
    const manual = await getManualById(id);
    if (!manual) return null;

    const content = manual.content || {};
    if (!content.acknowledgements) content.acknowledgements = [];
    content.acknowledgements.push({
        ...ack,
        timestamp: new Date().toISOString()
    });

    return await upsertManual({ ...manual, content });
}

/**
 * Append data capture results to a manual's content.
 */
export async function appendManualDataCapture(id, capture) {
    const manual = await getManualById(id);
    if (!manual) return null;

    const content = manual.content || {};
    if (!content.dataCaptures) content.dataCaptures = [];
    content.dataCaptures.push({
        ...capture,
        timestamp: new Date().toISOString()
    });

    return await upsertManual({ ...manual, content });
}
/**
 * Upload an image (data URL or File/Blob) to Supabase Storage.
 * Returns the public URL of the uploaded file.
 *
 * @param {string} storagePath  e.g. "manuals/manual-uuid/step-1.jpg"
 * @param {string|Blob} fileOrDataUrl
 * @param {object} [overrideSettings]  optional {url, anonKey, bucket}
 * @returns {string} public URL
 */
export async function uploadManualImage(storagePath, fileOrDataUrl, overrideSettings = null) {
    const { url, anonKey } = overrideSettings || getCredentials();
    if (!url || !anonKey) throw new Error('Supabase not configured for storage');

    const supabase = overrideSettings
        ? createClient(url, anonKey, { auth: { persistSession: false } })
        : getSupabaseClient();

    // Read settings for bucket name
    // Priority:
    // 1) overrideSettings.bucket
    // 2) localStorage.supabase_storage_settings.bucket
    // 3) Vite env VITE_SUPABASE_BUCKET
    // 4) fallback manual-media
    let bucket =
        overrideSettings?.bucket ||
        import.meta.env.VITE_SUPABASE_BUCKET ||
        'manual-media';

    try {
        const raw = localStorage.getItem('supabase_storage_settings');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (!overrideSettings?.bucket) {
                bucket = parsed?.bucket || bucket;
            }
        }
    } catch { /* ignore */ }

    let fileBlob;
    if (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('data:')) {
        // Convert data URL → Blob
        const [header, base64] = fileOrDataUrl.split(',');
        const mime = header.replace('data:', '').replace(';base64', '');
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        fileBlob = new Blob([bytes], { type: mime });
    } else {
        fileBlob = fileOrDataUrl; // already a Blob/File
    }

    const cleanPath = String(storagePath).replace(/^\/+/, '');
    const candidateBuckets = Array.from(new Set([
        bucket,
        'manual-media',
        'manuals',
        'images'
    ].filter(Boolean)));

    let uploadError = null;
    let activeBucket = bucket;

    for (const candidate of candidateBuckets) {
        const { error } = await supabase.storage.from(candidate).upload(cleanPath, fileBlob, { upsert: true });
        if (!error) {
            activeBucket = candidate;
            uploadError = null;
            break;
        }
        uploadError = error;
    }

    if (uploadError) {
        const message = String(uploadError?.message || '').toLowerCase();
        if (message.includes('bucket') && (message.includes('not found') || message.includes('does not exist'))) {
            throw new Error(
                `Supabase bucket tidak ditemukan. Coba buat bucket \"manual-media\" (public) di Supabase Storage, atau set bucket yang benar di supabase_storage_settings. Detail: ${uploadError.message}`
            );
        }
        throw uploadError;
    }

    const { data } = supabase.storage.from(activeBucket).getPublicUrl(cleanPath);
    return data.publicUrl;
}

// ── Internal helpers ──────────────────────────────────

/**
 * Normalize a Supabase row into the guide shape expected by ManualCreation.
 */
function normalizeRow(row) {
    if (!row) return null;

    const rawContent = row.content_json || row.steps || {};
    const content = typeof rawContent === 'string'
        ? safeParseJson(rawContent)
        : rawContent;

    return {
        // Top-level identity used by ManualCreation
        id: row.id,
        cloudId: row.id,   // kept for QR link compatibility
        kbId: row.id,

        // Metadata columns
        title: row.title || '',
        documentNumber: row.document_number || '',
        version: row.version || '1.0',
        status: normalizeWorkflowStatus(row.status || 'DRAFT'),
        author: row.author || '',
        description: row.summary || '',
        summary: row.summary || '',
        difficulty: row.difficulty || 'Moderate',
        timeRequired: row.time_required || '',
        category: row.category || '',
        industry: row.industry || '',
        type: row.type || 'manual',
        createdAt: row.created_at,
        updatedAt: row.updated_at,

        // Full guide content
        content
    };
}

function safeParseJson(value) {
    try { return JSON.parse(value); } catch { return {}; }
}
