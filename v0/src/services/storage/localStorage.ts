import type { StorageAdapter } from '../types';

export class LocalStorageAdapter implements StorageAdapter {
  private prefix: string;

  constructor(prefix = 'agui-chat:') {
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return this.prefix + key;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = localStorage.getItem(this.getKey(key));
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Error getting item from localStorage:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      localStorage.setItem(this.getKey(key), JSON.stringify(value));
    } catch (error) {
      console.error('Error setting item in localStorage:', error);
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(this.getKey(key));
    } catch (error) {
      console.error('Error removing item from localStorage:', error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = await this.keys();
      keys.forEach(key => localStorage.removeItem(this.getKey(key)));
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      throw error;
    }
  }

  async keys(): Promise<string[]> {
    try {
      const allKeys = Object.keys(localStorage);
      return allKeys
        .filter(key => key.startsWith(this.prefix))
        .map(key => key.substring(this.prefix.length));
    } catch (error) {
      console.error('Error getting keys from localStorage:', error);
      return [];
    }
  }

  // Utility methods for conversation-specific operations
  async getConversations(): Promise<string[]> {
    const keys = await this.keys();
    return keys.filter(key => key.startsWith('conversation:'));
  }

  async getConversationSummaries(): Promise<string[]> {
    const keys = await this.keys();
    return keys.filter(key => key.startsWith('conversation-summary:'));
  }

  async setConversation<T>(conversationId: string, conversation: T): Promise<void> {
    await this.set(`conversation:${conversationId}`, conversation);
  }

  async getConversation<T>(conversationId: string): Promise<T | null> {
    return await this.get<T>(`conversation:${conversationId}`);
  }

  async removeConversation(conversationId: string): Promise<void> {
    await this.remove(`conversation:${conversationId}`);
    await this.remove(`conversation-summary:${conversationId}`);
  }

  async setConversationSummary<T>(conversationId: string, summary: T): Promise<void> {
    await this.set(`conversation-summary:${conversationId}`, summary);
  }

  async getConversationSummary<T>(conversationId: string): Promise<T | null> {
    return await this.get<T>(`conversation-summary:${conversationId}`);
  }

  // Theme and configuration storage
  async setTheme<T>(theme: T): Promise<void> {
    await this.set('theme', theme);
  }

  async getTheme<T>(): Promise<T | null> {
    return await this.get<T>('theme');
  }

  async setConfig<T>(config: T): Promise<void> {
    await this.set('config', config);
  }

  async getConfig<T>(): Promise<T | null> {
    return await this.get<T>('config');
  }

  // File attachment storage (for temporary files)
  async setFileAttachment<T>(fileId: string, file: T): Promise<void> {
    await this.set(`file:${fileId}`, file);
  }

  async getFileAttachment<T>(fileId: string): Promise<T | null> {
    return await this.get<T>(`file:${fileId}`);
  }

  async removeFileAttachment(fileId: string): Promise<void> {
    await this.remove(`file:${fileId}`);
  }

  // Cleanup old data
  async cleanup(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<void> {
    const now = Date.now();
    const keys = await this.keys();

    for (const key of keys) {
      if (key.startsWith('conversation:')) {
        const conversation = await this.get<{ updatedAt: string }>(key);
        if (conversation && conversation.updatedAt) {
          const age = now - new Date(conversation.updatedAt).getTime();
          if (age > maxAge) {
            const conversationId = key.replace('conversation:', '');
            await this.removeConversation(conversationId);
          }
        }
      }
    }
  }

  // Get storage statistics
  async getStorageStats(): Promise<{ used: number; total: number; count: number }> {
    const keys = await this.keys();
    let used = 0;

    for (const key of keys) {
      const value = localStorage.getItem(this.getKey(key));
      if (value) {
        used += value.length;
      }
    }

    // Estimate total available storage (5MB is common limit)
    const total = 5 * 1024 * 1024;

    return {
      used,
      total,
      count: keys.length
    };
  }
}

export const createLocalStorageAdapter = (prefix?: string): LocalStorageAdapter => {
  return new LocalStorageAdapter(prefix);
};