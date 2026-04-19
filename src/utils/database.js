import * as supabaseTranslations from './supabaseTranslationDB.js';
import automationEngine from './automationEngine';

/**
 * Simplified database.js for MES project.
 * Provides entry points for translations used by LanguageContext.
 */

export const getDynamicTranslations = async () => {
    try {
        const data = await supabaseTranslations.getDynamicTranslations();
        // database.js signature returns rows as array [{ key, en, id, ja }]
        return Object.entries(data).map(([key, t]) => ({
            key,
            en: t.en,
            id: t.id,
            ja: t.ja,
            ...t
        }));
    } catch (error) {
        console.error('Failed to fetch dynamic translations:', error);
        return [];
    }
};

// Add other stubs if needed by components
export const initDB = async () => ({ execute: async () => ({ lastInsertId: 0 }), select: async () => [] });
export const checkDBStatus = async () => ({ isConfigured: true, isOnline: true, mode: 'MES Lite' });

// --- DATA STORAGE LOGIC (TABLES & COMPLETIONS) ---
const DB_NAME = 'FrontlineDataStorageDB';
// Bump version to ensure onupgradeneeded runs for users with older local DB schemas
// (some clients may have missing object stores from previous iterations).
const DB_VERSION = 6;
const TABLE_FIELD_LIMIT = 200;

export const TABLE_FIELD_TYPES = [
    'text',
    'number',
    'boolean',
    'integer',
    'interval',
    'image',
    'video',
    'file',
    'user',
    'datetime',
    'color',
    'linked_record',
    'machine',
    'station'
];

let dbPromise = null;

