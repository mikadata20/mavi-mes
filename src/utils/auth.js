/**
 * auth.js
 * =====================================================
 * Frontend Mock Authentication Utility for MAVI-MES
 * =====================================================
 */

const AUTH_KEY = 'mavi_mes_auth_session';
const USERS_STORAGE_KEY = 'mavi_mes_users_list';

// Preconfigured factory users (fallback if DB is empty)
const DEFAULT_USERS = [
    { id: 'usr-admin', username: 'admin', password: '123', name: 'System Admin', role: 'ADMIN' },
    { id: 'usr-eng', username: 'engineer', password: '123', name: 'Manufacturing Engineer', role: 'ENGINEER' },
    { id: 'usr-operator', username: 'operator', password: '123', name: 'Station Operator', role: 'OPERATOR' }
];

/**
 * Ensures that the internal localStorage DB for users is populated.
 * @returns {Array} List of all registered users
 */
export function getAllUsers() {
    try {
        const rawUsers = localStorage.getItem(USERS_STORAGE_KEY);
        if (rawUsers) {
            const parsed = JSON.parse(rawUsers);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
        }
    } catch (err) {
        console.error('Failed to read users DB from localStorage', err);
    }
    
    // Fallback: Initialize and return defaults
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
}

/**
 * Creates or updates a user in the localStorage DB.
 * @param {object} user - The user object to save
 * @returns {boolean} Success state
 */
export function saveUser(user) {
    if (!user || !user.username) return false;
    
    try {
        const users = getAllUsers();
        const existingIndex = users.findIndex(u => u.id === user.id);
        
        let targetUser = { ...user };
        // Ensure new users get an ID
        if (!targetUser.id) {
            targetUser.id = 'usr-' + Date.now();
        }

        if (existingIndex >= 0) {
            // Update existing
            users[existingIndex] = targetUser;
        } else {
            // Anti-duplicate username check
            const usernameExists = users.some(u => u.username.toLowerCase() === targetUser.username.toLowerCase());
            if (usernameExists) throw new Error('Username already exists');
            // Add new
            users.push(targetUser);
        }

        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
        return targetUser;
    } catch (err) {
        console.error('Failed to save user', err);
        throw err;
    }
}

/**
 * Deletes a user from the localStorage DB. 
 * Prevents deletion of the core 'admin' user.
 * @param {string} userId
 */
export function deleteUser(userId) {
    const users = getAllUsers();
    
    // Safety check
    const userToDelete = users.find(u => u.id === userId);
    if (!userToDelete) return false;
    if (userToDelete.username === 'admin') {
        throw new Error('Default system administrator cannot be deleted');
    }

    const updatedUsers = users.filter(u => u.id !== userId);
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));
    return true;
}

/**
 * Attempts to login with a username and password.
 * @param {string} username 
 * @param {string} password 
 * @returns {object|null} The user object if successful, null otherwise.
 */
export function login(username, password) {
    const users = getAllUsers();
    const user = users.find(u => 
        u.username.toLowerCase() === username.toLowerCase() && 
        u.password === password
    );

    if (user) {
        // Strip out the password before saving to local storage active session
        const { password, ...safeUser } = user;
        localStorage.setItem(AUTH_KEY, JSON.stringify(safeUser));
        return safeUser;
    }

    return null;
}

/**
 * Retrieves the currently logged in user session.
 * @returns {object|null}
 */
export function getCurrentUser() {
    try {
        const session = localStorage.getItem(AUTH_KEY);
        if (session) {
            return JSON.parse(session);
        }
    } catch (err) {
        console.error('Failed to read auth session', err);
    }
    return null;
}

/**
 * Logs out the current user by clearing the session.
 */
export function logout() {
    localStorage.removeItem(AUTH_KEY);
}

/**
 * Checks if the user has higher level privileges (Builder access).
 * @param {object} user 
 * @returns {boolean}
 */
export function isPrivileged(user) {
    if (!user) return false;
    return user.role === 'ADMIN' || user.role === 'ENGINEER';
}
