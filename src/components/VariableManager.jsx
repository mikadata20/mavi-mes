import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Variable, X, Trash2, Pencil, RefreshCw } from 'lucide-react';
import { getAllVariables, saveVariable, deleteVariable, getAllFrontlineApps } from '../utils/supabaseFrontlineDB';

const VARIABLE_TYPES = [
    { value: 'TEXT', label: 'Text', description: 'A sequence of characters, like "foo" or "abc123"' },
    { value: 'INTEGER', label: 'Integer', description: 'A whole number without fractional component' },
    { value: 'NUMBER', label: 'Number', description: 'Any real number (including decimals)' },
    { value: 'BOOLEAN', label: 'Boolean', description: 'True or false' },
    { value: 'DATETIME', label: 'Datetime', description: 'A time and date value' },
    { value: 'INTERVAL', label: 'Interval', description: 'An amount of time measured in seconds' },
    { value: 'COLOR', label: 'Color', description: 'Color picker value or HEX code' },
    { value: 'IMAGE', label: 'Image', description: 'Image uploaded from file or URL' },
    { value: 'VIDEO', label: 'Video', description: 'Video uploaded from file or URL' },
    { value: 'USER', label: 'User', description: 'Any user in the system' },
    { value: 'MACHINE', label: 'Machine', description: 'Any connected machine on shop floor' },
    { value: 'OBJECT', label: 'Object', description: 'Object/JSON output (e.g. connector output)' },
    { value: 'STATION', label: 'Station', description: 'Any station on shop floor' },
    { value: 'ARRAY', label: 'Array', description: 'Array of any supported variable type' }
];

const emptyVariable = {
    name: '',
    type: 'TEXT',
    defaultValue: '',
    clearOnCompletion: true,
    saveForAnalysis: true,
    whereUsed: '-',
    validationRules: {
        required: false,
        min: '',
        max: '',
        regex: '',
        options: ''
    }
};

// Convert DB row → UI variable object
function dbRowToVariable(row) {
    let defaultValue = '';
    try {
        defaultValue = row.default_value !== null ? JSON.parse(row.default_value) : '';
    } catch {
        defaultValue = row.default_value ?? '';
    }
    return {
        id: row.id,
        name: row.name,
        type: row.type,
        defaultValue,
        clearOnCompletion: row.clear_on_completion ?? true,
        saveForAnalysis: row.save_for_analysis ?? true,
        whereUsed: row.where_used || '-',
        validationRules: {
            required: row.validation_rules?.required ?? false,
            min: row.validation_rules?.min ?? '',
            max: row.validation_rules?.max ?? '',
            regex: row.validation_rules?.regex ?? '',
            options: Array.isArray(row.validation_rules?.options)
                ? row.validation_rules.options.join(', ')
                : (row.validation_rules?.options ?? '')
        }
    };
}

function stringifyDefaultValue(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') {
        try {
            return JSON.stringify(value);
        } catch {
            return String(value);
        }
    }
    return String(value);
}

function objectContainsVariableRef(value, variableName, parentKey = '') {
    if (value === null || value === undefined) return false;

    if (typeof value === 'string') {
        if (value.includes(`@${variableName}`)) return true;
        if (['varSource', 'variable', 'varPath'].includes(parentKey) && value === variableName) return true;
        return false;
    }

    if (Array.isArray(value)) {
        return value.some((item) => objectContainsVariableRef(item, variableName, parentKey));
    }

    if (typeof value === 'object') {
        return Object.entries(value).some(([k, v]) => objectContainsVariableRef(v, variableName, k));
    }

    return false;
}

