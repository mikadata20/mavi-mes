import { getSupabaseClient } from './supabaseManualDB.js';


/**
 * Fetch all global variables for the organization.
 */
export async function listGlobalVariables() {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('global_variables')
        .select('*')
        .order('name', { ascending: true });

    if (error) {
        console.error('[GlobalVars] Fetch failed:', error);
        return [];
    }
    return data || [];
}

/**
 * Update or create a global variable.
 */
export async function upsertGlobalVariable(name, type, value) {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    // In a real app, we'd fetch org_id from the session. 
    // For this lab/demo, we'll assume org_id is handled by a trigger/default or not strictly required for RLS in this context.
    const { data, error } = await supabase
        .from('global_variables')
        .upsert({ 
            name, 
            type, 
            value: { val: value }, // Wrap in object for JSONB
            last_updated: new Date().toISOString() 
        }, { onConflict: 'name' })
        .select()
        .single();

    if (error) {
        console.error('[GlobalVars] Upsert failed:', error);
        return null;
    }
    return data;
}

/**
 * Subscribe to real-time changes of global variables.
 */
export function subscribeToGlobalVariables(onUpdate) {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const channel = supabase
        .channel('global_vars_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'global_variables' }, (payload) => {
            onUpdate(payload);
        })
        .subscribe();

    return channel;
}
