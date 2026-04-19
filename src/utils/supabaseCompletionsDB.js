import { getSupabaseClient } from './supabaseManualDB';

/**
 * App Completions Data Utility
 * Handles immutable records of app execution.
 */

/**
 * Saves a new completion record.
 * @param {Object} completionData 
 */
export const saveCompletion = async (completionData) => {
    try {
        const supabase = getSupabaseClient();
        if (!supabase) throw new Error('Supabase client not configured');

        const { data, error } = await supabase
            .from('completions')
            .insert([
                {
                    app_id: completionData.appId,
                    app_name: completionData.appName,
                    app_version: completionData.appVersion,
                    user_id: completionData.userId,
                    user_email: completionData.userEmail,
                    station_name: completionData.stationName,
                    start_time: completionData.startTime,
                    end_time: completionData.endTime,
                    duration_ms: completionData.durationMs,
                    status: completionData.status, // COMPLETED, CANCELED, SAVED
                    variables_snapshot: completionData.variables,
                    step_history: completionData.stepHistory,
                    metadata: completionData.metadata || {}
                }
            ])
            .select();

        if (error) throw error;
        return data[0];
    } catch (error) {
        console.error('Error saving completion:', error);
        throw error;
    }
};

/**
 * Fetches all completions for a specific app.
 * @param {string} appId 
 */
export const getCompletionsByApp = async (appId) => {
    try {
        const supabase = getSupabaseClient();
        if (!supabase) return [];

        const { data, error } = await supabase
            .from('completions')
            .select('*')
            .eq('app_id', appId)
            .order('end_time', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching completions:', error);
        return [];
    }
};

/**
 * Fetches detail for a specific completion record.
 * @param {string} id 
 */
export const getCompletionDetail = async (id) => {
    try {
        const supabase = getSupabaseClient();
        if (!supabase) return null;

        const { data, error } = await supabase
            .from('completions')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching completion detail:', error);
        return null;
    }
};

