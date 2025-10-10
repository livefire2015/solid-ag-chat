import type { StorageAdapter, ConversationSummary, Conversation } from '../types';
import { LocalStorageAdapter, createLocalStorageAdapter } from './localStorage';
import { IndexedDBAdapter, createIndexedDBAdapter } from './indexedDB';

export type StorageType = 'localStorage' | 'indexedDB' | 'memory';

export interface StorageOptions {
  type: StorageType;
  prefix?: string;
  dbName?: string;
  dbVersion?: number;
}

// Memory storage adapter for testing or when persistence isn't needed
export class MemoryStorageAdapter implements StorageAdapter {
  private data: Map<string, any> = new Map();

  async get<T>(key: string): Promise<T | null> {
    return this.data.get(key) || null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.data.set(key, value);
  }

  async remove(key: string): Promise<void> {
    this.data.delete(key);
  }

  async clear(): Promise<void> {
    this.data.clear();
  }

  async keys(): Promise<string[]> {
    return Array.from(this.data.keys());
  }
}

export function createStorageAdapter(options: StorageOptions): StorageAdapter {
  switch (options.type) {
    case 'localStorage':
      return createLocalStorageAdapter(options.prefix);

    case 'indexedDB':
      return createIndexedDBAdapter(options.dbName, options.dbVersion);

    case 'memory':
      return new MemoryStorageAdapter();

    default:
      throw new Error(`Unsupported storage type: ${options.type}`);
  }
}

// Storage utility functions
export class StorageManager {
  private adapter: StorageAdapter;

  constructor(adapter: StorageAdapter) {
    this.adapter = adapter;
  }

  // Conversation management
  async saveConversation(conversation: any): Promise<void> {
    const conversationKey = `conversation:${conversation.id}`;
    const summaryKey = `conversation-summary:${conversation.id}`;

    // Save full conversation
    await this.adapter.set(conversationKey, conversation);

    // Save conversation summary for quick access
    const summary = {
      id: conversation.id,
      title: conversation.title,
      description: conversation.description,
      messageCount: conversation.messages?.length || 0,
      lastMessageAt: conversation.updatedAt,
      createdAt: conversation.createdAt,
      tags: conversation.tags,
      archived: conversation.archived,
      starred: conversation.starred
    };

    await this.adapter.set(summaryKey, summary);
  }

  async getConversation(conversationId: string): Promise<any | null> {
    return await this.adapter.get(`conversation:${conversationId}`);
  }

  async getConversationSummary(conversationId: string): Promise<any | null> {
    return await this.adapter.get(`conversation-summary:${conversationId}`);
  }

  async getAllConversationSummaries(): Promise<ConversationSummary[]> {
    const keys = await this.adapter.keys();
    const summaryKeys = keys.filter(key => key.startsWith('conversation-summary:'));

    const summaries = await Promise.all(
      summaryKeys.map(key => this.adapter.get<ConversationSummary>(key))
    );

    return summaries
      .filter((summary): summary is ConversationSummary => summary !== null && summary !== undefined)
      .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  }

  async deleteConversation(conversationId: string): Promise<void> {
    await this.adapter.remove(`conversation:${conversationId}`);
    await this.adapter.remove(`conversation-summary:${conversationId}`);
  }

  // Settings management
  async saveSettings(settings: any): Promise<void> {
    await this.adapter.set('settings', settings);
  }

  async getSettings(): Promise<any | null> {
    return await this.adapter.get('settings');
  }

  // Theme management
  async saveTheme(theme: any): Promise<void> {
    await this.adapter.set('theme', theme);
  }

  async getTheme(): Promise<any | null> {
    return await this.adapter.get('theme');
  }

  // File management
  async saveFile(fileId: string, file: any): Promise<void> {
    await this.adapter.set(`file:${fileId}`, file);
  }

  async getFile(fileId: string): Promise<any | null> {
    return await this.adapter.get(`file:${fileId}`);
  }

  async deleteFile(fileId: string): Promise<void> {
    await this.adapter.remove(`file:${fileId}`);
  }

  // Search functionality
  async searchConversations(query: string): Promise<any[]> {
    const summaries = await this.getAllConversationSummaries();
    const lowerQuery = query.toLowerCase();

    return summaries.filter(summary =>
      summary.title.toLowerCase().includes(lowerQuery) ||
      summary.description?.toLowerCase().includes(lowerQuery) ||
      summary.tags?.some((tag: string) => tag.toLowerCase().includes(lowerQuery))
    );
  }

  // Cleanup utilities
  async cleanup(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<void> {
    const keys = await this.adapter.keys();
    const now = Date.now();

    for (const key of keys) {
      if (key.startsWith('conversation:')) {
        const conversation = await this.adapter.get<Conversation>(key);
        if (conversation && conversation.updatedAt) {
          const age = now - new Date(conversation.updatedAt).getTime();
          if (age > maxAge) {
            const conversationId = key.replace('conversation:', '');
            await this.deleteConversation(conversationId);
          }
        }
      }
    }
  }

  // Export/Import functionality
  async exportData(): Promise<any> {
    const keys = await this.adapter.keys();
    const data: Record<string, any> = {};

    for (const key of keys) {
      data[key] = await this.adapter.get(key);
    }

    return {
      version: '1.0',
      timestamp: new Date().toISOString(),
      data
    };
  }

  async importData(exportData: any): Promise<void> {
    if (!exportData.data) {
      throw new Error('Invalid export data format');
    }

    for (const [key, value] of Object.entries(exportData.data)) {
      await this.adapter.set(key, value);
    }
  }
}

export * from './localStorage';
export * from './indexedDB';
export * from './remoteStorage';