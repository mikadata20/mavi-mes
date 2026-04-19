import { getSupabaseClient } from './supabaseManualDB.js';

/**
 * supabaseTablesDB.js
 * Supabase-backed storage for the Tulip-style Table Manager.
 * Replaces the IndexedDB-based tables/table_records stores.
 */

const TABLE_FIELD_LIMIT = 200;

export const TABLE_FIELD_TYPES = [
    'text', 'number', 'boolean', 'integer', 'interval',
    'image', 'video', 'file', 'user', 'datetime', 'color',
    'linked_record', 'machine', 'station'
];

export const LINK_TYPES = {
    ONE_TO_ONE: 'one_to_one',
    ONE_TO_MANY: 'one_to_many',
    MANY_TO_ONE: 'many_to_one',
    MANY_TO_MANY: 'many_to_many'
};

// ── Tables API ─────────────────────────────────────────────────────────────

export async function getTables() {
    try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('app_tables')
            .select('*')
            .order('created_at', { ascending: true });
        if (error) throw error;
        return (data || []).map(rowToTable);
    } catch (e) {
        console.warn('[Offline Mode] Could not load tables, returning empty array.', e);
        return [];
    }
}

export async function createTable(tableData) {
    console.log('[supabaseTablesDB] createTable attempt:', tableData);
    const supabase = getSupabaseClient();
    const fields = normalizeFields(tableData.fields || []);

    if (fields.length > TABLE_FIELD_LIMIT) {
        throw new Error(`Table field limit exceeded. Max ${TABLE_FIELD_LIMIT} fields.`);
    }

    const { data, error } = await supabase
        .from('app_tables')
        .insert({
            name: tableData.name || 'Untitled Table',
            description: tableData.description || '',
            fields: fields,
            archived_field_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .select()
        .single();

    if (error) {
        console.error('[supabaseTablesDB] createTable error:', error);
        throw toReadableSupabaseError(error, 'create_table');
    }
    console.log('[supabaseTablesDB] createTable success:', data);
    return rowToTable(data);
}

export async function updateTable(tableId, patch = {}) {
    const supabase = getSupabaseClient();

    // Fetch existing to merge
    const { data: existing, error: fetchErr } = await supabase
        .from('app_tables')
        .select('*')
        .eq('id', tableId)
        .single();

    if (fetchErr) throw fetchErr;
    if (!existing) throw new Error(`Table ${tableId} not found`);

    const fields = patch.fields !== undefined
        ? normalizeFields(patch.fields)
        : normalizeFields(existing.fields || []);

    const archivedCount = patch.archivedFieldCount !== undefined
        ? Number(patch.archivedFieldCount)
        : Number(existing.archived_field_count || 0);

    if (fields.length + archivedCount > TABLE_FIELD_LIMIT) {
        throw new Error(`Table field limit exceeded. Max ${TABLE_FIELD_LIMIT} fields including archived.`);
    }

    const { error } = await supabase
        .from('app_tables')
        .update({
            name: patch.name !== undefined ? patch.name : existing.name,
            description: patch.description !== undefined ? patch.description : existing.description,
            fields,
            queries: patch.queries !== undefined ? patch.queries : (existing.queries || []),
            aggregations: patch.aggregations !== undefined ? patch.aggregations : (existing.aggregations || []),
            archived_field_count: archivedCount,
            updated_at: new Date().toISOString()
        })
        .eq('id', tableId);

    if (error) throw error;

    // Handle reciprocal linked record fields
    if (patch.fields) {
        await syncReciprocalFields(tableId, existing.name, patch.fields, existing.fields || []);
    }

    return true;
}

/**
 * Ensures that for every linked_record field in sourceTable, 
 * there is a matching back-link field in the targetTable.
 */
async function syncReciprocalFields(sourceTableId, sourceTableName, newFields, oldFields) {
    const supabase = getSupabaseClient();

    // Identify new or changed linked_record fields
    const linkedFields = newFields.filter(f => f.type === 'linked_record' && f.link_table_id);

    for (const field of linkedFields) {
        const targetTableId = field.link_table_id;
        const targetFieldName = field.reverse_link_name;
        if (!targetTableId || !targetFieldName) continue;

        // Fetch target table
        const { data: targetTable, error: tErr } = await supabase
            .from('app_tables')
            .select('*')
            .eq('id', targetTableId)
            .single();

        if (tErr || !targetTable) continue;

        const targetFields = Array.isArray(targetTable.fields) ? targetTable.fields : [];
        const exists = targetFields.find(f => f.name === targetFieldName);

        if (!exists) {
            // Determine reverse link type
            let reverseType = field.link_type;
            if (field.link_type === LINK_TYPES.ONE_TO_MANY) reverseType = LINK_TYPES.MANY_TO_ONE;
            else if (field.link_type === LINK_TYPES.MANY_TO_ONE) reverseType = LINK_TYPES.ONE_TO_MANY;

            // Add reciprocal field
            const updatedTargetFields = [...targetFields, {
                name: targetFieldName,
                type: 'linked_record',
                link_table_id: sourceTableId,
                link_type: reverseType,
                reverse_link_name: field.name,
                auto_created: true
            }];
            await supabase
                .from('app_tables')
                .update({ fields: updatedTargetFields, updated_at: new Date().toISOString() })
                .eq('id', targetTableId);
        }
    }
}

export async function deleteTable(tableId) {
    const supabase = getSupabaseClient();

    // Delete all records first
    await supabase.from('app_table_records').delete().eq('table_id', tableId);

    const { error } = await supabase.from('app_tables').delete().eq('id', tableId);
    if (error) throw error;
    return true;
}

export async function getTableById(id) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('app_tables')
        .select('*')
        .eq('id', id)
        .single();
    if (error) throw error;
    return rowToTable(data);
}

// ── Records API ─────────────────────────────────────────────────────────────

export async function getTableRecords(tableId) {
    try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('app_table_records')
            .select('*')
            .eq('table_id', tableId)
            .order('created_at', { ascending: true });
        if (error) throw error;
        return (data || []).map(rowToRecord);
    } catch (e) {
        console.warn(`[Offline Mode] Could not load records for table ${tableId}, returning empty array.`, e);
        return [];
    }
}