function computeWhereUsed(variableName, apps) {
    const hits = [];

    (apps || []).forEach((app) => {
        const cfg = app?.config || {};
        const appLabel = app?.name || 'Unnamed App';

        if ((cfg.appVariables || []).some((v) => v?.name === variableName)) {
            hits.push(`${appLabel} › App Variable`);
        }

        if (objectContainsVariableRef(cfg.baseComponents || [], variableName)) {
            hits.push(`${appLabel} › Base Layout`);
        }

        (cfg.steps || []).forEach((step) => {
            (step.components || []).forEach((comp) => {
                if (objectContainsVariableRef(comp, variableName)) {
                    const widgetName = comp?.props?.label || comp?.props?.text || comp?.type || 'Widget';
                    hits.push(`${appLabel} › ${step?.title || 'Step'} › ${widgetName}`);
                }
            });

            if (objectContainsVariableRef(step?.triggers || [], variableName)) {
                hits.push(`${appLabel} › ${step?.title || 'Step'} › Triggers`);
            }
        });

        if (objectContainsVariableRef(cfg.appTriggers || [], variableName)) {
            hits.push(`${appLabel} › App Triggers`);
        }
    });

    const uniqueHits = Array.from(new Set(hits));
    if (!uniqueHits.length) return '-';
    if (uniqueHits.length <= 3) return uniqueHits.join(' | ');
    return `${uniqueHits.slice(0, 3).join(' | ')} | +${uniqueHits.length - 3} more`;
}