const getDB = () => {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                const ensureIndex = (store, indexName, keyPath, options = { unique: false }) => {
                    if (!store.indexNames.contains(indexName)) {
                        store.createIndex(indexName, keyPath, options);
                    }
                };
                if (!db.objectStoreNames.contains('tables')) {
                    db.createObjectStore('tables', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('table_records')) {
                    const recordStore = db.createObjectStore('table_records', { keyPath: 'id' });
                    ensureIndex(recordStore, 'tableId', 'tableId', { unique: false });
                } else {
                    const recordStore = e.target.transaction.objectStore('table_records');
                    ensureIndex(recordStore, 'tableId', 'tableId', { unique: false });
                }
                if (!db.objectStoreNames.contains('completions')) {
                    const completionStore = db.createObjectStore('completions', { keyPath: 'id' });
                    ensureIndex(completionStore, 'appId', 'appId', { unique: false });
                } else {
                    const completionStore = e.target.transaction.objectStore('completions');
                    ensureIndex(completionStore, 'appId', 'appId', { unique: false });
                }
                if (!db.objectStoreNames.contains('integration_connectors')) {
                    const connectorStore = db.createObjectStore('integration_connectors', { keyPath: 'id' });
                    ensureIndex(connectorStore, 'name', 'name', { unique: false });
                    ensureIndex(connectorStore, 'type', 'type', { unique: false });
                } else {
                    const connectorStore = e.target.transaction.objectStore('integration_connectors');
                    ensureIndex(connectorStore, 'name', 'name', { unique: false });
                    ensureIndex(connectorStore, 'type', 'type', { unique: false });
                }
                if (!db.objectStoreNames.contains('integration_logs')) {
                    const logStore = db.createObjectStore('integration_logs', { keyPath: 'id' });
                    ensureIndex(logStore, 'connectorId', 'connectorId', { unique: false });
                    ensureIndex(logStore, 'appId', 'appId', { unique: false });
                    ensureIndex(logStore, 'createdAt', 'createdAt', { unique: false });
                } else {
                    const logStore = e.target.transaction.objectStore('integration_logs');
                    ensureIndex(logStore, 'connectorId', 'connectorId', { unique: false });
                    ensureIndex(logStore, 'appId', 'appId', { unique: false });
                    ensureIndex(logStore, 'createdAt', 'createdAt', { unique: false });
                }
                if (!db.objectStoreNames.contains('shop_floor_stations')) {
                    db.createObjectStore('shop_floor_stations', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('shop_floor_interfaces')) {
                    db.createObjectStore('shop_floor_interfaces', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('shop_floor_machines')) {
                    db.createObjectStore('shop_floor_machines', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('shop_floor_edge_devices')) {
                    db.createObjectStore('shop_floor_edge_devices', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('machine_activity_logs')) {
                    const activityStore = db.createObjectStore('machine_activity_logs', { keyPath: 'id' });
                    ensureIndex(activityStore, 'machineId', 'machineId', { unique: false });
                    ensureIndex(activityStore, 'timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }
    return dbPromise;
};

const normalizeFieldType = (type) => {
    const normalized = String(type || 'text').toLowerCase().replace(/\s+/g, '_');
    return TABLE_FIELD_TYPES.includes(normalized) ? normalized : 'text';
};

const normalizeTableFields = (tableData = {}) => {
    const legacyColumns = Array.isArray(tableData.columns)
        ? tableData.columns.filter(Boolean).map((name) => ({ name, type: 'text' }))
        : [];

    const rawFields = Array.isArray(tableData.fields) && tableData.fields.length > 0
        ? tableData.fields
        : legacyColumns;

    const uniqueByName = new Map();
    rawFields.forEach((field) => {
        const fieldName = typeof field === 'string' ? field : field?.name;
        if (!fieldName) return;
        const cleanName = String(fieldName).trim();
        if (!cleanName) return;
        if (!uniqueByName.has(cleanName)) {
            uniqueByName.set(cleanName, {
                name: cleanName,
                type: normalizeFieldType(typeof field === 'string' ? 'text' : field.type),
                archived: Boolean(typeof field === 'string' ? false : field.archived)
            });
        }
    });

    return Array.from(uniqueByName.values());
};

// --- TABLES API ---
export const createTable = async (tableData) => {
    const db = await getDB();
    const id = `tbl_${Date.now()}`;
    const fields = normalizeTableFields(tableData);
    const archivedFieldCount = Number(tableData?.archivedFieldCount || 0);

    if (fields.length + archivedFieldCount > TABLE_FIELD_LIMIT) {
        throw new Error(`Table field limit exceeded. Max ${TABLE_FIELD_LIMIT} fields including archived fields.`);
    }

    const newTable = {
        id,
        name: tableData?.name || 'Untitled Table',
        description: tableData?.description || '',
        fields,
        columns: fields.map((f) => f.name),
        archivedFieldCount,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    return new Promise((resolve, reject) => {
        const tx = db.transaction('tables', 'readwrite');
        tx.objectStore('tables').put(newTable);
        tx.oncomplete = () => resolve(newTable);
        tx.onerror = () => reject(tx.error);
    });
};

export const updateTable = async (tableId, patch = {}) => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('tables', 'readwrite');
        const store = tx.objectStore('tables');
        const getReq = store.get(tableId);

        getReq.onsuccess = () => {
            const existing = getReq.result;
            if (!existing) {
                reject(new Error(`Table ${tableId} not found`));
                return;
            }

            const nextFields = patch.fields ? normalizeTableFields(patch) : normalizeTableFields(existing);
            const archivedFieldCount = Number(patch.archivedFieldCount ?? existing.archivedFieldCount ?? 0);
            if (nextFields.length + archivedFieldCount > TABLE_FIELD_LIMIT) {
                reject(new Error(`Table field limit exceeded. Max ${TABLE_FIELD_LIMIT} fields including archived fields.`));
                return;
            }

            const next = {
                ...existing,
                ...patch,
                fields: nextFields,
                columns: nextFields.map((f) => f.name),
                archivedFieldCount,
                updatedAt: new Date().toISOString()
            };
            store.put(next);
        };

        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
    });
};

export const deleteTable = async (tableId) => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(['tables', 'table_records'], 'readwrite');
        tx.objectStore('tables').delete(tableId);

        const index = tx.objectStore('table_records').index('tableId');
        const req = index.getAll(tableId);
        req.onsuccess = () => {
            (req.result || []).forEach((row) => {
                tx.objectStore('table_records').delete(row.id);
            });
        };

        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
    });
};

export const getTables = async () => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('tables', 'readonly');
        const req = tx.objectStore('tables').getAll();
        req.onsuccess = () => {
            const tables = (req.result || []).map((table) => {
                const fields = normalizeTableFields(table);
                return {
                    ...table,
                    fields,
                    columns: fields.map((f) => f.name),
                    archivedFieldCount: Number(table.archivedFieldCount || 0)
                };
            });
            resolve(tables);
        };
        req.onerror = () => reject(req.error);
    });
};

export const getTableById = async (id) => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('tables', 'readonly');
        const req = tx.objectStore('tables').get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
};