export async function queryTableRecords(tableId, options = {}) {
    const rows = await getTableRecords(tableId);
    if (!Array.isArray(rows) || rows.length === 0) return [];

    const {
        filters = [],
        sort = [],
        limit,
        matchType = 'all'
    } = options || {};

    const applyFilter = (row, filter) => {
        if (!filter || !filter.field) return true;
        const field = filter.field;
        const op = filter.operator;
        const expected = filter.value;
        const actual = row?.[field];

        switch (op) {
            case 'equals': return String(actual || '').toLowerCase() === String(expected || '').toLowerCase();
            case 'does_not_equal': return String(actual || '').toLowerCase() !== String(expected || '').toLowerCase();
            case 'contains': return String(actual || '').toLowerCase().includes(String(expected || '').toLowerCase());
            case 'does_not_contain': return !String(actual || '').toLowerCase().includes(String(expected || '').toLowerCase());
            case 'starts_with': return String(actual || '').toLowerCase().startsWith(String(expected || '').toLowerCase());
            case 'ends_with': return String(actual || '').toLowerCase().endsWith(String(expected || '').toLowerCase());
            case 'is_null': return actual == null || actual === '';
            case 'is_not_null': return actual != null && actual !== '';
            case 'greater_than_or_equal': return Number(actual) >= Number(expected);
            case 'less_than_or_equal': return Number(actual) <= Number(expected);
            case 'is_in': return (expected || '').split(',').map(v => v.trim().toLowerCase()).includes(String(actual || '').toLowerCase());
            case 'is_after': return actual && expected && new Date(actual) > new Date(expected);
            case 'is_before': return actual && expected && new Date(actual) < new Date(expected);
            default: return true;
        }
    };

    let result = rows.filter((row) => {
        if (filters.length === 0) return true;
        const results = filters.map(f => applyFilter(row, f));
        return matchType === 'all' ? results.every(r => r) : results.some(r => r);
    });

    if (sort.length > 0) {
        result.sort((a, b) => {
            for (const rule of sort) {
                const field = rule.field;
                const direction = rule.direction || 'asc';

                const aVal = field === 'recordId' ? a.recordId : a[field];
                const bVal = field === 'recordId' ? b.recordId : b[field];

                const aNum = Number(aVal);
                const bNum = Number(bVal);
                const bothNumeric = Number.isFinite(aNum) && Number.isFinite(bNum) && aVal !== '' && bVal !== '';

                let cmp = 0;
                if (bothNumeric) cmp = aNum - bNum;
                else cmp = String(aVal || '').localeCompare(String(bVal || ''));

                if (cmp !== 0) return direction === 'asc' ? cmp : -cmp;
            }
            return 0;
        });
    }

    if (limit && Number.isFinite(Number(limit))) {
        result = result.slice(0, Number(limit));
    }

    return result;
}