const VariableManager = () => {
    const [variables, setVariables] = useState([]);
    const [search, setSearch] = useState('');
    const [editor, setEditor] = useState({ isOpen: false, isEdit: false, variable: emptyVariable });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [syncingUsage, setSyncingUsage] = useState(false);
    const [error, setError] = useState(null);

    // Load from Supabase on mount
    useEffect(() => {
        setLoading(true);
        getAllVariables()
            .then(rows => setVariables(rows.map(dbRowToVariable)))
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return variables;
        return variables.filter(v =>
            v.name.toLowerCase().includes(q) ||
            v.type.toLowerCase().includes(q) ||
            String(v.defaultValue ?? '').toLowerCase().includes(q)
        );
    }, [variables, search]);

    const normalizeValidationRules = (variableType, rules = {}) => {
        const required = Boolean(rules.required);
        const normalized = { required };

        if (['NUMBER', 'INTEGER', 'INTERVAL'].includes(variableType)) {
            normalized.min = rules.min !== '' ? Number(rules.min) : null;
            normalized.max = rules.max !== '' ? Number(rules.max) : null;
            if (normalized.min !== null && Number.isNaN(normalized.min)) throw new Error('Min harus angka.');
            if (normalized.max !== null && Number.isNaN(normalized.max)) throw new Error('Max harus angka.');
            if (normalized.min !== null && normalized.max !== null && normalized.min > normalized.max) {
                throw new Error('Min tidak boleh lebih besar dari Max.');
            }
        }

        if (variableType === 'TEXT') {
            const regex = String(rules.regex || '').trim();
            if (regex) {
                try {
                    // Validate regex
                    new RegExp(regex);
                    normalized.regex = regex;
                } catch {
                    throw new Error('Regex tidak valid.');
                }
            }

            const options = String(rules.options || '')
                .split(',')
                .map((v) => v.trim())
                .filter(Boolean);

            if (options.length) {
                normalized.options = options;
            }
        }

        return normalized;
    };

    const buildVariablePayloadFromEditor = () => {
        const name = editor.variable.name.trim().toUpperCase().replace(/\s+/g, '_');
        if (!name) {
            throw new Error('Variable name wajib diisi.');
        }

        if (variables.some(v => v.name === name && v.id !== editor.variable.id)) {
            throw new Error('Variable name sudah ada.');
        }

        let defaultValue = editor.variable.defaultValue;
        if (editor.variable.type === 'NUMBER') defaultValue = Number(editor.variable.defaultValue || 0);
        if (editor.variable.type === 'INTEGER' || editor.variable.type === 'INTERVAL') defaultValue = parseInt(editor.variable.defaultValue || 0, 10) || 0;
        if (editor.variable.type === 'BOOLEAN') defaultValue = Boolean(editor.variable.defaultValue);
        if (editor.variable.type === 'OBJECT') {
            try {
                defaultValue = editor.variable.defaultValue ? JSON.parse(editor.variable.defaultValue) : {};
            } catch {
                throw new Error('Object default value harus JSON valid.');
            }
        }
        if (editor.variable.type === 'ARRAY') {
            try {
                defaultValue = editor.variable.defaultValue ? JSON.parse(editor.variable.defaultValue) : [];
                if (!Array.isArray(defaultValue)) {
                    throw new Error('Array default value harus JSON array, contoh: [1,2,3]');
                }
            } catch {
                throw new Error('Array default value harus JSON array valid.');
            }
        }

        const validationRules = normalizeValidationRules(editor.variable.type, editor.variable.validationRules || {});

        if (validationRules.required) {
            const empty = defaultValue === '' || defaultValue === null || defaultValue === undefined;
            if (empty) throw new Error('Default value wajib diisi jika Required aktif.');
        }

        if (['NUMBER', 'INTEGER', 'INTERVAL'].includes(editor.variable.type)) {
            if (validationRules.min !== null && defaultValue < validationRules.min) {
                throw new Error('Default value lebih kecil dari Min.');
            }
            if (validationRules.max !== null && defaultValue > validationRules.max) {
                throw new Error('Default value lebih besar dari Max.');
            }
        }

        if (editor.variable.type === 'TEXT') {
            const textValue = String(defaultValue ?? '');
            if (validationRules.regex && !new RegExp(validationRules.regex).test(textValue)) {
                throw new Error('Default value tidak sesuai Regex.');
            }
            if (Array.isArray(validationRules.options) && validationRules.options.length && textValue) {
                if (!validationRules.options.includes(textValue)) {
                    throw new Error('Default value tidak ada di daftar Options.');
                }
            }
        }

        return { ...editor.variable, name, defaultValue, validationRules };
    };

    const refreshWhereUsed = async (currentVariables = variables) => {
        setSyncingUsage(true);
        try {
            const apps = await getAllFrontlineApps();
            const next = currentVariables.map((v) => ({
                ...v,
                whereUsed: computeWhereUsed(v.name, apps)
            }));

            setVariables(next);

            await Promise.all(next.map(async (v) => {
                await saveVariable(v);
            }));
        } catch (err) {
            alert('Gagal refresh Where Used: ' + err.message);
        } finally {
            setSyncingUsage(false);
        }
    };

    const handleSaveVariable = async () => {
        let next;
        try {
            next = buildVariablePayloadFromEditor();
        } catch (err) {
            alert(err.message);
            return;
        }

        try {
            setSaving(true);
            const saved = await saveVariable(next);
            const mapped = dbRowToVariable(saved);

            setVariables(prev => {
                if (editor.isEdit) {
                    return prev.map((x) => (x.id === mapped.id ? mapped : x));
                }
                return [...prev, mapped];
            });

            setEditor({ isOpen: false, isEdit: false, variable: emptyVariable });
        } catch (err) {
            alert('Gagal menyimpan variabel: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (variable) => {
        if (!window.confirm(`Hapus variabel "${variable.name}"?`)) return;
        try {
            await deleteVariable(variable.id);
            setVariables(prev => prev.filter(x => x.id !== variable.id));
        } catch (err) {
            alert('Gagal menghapus variabel: ' + err.message);
        }
    };

    const handleFileUpload = (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            setEditor(prev => ({ ...prev, variable: { ...prev.variable, defaultValue: reader.result } }));
        };
        reader.readAsDataURL(file);
    };

    const openCreateEditor = () => {
        setEditor({
            isOpen: true,
            isEdit: false,
            variable: { ...emptyVariable, validationRules: { ...emptyVariable.validationRules } }
        });
    };

    const openEditEditor = (variable) => {
        setEditor({
            isOpen: true,
            isEdit: true,
            variable: {
                ...variable,
                defaultValue: stringifyDefaultValue(variable.defaultValue),
                validationRules: {
                    required: variable.validationRules?.required ?? false,
                    min: variable.validationRules?.min ?? '',
                    max: variable.validationRules?.max ?? '',
                    regex: variable.validationRules?.regex ?? '',
                    options: Array.isArray(variable.validationRules?.options)
                        ? variable.validationRules.options.join(', ')
                        : (variable.validationRules?.options ?? '')
                }
            }
        });
    };

    return (
        <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100%', color: '#0f172a' }}>
            <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>Variables</div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search variables..."
                                style={{ padding: '8px 10px 8px 30px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.82rem' }}
                            />
                        </div>
                        <button
                            onClick={openCreateEditor}
                            style={{ padding: '8px 12px', border: 'none', borderRadius: '6px', backgroundColor: '#2563eb', color: 'white', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            <Plus size={14} /> Create Variable
                        </button>
                        <button
                            onClick={() => refreshWhereUsed()}
                            disabled={syncingUsage || loading}
                            style={{ padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: 'white', color: '#334155', fontWeight: 700, cursor: syncingUsage ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                            title="Refresh where-used dari semua app"
                        >
                            <RefreshCw size={14} className={syncingUsage ? 'animate-spin' : ''} /> {syncingUsage ? 'Sync...' : 'Refresh Usage'}
                        </button>
                    </div>
                </div>

                <div style={{ padding: '10px 16px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                    <div style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 700, marginBottom: '6px' }}>Data type</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: 1.5 }}>
                        Number, Boolean, Text, Integer, Interval, Image, User, Datetime, Station, Machine, Array, Object, Color, Video
                    </div>
                </div>

                {error && (
                    <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '0.85rem', borderBottom: '1px solid #fecaca' }}>
                        ⚠ Error: {error}
                    </div>
                )}

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ backgroundColor: '#f8fafc' }}>
                            <tr>
                                {['TYPE', 'NAME', 'DEFAULT VALUE', 'WHERE USED', ''].map(h => (
                                    <th key={h} style={{ textAlign: 'left', padding: '12px 14px', fontSize: '0.72rem', color: '#64748b', fontWeight: 800 }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '46px 12px', color: '#64748b', fontSize: '0.9rem' }}>
                                        Memuat variabel...
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '46px 12px', color: '#64748b' }}>
                                        <Variable size={38} color="#cbd5e1" style={{ marginBottom: '10px' }} />
                                        <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#334155' }}>No variables found</div>
                                        <div style={{ fontSize: '0.86rem', marginTop: '6px' }}>Try create one now.</div>
                                        <button
                                            onClick={openCreateEditor}
                                            style={{ marginTop: '14px', padding: '8px 12px', border: 'none', borderRadius: '6px', backgroundColor: '#3b82f6', color: 'white', fontWeight: 700, cursor: 'pointer' }}
                                        >
                                            + Create Variable
                                        </button>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((v) => (
                                    <tr key={v.id || v.name} style={{ borderTop: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '10px 14px', fontSize: '0.85rem', color: '#475569' }}>{VARIABLE_TYPES.find(t => t.value === v.type)?.label || v.type}</td>
                                        <td style={{ padding: '10px 14px', fontWeight: 700, fontSize: '0.85rem' }}>{v.name}</td>
                                        <td style={{ padding: '10px 14px', fontSize: '0.85rem', color: '#475569' }}>{String(v.defaultValue ?? '')}</td>
                                        <td style={{ padding: '10px 14px', fontSize: '0.85rem', color: '#475569' }}>{v.whereUsed || '-'}</td>
                                        <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                                            <button
                                                onClick={() => openEditEditor(v)}
                                                style={{ border: 'none', background: 'none', color: '#2563eb', cursor: 'pointer', marginRight: '8px' }}
                                                title="Edit variable"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(v)}
                                                style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer' }}
                                                title="Delete variable"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {editor.isOpen && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.35)', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', padding: '72px 24px', zIndex: 2000 }}>
                    <div style={{ width: '340px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 20px 35px rgba(15,23,42,0.18)' }}>
                        <div style={{ padding: '12px 14px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{editor.isEdit ? 'Edit Variable' : 'Create Variable'}</div>
                            <button onClick={() => setEditor({ isOpen: false, isEdit: false, variable: emptyVariable })} style={{ border: 'none', background: 'none', color: '#64748b', cursor: 'pointer' }}><X size={16} /></button>
                        </div>

                        <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: '#475569', marginBottom: '6px', fontWeight: 700 }}>Variable name</label>
                                <input
                                    value={editor.variable.name}
                                    onChange={(e) => setEditor({ ...editor, variable: { ...editor.variable, name: e.target.value.toUpperCase().replace(/\s+/g, '_') } })}
                                    style={{ width: '100%', padding: '9px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: '#475569', marginBottom: '6px', fontWeight: 700 }}>Variable type</label>
                                <select
                                    value={editor.variable.type}
                                    onChange={(e) => setEditor({ ...editor, variable: { ...editor.variable, type: e.target.value, defaultValue: '' } })}
                                    style={{ width: '100%', padding: '9px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
                                >
                                    {VARIABLE_TYPES.map((type) => (
                                        <option key={type.value} value={type.value}>{type.label}</option>
                                    ))}
                                </select>
                                <div style={{ marginTop: '6px', fontSize: '0.72rem', color: '#64748b' }}>
                                    {VARIABLE_TYPES.find(t => t.value === editor.variable.type)?.description}
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: '#475569', marginBottom: '6px', fontWeight: 700 }}>Default value</label>
                                {editor.variable.type === 'BOOLEAN' ? (
                                    <select
                                        value={String(Boolean(editor.variable.defaultValue))}
                                        onChange={(e) => setEditor({ ...editor, variable: { ...editor.variable, defaultValue: e.target.value === 'true' } })}
                                        style={{ width: '100%', padding: '9px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
                                    >
                                        <option value="false">False</option>
                                        <option value="true">True</option>
                                    </select>
                                ) : editor.variable.type === 'COLOR' ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: '42px 1fr', gap: '8px' }}>
                                        <input
                                            type="color"
                                            value={editor.variable.defaultValue || '#3b82f6'}
                                            onChange={(e) => setEditor({ ...editor, variable: { ...editor.variable, defaultValue: e.target.value } })}
                                            style={{ width: '42px', height: '38px', borderRadius: '6px', border: '1px solid #d1d5db', padding: 0 }}
                                        />
                                        <input
                                            value={editor.variable.defaultValue || ''}
                                            onChange={(e) => setEditor({ ...editor, variable: { ...editor.variable, defaultValue: e.target.value } })}
                                            placeholder="#3b82f6"
                                            style={{ width: '100%', padding: '9px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
                                        />
                                    </div>
                                ) : (editor.variable.type === 'IMAGE' || editor.variable.type === 'VIDEO') ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <input
                                            value={editor.variable.defaultValue || ''}
                                            onChange={(e) => setEditor({ ...editor, variable: { ...editor.variable, defaultValue: e.target.value } })}
                                            placeholder={`https://example.com/${editor.variable.type === 'IMAGE' ? 'image.png' : 'video.mp4'}`}
                                            style={{ width: '100%', padding: '9px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
                                        />
                                        <input
                                            type="file"
                                            accept={editor.variable.type === 'IMAGE' ? 'image/*' : 'video/*'}
                                            onChange={(e) => handleFileUpload(e.target.files?.[0])}
                                            style={{ fontSize: '0.8rem' }}
                                        />
                                    </div>
                                ) : (editor.variable.type === 'ARRAY' || editor.variable.type === 'OBJECT') ? (
                                    <textarea
                                        value={editor.variable.defaultValue || ''}
                                        onChange={(e) => setEditor({ ...editor, variable: { ...editor.variable, defaultValue: e.target.value } })}
                                        placeholder={editor.variable.type === 'ARRAY' ? '["a", "b"]' : '{"key":"value"}'}
                                        rows={4}
                                        style={{ width: '100%', padding: '9px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem', fontFamily: 'monospace' }}
                                    />
                                ) : (
                                    <input
                                        type={['NUMBER', 'INTEGER', 'INTERVAL'].includes(editor.variable.type) ? 'number' : (editor.variable.type === 'DATETIME' ? 'datetime-local' : 'text')}
                                        value={editor.variable.defaultValue}
                                        onChange={(e) => setEditor({ ...editor, variable: { ...editor.variable, defaultValue: e.target.value } })}
                                        style={{ width: '100%', padding: '9px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
                                    />
                                )}
                            </div>

                            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                                <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 700, marginBottom: '8px' }}>Validation</div>

                                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: '#334155', marginBottom: '8px' }}>
                                    <span>Required</span>
                                    <input
                                        type="checkbox"
                                        checked={Boolean(editor.variable.validationRules?.required)}
                                        onChange={(e) => setEditor({ ...editor, variable: { ...editor.variable, validationRules: { ...editor.variable.validationRules, required: e.target.checked } } })}
                                    />
                                </label>

                                {['NUMBER', 'INTEGER', 'INTERVAL'].includes(editor.variable.type) && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginBottom: '4px' }}>Min</label>
                                            <input
                                                type="number"
                                                value={editor.variable.validationRules?.min ?? ''}
                                                onChange={(e) => setEditor({ ...editor, variable: { ...editor.variable, validationRules: { ...editor.variable.validationRules, min: e.target.value } } })}
                                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.82rem' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginBottom: '4px' }}>Max</label>
                                            <input
                                                type="number"
                                                value={editor.variable.validationRules?.max ?? ''}
                                                onChange={(e) => setEditor({ ...editor, variable: { ...editor.variable, validationRules: { ...editor.variable.validationRules, max: e.target.value } } })}
                                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.82rem' }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {editor.variable.type === 'TEXT' && (
                                    <>
                                        <div style={{ marginBottom: '8px' }}>
                                            <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginBottom: '4px' }}>Regex</label>
                                            <input
                                                value={editor.variable.validationRules?.regex ?? ''}
                                                onChange={(e) => setEditor({ ...editor, variable: { ...editor.variable, validationRules: { ...editor.variable.validationRules, regex: e.target.value } } })}
                                                placeholder="contoh: ^[A-Z0-9_-]+$"
                                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.82rem' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginBottom: '4px' }}>Options (comma separated)</label>
                                            <input
                                                value={editor.variable.validationRules?.options ?? ''}
                                                onChange={(e) => setEditor({ ...editor, variable: { ...editor.variable, validationRules: { ...editor.variable.validationRules, options: e.target.value } } })}
                                                placeholder="OK, NG, HOLD"
                                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.82rem' }}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>

                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: '#334155' }}>
                                <span>Clear on completion</span>
                                <input
                                    type="checkbox"
                                    checked={editor.variable.clearOnCompletion}
                                    onChange={(e) => setEditor({ ...editor, variable: { ...editor.variable, clearOnCompletion: e.target.checked } })}
                                />
                            </label>

                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: '#334155' }}>
                                <span>Save for analysis</span>
                                <input
                                    type="checkbox"
                                    checked={editor.variable.saveForAnalysis}
                                    onChange={(e) => setEditor({ ...editor, variable: { ...editor.variable, saveForAnalysis: e.target.checked } })}
                                />
                            </label>
                        </div>

                        <div style={{ padding: '12px 14px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button onClick={() => setEditor({ isOpen: false, variable: emptyVariable })} style={{ border: '1px solid #d1d5db', backgroundColor: 'white', color: '#334155', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                            <button
                                onClick={handleSaveVariable}
                                disabled={saving}
                                style={{ border: 'none', backgroundColor: saving ? '#93c5fd' : '#3b82f6', color: 'white', padding: '8px 14px', borderRadius: '6px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700 }}
                            >
                                {saving ? 'Menyimpan...' : (editor.isEdit ? 'Save Changes' : '+ Create')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VariableManager;
