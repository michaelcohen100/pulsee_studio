
import * as supabaseService from '../lib/supabase';
import { EntityProfile, GeneratedImage } from '../types';

export const DB_NAME = 'GeminiBrandStudioDB';
export const DB_VERSION = 1;

// ============================================
// INDEXEDDB IMPLEMENTATION (Fallback)
// ============================================

class LocalDB {
  private db: IDBDatabase | null = null;

  private isSupported(): boolean {
    return typeof indexedDB !== 'undefined';
  }

  async connect(): Promise<IDBDatabase> {
    if (!this.isSupported()) {
      throw new Error("IndexedDB is not supported in this environment.");
    }
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('profiles')) {
          db.createObjectStore('profiles', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('gallery')) {
          const store = db.createObjectStore('gallery', { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onerror = (e) => {
        console.error("DB Error", e);
        reject(e);
      };
    });
  }

  async saveProfile(profile: EntityProfile) {
    if (!this.isSupported()) return;
    try {
      const db = await this.connect();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction('profiles', 'readwrite');
        const store = tx.objectStore('profiles');
        const request = store.put({ id: profile.id, type: profile.type, data: profile });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn("Save profile failed", e);
    }
  }

  async getProfiles(): Promise<EntityProfile[]> {
    if (!this.isSupported()) return [];
    try {
      const db = await this.connect();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('profiles', 'readonly');
        const store = tx.objectStore('profiles');
        const request = store.getAll();

        request.onsuccess = () => {
          const results = request.result.map((item: { data: EntityProfile }) => item.data);
          resolve(results);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn("Get profiles failed", e);
      return [];
    }
  }

  async deleteProfile(id: string) {
    if (!this.isSupported()) return;
    try {
      const db = await this.connect();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction('profiles', 'readwrite');
        const store = tx.objectStore('profiles');
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn("Delete profile failed", e);
    }
  }

  async saveImage(image: GeneratedImage) {
    if (!this.isSupported()) return;
    try {
      const db = await this.connect();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction('gallery', 'readwrite');
        const store = tx.objectStore('gallery');
        const request = store.put({ id: image.id, timestamp: image.timestamp, data: image });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn("Save image failed", e);
    }
  }

  async getGallery(): Promise<GeneratedImage[]> {
    if (!this.isSupported()) return [];
    try {
      const db = await this.connect();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('gallery', 'readonly');
        const store = tx.objectStore('gallery');
        const index = store.index('timestamp');
        const request = index.openCursor(null, 'prev');
        const results: GeneratedImage[] = [];

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            results.push(cursor.value.data);
            cursor.continue();
          } else {
            resolve(results);
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn("Get gallery failed", e);
      return [];
    }
  }

  async updateImage(image: GeneratedImage) {
    return this.saveImage(image);
  }
}

const localDB = new LocalDB();

// ============================================
// UNIFIED DB INTERFACE (Supabase + Fallback)
// ============================================

class UnifiedDB {
  private useSupabase: boolean;

  constructor() {
    this.useSupabase = supabaseService.isSupabaseConfigured();
    console.log(`📦 Storage: ${this.useSupabase ? 'Supabase (cloud)' : 'IndexedDB (local)'}`);
  }

  async getProfiles(): Promise<EntityProfile[]> {
    if (this.useSupabase) {
      try {
        return await supabaseService.getProfiles();
      } catch (e) {
        console.warn('Supabase failed, falling back to IndexedDB', e);
        return localDB.getProfiles();
      }
    }
    return localDB.getProfiles();
  }

  async saveProfile(profile: EntityProfile): Promise<void> {
    if (this.useSupabase) {
      try {
        await supabaseService.saveProfile(profile);
        return;
      } catch (e) {
        console.warn('Supabase save failed, falling back to IndexedDB', e);
      }
    }
    await localDB.saveProfile(profile);
  }

  async deleteProfile(id: string): Promise<void> {
    if (this.useSupabase) {
      try {
        await supabaseService.deleteProfile(id);
        return;
      } catch (e) {
        console.warn('Supabase delete failed, falling back to IndexedDB', e);
      }
    }
    await localDB.deleteProfile(id);
  }

  async getGallery(): Promise<GeneratedImage[]> {
    if (this.useSupabase) {
      try {
        return await supabaseService.getGallery();
      } catch (e) {
        console.warn('Supabase failed, falling back to IndexedDB', e);
        return localDB.getGallery();
      }
    }
    return localDB.getGallery();
  }

  async saveImage(image: GeneratedImage): Promise<void> {
    if (this.useSupabase) {
      try {
        await supabaseService.saveImage(image);
        return;
      } catch (e) {
        console.warn('Supabase save failed, falling back to IndexedDB', e);
      }
    }
    await localDB.saveImage(image);
  }

  async updateImage(image: GeneratedImage): Promise<void> {
    return this.saveImage(image);
  }
}

export const db = new UnifiedDB();