const calculateTableRecord = (table, record) => {
    if (!table || !table.fields) return record;
    const result = { ...record };
    table.fields.forEach(field => {
        if (field.calculation) {
            try {
                let expr = field.calculation;
                table.fields.forEach(f => {
                    if (f.name !== field.name && expr.includes(f.name)) {
                        const val = record[f.name] ?? 0;
                        expr = expr.split(f.name).join(typeof val === 'number' ? val : `'${val}'`);
                    }
                });
                result[field.name] = new Function(`return ${expr}`)();
            } catch (err) {
                console.warn(`Calculation error for ${field.name}:`, err);
            }
        }
    });
    return result;
};

export const addTableRecord = async (tableId, recordData) => {
    const db = await getDB();
    const recordId = String(recordData?.recordId ?? recordData?.id ?? '').trim();
    if (!recordId) {
        throw new Error('Record ID is required and must be a non-empty text value.');
    }

    const id = `rec_${tableId}_${recordId}`;
    const payload = { ...recordData };
    delete payload.id;
    delete payload.recordId;

    const tableRecords = await getTableRecords(tableId);
    const duplicate = tableRecords.some((r) => String(r.recordId || '').toLowerCase() === recordId.toLowerCase());
    if (duplicate) {
        throw new Error(`Record ID "${recordId}" already exists in this table.`);
    }

    const table = await getTableById(tableId);
    const calculated = calculateTableRecord(table, { ...payload, recordId });
    const newRecord = { id, tableId, ...calculated, createdAt: new Date().toISOString() };
    return new Promise((resolve, reject) => {
        const tx = db.transaction('table_records', 'readwrite');
        tx.objectStore('table_records').put(newRecord);
        tx.oncomplete = () => {
            automationEngine.trigger('TABLE_ROW_ADDED', { tableId, record: newRecord });
            resolve(newRecord);
        };
        tx.onerror = () => reject(tx.error);
    });
};

export const updateTableRecord = async (tableId, recordId, updatedData) => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('table_records', 'readwrite');
        const store = tx.objectStore('table_records');
        const directReq = store.get(recordId);

        directReq.onsuccess = async () => {
            const directMatch = directReq.result;
            if (directMatch) {
                const table = await getTableById(tableId);
                const merged = { ...directMatch, ...updatedData };
                const calculated = calculateTableRecord(table, merged);
                const final = { ...calculated, updatedAt: new Date().toISOString() };
                store.put(final);
                automationEngine.trigger('TABLE_ROW_UPDATED', { tableId, recordId: directMatch.recordId || recordId, updatedData: final });
                return;
            }

            const index = store.index('tableId');
            const allReq = index.getAll(tableId);
            allReq.onsuccess = async () => {
                const existing = (allReq.result || []).find((r) => r.recordId === recordId || r.id === `rec_${tableId}_${recordId}`);
                if (!existing) {
                    reject(new Error(`Record ${recordId} not found`));
                    return;
                }
                const table = await getTableById(tableId);
                const merged = { ...existing, ...updatedData };
                const calculated = calculateTableRecord(table, merged);
                const final = { ...calculated, updatedAt: new Date().toISOString() };
                store.put(final);
                automationEngine.trigger('TABLE_ROW_UPDATED', { tableId, recordId: existing.recordId || recordId, updatedData: final });
            };
        };

        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
    });
};

export const deleteTableRecord = async (recordInternalId) => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('table_records', 'readwrite');
        tx.objectStore('table_records').delete(recordInternalId);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
    });
};

export const getTableRecords = async (tableId) => {
    if (tableId === 'SYSTEM:COMPLETIONS') {
        return getAllCompletions();
    }
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('table_records', 'readonly');
        const index = tx.objectStore('table_records').index('tableId');
        const req = index.getAll(tableId);
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });
};

