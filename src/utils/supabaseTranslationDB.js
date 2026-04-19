/**
 * supabaseTranslationDB.js
 * =====================================================
 * Storage layer for MAVi Dynamic Translations using Supabase.
 * =====================================================
 */
import { getSupabaseClient } from './supabaseManualDB.js';

/**
 * Fetch all translations.
 */
export async function getDynamicTranslations() {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('dynamic_translations')
        .select('*');

    if (error) throw error;

    // Convert to map { [key]: { en, tr, ... } }
    return (data || []).reduce((acc, item) => {
        acc[item.key_string] = item.translations;
        return acc;
    }, {});
}

/**
 * Update a specific language value for a key.
 */
export async function updateTranslation(key, lang, value) {
    const supabase = getSupabaseClient();

    // Get existing first
    const { data: existing } = await supabase
        .from('dynamic_translations')
        .select('*')
        .eq('key_string', key)
        .maybeSingle();

    const translations = existing ? existing.translations : {};
    translations[lang] = value;

    const { data, error } = await supabase
        .from('dynamic_translations')
        .upsert({
            key_string: key,
            translations,
            updated_at: new Date().toISOString()
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Upsert full translation object for a key.
 */
export async function upsertTranslation(key, translations) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('dynamic_translations')
        .upsert({
            key_string: key,
            translations,
            updated_at: new Date().toISOString()
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Delete a translation key.
 */
export async function deleteTranslation(key) {
    const supabase = getSupabaseClient();
    const { error } = await supabase
        .from('dynamic_translations')
        .delete()
        .eq('key_string', key);

    if (error) throw error;
    return true;
}
