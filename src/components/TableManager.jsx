import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Table, Plus, Search, Database, ArrowUpDown, Trash2, Archive, Rows3, Columns3, Info, RefreshCw, Upload, X, Lock, Type, ChevronDown, Settings, Edit3 } from 'lucide-react'; import {
    getTables,
    createTable,
    updateTable,
    deleteTable,
    getTableRecords,
    addTableRecord,
    updateTableRecord,
    deleteTableRecord,
    linkRecords,
    unlinkRecords,
    TABLE_FIELD_TYPES
} from '../utils/supabaseTablesDB';
import { uploadManualImage, isSupabaseReady } from '../utils/supabaseManualDB';

const FIELD_TYPE_LABELS = {
    text: 'Text',
    number: 'Number',
    boolean: 'Boolean',
    integer: 'Integer',
    interval: 'Interval (seconds)',
    image: 'Image',
    video: 'Video',
    file: 'File',
    user: 'User',
    datetime: 'Datetime',
    color: 'Color',
    linked_record: 'Linked Record',
    machine: 'Machine',
    station: 'Station'
};

const TOKENS = {
    primary: '#714B67', // Odoo Purple
    secondary: '#017E84', // Odoo Teal
    success: '#00A09D',
    bg: '#F9FAFB',
    surface: '#ffffff',
    text: '#4C4C4C',
    textMuted: '#8F8F8F',
    border: '#D1D5DB',
    borderLight: '#E5E7EB',
    radius: '10px',
    radiusSm: '6px',
    shadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    shadowLg: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
};

