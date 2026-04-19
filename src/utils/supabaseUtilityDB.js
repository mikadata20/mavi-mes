/**
 * supabaseUtilityDB.js
 * =====================================================
 * Storage layer for MAVi Cameras and Datasets using Supabase.
 * =====================================================
 */
import { getSupabaseClient } from './supabaseManualDB.js';

// ── Cameras ──────────────────────────────────────────

export async function getAllCameras() {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('cameras')
        .select('*')
        .order('name');
    if (error) throw error;
    return data || [];
}

export async function saveCamera(camera) {
    const supabase = getSupabaseClient();
    const payload = {
        name: camera.name,
        url: camera.url,
        type: camera.type,
        settings: camera.settings || {},
        updated_at: new Date().toISOString()
    };

    let result;
    if (camera.id) {
        result = await supabase.from('cameras').update(payload).eq('id', camera.id).select().single();
    } else {
        result = await supabase.from('cameras').insert({ ...payload, created_at: new Date().toISOString() }).select().single();
    }
    if (result.error) throw result.error;
    return result.data;
}

export async function deleteCamera(id) {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('cameras').delete().eq('id', id);
    if (error) throw error;
    return true;
}

// ── Datasets ─────────────────────────────────────────

export async function getAllDatasets() {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('datasets')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
}

export async function saveDataset(dataset) {
    const supabase = getSupabaseClient();
    const payload = {
        name: dataset.name,
        project_name: dataset.projectName,
        clip_id: dataset.clipId,
        folder_id: dataset.folderId,
        zip_url: dataset.zipUrl,
        metadata: dataset.metadata || {},
        updated_at: new Date().toISOString()
    };

    let result;
    if (dataset.id) {
        result = await supabase.from('datasets').update(payload).eq('id', dataset.id).select().single();
    } else {
        result = await supabase.from('datasets').insert({ ...payload, created_at: new Date().toISOString() }).select().single();
    }
    if (result.error) throw result.error;
    return result.data;
}

export async function deleteDataset(id) {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('datasets').delete().eq('id', id);
    if (error) throw error;
    return true;
}

// ── Live Terminal Measurements ───────────────────────

export async function saveLiveMeasurement(data) {
    const supabase = getSupabaseClient();
    const payload = {
        video_name: data.video_name || `LIVE_${new Date().getTime()}`,
        timestamp: new Date().toISOString(),
        measurements: data.measurements || {},
        cycle_data: data.cycle_data || [],
        narration: data.narration || 'Live Terminal Production Cycle',
        created_at: new Date().toISOString()
    };

    const { data: result, error } = await supabase
        .from('measurements')
        .insert(payload)
        .select()
        .single();

    if (error) throw error;
    return result;
}
