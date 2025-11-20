
export const DB_NAME = 'GeminiBrandStudioDB';
export const DB_VERSION = 1;

export interface DBProfile {
  id: string;
  type: 'PERSON' | 'PRODUCT';
  data: any; // EntityProfile
}

export interface DBImage {
  id: string;
  timestamp: number;
  data: any; // GeneratedImage
}

class LocalDB {
  private db: IDBDatabase | null = null;

  async connect(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Store for User and Products
        if (!db.objectStoreNames.contains('profiles')) {
          db.createObjectStore('profiles', { keyPath: 'id' });
        }
        
        // Store for Generated Gallery
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

  async saveProfile(profile: any) {
    const db = await this.connect();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction('profiles', 'readwrite');
      const store = tx.objectStore('profiles');
      // We wrap the profile to ensure we can query by ID easily
      const request = store.put({ id: profile.id, type: profile.type, data: profile });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getProfiles(): Promise<any[]> {
    const db = await this.connect();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('profiles', 'readonly');
      const store = tx.objectStore('profiles');
      const request = store.getAll();
      
      request.onsuccess = () => {
        // Extract the actual data payload
        const results = request.result.map((item: any) => item.data);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteProfile(id: string) {
    const db = await this.connect();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction('profiles', 'readwrite');
      store: tx.objectStore('profiles').delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async saveImage(image: any) {
    const db = await this.connect();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction('gallery', 'readwrite');
      const store = tx.objectStore('gallery');
      const request = store.put({ id: image.id, timestamp: image.timestamp, data: image });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getGallery(): Promise<any[]> {
    const db = await this.connect();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('gallery', 'readonly');
      const store = tx.objectStore('gallery');
      const index = store.index('timestamp');
      // Get all, but likely want to sort by timestamp descending
      const request = index.openCursor(null, 'prev');
      const results: any[] = [];

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
  }

  async updateImage(image: any) {
      return this.saveImage(image); // Put acts as update if key exists
  }
}

export const db = new LocalDB();