const LinkedRecordSelector = ({ field, value, onChange, tables }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [options, setOptions] = useState([]);
    const targetTable = tables?.find(t => t.id === field?.link_table_id);

    const selectedIds = useMemo(() => {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') {
            try { return JSON.parse(value); } catch(e) { return value.split(',').filter(Boolean); }
        }
        return [];
    }, [value]);

    useEffect(() => {
        if (field?.link_table_id) {
            getTableRecords(field.link_table_id).then(setOptions).catch(console.error);
        }
    }, [field?.link_table_id]);

    const filteredOptions = options.filter(opt =>
        String(opt.recordId || opt.record_id || '').toLowerCase().includes(searchTerm.toLowerCase()) &&
        !selectedIds.includes(opt.recordId || opt.record_id)
    );

    const handleSelect = (id) => {
        onChange([...selectedIds, id]);
        setSearchTerm('');
    };

    const handleRemove = (id) => {
        onChange(selectedIds.filter(val => val !== id));
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: TOKENS.text, fontWeight: 700, fontSize: '0.8rem' }}>
                    {field?.name}
                    <Upload size={14} style={{ color: TOKENS.textMuted, transform: 'rotate(90deg)', cursor: 'pointer' }} title="View Table" />
                </div>
                <span style={{ fontSize: '0.7rem', color: TOKENS.textMuted, fontWeight: 500 }}>
                    {field?.link_type?.replace(/_/g, ' ') || 'Many Records'}
                </span>
            </div>
            
            <div style={{ 
                border: `1px solid ${isFocused ? TOKENS.primary : TOKENS.border}`,
                borderRadius: '8px',
                padding: '10px 12px',
                backgroundColor: 'white',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                minHeight: '44px',
                position: 'relative',
                transition: 'border-color 0.2s'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Search size={16} color={TOKENS.textMuted} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                        placeholder="Add a record..."
                        style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.9rem' }}
                    />
                </div>

                {selectedIds.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', borderTop: `1px solid ${TOKENS.borderLight}`, paddingTop: '10px' }}>
                        {selectedIds.map(id => (
                            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 10px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.8rem', fontWeight: 600, color: TOKENS.primary }}>
                                {id}
                                <X 
                                    size={14} 
                                    style={{ cursor: 'pointer', color: TOKENS.textMuted }} 
                                    onClick={() => handleRemove(id)}
                                />
                            </div>
                        ))}
                    </div>
                )}

                {isFocused && filteredOptions.length > 0 && (
                    <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, backgroundColor: 'white', border: `1px solid ${TOKENS.border}`, borderRadius: '8px', boxShadow: TOKENS.shadowLg, zIndex: 100, maxHeight: '200px', overflowY: 'auto' }}>
                        {filteredOptions.map(opt => {
                            const rid = opt.recordId || opt.record_id;
                            return (
                                <div key={opt.id} onClick={() => handleSelect(rid)} style={{ padding: '10px 16px', cursor: 'pointer', fontSize: '0.85rem' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#f8fafc'} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>
                                    <div style={{ fontWeight: 600 }}>{rid}</div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};


const TableManager = () => {
    const [tables, setTables] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTableId, setSelectedTableId] = useState(null);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);
    const [recordsLoading, setRecordsLoading] = useState(false);
    const [recordSearchTerm, setRecordSearchTerm] = useState('');
    const [recordSortField, setRecordSortField] = useState('recordId');
    const [recordSortDirection, setRecordSortDirection] = useState('asc');
    const [selectedRecordInternalId, setSelectedRecordInternalId] = useState(null);
    const [newTableName, setNewTableName] = useState('');
    const [newTableDescription, setNewTableDescription] = useState('');
    const [newFieldName, setNewFieldName] = useState('');
    const [newFieldType, setNewFieldType] = useState('text');
    const [newFieldReverseName, setNewFieldReverseName] = useState('');
    const [newFieldLinkType, setNewFieldLinkType] = useState('one_to_one');
    const [isEditingRecord, setIsEditingRecord] = useState(false);
    const [newRecordId, setNewRecordId] = useState('');
    const [newRecordValues, setNewRecordValues] = useState({});
    const [activePanel, setActivePanel] = useState('fields');
    const [csvImporting, setCsvImporting] = useState(false);
    const [creatingTable, setCreatingTable] = useState(false);
    const [queries, setQueries] = useState([]);
    const [aggregations, setAggregations] = useState([]);
    const [activeQueryId, setActiveQueryId] = useState(null);
    const [targetTableId, setTargetTableId] = useState('');
    const [linkedRecords, setLinkedRecords] = useState([]);
    const [linkedRecordsLoading, setLinkedRecordsLoading] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
    const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
    const [isEditTableModalOpen, setIsEditTableModalOpen] = useState(false);
    const [isRenameFieldModalOpen, setIsRenameFieldModalOpen] = useState(false);
    const [editingField, setEditingField] = useState(null);
    const [editTableName, setEditTableName] = useState('');
    const [editTableDescription, setEditTableDescription] = useState('');
    const [renameFieldNewName, setRenameFieldNewName] = useState('');
    const [activeMenuField, setActiveMenuField] = useState(null); // { name: string, x: number, y: number }
    const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
    const [newType, setNewType] = useState('text');
    const [uploadingFields, setUploadingFields] = useState({}); // { fieldName: boolean }

    // Queries & Aggregations state
    const [isQueryEditorOpen, setIsQueryEditorOpen] = useState(false);
    const [editingQuery, setEditingQuery] = useState(null); // { id, name, matchType, filters: [], sort: [], limit }
    const [isAggregationEditorOpen, setIsAggregationEditorOpen] = useState(false);
    const [editingAggregation, setEditingAggregation] = useState(null); // { id, name, calculation, field }
    const csvInputRef = useRef(null);

    useEffect(() => {
        loadTables();
    }, []);

    useEffect(() => {
        if (!selectedTableId) {
            setRecords([]);
            setSelectedRecordInternalId(null);
            setRecordSearchTerm('');
            return;
        }
        loadRecords(selectedTableId);
    }, [selectedTableId]);

    useEffect(() => {
        if (!records.length) {
            setSelectedRecordInternalId(null);
            return;
        }

        if (!selectedRecordInternalId || !records.some((r) => r.id === selectedRecordInternalId)) {
            setSelectedRecordInternalId(records[0].id);
        }
    }, [records, selectedRecordInternalId]);

    const selectedTable = useMemo(
        () => tables.find((table) => table.id === selectedTableId) || null,
        [tables, selectedTableId]
    );

    const activeFields = useMemo(
        () => (selectedTable?.fields || []).filter((f) => !f.archived),
        [selectedTable]
    );

    const fieldUsage = (selectedTable?.archivedFieldCount || 0) + (selectedTable?.fields?.length || 0);
    const remainingFieldSlots = Math.max(0, 200 - fieldUsage);

    const filteredAndSortedRecords = useMemo(() => {
        let baseRows = records;

        // 1. Apply Search Keyword (Optional, works on top of Query)
        const keyword = recordSearchTerm.trim().toLowerCase();
        if (keyword) {
            baseRows = baseRows.filter((record) => {
                const searchableParts = [
                    record.recordId,
                    ...activeFields.map((field) => record[field.name])
                ];
                return searchableParts.some((part) => String(part ?? '').toLowerCase().includes(keyword));
            });
        }

        // 2. Apply Active Query Filters
        const activeQuery = (selectedTable?.queries || []).find(q => q.id === activeQueryId);
        if (activeQuery && activeQuery.filters && activeQuery.filters.length > 0) {
            const matchAll = activeQuery.matchType === 'all';
            baseRows = baseRows.filter(record => {
                const results = activeQuery.filters.map(filter => {
                    const fieldVal = record[filter.field];
                    const targetVal = filter.value;

                    switch (filter.operator) {
                        case 'equals': return String(fieldVal || '').toLowerCase() === String(targetVal || '').toLowerCase();
                        case 'does_not_equal': return String(fieldVal || '').toLowerCase() !== String(targetVal || '').toLowerCase();
                        case 'contains': return String(fieldVal || '').toLowerCase().includes(String(targetVal || '').toLowerCase());
                        case 'does_not_contain': return !String(fieldVal || '').toLowerCase().includes(String(targetVal || '').toLowerCase());
                        case 'starts_with': return String(fieldVal || '').toLowerCase().startsWith(String(targetVal || '').toLowerCase());
                        case 'ends_with': return String(fieldVal || '').toLowerCase().endsWith(String(targetVal || '').toLowerCase());
                        case 'is_null': return fieldVal == null || fieldVal === '';
                        case 'is_not_null': return fieldVal != null && fieldVal !== '';
                        case 'greater_than_or_equal': return Number(fieldVal) >= Number(targetVal);
                        case 'less_than_or_equal': return Number(fieldVal) <= Number(targetVal);
                        case 'is_in': return (targetVal || '').split(',').map(v => v.trim().toLowerCase()).includes(String(fieldVal || '').toLowerCase());
                        case 'is_after': return fieldVal && targetVal && new Date(fieldVal) > new Date(targetVal);
                        case 'is_before': return fieldVal && targetVal && new Date(fieldVal) < new Date(targetVal);
                        default: return true;
                    }
                });
                return matchAll ? results.every(r => r) : results.some(r => r);
            });
        }

        // 3. Sorting
        const sortRules = activeQuery?.sort?.length > 0 ? activeQuery.sort : [{ field: recordSortField, direction: recordSortDirection }];

        const compare = (a, b, field, direction) => {
            const getVal = (r) => field === 'recordId' ? r.recordId : r[field];
            const aVal = getVal(a);
            const bVal = getVal(b);
            
            const aNum = Number(aVal);
            const bNum = Number(bVal);
            const bothNumeric = Number.isFinite(aNum) && Number.isFinite(bNum) && aVal !== '' && bVal !== '';

            let res = 0;
            if (bothNumeric) res = aNum - bNum;
            else res = String(aVal || '').localeCompare(String(bVal || ''));
            
            return direction === 'asc' ? res : -res;
        };

        let sortedRows = [...baseRows].sort((a, b) => {
            for (const rule of sortRules) {
                const res = compare(a, b, rule.field, rule.direction);
                if (res !== 0) return res;
            }
            return 0;
        });

        // 4. Limit
        if (activeQuery?.limit) {
            sortedRows = sortedRows.slice(0, activeQuery.limit);
        }

        return sortedRows;
    }, [records, recordSearchTerm, activeFields, activeQueryId, selectedTable?.queries, recordSortField, recordSortDirection]);

    const selectedRecord = useMemo(
        () => filteredAndSortedRecords.find((row) => row.id === selectedRecordInternalId)
            || records.find((row) => row.id === selectedRecordInternalId)
            || null,
        [filteredAndSortedRecords, records, selectedRecordInternalId]
    );

    const updateRecordSort = (fieldName) => {
        if (recordSortField === fieldName) {
            setRecordSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
            return;
        }
        setRecordSortField(fieldName);
        setRecordSortDirection('asc');
    };

    const loadTables = async () => {
        setLoading(true);
        setFetchError(null);
        try {
            const data = await getTables();
            setTables(data);
            if (data.length > 0) {
                setSelectedTableId((prev) => (prev && data.some(t => t.id === prev)) ? prev : data[0].id);
            } else {
                setSelectedTableId(null);
            }
        } catch (error) {
            console.error('[TableManager] Failed to load tables:', error);

            // Helpful message for missing tables (PostgREST 404 / code 42P01)
            const isMissingTable =
                error?.message?.includes('404') ||
                error?.code === '42P01' ||
                error?.message?.includes('Could not find the table');

            setFetchError(
                isMissingTable
                    ? 'Table "app_tables" not found. Please run the SQL migration.'
                    : (error.message || 'Failed to connect to Supabase')
            );
        } finally {
            setLoading(false);
        }
    };

    const loadRecords = async (tableId) => {
        if (!tableId) return;
        setRecordsLoading(true);
        try {
            const data = await getTableRecords(tableId);
            setRecords(data);
        } catch (error) {
            console.error('Failed to load records:', error);
        } finally {
            setRecordsLoading(false);
        }
    };

    const handleCreateTable = async () => {
        const name = newTableName.trim();
        console.log('[TableManager] handleCreateTable attempt:', { name, description: newTableDescription });

        if (!name) {
            alert('Table name is required.');
            return;
        }

        setCreatingTable(true);
        try {
            console.log('[TableManager] Calling createTable API...');
            await createTable({
                name,
                description: newTableDescription.trim(),
                fields: []
            });
            console.log('[TableManager] createTable API success');
            setNewTableName('');
            setNewTableDescription('');
            setIsCreateModalOpen(false); // Close modal on success
            await loadTables();
        } catch (error) {
            console.error('[TableManager] handleCreateTable failed:', error);
            alert(error.message || 'Failed to create table');
        } finally {
            setCreatingTable(false);
        }
    };

    const handleDeleteTable = async (tableId) => {
        if (!confirm('Delete this table and all records?')) return;
        try {
            await deleteTable(tableId);
            await loadTables();
            if (selectedTableId === tableId) setSelectedTableId(null);
        } catch (error) {
            alert(error.message || 'Failed to delete table');
        }
    };

    const handleUpdateTableMetadata = async () => {
        if (!selectedTableId) return;
        try {
            setCreatingTable(true);
            await updateTable(selectedTableId, {
                name: editTableName,
                description: editTableDescription
            });
            await loadTables();
            setIsEditTableModalOpen(false);
        } catch (error) {
            alert(error.message || 'Failed to update table');
        } finally {
            setCreatingTable(false);
        }
    };

    const handleRenameField = async (oldName, newName) => {
        if (!selectedTableId || !newName || oldName === newName) {
            setIsRenameFieldModalOpen(false);
            return;
        }

        try {
            setLoading(true);
            const { fields } = selectedTable;
            const updatedFields = fields.map(f => {
                if (f.name === oldName) return { ...f, name: newName.trim() };
                return f;
            });

            await updateTable(selectedTableId, { fields: updatedFields });
            await loadTables();
            setIsRenameFieldModalOpen(false);
        } catch (error) {
            alert(error.message || 'Failed to rename field');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteField = async (fieldName) => {
        if (!confirm(`Permanently delete field "${fieldName}"? This will hide data for this field in all records.`)) return;
        try {
            setLoading(true);
            const { fields } = selectedTable;
            const updatedFields = fields.filter(f => f.name !== fieldName);
            await updateTable(selectedTableId, { fields: updatedFields });
            await loadTables();
        } catch (error) {
            alert(error.message || 'Failed to delete field');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateFieldType = async (fieldName, type) => {
        if (!selectedTableId || !type) return;
        try {
            setLoading(true);
            const { fields } = selectedTable;
            const updatedFields = fields.map(f => {
                if (f.name === fieldName) return { ...f, type };
                return f;
            });
            await updateTable(selectedTableId, { fields: updatedFields });
            await loadTables();
            setIsTypeModalOpen(false);
        } catch (error) {
            alert(error.message || 'Failed to update field type');
        } finally {
            setLoading(false);
        }
    };

    const handleAddField = async () => {
        if (!selectedTable) return;
        const fieldName = newFieldName.trim();
        if (!fieldName) return;
        if (remainingFieldSlots <= 0) {
            alert('Field limit reached (200 including archived fields).');
            return;
        }

        if (fieldName.toLowerCase() === 'id') {
            alert('The name "ID" is reserved for the system primary key.');
            return;
        }

        const exists = (selectedTable.fields || []).some((f) => f.name.toLowerCase() === fieldName.toLowerCase());
        if (exists) {
            alert('Field name already exists in this table.');
            return;
        }

        try {
            const nextFields = [...(selectedTable.fields || []), {
                name: fieldName,
                type: newFieldType,
                archived: false,
                link_table_id: newFieldType === 'linked_record' ? targetTableId : undefined,
                link_type: newFieldType === 'linked_record' ? newFieldLinkType : undefined,
                reverse_link_name: newFieldType === 'linked_record' ? newFieldReverseName : undefined
            }];
            await updateTable(selectedTable.id, {
                fields: nextFields,
                archivedFieldCount: selectedTable.archivedFieldCount || 0
            });
            setNewFieldName('');
            setNewFieldType('text');
            setTargetTableId('');
            setNewFieldReverseName('');
            setNewFieldLinkType('one_to_one');
            await loadTables();
        } catch (error) {
            alert(error.message || 'Failed to add field');
        }
    };

    const handleArchiveField = async (fieldName) => {
        if (!selectedTable) return;
        if (!confirm(`Archive field "${fieldName}"?`)) return;
        try {
            const nextFields = (selectedTable.fields || []).filter((f) => f.name !== fieldName);
            await updateTable(selectedTable.id, {
                fields: nextFields,
                archivedFieldCount: (selectedTable.archivedFieldCount || 0) + 1
            });
            await loadTables();
        } catch (error) {
            alert(error.message || 'Failed to archive field');
        }
    };

    const castValueByType = (type, value) => {
        if (value === '') return '';
        switch (type) {
            case 'number':
            case 'integer':
            case 'interval':
                return Number.isNaN(Number(value)) ? '' : Number(value);
            case 'boolean': {
                if (typeof value === 'boolean') return value;
                const normalized = String(value).trim().toLowerCase();
                if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
                if (['false', '0', 'no', 'n'].includes(normalized)) return false;
                return false;
            }
            default:
                return value;
        }
    };

    const parseCsvText = (text) => {
        const rows = [];
        let currentCell = '';
        let currentRow = [];
        let insideQuotes = false;

        for (let i = 0; i < text.length; i += 1) {
            const char = text[i];
            const next = text[i + 1];

            if (char === '"') {
                if (insideQuotes && next === '"') {
                    currentCell += '"';
                    i += 1;
                } else {
                    insideQuotes = !insideQuotes;
                }
            } else if (char === ',' && !insideQuotes) {
                currentRow.push(currentCell);
                currentCell = '';
            } else if ((char === '\n' || char === '\r') && !insideQuotes) {
                if (char === '\r' && next === '\n') i += 1;
                currentRow.push(currentCell);
                rows.push(currentRow);
                currentCell = '';
                currentRow = [];
            } else {
                currentCell += char;
            }
        }

        currentRow.push(currentCell);
        rows.push(currentRow);

        return rows.map((row) => row.map((cell) => String(cell ?? '').trim()));
    };

    const handleImportButtonClick = () => {
        if (!selectedTable) return;
        csvInputRef.current?.click();
    };

    const handleCsvFileImport = async (event) => {
        const file = event.target.files?.[0];
        if (!selectedTable || !file) return;

        try {
            setCsvImporting(true);
            const csvText = await file.text();
            const rawRows = parseCsvText(csvText).filter((row) => row.some((cell) => cell !== ''));

            if (rawRows.length < 2) {
                alert('CSV must contain a header row and at least one data row.');
                return;
            }

            const headers = rawRows[0].map((header) => header.toLowerCase());
            const recordIdIndex = headers.findIndex((header) => ['recordid', 'record id', 'id'].includes(header));

            if (recordIdIndex === -1) {
                alert('CSV header must include one of: recordId, Record ID, or id.');
                return;
            }

            const fieldColumnIndex = (activeFields || []).reduce((acc, field) => {
                acc[field.name] = headers.findIndex((header) => header === field.name.toLowerCase());
                return acc;
            }, {});

            let importedCount = 0;
            const errors = [];

            for (let rowIndex = 1; rowIndex < rawRows.length; rowIndex += 1) {
                const row = rawRows[rowIndex];
                if (!row || row.every((cell) => String(cell ?? '').trim() === '')) continue;

                const recordId = String(row[recordIdIndex] ?? '').trim();
                if (!recordId) {
                    errors.push(`Row ${rowIndex + 1}: missing Record ID`);
                    continue;
                }

                const payload = (activeFields || []).reduce((acc, field) => {
                    const index = fieldColumnIndex[field.name];
                    if (index < 0) return acc;
                    const rawValue = String(row[index] ?? '').trim();
                    acc[field.name] = castValueByType(field.type, rawValue);
                    return acc;
                }, {});

                try {
                    await addTableRecord(selectedTable.id, {
                        recordId,
                        ...payload
                    });
                    importedCount += 1;
                } catch (error) {
                    errors.push(`Row ${rowIndex + 1}: ${error.message || 'Failed to import row'}`);
                }
            }

            await loadRecords(selectedTable.id);
            await loadTables();

            const errorPreview = errors.slice(0, 5).join('\n');
            const moreErrorText = errors.length > 5 ? `\n...and ${errors.length - 5} more error(s)` : '';
            alert(`CSV import complete.\nImported: ${importedCount}\nFailed: ${errors.length}${errors.length ? `\n\nErrors:\n${errorPreview}${moreErrorText}` : ''}`);
        } catch (error) {
            alert(error.message || 'Failed to import CSV');
        } finally {
            setCsvImporting(false);
            event.target.value = '';
        }
    };

    const handleAddRecord = async () => {
        if (!selectedTable) return;
        const recordId = newRecordId.trim();
        if (!recordId) {
            alert('Record ID is required.');
            return;
        }

        try {
            const payload = activeFields.reduce((acc, field) => {
                const rawValue = newRecordValues[field.name] ?? (field.type === 'linked_record' ? [] : '');
                acc[field.name] = castValueByType(field.type, rawValue);
                return acc;
            }, {});

            if (isEditingRecord) {
                // Update existing record
                const oldValues = selectedRecord;
                await updateTableRecord(selectedRecord.id, payload);

                // Sync links (Diff links)
                for (const field of activeFields) {
                    if (field.type === 'linked_record') {
                        const oldLinks = Array.isArray(oldValues[field.name]) ? oldValues[field.name] : (oldValues[field.name] ? [oldValues[field.name]] : []);
                        const newLinks = Array.isArray(payload[field.name]) ? payload[field.name] : (payload[field.name] ? [payload[field.name]] : []);
                        
                        const added = newLinks.filter(id => !oldLinks.includes(id));
                        const removed = oldLinks.filter(id => !newLinks.includes(id));

                        const targetTable = tables.find(t => t.id === field.link_table_id);
                        if (targetTable && field.reverse_link_name) {
                            for (const tid of added) {
                                await linkRecords(selectedTable.id, recordId, field.name, field.link_table_id, tid, field.reverse_link_name);
                            }
                            for (const tid of removed) {
                                await unlinkRecords(selectedTable.id, recordId, field.name, field.link_table_id, tid, field.reverse_link_name);
                            }
                        }
                    }
                }
            } else {
                // Add new record
                await addTableRecord(selectedTable.id, {
                    recordId,
                    ...payload
                });

                // Perform bi-directional link synchronization for new record
                for (const field of activeFields) {
                    if (field.type === 'linked_record' && payload[field.name]) {
                        const linkedIds = Array.isArray(payload[field.name]) ? payload[field.name] : [payload[field.name]];
                        const targetTable = tables.find(t => t.id === field.link_table_id);
                        if (targetTable && field.reverse_link_name) {
                            for (const targetId of linkedIds) {
                                await linkRecords(
                                    selectedTable.id, recordId, field.name,
                                    field.link_table_id, targetId, field.reverse_link_name
                                );
                            }
                        }
                    }
                }
            }

            setNewRecordId('');
            setNewRecordValues({});
            setIsRecordModalOpen(false);
            setIsEditingRecord(false);
            await loadRecords(selectedTable.id);
            await loadTables();
        } catch (error) {
            alert(error.message || 'Failed to save record');
        }
    };
    
    const handleFileUpload = async (fieldName, file) => {
        if (!file) return;
        if (!isSupabaseReady()) {
            alert('Supabase is not configured. Please check your settings.');
            return;
        }

        setUploadingFields(prev => ({ ...prev, [fieldName]: true }));
        try {
            const tableId = selectedTable?.id || 'unknown';
            const timestamp = Date.now();
            const extension = file.name.split('.').pop();
            const storagePath = `tables/${tableId}/${fieldName}_${timestamp}.${extension}`;
            
            const publicUrl = await uploadManualImage(storagePath, file);
            
            setNewRecordValues(prev => ({ ...prev, [fieldName]: publicUrl }));
        } catch (error) {
            console.error('File upload failed:', error);
            alert(`Upload failed: ${error.message}`);
        } finally {
            setUploadingFields(prev => ({ ...prev, [fieldName]: false }));
        }
    };

    const handleDeleteRecord = async (recordInternalId) => {
        if (!confirm('Delete this record?')) return;
        try {
            await deleteTableRecord(recordInternalId);
            await loadRecords(selectedTable.id);
            await loadTables();
        } catch (error) {
            alert(error.message || 'Failed to delete record');
        }
    };

    const filteredTables = tables.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div style={{
            display: 'flex',
            height: '100vh',
            backgroundColor: TOKENS.bg,
            color: TOKENS.text,
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
            overflow: 'hidden'
        }}>
            {/* Sidebar: Navigation & Table List */}
            <div style={{
                width: '300px',
                backgroundColor: TOKENS.surface,
                borderRight: `1px solid ${TOKENS.border}`,
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0,
                boxShadow: '4px 0 6px -1px rgba(0,0,0,0.05)'
            }}>
                {/* Sidebar Header - Odoo Purple Style */}
                <div style={{ 
                    padding: '20px 24px', 
                    backgroundColor: TOKENS.primary, 
                    color: 'white',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            backgroundColor: 'rgba(255,255,255,0.15)',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white'
                        }}>
                            <Table size={20} />
                        </div>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Tables</h2>
                    </div>

                    <div style={{ position: 'relative' }}>
                        <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.7 }} />
                        <input
                            type="text"
                            placeholder="Find a table..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px 12px 8px 36px',
                                borderRadius: TOKENS.radiusSm,
                                border: 'none',
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                color: 'white',
                                outline: 'none',
                                fontSize: '0.85rem'
                            }}
                        />
                    </div>
                </div>

                <div style={{ padding: '16px 20px', borderBottom: `1px solid ${TOKENS.borderLight}` }}>
                    <button
                        onClick={() => {
                            setNewTableName('');
                            setNewTableDescription('');
                            setIsCreateModalOpen(true);
                        }}
                        style={{
                            width: '100%',
                            padding: '10px',
                            backgroundColor: 'white',
                            color: TOKENS.secondary,
                            border: `1px solid ${TOKENS.secondary}`,
                            borderRadius: TOKENS.radiusSm,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            fontSize: '0.85rem',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => { 
                            e.currentTarget.style.backgroundColor = TOKENS.secondary; 
                            e.currentTarget.style.color = 'white';
                        }}
                        onMouseLeave={(e) => { 
                            e.currentTarget.style.backgroundColor = 'white'; 
                            e.currentTarget.style.color = TOKENS.secondary;
                        }}
                    >
                        <Plus size={16} /> New Table
                    </button>
                </div>

                {/* Sidebar Table List */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                    {loading ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: TOKENS.textMuted, fontSize: '0.85rem' }}>
                            <RefreshCw size={20} className="animate-spin" style={{ color: TOKENS.primary, marginBottom: '8px' }} />
                            <div>Loading...</div>
                        </div>
                    ) : filteredTables.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: TOKENS.textMuted, fontSize: '0.85rem' }}>
                            No tables found
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {filteredTables.map((table) => (
                                <div
                                    key={table.id}
                                    onClick={() => setSelectedTableId(table.id)}
                                    style={{
                                        padding: '12px 16px',
                                        borderRadius: '0',
                                        backgroundColor: selectedTableId === table.id ? 'rgba(113, 75, 103, 0.08)' : 'transparent',
                                        borderLeft: `4px solid ${selectedTableId === table.id ? TOKENS.primary : 'transparent'}`,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        transition: 'all 0.2s',
                                        color: selectedTableId === table.id ? TOKENS.primary : TOKENS.text,
                                        fontWeight: selectedTableId === table.id ? 600 : 400
                                    }}
                                    onMouseEnter={(e) => { if (selectedTableId !== table.id) e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)'; }}
                                    onMouseLeave={(e) => { if (selectedTableId !== table.id) e.currentTarget.style.backgroundColor = 'transparent'; }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                                        <Database size={16} color={selectedTableId === table.id ? TOKENS.primary : TOKENS.textMuted} />
                                        <span style={{
                                            fontWeight: selectedTableId === table.id ? 700 : 500,
                                            color: selectedTableId === table.id ? TOKENS.primary : TOKENS.text,
                                            fontSize: '0.9rem',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>
                                            {table.name}
                                        </span>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteTable(table.id);
                                        }}
                                        className="delete-table-btn"
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: TOKENS.textMuted,
                                            cursor: 'pointer',
                                            padding: '4px',
                                            borderRadius: '4px',
                                            opacity: 0,
                                            transition: 'opacity 0.2s'
                                        }}
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                    <style>{`
                                        div:hover > .delete-table-btn { opacity: 1 !important; }
                                    `}</style>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Sidebar Footer */}
                <div style={{ padding: '16px', borderTop: `1px solid ${TOKENS.borderLight}`, fontSize: '0.75rem', color: TOKENS.textMuted, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
                    Connected to Supabase
                </div>
            </div>

            {/* Main Content Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Main Header / Breadcrumbs */}
                <div style={{
                    padding: '16px 32px',
                    backgroundColor: 'white',
                    borderBottom: `1px solid ${TOKENS.borderLight}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    height: '72px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem' }}>
                        <span style={{ color: TOKENS.textMuted }}>Tables</span>
                        <span style={{ color: TOKENS.border }}>/</span>
                        <span style={{ color: TOKENS.text, fontWeight: 700, fontSize: '1.1rem' }}>{selectedTable?.name || '...'}</span>
                        {selectedTable && (
                            <button
                                onClick={() => {
                                    setEditTableName(selectedTable.name);
                                    setEditTableDescription(selectedTable.description || '');
                                    setIsEditTableModalOpen(true);
                                }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: '4px',
                                    cursor: 'pointer',
                                    color: TOKENS.textMuted,
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                            >
                                <Settings size={14} />
                            </button>
                        )}
                    </div>

                    <div style={{
                        display: 'flex',
                        backgroundColor: TOKENS.bg,
                        padding: '4px',
                        borderRadius: TOKENS.radiusSm,
                        border: `1px solid ${TOKENS.borderLight}`
                    }}>
                        <button
                            onClick={() => setActivePanel('records')}
                            style={{
                                padding: '6px 16px',
                                borderRadius: '4px',
                                border: 'none',
                                backgroundColor: activePanel === 'records' ? 'white' : 'transparent',
                                color: activePanel === 'records' ? TOKENS.primary : TOKENS.textMuted,
                                fontWeight: 600,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                boxShadow: activePanel === 'records' ? TOKENS.shadow : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            <Rows3 size={14} /> Records
                        </button>
                        <button
                            onClick={() => setActivePanel('fields')}
                            style={{
                                padding: '6px 16px',
                                borderRadius: '4px',
                                border: 'none',
                                backgroundColor: activePanel === 'fields' ? 'white' : 'transparent',
                                color: activePanel === 'fields' ? TOKENS.primary : TOKENS.textMuted,
                                fontWeight: 600,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                boxShadow: activePanel === 'fields' ? TOKENS.shadow : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            <Columns3 size={14} /> Fields
                        </button>
                        <button
                            onClick={() => setActivePanel('queries')}
                            style={{
                                padding: '6px 16px',
                                borderRadius: '4px',
                                border: 'none',
                                backgroundColor: activePanel === 'queries' ? 'white' : 'transparent',
                                color: activePanel === 'queries' ? TOKENS.primary : TOKENS.textMuted,
                                fontWeight: 600,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                boxShadow: activePanel === 'queries' ? TOKENS.shadow : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            <Search size={14} /> Queries
                        </button>
                        <button
                            onClick={() => setActivePanel('aggregations')}
                            style={{
                                padding: '6px 16px',
                                borderRadius: '4px',
                                border: 'none',
                                backgroundColor: activePanel === 'aggregations' ? 'white' : 'transparent',
                                color: activePanel === 'aggregations' ? TOKENS.primary : TOKENS.textMuted,
                                fontWeight: 600,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                boxShadow: activePanel === 'aggregations' ? TOKENS.shadow : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            <ArrowUpDown size={14} /> Aggregations
                        </button>
                    </div>
                </div>

                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {!selectedTable ? (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: TOKENS.textMuted, padding: '40px' }}>
                            <div style={{
                                width: '80px',
                                height: '80px',
                                borderRadius: '20px',
                                backgroundColor: TOKENS.bg,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '24px',
                                color: TOKENS.primary,
                                opacity: 0.5
                            }}>
                                <Database size={40} />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: TOKENS.text, margin: '0 0 12px 0' }}>No Table Selected</h3>
                            <p style={{ fontSize: '0.9rem', margin: 0, maxWidth: '300px', textAlign: 'center', lineHeight: '1.5' }}>
                                Select a table from the sidebar to view its records and manage fields.
                            </p>
                        </div>
                    ) : (
                        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '24px 32px' }}>
                            {activePanel === 'records' ? (
                                <>
                                    {/* Toolbar */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        marginBottom: '24px',
                                        gap: '16px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ position: 'relative' }}>
                                                <select
                                                    value={activeQueryId || ''}
                                                    onChange={(e) => setActiveQueryId(e.target.value || null)}
                                                    style={{
                                                        padding: '8px 32px 8px 12px',
                                                        borderRadius: TOKENS.radiusSm,
                                                        border: `1px solid ${TOKENS.border}`,
                                                        fontSize: '0.85rem',
                                                        backgroundColor: 'white',
                                                        appearance: 'none',
                                                        cursor: 'pointer',
                                                        minWidth: '160px'
                                                    }}
                                                >
                                                    <option value="">No Query Applied</option>
                                                    {(selectedTable?.queries || []).map(q => (
                                                        <option key={q.id} value={q.id}>{q.name}</option>
                                                    ))}
                                                </select>
                                                <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: TOKENS.textMuted }}>
                                                    <ChevronDown size={14} />
                                                </div>
                                            </div>

                                            <button
                                                onClick={handleImportButtonClick}
                                                disabled={csvImporting}
                                                style={{
                                                    padding: '8px 16px',
                                                    backgroundColor: 'white',
                                                    border: `1px solid ${TOKENS.border}`,
                                                    borderRadius: TOKENS.radiusSm,
                                                    fontSize: '0.85rem',
                                                    fontWeight: 600,
                                                    color: TOKENS.text,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = TOKENS.bg}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                            >
                                                <Upload size={14} /> Import
                                            </button>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ position: 'relative', width: '240px' }}>
                                                <input
                                                    type="text"
                                                    value={recordSearchTerm}
                                                    onChange={(e) => setRecordSearchTerm(e.target.value)}
                                                    placeholder="Search records..."
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px 12px 8px 36px',
                                                        borderRadius: TOKENS.radiusSm,
                                                        border: `1px solid ${TOKENS.border}`,
                                                        fontSize: '0.85rem',
                                                        outline: 'none',
                                                        transition: 'border-color 0.2s'
                                                    }}
                                                    onFocus={(e) => e.target.style.borderColor = TOKENS.primary}
                                                    onBlur={(e) => e.target.style.borderColor = TOKENS.border}
                                                />
                                                <Search size={16} color={TOKENS.textMuted} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setNewRecordId('');
                                                    setNewRecordValues({});
                                                    setIsEditingRecord(false);
                                                    setIsRecordModalOpen(true);
                                                }}
                                                style={{
                                                    padding: '8px 20px',
                                                    backgroundColor: TOKENS.secondary,
                                                    border: 'none',
                                                    borderRadius: TOKENS.radiusSm,
                                                    fontSize: '0.85rem',
                                                    fontWeight: 800,
                                                    color: 'white',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    boxShadow: TOKENS.shadow,
                                                    transition: 'filter 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                                                onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}
                                            >
                                                <Plus size={16} /> New Record
                                            </button>
                                        </div>
                                    </div>

                                    {/* Table View */}
                                    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', gap: '1px', backgroundColor: TOKENS.borderLight, borderRadius: TOKENS.radius, border: `1px solid ${TOKENS.borderLight}`, boxShadow: TOKENS.shadow }}>
                                        <div style={{ flex: 1, overflow: 'auto', backgroundColor: 'white' }}>
                                            {filteredAndSortedRecords.length === 0 ? (
                                                <div style={{ padding: '80px', textAlign: 'center', color: TOKENS.textMuted }}>
                                                    <Database size={40} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                                                    <div style={{ fontWeight: 600 }}>No records found</div>
                                                    <p style={{ fontSize: '0.8rem', margin: '4px 0 0' }}>Try adjusting your filters or search.</p>
                                                </div>
                                            ) : (
                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                                    <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: TOKENS.bg }}>
                                                        <tr>
                                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 800, color: TOKENS.primary, borderBottom: `2px solid ${TOKENS.borderLight}`, width: '50px' }}>#</th>
                                                            <th
                                                                onClick={() => {
                                                                    setRecordSortDirection(recordSortField === 'recordId' && recordSortDirection === 'asc' ? 'desc' : 'asc');
                                                                    setRecordSortField('recordId');
                                                                }}
                                                                style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 800, color: TOKENS.primary, borderBottom: `2px solid ${TOKENS.borderLight}`, cursor: 'pointer' }}
                                                            >
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    ID {recordSortField === 'recordId' && <ArrowUpDown size={14} />}
                                                                </div>
                                                            </th>
                                                            {activeFields.map(field => (
                                                                <th
                                                                    key={field.name}
                                                                    onClick={() => {
                                                                        setRecordSortDirection(recordSortField === field.name && recordSortDirection === 'asc' ? 'desc' : 'asc');
                                                                        setRecordSortField(field.name);
                                                                    }}
                                                                    style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 800, color: TOKENS.primary, borderBottom: `2px solid ${TOKENS.borderLight}`, cursor: 'pointer', minWidth: '150px' }}
                                                                >
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                        {field.name} {recordSortField === field.name && <ArrowUpDown size={14} />}
                                                                    </div>
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {filteredAndSortedRecords.map((record, idx) => (
                                                            <tr
                                                                key={record.id}
                                                                onClick={() => setSelectedRecordInternalId(record.id)}
                                                                style={{
                                                                    backgroundColor: selectedRecordInternalId === record.id ? 'rgba(113, 75, 103, 0.04)' : 'transparent',
                                                                    cursor: 'pointer',
                                                                    transition: 'background 0.15s'
                                                                }}
                                                                onMouseEnter={(e) => { if (selectedRecordInternalId !== record.id) e.currentTarget.style.backgroundColor = '#fcfcfc'; }}
                                                                onMouseLeave={(e) => { if (selectedRecordInternalId !== record.id) e.currentTarget.style.backgroundColor = 'transparent'; }}
                                                            >
                                                                <td style={{ padding: '12px 16px', borderBottom: `1px solid ${TOKENS.borderLight}`, color: TOKENS.textMuted }}>{idx + 1}</td>
                                                                <td style={{ padding: '12px 16px', borderBottom: `1px solid ${TOKENS.borderLight}`, fontWeight: 700, color: TOKENS.text }}>{record.recordId}</td>
                                                                {activeFields.map(field => (
                                                                    <td key={field.name} style={{ padding: '12px 16px', borderBottom: `1px solid ${TOKENS.borderLight}`, color: TOKENS.text }}>
                                                                        {field.type === 'linked_record' ? (
                                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                                                {(() => {
                                                                                    const val = record[field.name];
                                                                                    const ids = Array.isArray(val) ? val : (val ? [val] : []);
                                                                                    if (ids.length === 0) return <span style={{ color: TOKENS.textMuted }}>-</span>;
                                                                                    return ids.map(id => (
                                                                                        <div key={id} style={{ padding: '2px 8px', backgroundColor: '#f1f5f9', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, color: TOKENS.primary, border: '1px solid #e2e8f0' }}>
                                                                                            {id}
                                                                                        </div>
                                                                                    ));
                                                                                })()}
                                                                            </div>
                                                                        ) : field.type === 'image' ? (
                                                                            record[field.name] ? <img src={record[field.name]} alt="" style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover' }} /> : '-'
                                                                        ) : String(record[field.name] ?? '-')}
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>

                                        {/* Record Detail Side Panel */}
                                        <div style={{ width: '350px', backgroundColor: TOKENS.bg, borderLeft: `1px solid ${TOKENS.borderLight}`, overflow: 'auto', padding: '24px' }}>
                                            {selectedRecord ? (
                                                <div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: TOKENS.primary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Details</div>
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <button
                                                                onClick={() => {
                                                                    setNewRecordId(selectedRecord.recordId);
                                                                    setNewRecordValues(selectedRecord);
                                                                    setIsEditingRecord(true);
                                                                    setIsRecordModalOpen(true);
                                                                }}
                                                                style={{ border: 'none', background: 'none', color: TOKENS.primary, cursor: 'pointer', padding: '4px' }}
                                                            >
                                                                <Edit3 size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteRecord(selectedRecord.id)}
                                                                className="delete-rec-btn"
                                                                style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', padding: '4px' }}
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                                        <div style={{ padding: '16px', backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: `1px solid ${TOKENS.borderLight}` }}>
                                                            <label style={{ display: 'block', fontSize: '0.7rem', color: TOKENS.textMuted, fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>Record ID</label>
                                                            <div style={{ fontWeight: 800, color: TOKENS.text, fontSize: '1.2rem' }}>{selectedRecord.recordId}</div>
                                                        </div>

                                                        {activeFields.map(field => (
                                                            <div key={field.name} style={{ padding: '16px', backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: `1px solid ${TOKENS.borderLight}` }}>
                                                                <label style={{ display: 'block', fontSize: '0.7rem', color: TOKENS.textMuted, fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>{field.name}</label>
                                                                {field.type === 'linked_record' ? (
                                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                                        {(() => {
                                                                            const val = selectedRecord[field.name];
                                                                            const ids = Array.isArray(val) ? val : (val ? [val] : []);
                                                                            if (ids.length === 0) return <span style={{ color: TOKENS.textMuted }}>-</span>;
                                                                            return ids.map(id => (
                                                                                <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', backgroundColor: '#f1f5f9', borderRadius: '6px', color: TOKENS.primary, fontWeight: 600, border: '1px solid #e2e8f0', fontSize: '0.8rem' }}>
                                                                                    <Database size={12} /> {id}
                                                                                </div>
                                                                            ));
                                                                        })()}
                                                                    </div>
                                                                ) : field.type === 'image' ? (
                                                                    selectedRecord[field.name] ? <img src={selectedRecord[field.name]} alt="" style={{ width: '100%', borderRadius: '8px', marginTop: '4px' }} /> : '-'
                                                                ) : (
                                                                    <div style={{ color: TOKENS.text, lineHeight: '1.5' }}>{selectedRecord[field.name] || '-'}</div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: TOKENS.textMuted, textAlign: 'center' }}>
                                                    <Info size={32} style={{ opacity: 0.2, marginBottom: '12px' }} />
                                                    <div style={{ fontSize: '0.85rem' }}>Select a record to view details</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : activePanel === 'fields' ? (
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: TOKENS.text }}>Store Schema</h2>
                                            <p style={{ fontSize: '0.85rem', color: TOKENS.textMuted, margin: '4px 0 0' }}>Configure columns and data types for this table.</p>
                                        </div>
                                        <button
                                            onClick={() => setIsFieldModalOpen(true)}
                                            style={{
                                                padding: '10px 24px',
                                                backgroundColor: TOKENS.secondary,
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontWeight: 800,
                                                fontSize: '0.85rem',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                boxShadow: TOKENS.shadow
                                            }}
                                        >
                                            <Plus size={18} /> Add Column
                                        </button>
                                    </div>

                                    <div style={{ backgroundColor: 'white', borderRadius: TOKENS.radius, border: `1px solid ${TOKENS.borderLight}`, boxShadow: TOKENS.shadow, overflow: 'hidden' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                            <thead>
                                                <tr style={{ backgroundColor: TOKENS.bg }}>
                                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 800, color: TOKENS.primary, borderBottom: `1px solid ${TOKENS.borderLight}` }}>Name</th>
                                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 800, color: TOKENS.primary, borderBottom: `1px solid ${TOKENS.borderLight}` }}>Type</th>
                                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 800, color: TOKENS.primary, borderBottom: `1px solid ${TOKENS.borderLight}` }}>Configuration</th>
                                                    <th style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 800, color: TOKENS.primary, borderBottom: `1px solid ${TOKENS.borderLight}` }}>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr style={{ borderBottom: `1px solid ${TOKENS.borderLight}` }}>
                                                    <td style={{ padding: '16px 20px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: TOKENS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <Lock size={14} color={TOKENS.textMuted} />
                                                            </div>
                                                            <span style={{ fontWeight: 700 }}>ID</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '16px 20px' }}>
                                                        <span style={{ padding: '4px 8px', backgroundColor: TOKENS.bg, borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, color: TOKENS.textMuted }}>System ID</span>
                                                    </td>
                                                    <td style={{ padding: '16px 20px', color: TOKENS.textMuted, fontSize: '0.8rem' }}>Default Primary Key</td>
                                                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                                        <button disabled style={{ background: 'none', border: 'none', opacity: 0.2 }}><Settings size={16} /></button>
                                                    </td>
                                                </tr>
                                                {activeFields.map(field => (
                                                    <tr key={field.name} style={{ borderBottom: `1px solid ${TOKENS.borderLight}`, transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fcfcfc'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                                        <td style={{ padding: '16px 20px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: 'rgba(113, 75, 103, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    <Type size={14} color={TOKENS.primary} />
                                                                </div>
                                                                <span style={{ fontWeight: 700 }}>{field.name}</span>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '16px 20px' }}>
                                                            <span style={{ padding: '4px 8px', backgroundColor: TOKENS.bg, borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, color: TOKENS.primary }}>
                                                                {FIELD_TYPE_LABELS[field.type] || field.type}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '16px 20px', color: TOKENS.textMuted, fontSize: '0.8rem' }}>
                                                            {field.type === 'linked_record' ? `Linked to table ID: ${field.link_table_id}` : 'Standard field'}
                                                        </td>
                                                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                                            <button
                                                                onClick={(e) => {
                                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                                    setActiveMenuField({ name: field.name, x: rect.left, y: rect.top });
                                                                }}
                                                                style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '6px', color: TOKENS.textMuted, transition: 'background 0.2s' }}
                                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = TOKENS.bg}
                                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                            >
                                                                <Settings size={18} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                <tr>
                                                    <td colSpan="4" style={{ padding: '16px 20px' }}>
                                                        <button
                                                            onClick={() => setIsFieldModalOpen(true)}
                                                            style={{ width: '100%', padding: '12px', border: `1px dashed ${TOKENS.border}`, borderRadius: '8px', background: 'none', color: TOKENS.textMuted, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}
                                                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = TOKENS.primary; e.currentTarget.style.backgroundColor = 'rgba(113, 75, 103, 0.02)'; }}
                                                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = TOKENS.border; e.currentTarget.style.backgroundColor = 'transparent'; }}
                                                        >
                                                            <Plus size={14} /> Add new column ({remainingFieldSlots} remaining)
                                                        </button>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : activePanel === 'queries' ? (
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: TOKENS.text }}>Table Queries</h2>
                                            <p style={{ fontSize: '0.85rem', color: TOKENS.textMuted, margin: '4px 0 0' }}>Save filters and sorts to use across apps.</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setEditingQuery({ id: Date.now().toString(), name: 'New Query', matchType: 'all', filters: [], sort: [], limit: 1000 });
                                                setIsQueryEditorOpen(true);
                                            }}
                                            style={{
                                                padding: '10px 24px',
                                                backgroundColor: TOKENS.secondary,
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontWeight: 800,
                                                fontSize: '0.85rem',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                boxShadow: TOKENS.shadow
                                            }}
                                        >
                                            <Plus size={18} /> Add Query
                                        </button>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                                        {(selectedTable?.queries || []).length === 0 ? (
                                            <div style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center', backgroundColor: 'white', borderRadius: TOKENS.radius, border: `1px dashed ${TOKENS.border}` }}>
                                                <Search size={40} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
                                                <div style={{ color: TOKENS.textMuted }}>No queries defined yet.</div>
                                            </div>
                                        ) : (
                                            (selectedTable?.queries || []).map(q => (
                                                <div key={q.id} style={{ backgroundColor: 'white', padding: '20px', borderRadius: TOKENS.radius, border: `1px solid ${TOKENS.borderLight}`, boxShadow: TOKENS.shadow, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                        <div style={{ fontWeight: 700, fontSize: '1rem', color: TOKENS.text }}>{q.name}</div>
                                                        <div style={{ display: 'flex', gap: '4px' }}>
                                                            <button
                                                                onClick={() => {
                                                                    setEditingQuery(q);
                                                                    setIsQueryEditorOpen(true);
                                                                }}
                                                                style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '6px', color: TOKENS.textMuted }}
                                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = TOKENS.bg}
                                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    const updatedQueries = selectedTable.queries.filter(existing => existing.id !== q.id);
                                                                    await updateTable(selectedTableId, { queries: updatedQueries });
                                                                    loadTables();
                                                                }}
                                                                style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '6px', color: '#dc2626' }}
                                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div style={{ fontSize: '0.8rem', color: TOKENS.textMuted }}>
                                                        {q.filters?.length || 0} filters • {q.sort?.length || 0} sorts • Limit {q.limit}
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            setActiveQueryId(q.id);
                                                            setActivePanel('records');
                                                        }}
                                                        style={{ width: '100%', padding: '10px', backgroundColor: TOKENS.bg, border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.8rem', color: TOKENS.primary, cursor: 'pointer' }}
                                                    >
                                                        View Results
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: TOKENS.text }}>Table Aggregations</h2>
                                            <p style={{ fontSize: '0.85rem', color: TOKENS.textMuted, margin: '4px 0 0' }}>Calculate statistics across your table data.</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setEditingAggregation({ id: Date.now().toString(), name: 'New Aggregation', calculation: 'sum', field: activeFields[0]?.name });
                                                setIsAggregationEditorOpen(true);
                                            }}
                                            style={{
                                                padding: '10px 24px',
                                                backgroundColor: TOKENS.secondary,
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontWeight: 800,
                                                fontSize: '0.85rem',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                boxShadow: TOKENS.shadow
                                            }}
                                        >
                                            <Plus size={18} /> Add Aggregation
                                        </button>
                                    </div>

                                    <div style={{ backgroundColor: 'white', borderRadius: TOKENS.radius, border: `1px solid ${TOKENS.borderLight}`, boxShadow: TOKENS.shadow, overflow: 'hidden' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                            <thead>
                                                <tr style={{ backgroundColor: TOKENS.bg }}>
                                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 800, color: TOKENS.primary, borderBottom: `1px solid ${TOKENS.borderLight}` }}>Name</th>
                                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 800, color: TOKENS.primary, borderBottom: `1px solid ${TOKENS.borderLight}` }}>Calculation</th>
                                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 800, color: TOKENS.primary, borderBottom: `1px solid ${TOKENS.borderLight}` }}>Field</th>
                                                    <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 800, color: TOKENS.primary, borderBottom: `1px solid ${TOKENS.borderLight}` }}>Current Result</th>
                                                    <th style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 800, color: TOKENS.primary, borderBottom: `1px solid ${TOKENS.borderLight}` }}>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(selectedTable?.aggregations || []).length === 0 ? (
                                                    <tr>
                                                        <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: TOKENS.textMuted }}>No aggregations defined.</td>
                                                    </tr>
                                                ) : (
                                                    (selectedTable?.aggregations || []).map(agg => {
                                                        const result = (() => {
                                                            let values = filteredAndSortedRecords.map(r => Number(r[agg.field])).filter(n => !isNaN(n));
                                                            if (agg.calculation === 'count') return filteredAndSortedRecords.length;
                                                            if (values.length === 0) return '-';
                                                            switch (agg.calculation) {
                                                                case 'sum': return values.reduce((s, v) => s + v, 0).toLocaleString();
                                                                case 'average': return (values.reduce((s, v) => s + v, 0) / values.length).toFixed(2);
                                                                case 'min': return Math.min(...values);
                                                                case 'max': return Math.max(...values);
                                                                default: return '-';
                                                            }
                                                        })();

                                                        return (
                                                            <tr key={agg.id} style={{ borderBottom: `1px solid ${TOKENS.borderLight}` }}>
                                                                <td style={{ padding: '16px 20px', fontWeight: 700 }}>{agg.name}</td>
                                                                <td style={{ padding: '16px 20px', textTransform: 'capitalize' }}>{agg.calculation}</td>
                                                                <td style={{ padding: '16px 20px' }}>{agg.field}</td>
                                                                <td style={{ padding: '16px 20px', fontWeight: 800, color: TOKENS.secondary }}>{result}</td>
                                                                <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                                                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                                                        <button
                                                                            onClick={() => {
                                                                                setEditingAggregation(agg);
                                                                                setIsAggregationEditorOpen(true);
                                                                            }}
                                                                            style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '6px', color: TOKENS.textMuted }}
                                                                        >
                                                                            <Edit2 size={16} />
                                                                        </button>
                                                                        <button
                                                                            onClick={async () => {
                                                                                const updatedAggs = selectedTable.aggregations.filter(existing => existing.id !== agg.id);
                                                                                await updateTable(selectedTableId, { aggregations: updatedAggs });
                                                                                loadTables();
                                                                            }}
                                                                            style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '6px', color: '#dc2626' }}
                                                                        >
                                                                            <Trash2 size={16} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

            {isCreateModalOpen && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000, backdropFilter: 'blur(4px)' }}>
                    <div style={{ width: '400px', backgroundColor: TOKENS.surface, borderRadius: TOKENS.radius, boxShadow: TOKENS.shadowLg, border: `1px solid ${TOKENS.border}`, overflow: 'hidden' }}>
                        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${TOKENS.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.01em' }}>Create New Table</div>
                            <button onClick={() => setIsCreateModalOpen(false)} style={{ border: 'none', background: 'none', color: TOKENS.textMuted, cursor: 'pointer', padding: '4px' }}><X size={20} /></button>
                        </div>
                        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: TOKENS.text, marginBottom: '8px', fontWeight: 700 }}>Table Name</label>
                                <input
                                    value={newTableName}
                                    onChange={(e) => setNewTableName(e.target.value)}
                                    placeholder="e.g. Work Orders"
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${TOKENS.border}`, fontSize: '0.9rem', outline: 'none' }}
                                    onFocus={(e) => e.target.style.borderColor = TOKENS.primary}
                                    onBlur={(e) => e.target.style.borderColor = TOKENS.border}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: TOKENS.text, marginBottom: '8px', fontWeight: 700 }}>Description</label>
                                <textarea
                                    value={newTableDescription}
                                    onChange={(e) => setNewTableDescription(e.target.value)}
                                    placeholder="What is this table for?"
                                    rows={3}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${TOKENS.border}`, fontSize: '0.9rem', outline: 'none', resize: 'vertical' }}
                                    onFocus={(e) => e.target.style.borderColor = TOKENS.primary}
                                    onBlur={(e) => e.target.style.borderColor = TOKENS.border}
                                />
                            </div>
                        </div>
                        <div style={{ padding: '20px 24px', borderTop: `1px solid ${TOKENS.borderLight}`, display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: TOKENS.bg }}>
                            <button onClick={() => setIsCreateModalOpen(false)} style={{ border: `1px solid ${TOKENS.border}`, backgroundColor: TOKENS.surface, color: TOKENS.text, padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>Cancel</button>
                            <button
                                onClick={handleCreateTable}
                                disabled={creatingTable}
                                style={{ border: 'none', backgroundColor: TOKENS.primary, color: 'white', padding: '10px 22px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}
                            >
                                {creatingTable ? 'Creating...' : 'Create Table'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {isRecordModalOpen && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', zIndex: 6000, backdropFilter: 'blur(4px)' }}>
                    <div style={{ width: '100%', maxWidth: '500px', backgroundColor: TOKENS.surface, borderRadius: TOKENS.radius, boxShadow: TOKENS.shadowLg, border: `1px solid ${TOKENS.border}`, overflow: 'hidden' }}>
                        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${TOKENS.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '12px', color: TOKENS.primary }}>
                                <span>{isEditingRecord ? 'Update Record' : 'Add Record'}</span>
                            </div>
                            <button onClick={() => setIsRecordModalOpen(false)} style={{ border: 'none', background: 'none', color: TOKENS.textMuted, cursor: 'pointer', padding: '4px' }}><X size={20} /></button>
                        </div>

                        <div style={{ maxHeight: '70vh', overflowY: 'auto', padding: '24px' }}>
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: TOKENS.text, marginBottom: '8px', fontWeight: 700 }}>Record ID <span style={{ color: '#ef4444' }}>*</span></label>
                                <input
                                    value={newRecordId}
                                    onChange={(e) => setNewRecordId(e.target.value)}
                                    placeholder="e.g. WO-123"
                                    disabled={isEditingRecord}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${TOKENS.border}`, fontSize: '0.9rem', outline: 'none', backgroundColor: isEditingRecord ? TOKENS.bg : 'white' }}
                                    onFocus={(e) => e.target.style.borderColor = TOKENS.primary}
                                    onBlur={(e) => e.target.style.borderColor = TOKENS.border}
                                    autoFocus={!isEditingRecord}
                                />
                                <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: TOKENS.textMuted }}>Unique identifier for this record.</p>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: TOKENS.primary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Field Data</div>
                                {activeFields.length === 0 ? (
                                    <div style={{ padding: '20px', backgroundColor: TOKENS.bg, borderRadius: '8px', textAlign: 'center', color: TOKENS.textMuted, fontSize: '0.85rem' }}>
                                        No custom fields defined for this table.
                                    </div>
                                ) : (
                                    activeFields.map((field) => (
                                        <div key={field.name}>
                                            <label style={{ display: 'block', fontSize: '0.8rem', color: TOKENS.text, marginBottom: '8px', fontWeight: 700 }}>
                                                {field.name}
                                                <span style={{ marginLeft: '8px', fontWeight: 400, color: TOKENS.textMuted, fontSize: '0.75rem' }}>({FIELD_TYPE_LABELS[field.type] || field.type})</span>
                                            </label>
                                            {field.type === 'linked_record' ? (
                                                <LinkedRecordSelector
                                                    field={field}
                                                    value={newRecordValues[field.name] ?? []}
                                                    tables={tables}
                                                    onChange={(val) => setNewRecordValues((prev) => ({ ...prev, [field.name]: val }))}
                                                />
                                            ) : (field.type === 'image' || field.type === 'video') ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <input
                                                            type="text"
                                                            value={newRecordValues[field.name] ?? ''}
                                                            onChange={(e) => setNewRecordValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
                                                            placeholder={`Public URL or upload...`}
                                                            style={{ flex: 1, padding: '12px', borderRadius: '8px', border: `1px solid ${TOKENS.border}`, fontSize: '0.9rem', outline: 'none' }}
                                                            onFocus={(e) => e.target.style.borderColor = TOKENS.primary}
                                                            onBlur={(e) => e.target.style.borderColor = TOKENS.border}
                                                        />
                                                        <label style={{
                                                            padding: '10px 16px',
                                                            backgroundColor: uploadingFields[field.name] ? '#e2e8f0' : TOKENS.bg,
                                                            color: TOKENS.primary,
                                                            borderRadius: '8px',
                                                            border: `1px solid ${TOKENS.border}`,
                                                            cursor: uploadingFields[field.name] ? 'not-allowed' : 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px',
                                                            fontSize: '0.85rem',
                                                            fontWeight: 700,
                                                            transition: 'all 0.2s'
                                                        }}>
                                                            {uploadingFields[field.name] ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                                                            {uploadingFields[field.name] ? 'Uploading...' : 'Upload'}
                                                            <input
                                                                type="file"
                                                                accept={field.type === 'image' ? 'image/*' : 'video/*'}
                                                                onChange={(e) => handleFileUpload(field.name, e.target.files?.[0])}
                                                                style={{ display: 'none' }}
                                                                disabled={uploadingFields[field.name]}
                                                            />
                                                        </label>
                                                    </div>
                                                    {newRecordValues[field.name] && field.type === 'image' && (
                                                        <div style={{ width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: `1px solid ${TOKENS.border}` }}>
                                                            <img src={newRecordValues[field.name]} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <input
                                                    value={newRecordValues[field.name] ?? ''}
                                                    onChange={(e) => setNewRecordValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
                                                    placeholder={`Enter ${field.name}...`}
                                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${TOKENS.border}`, fontSize: '0.9rem', outline: 'none' }}
                                                    onFocus={(e) => e.target.style.borderColor = TOKENS.primary}
                                                    onBlur={(e) => e.target.style.borderColor = TOKENS.border}
                                                />
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div style={{ padding: '20px 24px', borderTop: `1px solid ${TOKENS.borderLight}`, display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: TOKENS.bg }}>
                            <button onClick={() => setIsRecordModalOpen(false)} style={{ border: `1px solid ${TOKENS.border}`, backgroundColor: TOKENS.surface, color: TOKENS.text, padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>Cancel</button>
                            <button
                                onClick={handleAddRecord}
                                disabled={recordsLoading || (!isEditingRecord && activeFields.length === 0 && !newRecordId)}
                                style={{ border: 'none', backgroundColor: '#10b981', color: 'white', padding: '10px 22px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                {isEditingRecord ? <RefreshCw size={18} /> : <Plus size={18} />}
                                {isEditingRecord ? 'Save Changes' : 'Add Entry'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {isFieldModalOpen && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 6000, backdropFilter: 'blur(4px)' }}>
                    <div style={{ width: '400px', backgroundColor: TOKENS.surface, borderRadius: TOKENS.radius, boxShadow: TOKENS.shadowLg, border: `1px solid ${TOKENS.border}`, overflow: 'hidden' }}>
                        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${TOKENS.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.01em' }}>Add New Column</div>
                            <button onClick={() => setIsFieldModalOpen(false)} style={{ border: 'none', background: 'none', color: TOKENS.textMuted, cursor: 'pointer', padding: '4px' }}><X size={20} /></button>
                        </div>
                        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: TOKENS.text, marginBottom: '8px', fontWeight: 700 }}>Column Name</label>
                                <input
                                    value={newFieldName}
                                    onChange={(e) => setNewFieldName(e.target.value)}
                                    placeholder="e.g. Quantity"
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${TOKENS.border}`, fontSize: '0.9rem', outline: 'none' }}
                                    onFocus={(e) => e.target.style.borderColor = TOKENS.primary}
                                    onBlur={(e) => e.target.style.borderColor = TOKENS.border}
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: TOKENS.text, marginBottom: '8px', fontWeight: 700 }}>Data Type</label>
                                <select
                                    value={newFieldType}
                                    onChange={(e) => setNewFieldType(e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${TOKENS.border}`, fontSize: '0.9rem', outline: 'none', backgroundColor: TOKENS.surface }}
                                    onFocus={(e) => e.target.style.borderColor = TOKENS.primary}
                                    onBlur={(e) => e.target.style.borderColor = TOKENS.border}
                                >
                                    {TABLE_FIELD_TYPES.map((type) => (
                                        <option key={type} value={type}>{FIELD_TYPE_LABELS[type] || type}</option>
                                    ))}
                                </select>
                            </div>
                            {newFieldType === 'linked_record' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', color: TOKENS.text, marginBottom: '8px', fontWeight: 700 }}>Link To Table</label>
                                        <select
                                            value={targetTableId}
                                            onChange={(e) => setTargetTableId(e.target.value)}
                                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: `1px solid ${TOKENS.border}`, fontSize: '0.9rem', outline: 'none', backgroundColor: 'white' }}
                                        >
                                            <option value="">Select a table...</option>
                                            {tables.filter(t => t.id !== selectedTableId).map((table) => (
                                                <option key={table.id} value={table.id}>{table.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', color: TOKENS.text, marginBottom: '8px', fontWeight: 700 }}>Label in Target Table</label>
                                        <input
                                            value={newFieldReverseName}
                                            onChange={(e) => setNewFieldReverseName(e.target.value)}
                                            placeholder="e.g. Related Records"
                                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: `1px solid ${TOKENS.border}`, fontSize: '0.9rem', outline: 'none' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', color: TOKENS.text, marginBottom: '8px', fontWeight: 700 }}>Link Type</label>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                            {[
                                                { id: 'one_to_one', label: 'One to One', icon: '○──○' },
                                                { id: 'one_to_many', label: 'One to Many', icon: '○──∈' },
                                                { id: 'many_to_one', label: 'Many to One', icon: '∋──○' },
                                                { id: 'many_to_many', label: 'Many to Many', icon: '∋──∈' }
                                            ].map(lt => (
                                                <button
                                                    key={lt.id}
                                                    onClick={() => setNewFieldLinkType(lt.id)}
                                                    style={{
                                                        padding: '10px 8px',
                                                        borderRadius: '6px',
                                                        border: `2px solid ${newFieldLinkType === lt.id ? TOKENS.primary : '#e2e8f0'}`,
                                                        backgroundColor: newFieldLinkType === lt.id ? '#f5f3ff' : 'white',
                                                        color: newFieldLinkType === lt.id ? TOKENS.primary : TOKENS.text,
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <span style={{ fontSize: '1rem' }}>{lt.icon}</span>
                                                    {lt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div style={{ padding: '20px 24px', borderTop: `1px solid ${TOKENS.borderLight}`, display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: TOKENS.bg }}>
                            <button onClick={() => setIsFieldModalOpen(false)} style={{ border: `1px solid ${TOKENS.border}`, backgroundColor: TOKENS.surface, color: TOKENS.text, padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>Cancel</button>
                            <button
                                onClick={async () => {
                                    await handleAddField();
                                    setIsFieldModalOpen(false);
                                }}
                                style={{ border: 'none', backgroundColor: TOKENS.primary, color: 'white', padding: '10px 22px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}
                            >
                                Add Column
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {isEditTableModalOpen && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000, backdropFilter: 'blur(4px)' }}>
                    <div style={{ width: '450px', backgroundColor: TOKENS.surface, borderRadius: TOKENS.radius, boxShadow: TOKENS.shadowLg, border: `1px solid ${TOKENS.border}`, overflow: 'hidden' }}>
                        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${TOKENS.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.01em' }}>Edit Table Settings</div>
                            <button onClick={() => setIsEditTableModalOpen(false)} style={{ border: 'none', background: 'none', color: TOKENS.textMuted, cursor: 'pointer', padding: '4px' }}><X size={20} /></button>
                        </div>
                        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: TOKENS.text, marginBottom: '8px', fontWeight: 700 }}>Table Name</label>
                                <input
                                    value={editTableName}
                                    onChange={(e) => setEditTableName(e.target.value)}
                                    placeholder="Enter table name"
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${TOKENS.border}`, fontSize: '0.9rem', outline: 'none' }}
                                    onFocus={(e) => e.target.style.borderColor = TOKENS.primary}
                                    onBlur={(e) => e.target.style.borderColor = TOKENS.border}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: TOKENS.text, marginBottom: '8px', fontWeight: 700 }}>Description</label>
                                <textarea
                                    value={editTableDescription}
                                    onChange={(e) => setEditTableDescription(e.target.value)}
                                    placeholder="Table description..."
                                    rows={3}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${TOKENS.border}`, fontSize: '0.9rem', outline: 'none', resize: 'vertical' }}
                                    onFocus={(e) => e.target.style.borderColor = TOKENS.primary}
                                    onBlur={(e) => e.target.style.borderColor = TOKENS.border}
                                />
                            </div>
                        </div>
                        <div style={{ padding: '20px 24px', borderTop: `1px solid ${TOKENS.borderLight}`, display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: TOKENS.bg }}>
                            <button onClick={() => setIsEditTableModalOpen(false)} style={{ border: `1px solid ${TOKENS.border}`, backgroundColor: TOKENS.surface, color: TOKENS.text, padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>Cancel</button>
                            <button
                                onClick={handleUpdateTableMetadata}
                                disabled={creatingTable}
                                style={{ border: 'none', backgroundColor: TOKENS.primary, color: 'white', padding: '10px 22px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}
                            >
                                {creatingTable ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isRenameFieldModalOpen && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 6000, backdropFilter: 'blur(4px)' }}>
                    <div style={{ width: '400px', backgroundColor: TOKENS.surface, borderRadius: TOKENS.radius, boxShadow: TOKENS.shadowLg, border: `1px solid ${TOKENS.border}`, overflow: 'hidden' }}>
                        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${TOKENS.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.01em' }}>Rename Column</div>
                            <button onClick={() => setIsRenameFieldModalOpen(false)} style={{ border: 'none', background: 'none', color: TOKENS.textMuted, cursor: 'pointer', padding: '4px' }}><X size={20} /></button>
                        </div>
                        <div style={{ padding: '24px' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: TOKENS.text, marginBottom: '8px', fontWeight: 700 }}>New Name for "{editingField}"</label>
                            <input
                                value={renameFieldNewName}
                                onChange={(e) => setRenameFieldNewName(e.target.value)}
                                placeholder="New column name"
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${TOKENS.border}`, fontSize: '0.9rem', outline: 'none' }}
                                onFocus={(e) => e.target.style.borderColor = TOKENS.primary}
                                onBlur={(e) => e.target.style.borderColor = TOKENS.border}
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleRenameField(editingField, renameFieldNewName)}
                            />
                        </div>
                        <div style={{ padding: '20px 24px', borderTop: `1px solid ${TOKENS.borderLight}`, display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: TOKENS.bg }}>
                            <button onClick={() => setIsRenameFieldModalOpen(false)} style={{ border: `1px solid ${TOKENS.border}`, backgroundColor: TOKENS.surface, color: TOKENS.text, padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>Cancel</button>
                            <button
                                onClick={() => handleRenameField(editingField, renameFieldNewName)}
                                style={{ border: 'none', backgroundColor: TOKENS.primary, color: 'white', padding: '10px 22px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}
                            >
                                Rename
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {isTypeModalOpen && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 6000, backdropFilter: 'blur(4px)' }}>
                    <div style={{ width: '400px', backgroundColor: TOKENS.surface, borderRadius: TOKENS.radius, boxShadow: TOKENS.shadowLg, border: `1px solid ${TOKENS.border}`, overflow: 'hidden' }}>
                        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${TOKENS.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.01em' }}>Change Column Type</div>
                            <button onClick={() => setIsTypeModalOpen(false)} style={{ border: 'none', background: 'none', color: TOKENS.textMuted, cursor: 'pointer', padding: '4px' }}><X size={20} /></button>
                        </div>
                        <div style={{ padding: '24px' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: TOKENS.text, marginBottom: '8px', fontWeight: 700 }}>Data Type for "{editingField}"</label>
                            <select
                                value={newType}
                                onChange={(e) => setNewType(e.target.value)}
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${TOKENS.border}`, fontSize: '0.9rem', outline: 'none', backgroundColor: TOKENS.surface }}
                                onFocus={(e) => e.target.style.borderColor = TOKENS.primary}
                                onBlur={(e) => e.target.style.borderColor = TOKENS.border}
                            >
                                {TABLE_FIELD_TYPES.map(type => (
                                    <option key={type} value={type}>{FIELD_TYPE_LABELS[type] || type}</option>
                                ))}
                            </select>
                            <p style={{ marginTop: '12px', fontSize: '0.75rem', color: TOKENS.textMuted, lineHeight: '1.4' }}>Changing the type might affect how current data is validated and displayed.</p>
                        </div>
                        <div style={{ padding: '20px 24px', borderTop: `1px solid ${TOKENS.borderLight}`, display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: TOKENS.bg }}>
                            <button onClick={() => setIsTypeModalOpen(false)} style={{ border: `1px solid ${TOKENS.border}`, backgroundColor: TOKENS.surface, color: TOKENS.text, padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>Cancel</button>
                            <button
                                onClick={() => handleUpdateFieldType(editingField, newType)}
                                style={{ border: 'none', backgroundColor: TOKENS.primary, color: 'white', padding: '10px 22px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}
                            >
                                Change Type
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isQueryEditorOpen && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 7000, backdropFilter: 'blur(4px)' }}>
                    <div style={{ width: '600px', backgroundColor: TOKENS.surface, borderRadius: TOKENS.radius, boxShadow: TOKENS.shadowLg, border: `1px solid ${TOKENS.border}`, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
                        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${TOKENS.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.01em' }}>{editingQuery?.id ? 'Edit Query' : 'Create Query'}</div>
                            <button onClick={() => setIsQueryEditorOpen(false)} style={{ border: 'none', background: 'none', color: TOKENS.textMuted, cursor: 'pointer', padding: '4px' }}><X size={20} /></button>
                        </div>
                        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: TOKENS.text, marginBottom: '8px', fontWeight: 700 }}>Query Name</label>
                                <input
                                    value={editingQuery?.name || ''}
                                    onChange={(e) => setEditingQuery(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="e.g. Recently Completed"
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${TOKENS.border}`, fontSize: '0.9rem', outline: 'none' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: TOKENS.text, marginBottom: '8px', fontWeight: 700 }}>Match records that fit...</label>
                                    <select
                                        value={editingQuery?.matchType || 'all'}
                                        onChange={(e) => setEditingQuery(prev => ({ ...prev, matchType: e.target.value }))}
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${TOKENS.border}`, fontSize: '0.9rem', backgroundColor: 'white' }}
                                    >
                                        <option value="all">ALL filters (AND)</option>
                                        <option value="any">ANY filters (OR)</option>
                                    </select>
                                </div>
                                <div style={{ width: '100px' }}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: TOKENS.text, marginBottom: '8px', fontWeight: 700 }}>Limit</label>
                                    <input
                                        type="number"
                                        value={editingQuery?.limit || 1000}
                                        onChange={(e) => setEditingQuery(prev => ({ ...prev, limit: parseInt(e.target.value) }))}
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${TOKENS.border}`, fontSize: '0.9rem' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <label style={{ fontSize: '0.8rem', color: TOKENS.text, fontWeight: 700 }}>Filters</label>
                                    <button
                                        onClick={() => setEditingQuery(prev => ({ ...prev, filters: [...(prev.filters || []), { field: 'recordId', operator: 'equals', value: '' }] }))}
                                        style={{ padding: '4px 12px', backgroundColor: TOKENS.bg, border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, color: TOKENS.primary, cursor: 'pointer' }}
                                    >
                                        + Add Filter
                                    </button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {(editingQuery?.filters || []).map((filter, idx) => (
                                        <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <select
                                                value={filter.field}
                                                onChange={(e) => {
                                                    const newFilters = [...editingQuery.filters];
                                                    newFilters[idx].field = e.target.value;
                                                    setEditingQuery(prev => ({ ...prev, filters: newFilters }));
                                                }}
                                                style={{ flex: 1.5, padding: '8px', borderRadius: '6px', border: `1px solid ${TOKENS.border}`, fontSize: '0.8rem' }}
                                            >
                                                <option value="recordId">ID</option>
                                                {activeFields.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
                                            </select>
                                            <select
                                                value={filter.operator}
                                                onChange={(e) => {
                                                    const newFilters = [...editingQuery.filters];
                                                    newFilters[idx].operator = e.target.value;
                                                    setEditingQuery(prev => ({ ...prev, filters: newFilters }));
                                                }}
                                                style={{ flex: 1, padding: '8px', borderRadius: '6px', border: `1px solid ${TOKENS.border}`, fontSize: '0.8rem' }}
                                            >
                                                <option value="equals">equals</option>
                                                <option value="does_not_equal">not equal</option>
                                                <option value="contains">contains</option>
                                                <option value="does_not_contain">not contain</option>
                                                <option value="is_null">is empty</option>
                                                <option value="is_not_null">is not empty</option>
                                                <option value="greater_than_or_equal">≥</option>
                                                <option value="less_than_or_equal">≤</option>
                                                <option value="is_in">is in (comma-separated)</option>
                                                <option value="is_after">is after</option>
                                                <option value="is_before">is before</option>
                                            </select>
                                            <input
                                                value={filter.value}
                                                onChange={(e) => {
                                                    const newFilters = [...editingQuery.filters];
                                                    newFilters[idx].value = e.target.value;
                                                    setEditingQuery(prev => ({ ...prev, filters: newFilters }));
                                                }}
                                                placeholder="Value..."
                                                style={{ flex: 2, padding: '8px', borderRadius: '6px', border: `1px solid ${TOKENS.border}`, fontSize: '0.8rem' }}
                                            />
                                            <button
                                                onClick={() => {
                                                    const newFilters = editingQuery.filters.filter((_, i) => i !== idx);
                                                    setEditingQuery(prev => ({ ...prev, filters: newFilters }));
                                                }}
                                                style={{ padding: '6px', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}
                                            ><Trash2 size={14} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <label style={{ fontSize: '0.8rem', color: TOKENS.text, fontWeight: 700 }}>Sorting</label>
                                    <button
                                        onClick={() => setEditingQuery(prev => ({ ...prev, sort: [...(prev.sort || []), { field: 'recordId', direction: 'asc' }] }))}
                                        style={{ padding: '4px 12px', backgroundColor: TOKENS.bg, border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, color: TOKENS.primary, cursor: 'pointer' }}
                                    >
                                        + Add Sort
                                    </button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {(editingQuery?.sort || []).map((s, idx) => (
                                        <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <select
                                                value={s.field}
                                                onChange={(e) => {
                                                    const newSort = [...editingQuery.sort];
                                                    newSort[idx].field = e.target.value;
                                                    setEditingQuery(prev => ({ ...prev, sort: newSort }));
                                                }}
                                                style={{ flex: 1, padding: '8px', borderRadius: '6px', border: `1px solid ${TOKENS.border}`, fontSize: '0.8rem' }}
                                            >
                                                <option value="recordId">ID</option>
                                                {activeFields.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
                                            </select>
                                            <select
                                                value={s.direction}
                                                onChange={(e) => {
                                                    const newSort = [...editingQuery.sort];
                                                    newSort[idx].direction = e.target.value;
                                                    setEditingQuery(prev => ({ ...prev, sort: newSort }));
                                                }}
                                                style={{ width: '120px', padding: '8px', borderRadius: '6px', border: `1px solid ${TOKENS.border}`, fontSize: '0.8rem' }}
                                            >
                                                <option value="asc">Ascending</option>
                                                <option value="desc">Descending</option>
                                            </select>
                                            <button
                                                onClick={() => {
                                                    const newSort = editingQuery.sort.filter((_, i) => i !== idx);
                                                    setEditingQuery(prev => ({ ...prev, sort: newSort }));
                                                }}
                                                style={{ padding: '6px', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}
                                            ><Trash2 size={14} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div style={{ padding: '20px 24px', borderTop: `1px solid ${TOKENS.borderLight}`, display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: TOKENS.bg }}>
                            <button onClick={() => setIsQueryEditorOpen(false)} style={{ border: `1px solid ${TOKENS.border}`, backgroundColor: TOKENS.surface, color: TOKENS.text, padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>Cancel</button>
                            <button
                                onClick={async () => {
                                    const updatedQueries = selectedTable.queries ? [...selectedTable.queries] : [];
                                    const index = updatedQueries.findIndex(q => q.id === editingQuery.id);
                                    if (index >= 0) updatedQueries[index] = editingQuery;
                                    else updatedQueries.push(editingQuery);
                                    
                                    await updateTable(selectedTableId, { queries: updatedQueries });
                                    await loadTables();
                                    setIsQueryEditorOpen(false);
                                }}
                                style={{ border: 'none', backgroundColor: TOKENS.primary, color: 'white', padding: '10px 22px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}
                            >
                                Save Query
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isAggregationEditorOpen && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 7000, backdropFilter: 'blur(4px)' }}>
                    <div style={{ width: '450px', backgroundColor: TOKENS.surface, borderRadius: TOKENS.radius, boxShadow: TOKENS.shadowLg, border: `1px solid ${TOKENS.border}`, overflow: 'hidden' }}>
                        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${TOKENS.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.01em' }}>{editingAggregation?.id ? 'Edit Aggregation' : 'Create Aggregation'}</div>
                            <button onClick={() => setIsAggregationEditorOpen(false)} style={{ border: 'none', background: 'none', color: TOKENS.textMuted, cursor: 'pointer', padding: '4px' }}><X size={20} /></button>
                        </div>
                        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: TOKENS.text, marginBottom: '8px', fontWeight: 700 }}>Aggregation Name</label>
                                <input
                                    value={editingAggregation?.name || ''}
                                    onChange={(e) => setEditingAggregation(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="e.g. Total Revenue"
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${TOKENS.border}`, fontSize: '0.9rem', outline: 'none' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: TOKENS.text, marginBottom: '8px', fontWeight: 700 }}>Calculation</label>
                                <select
                                    value={editingAggregation?.calculation || 'sum'}
                                    onChange={(e) => setEditingAggregation(prev => ({ ...prev, calculation: e.target.value }))}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${TOKENS.border}`, fontSize: '0.9rem', backgroundColor: 'white' }}
                                >
                                    <option value="sum">Sum</option>
                                    <option value="average">Average</option>
                                    <option value="count">Count</option>
                                    <option value="min">Min</option>
                                    <option value="max">Max</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: TOKENS.text, marginBottom: '8px', fontWeight: 700 }}>Field</label>
                                <select
                                    value={editingAggregation?.field || ''}
                                    onChange={(e) => setEditingAggregation(prev => ({ ...prev, field: e.target.value }))}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${TOKENS.border}`, fontSize: '0.9rem', backgroundColor: 'white' }}
                                >
                                    <option value="">Select a field...</option>
                                    <option value="recordId">ID</option>
                                    {activeFields.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div style={{ padding: '20px 24px', borderTop: `1px solid ${TOKENS.borderLight}`, display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: TOKENS.bg }}>
                            <button onClick={() => setIsAggregationEditorOpen(false)} style={{ border: `1px solid ${TOKENS.border}`, backgroundColor: TOKENS.surface, color: TOKENS.text, padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>Cancel</button>
                            <button
                                onClick={async () => {
                                    const updatedAggs = selectedTable.aggregations ? [...selectedTable.aggregations] : [];
                                    const index = updatedAggs.findIndex(a => a.id === editingAggregation.id);
                                    if (index >= 0) updatedAggs[index] = editingAggregation;
                                    else updatedAggs.push(editingAggregation);
                                    
                                    await updateTable(selectedTableId, { aggregations: updatedAggs });
                                    await loadTables();
                                    setIsAggregationEditorOpen(false);
                                }}
                                style={{ border: 'none', backgroundColor: TOKENS.primary, color: 'white', padding: '10px 22px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}
                            >
                                Save Aggregation
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Global Field Menu (Fixed to avoid clipping) */}
            {activeMenuField && (
                <>
                    <div
                        style={{ position: 'fixed', inset: 0, zIndex: 10000 }}
                        onClick={() => setActiveMenuField(null)}
                    />
                    <div style={{
                        position: 'fixed',
                        top: `${activeMenuField.y + 8}px`,
                        left: `${activeMenuField.x}px`,
                        backgroundColor: TOKENS.surface,
                        boxShadow: TOKENS.shadowLg,
                        borderRadius: '10px',
                        padding: '8px',
                        zIndex: 10001,
                        minWidth: '180px',
                        border: `1px solid ${TOKENS.border}`,
                        animation: 'slideUp 0.15s ease-out'
                    }}>
                        {activeMenuField.name === 'ID' ? (
                            <div style={{ padding: '12px', fontSize: '0.8rem', color: TOKENS.textMuted, fontStyle: 'italic', lineHeight: '1.4' }}>
                                The ID field is managed by the system and cannot be edited.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <button
                                    onClick={() => {
                                        setEditingField(activeMenuField.name);
                                        setRenameFieldNewName(activeMenuField.name);
                                        setIsRenameFieldModalOpen(true);
                                        setActiveMenuField(null);
                                    }}
                                    style={{ width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none', background: 'none', cursor: 'pointer', borderRadius: '6px', fontSize: '0.85rem', color: TOKENS.text, display: 'flex', alignItems: 'center', gap: '10px', transition: 'background-color 0.2s' }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = TOKENS.bg}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <Edit2 size={14} color={TOKENS.primary} /> Rename
                                </button>
                                <button
                                    onClick={() => {
                                        const field = selectedTable.fields.find(f => f.name === activeMenuField.name);
                                        setEditingField(activeMenuField.name);
                                        setNewType(field?.type || 'text');
                                        setIsTypeModalOpen(true);
                                        setActiveMenuField(null);
                                    }}
                                    style={{ width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none', background: 'none', cursor: 'pointer', borderRadius: '6px', fontSize: '0.85rem', color: TOKENS.text, display: 'flex', alignItems: 'center', gap: '10px', transition: 'background-color 0.2s' }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = TOKENS.bg}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <Type size={14} color={TOKENS.primary} /> Change Type
                                </button>
                                <div style={{ height: '1px', backgroundColor: TOKENS.borderLight, margin: '6px 4px' }} />
                                <button
                                    onClick={() => {
                                        handleDeleteField(activeMenuField.name);
                                        setActiveMenuField(null);
                                    }}
                                    style={{ width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none', background: 'none', cursor: 'pointer', borderRadius: '6px', fontSize: '0.85rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background-color 0.2s' }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <Trash2 size={14} /> Delete Field
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
            {/* Hidden CSV Input */}
            <input
                type="file"
                ref={csvInputRef}
                onChange={handleCsvFileImport}
                accept=".csv"
            />
        </div>
    </div>
);
};

export default TableManager;
