import type { StorageAdapter, Conversation, ConversationSummary } from '../types';
import type { ApiConfig, ApiEndpoints } from '../types/api';
import { buildEndpointUrl, DEFAULT_ENDPOINTS } from '../types/api';

export class RemoteStorageAdapter implements StorageAdapter {
  private apiConfig: ApiConfig;
  private endpoints: ApiEndpoints;

  constructor(apiConfig: ApiConfig) {
    this.apiConfig = apiConfig;
    this.endpoints = { ...DEFAULT_ENDPOINTS, ...(apiConfig.endpoints || {}) };
  }

  private async fetchApi<T>(
    endpoint: string,
    options: RequestInit = {},
    params?: Record<string, string>
  ): Promise<T> {
    const baseUrl = this.apiConfig.baseUrl || '';
    const url = buildEndpointUrl(baseUrl, endpoint, params);

    const headers = {
      'Content-Type': 'application/json',
      ...(this.apiConfig.headers || {}),
      ...(options.headers || {})
    };

    const config: RequestInit = {
      ...options,
      headers
    };

    if (this.apiConfig.timeout) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.apiConfig.timeout);
      config.signal = controller.signal;

      try {
        const response = await fetch(url, config);
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    }

    const response = await fetch(url, config);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  // Generic key-value storage methods (for settings, theme, etc.)
  async get<T>(key: string): Promise<T | null> {
    // Dummy implementation - in real implementation, this would use a generic storage endpoint
    console.log(`RemoteStorageAdapter: get(${key}) - dummy implementation`);

    // For conversation-related keys, use specific endpoints
    if (key.startsWith('conversation:')) {
      const conversationId = key.replace('conversation:', '');
      return await this.getConversation(conversationId) as T;
    }

    if (key.startsWith('conversation-summary:')) {
      const conversationId = key.replace('conversation-summary:', '');
      return await this.getConversationSummary(conversationId) as T;
    }

    // Return null for other keys (settings, theme, etc.) in dummy implementation
    return null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    // Dummy implementation
    console.log(`RemoteStorageAdapter: set(${key}) - dummy implementation`);

    // For conversation-related keys, use specific endpoints
    if (key.startsWith('conversation:')) {
      const conversationId = key.replace('conversation:', '');
      await this.updateConversation(conversationId, value as any);
      return;
    }

    // No-op for other keys in dummy implementation
  }

  async remove(key: string): Promise<void> {
    // Dummy implementation
    console.log(`RemoteStorageAdapter: remove(${key}) - dummy implementation`);

    // For conversation-related keys, use specific endpoints
    if (key.startsWith('conversation:')) {
      const conversationId = key.replace('conversation:', '');
      await this.deleteConversation(conversationId);
      return;
    }

    // No-op for other keys in dummy implementation
  }

  async clear(): Promise<void> {
    // Dummy implementation - in real implementation, this would clear user data
    console.log('RemoteStorageAdapter: clear() - dummy implementation');
  }

  async keys(): Promise<string[]> {
    // Dummy implementation - return empty array
    console.log('RemoteStorageAdapter: keys() - dummy implementation');
    return [];
  }

  // Conversation-specific methods
  async getConversations(): Promise<ConversationSummary[]> {
    if (!this.endpoints.getConversations) {
      console.warn('getConversations endpoint not configured, returning empty array');
      return [];
    }

    try {
      // Dummy implementation - return mock data
      console.log('RemoteStorageAdapter: getConversations() - dummy implementation');
      return [
        {
          id: crypto.randomUUID(),
          title: 'Remote Conversation 1',
          description: 'This is a dummy remote conversation',
          messageCount: 0,
          lastMessageAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        }
      ];
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }
  }

  async getConversation(conversationId: string): Promise<Conversation | null> {
    if (!this.endpoints.getConversation) {
      console.warn('getConversation endpoint not configured');
      return null;
    }

    try {
      // Dummy implementation - return mock data
      console.log(`RemoteStorageAdapter: getConversation(${conversationId}) - dummy implementation`);
      return {
        id: conversationId,
        title: 'Remote Conversation',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching conversation:', error);
      return null;
    }
  }

  async createConversation(title: string, description?: string): Promise<string> {
    if (!this.endpoints.createConversation) {
      console.warn('createConversation endpoint not configured');
      const newId = crypto.randomUUID();
      return newId;
    }

    try {
      // Dummy implementation - return new UUID
      console.log(`RemoteStorageAdapter: createConversation(${title}) - dummy implementation`);
      return crypto.randomUUID();
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

  async updateConversation(conversationId: string, updates: Partial<Conversation>): Promise<void> {
    if (!this.endpoints.updateConversation) {
      console.warn('updateConversation endpoint not configured');
      return;
    }

    try {
      // Dummy implementation - no-op
      console.log(`RemoteStorageAdapter: updateConversation(${conversationId}) - dummy implementation`);
    } catch (error) {
      console.error('Error updating conversation:', error);
      throw error;
    }
  }

  async deleteConversation(conversationId: string): Promise<void> {
    if (!this.endpoints.deleteConversation) {
      console.warn('deleteConversation endpoint not configured');
      return;
    }

    try {
      // Dummy implementation - no-op
      console.log(`RemoteStorageAdapter: deleteConversation(${conversationId}) - dummy implementation`);
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }

  async getConversationSummary(conversationId: string): Promise<ConversationSummary | null> {
    // In real implementation, this might be a separate endpoint or derived from getConversation
    const conversation = await this.getConversation(conversationId);
    if (!conversation) return null;

    return {
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
  }

  // Message-specific methods
  async getMessages(conversationId: string): Promise<any[]> {
    if (!this.endpoints.getMessages) {
      console.warn('getMessages endpoint not configured');
      return [];
    }

    try {
      // Dummy implementation - return empty array
      console.log(`RemoteStorageAdapter: getMessages(${conversationId}) - dummy implementation`);
      return [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  async sendMessage(conversationId: string, message: any): Promise<void> {
    if (!this.endpoints.sendMessage) {
      console.warn('sendMessage endpoint not configured');
      return;
    }

    try {
      // Dummy implementation - no-op
      console.log(`RemoteStorageAdapter: sendMessage(${conversationId}) - dummy implementation`);
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async streamMessage(conversationId: string): Promise<string> {
    if (!this.endpoints.streamMessage) {
      // Fallback to default streaming endpoint
      return `/agent/stream`;
    }

    // Return the streaming endpoint URL with conversationId
    const baseUrl = this.apiConfig.baseUrl || '';
    return buildEndpointUrl(baseUrl, this.endpoints.streamMessage, { conversationId });
  }
}

export const createRemoteStorageAdapter = (apiConfig: ApiConfig): RemoteStorageAdapter => {
  return new RemoteStorageAdapter(apiConfig);
};