export const queryTableRecords = async (tableId, options = {}) => {
    const rows = await getTableRecords(tableId);
    if (!Array.isArray(rows) || rows.length === 0) return [];

    const {
        filters = [],
        sort = [],
        limit,
        columns = [],
        search = ''
    } = options || {};

    const normalizedFilters = Array.isArray(filters) ? filters : [];
    const normalizedSort = Array.isArray(sort) ? sort : [];
    const normalizedColumns = Array.isArray(columns) ? columns.filter(Boolean) : [];
    const normalizedSearch = String(search || '').trim().toLowerCase();

    const applyFilter = (row, filter) => {
        if (!filter || !filter.field) return true;
        const field = filter.field;
        const op = filter.operator || 'eq';
        const expected = filter.value;
        const actual = row?.[field];

        switch (op) {
            case 'eq': return String(actual ?? '') === String(expected ?? '');
            case 'neq': return String(actual ?? '') !== String(expected ?? '');
            case 'contains': return String(actual ?? '').toLowerCase().includes(String(expected ?? '').toLowerCase());
            case 'gt': return Number(actual) > Number(expected);
            case 'gte': return Number(actual) >= Number(expected);
            case 'lt': return Number(actual) < Number(expected);
            case 'lte': return Number(actual) <= Number(expected);
            case 'in': {
                const list = Array.isArray(expected) ? expected : [];
                return list.map(v => String(v)).includes(String(actual));
            }
            case 'is_empty': return actual === null || actual === undefined || String(actual).trim() === '';
            case 'is_not_empty': return !(actual === null || actual === undefined || String(actual).trim() === '');
            default: return true;
        }
    };

    let result = rows.filter((row) => {
        const passFilters = normalizedFilters.every((f) => applyFilter(row, f));
        if (!passFilters) return false;

        if (!normalizedSearch) return true;
        return Object.values(row || {}).some((val) => String(val ?? '').toLowerCase().includes(normalizedSearch));
    });

    if (normalizedSort.length > 0) {
        result = [...result].sort((a, b) => {
            for (const s of normalizedSort) {
                const field = s?.field;
                if (!field) continue;
                const direction = (s?.direction || 'asc').toLowerCase();
                const av = a?.[field];
                const bv = b?.[field];

                if (av === bv) continue;
                if (av === undefined || av === null) return direction === 'desc' ? 1 : -1;
                if (bv === undefined || bv === null) return direction === 'desc' ? -1 : 1;

                if (typeof av === 'number' && typeof bv === 'number') {
                    return direction === 'desc' ? bv - av : av - bv;
                }
                const cmp = String(av).localeCompare(String(bv));
                return direction === 'desc' ? -cmp : cmp;
            }
            return 0;
        });
    }

    if (Number.isFinite(Number(limit)) && Number(limit) > 0) {
        result = result.slice(0, Number(limit));
    }

    if (normalizedColumns.length > 0) {
        result = result.map((row) => {
            const picked = {};
            normalizedColumns.forEach((col) => {
                picked[col] = row?.[col];
            });
            // keep core identifiers for compatibility
            picked.id = row?.id;
            picked.recordId = row?.recordId;
            picked.tableId = row?.tableId;
            return picked;
        });
    }

    return result;
};

// --- COMPLETIONS API ---
export const logCompletion = async (appId, completionData) => {
    const db = await getDB();
    const id = `comp_${Date.now()}`;
    const logEntry = { id, appId, ...completionData, timestamp: new Date().toISOString() };
    return new Promise((resolve, reject) => {
        const tx = db.transaction('completions', 'readwrite');
        tx.objectStore('completions').put(logEntry);
        tx.oncomplete = () => resolve(logEntry);
        tx.onerror = () => reject(tx.error);
    });
};

export const getCompletions = async (appId) => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('completions', 'readonly');
        const index = tx.objectStore('completions').index('appId');
        const req = index.getAll(appId);
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });
};

export const getAllCompletions = async () => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('completions', 'readonly');
        const req = tx.objectStore('completions').getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });
};

