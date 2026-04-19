import React, { useEffect, useMemo, useState } from 'react';
import { addTableRecord, getTableRecords, getTables } from '../utils/database';

const AppSheetBuilder = () => {
    const [tables, setTables] = useState([]);
    const [selectedTableId, setSelectedTableId] = useState('');
    const [values, setValues] = useState({});
    const [recordId, setRecordId] = useState('');
    const [recentRecords, setRecentRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const selectedTable = useMemo(() => tables.find((t) => t.id === selectedTableId) || null, [tables, selectedTableId]);
    const fields = useMemo(() => (selectedTable?.fields || []).filter((f) => !f.archived), [selectedTable]);

    const loadTables = async () => {
        setLoading(true);
        try {
            const data = await getTables();
            setTables(data || []);
            if (!selectedTableId && data?.length) {
                setSelectedTableId(data[0].id);
            }
        } catch (err) {
            setError(`Failed load tables: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const loadRecentRecords = async (tableId) => {
        if (!tableId) return;
        try {
            const rows = await getTableRecords(tableId);
            setRecentRecords((rows || []).slice(-8).reverse());
        } catch {
            setRecentRecords([]);
        }
    };

    useEffect(() => {
        loadTables();
    }, []);

    useEffect(() => {
        setValues({});
        setMessage('');
        setError('');
        if (selectedTableId) loadRecentRecords(selectedTableId);
    }, [selectedTableId]);

    const castByType = (type, value) => {
        if (value === '' || value === null || value === undefined) return '';
        if (['number', 'integer', 'interval'].includes(type)) return Number(value);
        if (type === 'boolean') return Boolean(value);
        return value;
    };

    const autoGenerateRecordId = () => {
        const now = new Date();
        const code = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${now.getHours()}${now.getMinutes()}${now.getSeconds()}`;
        setRecordId(`REC-${code}`);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        if (!selectedTableId) {
            setError('Please choose table first.');
            return;
        }
        if (!recordId.trim()) {
            setError('Record ID wajib diisi.');
            return;
        }

        setSubmitting(true);
        try {
            const payload = fields.reduce((acc, field) => {
                acc[field.name] = castByType(field.type, values[field.name]);
                return acc;
            }, {});

            await addTableRecord(selectedTableId, { recordId: recordId.trim(), ...payload });
            setMessage('Data berhasil disimpan ke table.');
            setRecordId('');
            setValues({});
            await loadRecentRecords(selectedTableId);
        } catch (err) {
            setError(err.message || 'Gagal menyimpan data');
        } finally {
            setSubmitting(false);
        }
    };

    const renderInput = (field) => {
        const value = values[field.name] ?? '';
        if (field.type === 'boolean') {
            return (
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                    <input
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={(e) => setValues((prev) => ({ ...prev, [field.name]: e.target.checked }))}
                    />
                    <span style={{ color: '#475569', fontSize: '0.9rem' }}>Checked</span>
                </label>
            );
        }

        const inputType =
            field.type === 'datetime'
                ? 'datetime-local'
                : ['number', 'integer', 'interval'].includes(field.type)
                    ? 'number'
                    : field.type === 'color'
                        ? 'color'
                        : 'text';

        return (
            <input
                type={inputType}
                value={value}
                onChange={(e) => setValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
                placeholder={`Input ${field.name}`}
                style={{ width: '100%', marginTop: '8px', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
            />
        );
    };

    return (
        <div style={{ height: '100%', overflowY: 'auto', backgroundColor: '#f8fafc', padding: '26px', fontFamily: "'Inter', sans-serif" }}>
            <div style={{ maxWidth: '1080px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
                <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px' }}>
                    <h2 style={{ margin: 0, color: '#0f172a' }}>AppSheet - Data Entry Form</h2>
                    <p style={{ marginTop: '8px', color: '#64748b' }}>Buat form entry yang langsung simpan ke data table.</p>

                    <div style={{ marginTop: '16px' }}>
                        <label style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 700 }}>Pilih Table</label>
                        <select
                            value={selectedTableId}
                            onChange={(e) => setSelectedTableId(e.target.value)}
                            style={{ width: '100%', marginTop: '8px', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                        >
                            {(tables || []).map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {loading ? (
                        <p style={{ color: '#64748b' }}>Loading tables...</p>
                    ) : !selectedTable ? (
                        <p style={{ color: '#dc2626', marginTop: '14px' }}>Belum ada table. Buat dulu di menu Tables.</p>
                    ) : (
                        <form onSubmit={handleSubmit} style={{ marginTop: '14px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
                                <div>
                                    <label style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 700 }}>Record ID</label>
                                    <input
                                        value={recordId}
                                        onChange={(e) => setRecordId(e.target.value)}
                                        placeholder="WO-0001"
                                        style={{ width: '100%', marginTop: '8px', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                                    />
                                </div>
                                <button type="button" onClick={autoGenerateRecordId} style={{ alignSelf: 'end', padding: '10px 12px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '8px', cursor: 'pointer' }}>
                                    Auto ID
                                </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                                {fields.map((field) => (
                                    <div key={field.name}>
                                        <label style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 700 }}>
                                            {field.name} <span style={{ color: '#94a3b8', fontWeight: 500 }}>({field.type})</span>
                                        </label>
                                        {renderInput(field)}
                                    </div>
                                ))}
                            </div>

                            {message && <div style={{ marginTop: '12px', color: '#16a34a', fontWeight: 700 }}>{message}</div>}
                            {error && <div style={{ marginTop: '12px', color: '#dc2626', fontWeight: 700 }}>{error}</div>}

                            <button
                                type="submit"
                                disabled={submitting || !selectedTable}
                                style={{ marginTop: '14px', padding: '12px 16px', border: 'none', backgroundColor: '#2563eb', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 800 }}
                            >
                                {submitting ? 'Saving...' : 'Submit to Table'}
                            </button>
                        </form>
                    )}
                </div>

                <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px' }}>
                    <h3 style={{ margin: 0, color: '#0f172a' }}>Recent Records</h3>
                    <p style={{ marginTop: '8px', color: '#64748b' }}>8 data terakhir dari table terpilih.</p>

                    <div style={{ marginTop: '12px', display: 'grid', gap: '8px' }}>
                        {recentRecords.length === 0 ? (
                            <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#94a3b8' }}>Belum ada data.</div>
                        ) : (
                            recentRecords.map((row) => (
                                <div key={row.id} style={{ padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>{row.recordId}</div>
                                    <div style={{ fontSize: '0.73rem', color: '#64748b', marginTop: '4px' }}>{new Date(row.createdAt).toLocaleString()}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AppSheetBuilder;
