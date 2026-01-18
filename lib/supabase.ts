import { createClient } from '@supabase/supabase-js';
import { EntityProfile, GeneratedImage } from '../types';

// Supabase client initialization
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not found. Falling back to IndexedDB.');
}

export const supabase = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// ============================================
// PROFILES CRUD
// ============================================

export async function getProfiles(): Promise<EntityProfile[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching profiles:', error);
        return [];
    }

    // Map database columns to EntityProfile interface
    return (data || []).map(row => ({
        id: row.id,
        name: row.name,
        description: row.description || '',
        images: row.images || [],
        type: row.type,
        isAI: row.is_ai,
        dimensions: row.dimensions,
        createdAt: new Date(row.created_at).getTime(),
        updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : undefined
    }));
}

export async function saveProfile(profile: EntityProfile): Promise<void> {
    if (!supabase) return;

    const { error } = await supabase
        .from('profiles')
        .upsert({
            id: profile.id,
            type: profile.type,
            name: profile.name,
            description: profile.description,
            images: profile.images,
            dimensions: profile.dimensions,
            is_ai: profile.isAI || false,
            updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

    if (error) {
        console.error('Error saving profile:', error);
        throw error;
    }
}

export async function deleteProfile(id: string): Promise<void> {
    if (!supabase) return;

    const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting profile:', error);
        throw error;
    }
}

// ============================================
// GALLERY CRUD
// ============================================

export async function getGallery(): Promise<GeneratedImage[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('gallery')
        .select('*')
        .order('timestamp', { ascending: false });

    if (error) {
        console.error('Error fetching gallery:', error);
        return [];
    }

    // Map database columns to GeneratedImage interface
    return (data || []).map(row => ({
        id: row.id,
        url: row.url,
        prompt: row.prompt || '',
        mode: row.mode,
        productId: row.product_id,
        personId: row.person_id,
        locationId: row.location_id,
        styleId: row.style_id,
        timestamp: row.timestamp,
        feedback: row.feedback,
        parentId: row.parent_id,
        generationTime: row.generation_time,
        metadata: row.metadata
    }));
}

export async function saveImage(image: GeneratedImage): Promise<void> {
    if (!supabase) return;

    const { error } = await supabase
        .from('gallery')
        .upsert({
            id: image.id,
            url: image.url,
            prompt: image.prompt,
            mode: image.mode,
            product_id: image.productId,
            person_id: image.personId,
            location_id: image.locationId,
            style_id: image.styleId,
            timestamp: image.timestamp,
            feedback: image.feedback,
            parent_id: image.parentId,
            generation_time: image.generationTime,
            metadata: image.metadata
        }, { onConflict: 'id' });

    if (error) {
        console.error('Error saving image:', error);
        throw error;
    }
}

export async function updateImage(image: GeneratedImage): Promise<void> {
    return saveImage(image);
}

// ============================================
// CONNECTION CHECK
// ============================================

export function isSupabaseConfigured(): boolean {
    return supabase !== null;
}
