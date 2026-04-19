import { getSupabaseClient } from './supabaseManualDB.js';

export async function getTables() {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('app_tables')
        .select('*')
        .order('name');
    if (error) {
        if (error.code === '42P01') return [];
        throw error;
    }
    return data || [];
}

/**
 * supabaseFrontlineDB.js
 * Utility functions for custom frontline apps.
 */

export async function getAllFrontlineApps() {
    try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('frontline_apps')
            .select('*')
            .order('name');
        
        if (error) {
            console.warn('[Offline Mode] Supabase query failed, attempting to load from cache...', error);
            throw error;
        }

        const normalizedData = (data || []).map(app => {
            if (app.config && app.config.iotConfig && app.config.iotConfig.brokerUrl) {
                let url = app.config.iotConfig.brokerUrl;
                if (url === 'ws://broker.emqx.io:8083/mqtt') url = 'wss://broker.emqx.io:8084/mqtt';
                else if (url.startsWith('ws://') && typeof window !== 'undefined' && window.location.protocol === 'https:') {
                    url = url.replace('ws://', 'wss://');
                }
                if (url !== app.config.iotConfig.brokerUrl) {
                    return { ...app, config: { ...app.config, iotConfig: { ...app.config.iotConfig, brokerUrl: url } } };
                }
            }
            return app;
        });

        // Save successfully fetched apps to offline cache
        if (typeof window !== 'undefined') {
            localStorage.setItem('offline_apps_cache', JSON.stringify(normalizedData));
        }

        return normalizedData;
    } catch (err) {
        if (typeof window !== 'undefined') {
            try {
                const cachedApps = localStorage.getItem('offline_apps_cache');
                if (cachedApps) {
                    console.log('[Offline Mode] Successfully returned apps from local storage cache.');
                    return JSON.parse(cachedApps);
                }
            } catch (e) {
                console.error('[Offline Mode] Failed to parse local storage cache', e);
            }
        }
        return []; // Return empty array if completely offline and no configuration present
    }
}

export async function saveFrontlineApp(app) {
    const payload = {
        name: app.name,
        category: app.category || 'Shop Floor',
        config: app.config || { components: [] },
        // Governance fields
        is_published: app.is_published ?? false,
        approval_status: app.approval_status || 'DRAFT',
        version: app.version || 1,
        updated_at: new Date().toISOString()
    };

    try {
        const supabase = getSupabaseClient();
        const saveWithPayload = async (currentPayload) => {
            if (app.id) {
                return await supabase
                    .from('frontline_apps')
                    .update(currentPayload)
                    .eq('id', app.id)
                    .select()
                    .single();
            } else {
                return await supabase
                    .from('frontline_apps')
                    .insert({ ...currentPayload, created_at: new Date().toISOString() })
                    .select()
                    .single();
            }
        };

        let result = await saveWithPayload(payload);

        // Backward compatibility if DB schema doesn't have category yet
        if (result.error && String(result.error.message || '').includes('category')) {
            const fallbackPayload = { ...payload };
            delete fallbackPayload.category;
            result = await saveWithPayload(fallbackPayload);
        }

        // NEW: Fallback for Enterprise Governance fields if migration hasn't been run
        if (result.error && (
            String(result.error.message || '').includes('is_published') ||
            String(result.error.message || '').includes('approval_status') ||
            String(result.error.message || '').includes('version')
        )) {
            console.warn('[Supabase] Governance columns missing, falling back to legacy save.');
            const legacyPayload = {
                name: payload.name,
                category: payload.category, // might still fail if category is also missing
                config: payload.config,
                updated_at: payload.updated_at
            };
            if (result.error && String(result.error.message || '').includes('category')) {
                delete legacyPayload.category;
            }
            result = await saveWithPayload(legacyPayload);
        }

        if (result.error) {
            console.error('[Supabase] Save failed permanently:', result.error);
            throw result.error;
        }
        return result.data;
    } catch (err) {
        console.warn('[Offline Mode] Intercepting save, applying to localStorage cache', err);
        const cached = JSON.parse(localStorage.getItem('offline_apps_cache') || '[]');
        let outputApp = { ...app, ...payload };
        
        if (app.id) {
            const index = cached.findIndex(a => a.id === app.id);
            if (index > -1) cached[index] = outputApp;
            else cached.push(outputApp);
        } else {
            const newId = `app_${Date.now()}`;
            outputApp.id = newId;
            cached.push(outputApp);
        }
        localStorage.setItem('offline_apps_cache', JSON.stringify(cached));
        return outputApp;
    }
}

/**
 * Publish a draft to the shop floor.
 * Copies working 'config' to 'published_config'.
 */
