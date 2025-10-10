export interface ApiEndpoints {
  // Conversation management
  getConversations?: string;
  getConversation?: string;
  createConversation?: string;
  updateConversation?: string;
  deleteConversation?: string;

  // Message management
  getMessages?: string;
  sendMessage?: string;
  streamMessage?: string;
  getMessage?: string;
  updateMessage?: string;
  deleteMessage?: string;
}

export interface ApiConfig {
  baseUrl?: string;
  endpoints?: ApiEndpoints;
  headers?: Record<string, string>;
  timeout?: number;
}

export type StorageMode = 'local' | 'remote' | 'hybrid';

export const DEFAULT_ENDPOINTS: ApiEndpoints = {
  // Conversation management
  getConversations: '/chat/conversations',
  getConversation: '/chat/c/{conversationId}',
  createConversation: '/chat/conversations',
  updateConversation: '/chat/c/{conversationId}',
  deleteConversation: '/chat/c/{conversationId}',

  // Message management
  getMessages: '/chat/c/{conversationId}/messages',
  sendMessage: '/chat/c/{conversationId}/messages',
  streamMessage: '/chat/c/{conversationId}/stream',
  getMessage: '/chat/c/{conversationId}/messages/{messageId}',
  updateMessage: '/chat/c/{conversationId}/messages/{messageId}',
  deleteMessage: '/chat/c/{conversationId}/messages/{messageId}'
};

export function buildEndpointUrl(
  baseUrl: string,
  endpoint: string,
  params?: Record<string, string>
): string {
  let url = endpoint;

  // Replace path parameters
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`{${key}}`, value);
    });
  }

  // Combine with base URL
  if (baseUrl && !url.startsWith('http')) {
    return `${baseUrl.replace(/\/$/, '')}${url}`;
  }

  return url;
}