// --- INTEGRATIONS API (PHASE 1) ---
export const saveIntegrationConnector = async (connector) => {
    const db = await getDB();
    const id = connector.id || `conn_${Date.now()}`;
    const row = {
        id,
        name: connector.name || 'Untitled Connector',
        type: connector.type || 'HTTP', // HTTP | SQL | MQTT
        description: connector.description || '',
        allowCustomSubdomain: connector.allowCustomSubdomain || false,
        host: connector.host || 'Cloud Connector Host',
        serverAddress: connector.serverAddress || '',
        tls: connector.tls !== undefined ? connector.tls : true,
        useCustomPort: connector.useCustomPort || false,
        port: connector.port || (connector.tls ? 443 : 80),
        authType: connector.authType || 'No auth',
        authConfig: connector.authConfig || {},
        databaseName: connector.databaseName || '',
        username: connector.username || '',
        password: connector.password || '',
        supabaseUrl: connector.supabaseUrl || '',
        supabaseKey: connector.supabaseKey || '',
        spreadsheetId: connector.spreadsheetId || '',
        sheetName: connector.sheetName || '',
        headers: connector.headers || [],
        tlsSettings: connector.tlsSettings || { ca: '', certs: '', passphrase: '' },
        functions: connector.functions || [],
        environments: connector.environments || {
            dev: { serverAddress: '', port: '' },
            prod: { serverAddress: '', port: '' }
        },
        mqttSettings: connector.mqttSettings || {
            protocol: 'MQTT',
            clientId: '',
            autoGenerateClientId: true,
            keepAlive: 60,
            cleanSession: true,
            qos: 0,
            version: '5.0',
            security: { privateKey: '', cert: '', ca: '', passphrase: '' }
        },
        opcUaSettings: connector.opcUaSettings || {
            securityPolicy: 'None',
            endpointUrl: '',
            authentication: 'Anonymous'
        },
        modbusSettings: connector.modbusSettings || {
            mode: 'TCP',
            ip: '',
            port: 502,
            unitId: 1
        },
        aiSettings: connector.aiSettings || {
            provider: 'OpenAI',
            apiKey: '',
            modelId: 'gpt-4o',
            basePrompt: 'You are a helpful manufacturing assistant. Answers should be safe and concise.'
        },
        updatedAt: new Date().toISOString(),
        createdAt: connector.createdAt || new Date().toISOString()
    };
    return new Promise((resolve, reject) => {
        const tx = db.transaction('integration_connectors', 'readwrite');
        tx.objectStore('integration_connectors').put(row);
        tx.oncomplete = () => resolve(row);
        tx.onerror = () => reject(tx.error);
    });
};

export const getIntegrationConnectors = async () => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('integration_connectors', 'readonly');
        const req = tx.objectStore('integration_connectors').getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });
};

export const getPrimaryAiConnector = async () => {
    const connectors = await getIntegrationConnectors();
    const aiConnectors = (connectors || []).filter((c) => c?.type === 'AI_ASSISTANT');
    if (aiConnectors.length === 0) return null;

    // Prefer explicit global connector name, then latest updated row.
    const namedGlobal = aiConnectors.find((c) => String(c?.name || '').toLowerCase() === 'global ai assistant');
    if (namedGlobal) return namedGlobal;

    return [...aiConnectors].sort((a, b) => {
        const ta = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
        const tb = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
        return tb - ta;
    })[0];
};

export const deleteIntegrationConnector = async (id) => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('integration_connectors', 'readwrite');
        tx.objectStore('integration_connectors').delete(id);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
    });
};