export async function publishApp(appId) {
    const supabase = getSupabaseClient();
    
    // 1. Get current draft
    const { data: app, error: fetchError } = await supabase
        .from('frontline_apps')
        .select('*')
        .eq('id', appId)
        .single();
    
    if (fetchError) throw fetchError;

    // 2. Increment version and copy config
    const { data, error } = await supabase
        .from('frontline_apps')
        .update({
            published_config: app.config,
            is_published: true,
            approval_status: 'PUBLISHED', // Auto-approve if publishing directly for now
            version: (app.version || 0) + 1,
            updated_at: new Date().toISOString()
        })
        .eq('id', appId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function requestApproval(appId) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('frontline_apps')
        .update({
            approval_status: 'PENDING',
            updated_at: new Date().toISOString()
        })
        .eq('id', appId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function approveApp(appId, operatorId) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('frontline_apps')
        .update({
            approval_status: 'APPROVED',
            approved_by: operatorId,
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq('id', appId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteFrontlineApp(id) {
    try {
        const supabase = getSupabaseClient();

        // Delete dependent queue rows first to avoid FK conflicts (409 / 23503)
        // when production_queue.app_id still references this frontline app.
        const { error: queueError } = await supabase
            .from('production_queue')
            .delete()
            .eq('app_id', id);

        if (queueError) {
            // Ignore when table does not exist in older schemas, otherwise surface error.
            const isMissingTable = queueError.code === '42P01' || String(queueError.message || '').toLowerCase().includes('production_queue');
            if (!isMissingTable) throw queueError;
        }

        const { error } = await supabase
            .from('frontline_apps')
            .delete()
            .eq('id', id);

        if (error) {
            const isFkConflict = error.code === '23503' || String(error.message || '').toLowerCase().includes('foreign key');
            if (isFkConflict) {
                throw new Error('Cannot delete app because it is still referenced by related records. Remove dependent records first, then retry.');
            }
            throw error;
        }

        return true;
    } catch (err) {
        console.warn('[Offline Mode] Intercepting delete, applying to localStorage cache', err);
        const cached = JSON.parse(localStorage.getItem('offline_apps_cache') || '[]');
        const nextCached = cached.filter(a => a.id !== id);
        localStorage.setItem('offline_apps_cache', JSON.stringify(nextCached));
        return true;
    }
}

export async function getProductionQueue() {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('production_queue')
        .select('*')
        .eq('status', 'PENDING')
        .order('priority', { ascending: true })
        .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
}

export async function createProductionJob(job) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('production_queue')
        .insert([{
            work_order: job.work_order,
            app_id: job.app_id,
            target_qty: job.target_qty,
            priority: job.priority || 'P2',
            status: 'PENDING',
            created_at: new Date().toISOString()
        }])
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function updateJobStatus(id, status) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('production_queue')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
}

// ─── App Variables ────────────────────────────────────────────────────────────

export async function getAllVariables() {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('app_variables')
        .select('*')
        .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
}

export async function saveVariable(variable) {
    const supabase = getSupabaseClient();
    const basePayload = {
        name: variable.name,
        type: variable.type,
        default_value: variable.defaultValue !== undefined ? JSON.stringify(variable.defaultValue) : null,
        clear_on_completion: variable.clearOnCompletion ?? true,
        save_for_analysis: variable.saveForAnalysis ?? true,
        where_used: variable.whereUsed || '-',
        updated_at: new Date().toISOString()
    };

    const payloadWithValidation = {
        ...basePayload,
        validation_rules: variable.validationRules || {}
    };

    const saveWithPayload = async (payload) => {
        if (variable.id) {
            return await supabase
                .from('app_variables')
                .update(payload)
                .eq('id', variable.id)
                .select()
                .single();
        }
        return await supabase
            .from('app_variables')
            .insert({ ...payload, created_at: new Date().toISOString() })
            .select()
            .single();
    };

    let result = await saveWithPayload(payloadWithValidation);

    // Backward compatibility if old DB schema doesn't have validation_rules yet.
    if (result.error && String(result.error.message || '').includes('validation_rules')) {
        result = await saveWithPayload(basePayload);
    }

    if (result.error) throw result.error;
    return result.data;
}

export async function deleteVariable(id) {
    const supabase = getSupabaseClient();
    const { error } = await supabase
        .from('app_variables')
        .delete()
        .eq('id', id);
    if (error) throw error;
    return true;
}

// ─── Saved Analyses & Dashboards ──────────────────────────────────────────────

export async function getAllSavedAnalyses() {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('saved_analyses')
        .select('*')
        .order('name');
    if (error) {
        // Fallback for missing table during initial dev
        if (error.code === '42P01') return []; 
        throw error;
    }
    return data || [];
}

export async function saveAnalysis(analysis) {
    const supabase = getSupabaseClient();
    const payload = {
        name: analysis.name,
        description: analysis.description || '',
        config: analysis.config || {},
        updated_at: new Date().toISOString()
    };

    if (analysis.id) {
        const { data, error } = await supabase
            .from('saved_analyses')
            .update(payload)
            .eq('id', analysis.id)
            .select()
            .single();
        if (error) throw error;
        return data;
    } else {
        const { data, error } = await supabase
            .from('saved_analyses')
            .insert({ ...payload, created_at: new Date().toISOString() })
            .select()
            .single();
        if (error) throw error;
        return data;
    }
}

export async function deleteAnalysis(id) {
    const supabase = getSupabaseClient();
    const { error } = await supabase
        .from('saved_analyses')
        .delete()
        .eq('id', id);
    if (error) throw error;
    return true;
}

export async function getAllDashboards() {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('dashboards')
        .select('*')
        .order('name');
    if (error) {
        if (error.code === '42P01') return [];
        throw error;
    }
    return data || [];
}

export async function saveDashboard(dashboard) {
    const supabase = getSupabaseClient();
    const payload = {
        name: dashboard.name,
        description: dashboard.description || '',
        layout: dashboard.layout || [],
        updated_at: new Date().toISOString()
    };

    if (dashboard.id) {
        const { data, error } = await supabase
            .from('dashboards')
            .update(payload)
            .eq('id', dashboard.id)
            .select()
            .single();
        if (error) throw error;
        return data;
    } else {
        const { data, error } = await supabase
            .from('dashboards')
            .insert({ ...payload, created_at: new Date().toISOString() })
            .select()
            .single();
        if (error) throw error;
        return data;
    }
}

export async function deleteDashboard(id) {
    const supabase = getSupabaseClient();
    const { error } = await supabase
        .from('dashboards')
        .delete()
        .eq('id', id);
    if (error) throw error;
    return true;
}