export async function addTableRecord(tableId, recordData) {
    const supabase = getSupabaseClient();
    const recordId = String(recordData?.recordId ?? recordData?.id ?? '').trim();
    if (!recordId) throw new Error('Record ID is required and must be a non-empty text value.');

    // Check for duplicate
    const { data: existing } = await supabase
        .from('app_table_records')
        .select('id')
        .eq('table_id', tableId)
        .ilike('record_id', recordId)
        .maybeSingle();

    if (existing) throw new Error(`Record ID "${recordId}" already exists in this table.`);

    const payload = { ...recordData };
    delete payload.id;
    delete payload.recordId;

    const { data, error } = await supabase
        .from('app_table_records')
        .insert({
            table_id: tableId,
            record_id: recordId,
            data: payload,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .select()
        .single();

    if (error) throw error;
    return rowToRecord(data);
}

export async function deleteTableRecord(recordInternalId) {
    const supabase = getSupabaseClient();
    const { error } = await supabase
        .from('app_table_records')
        .delete()
        .eq('id', recordInternalId);
    if (error) throw error;
    return true;
}

export async function updateTableRecord(recordInternalId, updateData) {
    const supabase = getSupabaseClient();

    // Fetch current to merge
    const { data: existing, error: fetchErr } = await supabase
        .from('app_table_records')
        .select('*')
        .eq('id', recordInternalId)
        .single();
    if (fetchErr) throw fetchErr;

    const newData = { ...(existing.data || {}), ...updateData };
    delete newData.id;
    delete newData.recordId;
    delete newData.tableId;

    const { data, error } = await supabase
        .from('app_table_records')
        .update({
            data: newData,
            updated_at: new Date().toISOString()
        })
        .eq('id', recordInternalId)
        .select()
        .single();

    if (error) throw error;
    return rowToRecord(data);
}

/**
 * Bi-directionally link two records together.
 */
export async function linkRecords(sourceTableId, sourceRecordId, sourceFieldName, targetTableId, targetRecordId, targetFieldName) {
    const supabase = getSupabaseClient();

    const updateSide = async (tId, rId, fName, linkedId) => {
        const { data: record, error } = await supabase
            .from('app_table_records')
            .select('*')
            .eq('table_id', tId)
            .ilike('record_id', rId)
            .single();
        if (error || !record) return;

        const currentData = record.data || {};
        const currentLinks = Array.isArray(currentData[fName]) ? currentData[fName] : (currentData[fName] ? [currentData[fName]] : []);

        if (!currentLinks.includes(linkedId)) {
            const nextData = { ...currentData, [fName]: [...currentLinks, linkedId] };
            await supabase
                .from('app_table_records')
                .update({ data: nextData, updated_at: new Date().toISOString() })
                .eq('id', record.id);
        }
    };

    await Promise.all([
        updateSide(sourceTableId, sourceRecordId, sourceFieldName, targetRecordId),
        updateSide(targetTableId, targetRecordId, targetFieldName, sourceRecordId)
    ]);
    return true;
}

/**
 * Bi-directionally unlink two records.
 */
export async function unlinkRecords(sourceTableId, sourceRecordId, sourceFieldName, targetTableId, targetRecordId, targetFieldName) {
    const supabase = getSupabaseClient();

    const updateSide = async (tId, rId, fName, linkedId) => {
        const { data: record, error } = await supabase
            .from('app_table_records')
            .select('*')
            .eq('table_id', tId)
            .ilike('record_id', rId)
            .single();
        if (error || !record) return;

        const currentData = record.data || {};
        const currentLinks = Array.isArray(currentData[fName]) ? currentData[fName] : (currentData[fName] ? [currentData[fName]] : []);

        if (currentLinks.includes(linkedId)) {
            const nextData = { ...currentData, [fName]: currentLinks.filter(id => id !== linkedId) };
            await supabase
                .from('app_table_records')
                .update({ data: nextData, updated_at: new Date().toISOString() })
                .eq('id', record.id);
        }
    };

    await Promise.all([
        updateSide(sourceTableId, sourceRecordId, sourceFieldName, targetRecordId),
        updateSide(targetTableId, targetRecordId, targetFieldName, sourceRecordId)
    ]);
    return true;
}

// ── Internal helpers ────────────────────────────────────────────────────────

function normalizeFields(fields) {
    if (!Array.isArray(fields)) return [];
    const seen = new Set();
    return fields
        .filter(f => f && f.name)
        .map(f => ({
            name: String(f.name).trim(),
            type: TABLE_FIELD_TYPES.includes(f.type) ? f.type : 'text',
            archived: Boolean(f.archived),
            link_table_id: f.type === 'linked_record' ? f.link_table_id : undefined,
            link_type: f.type === 'linked_record' ? f.link_type : undefined,
            reverse_link_name: f.type === 'linked_record' ? f.reverse_link_name : undefined,
            auto_created: Boolean(f.auto_created)
        }))
        .filter(f => {
            if (seen.has(f.name)) return false;
            seen.add(f.name);
            return true;
        });
}

function rowToTable(row) {
    const fields = normalizeFields(Array.isArray(row.fields) ? row.fields : []);
    return {
        id: row.id,
        name: row.name,
        description: row.description || '',
        fields,
        columns: fields.map(f => f.name),
        queries: Array.isArray(row.queries) ? row.queries : [],
        aggregations: Array.isArray(row.aggregations) ? row.aggregations : [],
        archivedFieldCount: Number(row.archived_field_count || 0),
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function rowToRecord(row) {
    const data = row.data || {};
    return {
        id: row.id,
        tableId: row.table_id,
        recordId: row.record_id,
        ...data,
        createdAt: row.created_at
    };
}

function toReadableSupabaseError(error, action = 'unknown') {
    const status = Number(error?.status || error?.statusCode || 0);
    const code = String(error?.code || '');
    const rawMessage = String(error?.message || '').trim();

    let message = rawMessage || 'Supabase request failed.';

    // Common failure for self-hosted Supabase / wrong anon key
    if (status === 401 || code === '401') {
        message = [
            'Unauthorized (401) from Supabase while creating table.',
            'Periksa kembali URL + ANON KEY di Supabase Settings (harus key anon dari project yang sama).',
            'Jika self-hosted/VPS, pastikan JWT secret, anon key, dan service kong/postgrest saling match.',
            'Jika perlu, login ulang lalu refresh browser.'
        ].join(' ');
    }

    // Missing relation/table in Postgres
    if (code === '42P01' || /Could not find the table|relation .* does not exist/i.test(rawMessage)) {
        message = 'Table "app_tables" belum ada di database. Jalankan ulang SQL migration (supabase_setup.sql).';
    }

    // RLS/policy issues
    if (status === 403 || /row-level security|permission denied|insufficient privilege/i.test(rawMessage)) {
        message = [
            'Akses ditolak oleh policy/permission database.',
            'Pastikan role anon/authenticated punya GRANT + RLS policy untuk INSERT/SELECT pada app_tables dan app_table_records.'
        ].join(' ');
    }

    const wrapped = new Error(message);
    wrapped.original = error;
    wrapped.action = action;
    return wrapped;
}