export const logIntegrationEvent = async (entry) => {
    const db = await getDB();
    const row = {
        id: `ilog_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        connectorId: entry.connectorId || null,
        appId: entry.appId || null,
        event: entry.event || 'EXECUTE',
        status: entry.status || 'SUCCESS',
        requestPayload: entry.requestPayload || null,
        responsePayload: entry.responsePayload || null,
        errorMessage: entry.errorMessage || null,
        createdAt: new Date().toISOString()
    };
    return new Promise((resolve, reject) => {
        const tx = db.transaction('integration_logs', 'readwrite');
        tx.objectStore('integration_logs').put(row);
        tx.oncomplete = () => resolve(row);
        tx.onerror = () => reject(tx.error);
    });
};

export const getIntegrationLogs = async (limit = 100) => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('integration_logs', 'readonly');
        const req = tx.objectStore('integration_logs').getAll();
        req.onsuccess = () => {
            const rows = (req.result || [])
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, limit);
            resolve(rows);
        };
        req.onerror = () => reject(req.error);
    });
};

export const testIntegrationConnector = async (connector) => {
    const required = connector?.name && connector?.type;
    if (!required) return { ok: false, message: 'Missing name/type' };

    // Browser-only phase: best effort test via endpoint ping when provided.
    const endpoint = connector?.config?.endpoint || connector?.config?.webhookUrl || connector?.config?.sqlApiUrl;
    if (!endpoint) return { ok: true, message: 'Connector saved (no endpoint ping configured).' };

    try {
        const res = await fetch(endpoint, { method: 'OPTIONS' });
        return { ok: true, message: `Endpoint reachable (${res.status})` };
    } catch (err) {
        return { ok: false, message: `Endpoint unreachable: ${err.message}` };
    }
};

export const executeIntegrationAction = async ({ connector, payload, appId, event = 'EXECUTE' }) => {
    try {
        if (!connector) throw new Error('Connector not found');

        let targetUrl = connector?.config?.endpoint || '';
        if (connector.type === 'GOOGLE_SHEETS') targetUrl = connector?.config?.webhookUrl || targetUrl;
        if (connector.type === 'SQL') targetUrl = connector?.config?.sqlApiUrl || targetUrl;
        if (!targetUrl) throw new Error('Connector endpoint is not configured');

        const headers = { 'Content-Type': 'application/json' };
        if (connector?.credentials?.apiKey) headers['x-api-key'] = connector.credentials.apiKey;
        if (connector?.credentials?.authorization) headers['Authorization'] = connector.credentials.authorization;

        const body = {
            connectorType: connector.type,
            connectorName: connector.name,
            environment: connector.environment,
            payload,
            sentAt: new Date().toISOString()
        };

        const response = await fetch(targetUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        });

        const text = await response.text();
        const responsePayload = { status: response.status, body: text };

        await logIntegrationEvent({
            connectorId: connector.id,
            appId,
            event,
            status: response.ok ? 'SUCCESS' : 'FAILED',
            requestPayload: payload,
            responsePayload,
            errorMessage: response.ok ? null : `HTTP ${response.status}`
        });

        if (!response.ok) throw new Error(`Integration failed: HTTP ${response.status}`);
        return { ok: true, response: responsePayload };
    } catch (error) {
        await logIntegrationEvent({
            connectorId: connector?.id || null,
            appId,
            event,
            status: 'FAILED',
            requestPayload: payload,
            responsePayload: null,
            errorMessage: error.message
        });
        return { ok: false, error: error.message };
    }
};

// --- SHOP FLOOR API ---
const getAll = async (storeName) => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });
};

const saveItem = async (storeName, item) => {
    const db = await getDB();
    const id = item.id || `sf_${storeName.split('_').pop()}_${Date.now()}`;
    const row = { ...item, id, updatedAt: new Date().toISOString(), createdAt: item.createdAt || new Date().toISOString() };
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).put(row);
        tx.oncomplete = () => resolve(row);
        tx.onerror = () => reject(tx.error);
    });
};

const deleteItemById = async (storeName, id) => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).delete(id);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
    });
};

export const getStations = () => getAll('shop_floor_stations');
export const saveStation = (station) => saveItem('shop_floor_stations', station);
export const deleteStation = (id) => deleteItemById('shop_floor_stations', id);

export const getInterfaces = () => getAll('shop_floor_interfaces');
export const saveInterface = (iface) => saveItem('shop_floor_interfaces', iface);
export const deleteInterface = (id) => deleteItemById('shop_floor_interfaces', id);

export const getMachines = () => getAll('shop_floor_machines');
export const saveMachine = async (machine) => {
    const existing = await getMachines();
    const prev = existing.find(m => m.id === machine.id);

    // Auto-log status changes
    if (prev && prev.status !== machine.status) {
        await logMachineActivity(machine.id, machine.status);
    } else if (!prev && machine.status) {
        // Log initial status
        setTimeout(() => logMachineActivity(machine.id, machine.status), 100);
    }

    return saveItem('shop_floor_machines', machine);
};
export const deleteMachine = (id) => deleteItemById('shop_floor_machines', id);

export const logMachineActivity = async (machineId, status) => {
    const db = await getDB();
    const id = `mlog_${machineId}_${Date.now()}`;
    const entry = { id, machineId, status, timestamp: new Date().toISOString() };
    return new Promise((resolve, reject) => {
        const tx = db.transaction('machine_activity_logs', 'readwrite');
        tx.objectStore('machine_activity_logs').put(entry);
        tx.oncomplete = () => resolve(entry);
        tx.onerror = () => reject(tx.error);
    });
};

export const getMachineActivityLogs = async (machineId) => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('machine_activity_logs', 'readonly');
        const index = tx.objectStore('machine_activity_logs').index('machineId');
        const req = index.getAll(machineId);
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });
};

export const getEdgeDevices = () => getAll('shop_floor_edge_devices');
export const saveEdgeDevice = (device) => saveItem('shop_floor_edge_devices', device);
export const deleteEdgeDevice = (id) => deleteItemById('shop_floor_edge_devices', id);
