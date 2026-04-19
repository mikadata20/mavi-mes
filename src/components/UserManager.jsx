import React, { useState, useEffect } from 'react';
import { 
    Users, Plus, Search, Edit3, Trash2, X, Save, 
    ShieldAlert, AlertCircle, ShieldCheck, Wrench, User as UserIcon
} from 'lucide-react';
import { getAllUsers, saveUser, deleteUser } from '../utils/auth';

const UserManager = () => {
    const [users, setUsers] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = () => {
        const data = getAllUsers() || [];
        setUsers(data);
    };

    const handleAddUser = () => {
        setError('');
        setSuccess('');
        setCurrentUser({ username: '', password: '', name: '', role: 'OPERATOR' });
        setIsEditing(true);
    };

    const handleEditUser = (u) => {
        setError('');
        setSuccess('');
        // Ensure password isn't fully exposed unless retrieved or reset, but since it's mock local DB we'll allow seeing it.
        const allLocalStore = getAllUsers();
        const fullUser = allLocalStore.find(stored => stored.id === u.id) || u;
        setCurrentUser({ ...fullUser });
        setIsEditing(true);
    };

    const handleDeleteUser = (u) => {
        if (u.username === 'admin') {
            setError('Cannot delete the default system administrator account.');
            return;
        }
        if (window.confirm(`Are you sure you want to delete the user "${u.username}"?`)) {
            try {
                deleteUser(u.id);
                setSuccess('User successfully deleted.');
                loadUsers();
            } catch (err) {
                setError(err.message || 'Failed to delete user.');
            }
        }
    };

    const handleSaveUser = () => {
        try {
            if (!currentUser.username || !currentUser.name || !currentUser.password) {
                setError('Please fill in all required fields (Name, Username, Password).');
                return;
            }
            if (currentUser.username.toLowerCase() === 'admin' && currentUser.id !== 'usr-admin') {
                setError('Username "admin" is globally reserved.');
                return;
            }

            saveUser(currentUser);
            setSuccess(`User ${currentUser.username} successfully saved.`);
            setIsEditing(false);
            loadUsers();
        } catch (err) {
            setError(err.message || 'Failed to save user.');
        }
    };

    const filteredUsers = users.filter(u => 
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.username?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.role?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getRoleBadge = (role) => {
        switch(role) {
            case 'ADMIN': return { icon: <ShieldAlert size={14}/>, color: '#991b1b', bg: '#fee2e2' };
            case 'ENGINEER': return { icon: <Wrench size={14}/>, color: '#1d4ed8', bg: '#dbeafe' };
            case 'OPERATOR': return { icon: <UserIcon size={14}/>, color: '#166534', bg: '#dcfce7' };
            default: return { icon: <ShieldCheck size={14}/>, color: '#475569', bg: '#f1f5f9' };
        }
    };

    return (
        <div style={{ padding: '24px', flex: 1, backgroundColor: 'var(--bg-primary)', overflowVertical: 'auto', fontFamily: "'Inter', sans-serif" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={24} color="#3b82f6" /> User Access Management
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0', fontSize: '0.9rem' }}>
                        Manage factory accounts, passwords, and assigned privileges.
                    </p>
                </div>
                <button
                    onClick={handleAddUser}
                    style={{
                        padding: '10px 16px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)'
                    }}
                >
                    <Plus size={18} /> Add User
                </button>
            </div>

            {error && (
                <div style={{ marginBottom: '20px', padding: '12px 16px', backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #ef4444', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.9rem' }}>
                    <AlertCircle size={18} /> {error}
                </div>
            )}

            {success && (
                <div style={{ marginBottom: '20px', padding: '12px 16px', backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #22c55e', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.9rem' }}>
                    <ShieldCheck size={18} /> {success}
                </div>
            )}

            <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                {/* Toolbar */}
                <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '16px' }}>
                    <div style={{ position: 'relative', width: '300px' }}>
                        <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                            type="text"
                            placeholder="Find by name, role, or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px 12px 8px 36px',
                                border: '1px solid var(--border-color)',
                                borderRadius: '6px',
                                fontSize: '0.9rem',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>
                </div>

                {/* Table */}
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)' }}>
                                <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Full Name</th>
                                <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Username / Operator ID</th>
                                <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Assigned Role</th>
                                <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        No active users found.
                                    </td>
                                </tr>
                            ) : filteredUsers.map(u => {
                                const badge = getRoleBadge(u.role);
                                return (
                                    <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                        <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</td>
                                        <td style={{ padding: '12px 16px', color: '#475569', fontSize: '0.9rem', fontFamily: 'monospace' }}>{u.username}</td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{ 
                                                display: 'inline-flex', padding: '4px 8px', borderRadius: '12px', alignItems: 'center', gap: '4px',
                                                backgroundColor: badge.bg, color: badge.color, fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.5px' 
                                            }}>
                                                {badge.icon} {u.role}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button onClick={() => handleEditUser(u)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }} title="Edit Profile">
                                                    <Edit3 size={18} />
                                                </button>
                                                <button onClick={() => handleDeleteUser(u)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }} title="Revoke Access" disabled={u.username === 'admin'}>
                                                    <Trash2 size={18} opacity={u.username === 'admin' ? 0.3 : 1} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit / Add Modal */}
            {isEditing && currentUser && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '450px', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', overflow: 'hidden' }}>
                        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-primary)' }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                                {currentUser.id ? 'Edit User Profile' : 'Register New User'}
                            </h2>
                            <button onClick={() => setIsEditing(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}>
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>Full Name <span style={{color: '#ef4444'}}>*</span></label>
                                <input
                                    type="text"
                                    value={currentUser.name}
                                    placeholder="e.g. John Doe"
                                    onChange={(e) => setCurrentUser({...currentUser, name: e.target.value})}
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>Username (Operator ID) <span style={{color: '#ef4444'}}>*</span></label>
                                <input
                                    type="text"
                                    value={currentUser.username}
                                    placeholder="e.g. op_john1"
                                    disabled={currentUser.username === 'admin'}
                                    onChange={(e) => setCurrentUser({...currentUser, username: e.target.value.replace(/\s+/g, '_')})}
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none', boxSizing: 'border-box', backgroundColor: currentUser.username === 'admin' ? '#f1f5f9' : 'white' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>Password / PIN <span style={{color: '#ef4444'}}>*</span></label>
                                <input
                                    type="text"
                                    value={currentUser.password}
                                    placeholder="Secret pin or password"
                                    onChange={(e) => setCurrentUser({...currentUser, password: e.target.value})}
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none', boxSizing: 'border-box' }}
                                />
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>In plain text for testing purposes.</div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>App Privilege Level <span style={{color: '#ef4444'}}>*</span></label>
                                <select
                                    value={currentUser.role}
                                    onChange={(e) => setCurrentUser({...currentUser, role: e.target.value})}
                                    disabled={currentUser.username === 'admin'}
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none', appearance: 'none', boxSizing: 'border-box', backgroundColor: currentUser.username === 'admin' ? '#f1f5f9' : 'white' }}
                                >
                                    <option value="OPERATOR">OPERATOR - Execute Only (Live Terminal)</option>
                                    <option value="ENGINEER">ENGINEER - App Building & Configuration</option>
                                    <option value="ADMIN">ADMIN - Global System Access</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ padding: '16px 24px', backgroundColor: 'var(--bg-primary)', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button onClick={() => setIsEditing(false)} style={{ padding: '10px 16px', backgroundColor: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
                                Cancel
                            </button>
                            <button onClick={handleSaveUser} style={{ padding: '10px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Save size={16} /> Save User
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManager;
