import type { StorageAdapter } from '../types';

export class IndexedDBAdapter implements StorageAdapter {
  private dbName: string;
  private dbVersion: number;
  private db: IDBDatabase | null = null;

  constructor(dbName = 'agui-chat', dbVersion = 1) {
    this.dbName = dbName;
    this.dbVersion = dbVersion;
  }

  private async initDB(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = () => {
        const db = request.result;

        // Create object stores
        if (!db.objectStoreNames.contains('storage')) {
          db.createObjectStore('storage', { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains('conversations')) {
          const conversationStore = db.createObjectStore('conversations', { keyPath: 'id' });
          conversationStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          conversationStore.createIndex('archived', 'archived', { unique: false });
        }

        if (!db.objectStoreNames.contains('files')) {
          const fileStore = db.createObjectStore('files', { keyPath: 'id' });
          fileStore.createIndex('conversationId', 'conversationId', { unique: false });
        }
      };
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction(['storage'], 'readonly');
      const store = transaction.objectStore('storage');

      return new Promise((resolve, reject) => {
        const request = store.get(key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const result = request.result;
          resolve(result ? result.value : null);
        };
      });
    } catch (error) {
      console.error('Error getting item from IndexedDB:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction(['storage'], 'readwrite');
      const store = transaction.objectStore('storage');

      return new Promise((resolve, reject) => {
        const request = store.put({ key, value, timestamp: Date.now() });
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('Error setting item in IndexedDB:', error);
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction(['storage'], 'readwrite');
      const store = transaction.objectStore('storage');

      return new Promise((resolve, reject) => {
        const request = store.delete(key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('Error removing item from IndexedDB:', error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction(['storage'], 'readwrite');
      const store = transaction.objectStore('storage');

      return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('Error clearing IndexedDB:', error);
      throw error;
    }
  }

  async keys(): Promise<string[]> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction(['storage'], 'readonly');
      const store = transaction.objectStore('storage');

      return new Promise((resolve, reject) => {
        const request = store.getAllKeys();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result as string[]);
      });
    } catch (error) {
      console.error('Error getting keys from IndexedDB:', error);
      return [];
    }
  }

  // Conversation-specific methods
  async setConversation<T>(conversationId: string, conversation: T): Promise<void> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction(['conversations'], 'readwrite');
      const store = transaction.objectStore('conversations');

      return new Promise((resolve, reject) => {
        const request = store.put({ id: conversationId, data: conversation, timestamp: Date.now() });
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('Error setting conversation in IndexedDB:', error);
      throw error;
    }
  }

  async getConversation<T>(conversationId: string): Promise<T | null> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction(['conversations'], 'readonly');
      const store = transaction.objectStore('conversations');

      return new Promise((resolve, reject) => {
        const request = store.get(conversationId);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const result = request.result;
          resolve(result ? result.data : null);
        };
      });
    } catch (error) {
      console.error('Error getting conversation from IndexedDB:', error);
      return null;
    }
  }

  async getAllConversations<T>(): Promise<T[]> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction(['conversations'], 'readonly');
      const store = transaction.objectStore('conversations');

      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const results = request.result;
          resolve(results.map((result: any) => result.data));
        };
      });
    } catch (error) {
      console.error('Error getting all conversations from IndexedDB:', error);
      return [];
    }
  }

  async removeConversation(conversationId: string): Promise<void> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction(['conversations'], 'readwrite');
      const store = transaction.objectStore('conversations');

      return new Promise((resolve, reject) => {
        const request = store.delete(conversationId);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('Error removing conversation from IndexedDB:', error);
      throw error;
    }
  }

  // File storage methods
  async setFile<T>(fileId: string, file: T, conversationId?: string): Promise<void> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction(['files'], 'readwrite');
      const store = transaction.objectStore('files');

      return new Promise((resolve, reject) => {
        const request = store.put({
          id: fileId,
          data: file,
          conversationId,
          timestamp: Date.now()
        });
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('Error setting file in IndexedDB:', error);
      throw error;
    }
  }

  async getFile<T>(fileId: string): Promise<T | null> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction(['files'], 'readonly');
      const store = transaction.objectStore('files');

      return new Promise((resolve, reject) => {
        const request = store.get(fileId);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const result = request.result;
          resolve(result ? result.data : null);
        };
      });
    } catch (error) {
      console.error('Error getting file from IndexedDB:', error);
      return null;
    }
  }

  async removeFile(fileId: string): Promise<void> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction(['files'], 'readwrite');
      const store = transaction.objectStore('files');

      return new Promise((resolve, reject) => {
        const request = store.delete(fileId);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('Error removing file from IndexedDB:', error);
      throw error;
    }
  }

  // Cleanup old data
  async cleanup(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const db = await this.initDB();
      const now = Date.now();

      // Clean up old conversations
      const conversationTransaction = db.transaction(['conversations'], 'readwrite');
      const conversationStore = conversationTransaction.objectStore('conversations');

      const conversationCursor = conversationStore.openCursor();
      conversationCursor.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const data = cursor.value;
          if (data.timestamp && (now - data.timestamp) > maxAge) {
            cursor.delete();
          }
          cursor.continue();
        }
      };

      // Clean up old files
      const fileTransaction = db.transaction(['files'], 'readwrite');
      const fileStore = fileTransaction.objectStore('files');

      const fileCursor = fileStore.openCursor();
      fileCursor.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const data = cursor.value;
          if (data.timestamp && (now - data.timestamp) > maxAge) {
            cursor.delete();
          }
          cursor.continue();
        }
      };
    } catch (error) {
      console.error('Error during IndexedDB cleanup:', error);
    }
  }

  // Storage statistics
  async getStorageStats(): Promise<{ conversations: number; files: number; storageItems: number }> {
    try {
      const db = await this.initDB();

      const conversationCount = await new Promise<number>((resolve) => {
        const transaction = db.transaction(['conversations'], 'readonly');
        const store = transaction.objectStore('conversations');
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(0);
      });

      const fileCount = await new Promise<number>((resolve) => {
        const transaction = db.transaction(['files'], 'readonly');
        const store = transaction.objectStore('files');
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(0);
      });

      const storageCount = await new Promise<number>((resolve) => {
        const transaction = db.transaction(['storage'], 'readonly');
        const store = transaction.objectStore('storage');
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(0);
      });

      return {
        conversations: conversationCount,
        files: fileCount,
        storageItems: storageCount
      };
    } catch (error) {
      console.error('Error getting storage stats from IndexedDB:', error);
      return { conversations: 0, files: 0, storageItems: 0 };
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export const createIndexedDBAdapter = (dbName?: string, dbVersion?: number): IndexedDBAdapter => {
  return new IndexedDBAdapter(dbName, dbVersion);
};