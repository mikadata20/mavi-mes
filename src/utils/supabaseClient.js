const SUPABASE_STORAGE_KEY = 'supabase_storage_settings';

const DEFAULT_SETTINGS = {
    enabled: false,
    url: '',
    anonKey: '',
    bucket: 'manual-media',
    folder: 'manuals'
};

const normalizeBaseUrl = (value = '') => String(value || '').trim().replace(/\/+$/, '');

const validateSupabaseUrl = (rawUrl = '') => {
    const normalized = normalizeBaseUrl(rawUrl);
    if (!normalized) {
        throw new Error('Supabase URL is required');
    }

    let parsed;
    try {
        parsed = new URL(normalized);
    } catch {
        throw new Error('Supabase URL is invalid. Example: https://your-project-ref.supabase.co');
    }

    if (!['https:', 'http:'].includes(parsed.protocol)) {
        throw new Error('Supabase URL must start with http:// or https:// (not libsql://).');
    }

    if (!parsed.hostname.toLowerCase().includes('supabase.co')) {
        throw new Error('Supabase URL should be your Supabase project domain (…supabase.co).');
    }

    return normalizeBaseUrl(parsed.toString());
};

const fetchWithTimeout = async (url, options = {}, timeoutMs = 10000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timeoutId);
    }
};

export const getSupabaseSettings = () => {
    try {
        const raw = localStorage.getItem(SUPABASE_STORAGE_KEY);
        if (!raw) return { ...DEFAULT_SETTINGS };
        const parsed = JSON.parse(raw);
        return {
            ...DEFAULT_SETTINGS,
            ...parsed,
            url: normalizeBaseUrl(parsed?.url || ''),
            bucket: String(parsed?.bucket || DEFAULT_SETTINGS.bucket).trim() || DEFAULT_SETTINGS.bucket,
            folder: String(parsed?.folder || DEFAULT_SETTINGS.folder).trim() || DEFAULT_SETTINGS.folder
        };
    } catch {
        return { ...DEFAULT_SETTINGS };
    }
};

export const saveSupabaseSettings = (settings = {}) => {
    const next = {
        ...DEFAULT_SETTINGS,
        ...settings,
        url: normalizeBaseUrl(settings?.url || ''),
        bucket: String(settings?.bucket || DEFAULT_SETTINGS.bucket).trim() || DEFAULT_SETTINGS.bucket,
        folder: String(settings?.folder || DEFAULT_SETTINGS.folder).trim() || DEFAULT_SETTINGS.folder
    };
    localStorage.setItem(SUPABASE_STORAGE_KEY, JSON.stringify(next));
    return next;
};

export const isSupabaseConfigured = () => {
    const cfg = getSupabaseSettings();
    return Boolean(cfg.enabled && cfg.url && cfg.anonKey && cfg.bucket);
};

const parseDataUrl = (dataUrl) => {
    const raw = String(dataUrl || '');
    const match = raw.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) throw new Error('Invalid data URL format');
    const [, mimeType, base64] = match;
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return { mimeType, bytes };
};

const buildStoragePath = (path = '') => String(path || '').replace(/^\/+/, '');

export const uploadDataUrlToSupabase = async (path, dataUrl, overrideSettings = null) => {
    const cfg = overrideSettings || getSupabaseSettings();
    if (!cfg.url || !cfg.anonKey || !cfg.bucket) {
        throw new Error('Supabase settings incomplete');
    }
    const validBaseUrl = validateSupabaseUrl(cfg.url);

    const cleanPath = buildStoragePath(path);
    const { mimeType, bytes } = parseDataUrl(dataUrl);
    const endpoint = `${validBaseUrl}/storage/v1/object/${encodeURIComponent(cfg.bucket)}/${cleanPath}`;

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            apikey: cfg.anonKey,
            Authorization: `Bearer ${cfg.anonKey}`,
            'Content-Type': mimeType,
            'x-upsert': 'true'
        },
        body: bytes
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `Supabase upload failed (${response.status})`);
    }

    return `${validBaseUrl}/storage/v1/object/public/${encodeURIComponent(cfg.bucket)}/${cleanPath}`;
};

export const uploadBlobToSupabase = async (path, blob, contentType = null, overrideSettings = null) => {
    const cfg = overrideSettings || getSupabaseSettings();
    if (!cfg.url || !cfg.anonKey || !cfg.bucket) {
        throw new Error('Supabase settings incomplete');
    }
    const validBaseUrl = validateSupabaseUrl(cfg.url);

    const cleanPath = buildStoragePath(path);
    const endpoint = `${validBaseUrl}/storage/v1/object/${encodeURIComponent(cfg.bucket)}/${cleanPath}`;
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            apikey: cfg.anonKey,
            Authorization: `Bearer ${cfg.anonKey}`,
            'Content-Type': contentType || blob?.type || 'application/octet-stream',
            'x-upsert': 'true'
        },
        body: blob
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `Supabase upload failed (${response.status})`);
    }

    return `${validBaseUrl}/storage/v1/object/public/${encodeURIComponent(cfg.bucket)}/${cleanPath}`;
};

export const testSupabaseConnection = async (overrideSettings = null) => {
    const cfg = overrideSettings || getSupabaseSettings();
    if (!cfg.url || !cfg.anonKey) throw new Error('Supabase URL / Anon Key is required');
    const validBaseUrl = validateSupabaseUrl(cfg.url);

    let response;
    try {
        response = await fetchWithTimeout(`${validBaseUrl}/storage/v1/bucket`, {
            headers: {
                apikey: cfg.anonKey,
                Authorization: `Bearer ${cfg.anonKey}`
            }
        }, 12000);
    } catch (error) {
        if (error?.name === 'AbortError') {
            throw new Error('Supabase connection timed out. Check internet access, project URL, and firewall/proxy settings.');
        }
        throw new Error(`Failed to reach Supabase endpoint (${validBaseUrl}). ${error?.message || 'Network error.'}`);
    }

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `Connection failed (${response.status})`);
    }

    return true;
};
