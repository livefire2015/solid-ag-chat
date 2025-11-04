import type {
  AgUiClient,
  AllEventType,
  Id,
  ConversationDoc,
  MessageDoc,
} from '../types';

type Handler<E extends AllEventType> = (payload: any) => void;

export interface SseAgClientOptions {
  baseUrl: string;
  headers?: Record<string, string>; // For auth: Bearer tokens, etc.
  paths?: Partial<{
    conversations: string;
    messages: string;
    autoCreate: string;
  }>;
}

export class SseAgClient implements AgUiClient {
  private baseUrl: string;
  private headers: Record<string, string>;
  private paths: {
    conversations: string;
    messages: string;
    autoCreate: string;
  };
  private listeners = new Map<string, Set<Function>>();
  private activeStreams = new Map<string, AbortController>();

  constructor(options: SseAgClientOptions) {
    this.baseUrl = options.baseUrl;
    this.headers = options.headers || {};
    this.paths = {
      conversations: options.paths?.conversations || '/conversations',
      messages: options.paths?.messages || '/conversations/:id/messages',
      autoCreate: options.paths?.autoCreate || '/messages',
    };
  }

  // Event handling (unchanged)
  on<E extends AllEventType>(type: E, handler: Handler<E>): () => void {
    const set = this.listeners.get(type) || new Set();
    set.add(handler as any);
    this.listeners.set(type, set);
    return () => this.off(type, handler);
  }

  off<E extends AllEventType>(type: E, handler: Handler<E>): void {
    const set = this.listeners.get(type);
    set?.delete(handler as any);
  }

  emit<E extends AllEventType>(type: E, payload: any): void {
    const set = this.listeners.get(type);
    if (!set) return;
    set.forEach((fn) => {
      try {
        (fn as any)(payload);
      } catch (e) {
        console.error(`Error in handler for ${type}:`, e);
      }
    });
  }

  // Conversation Management
  async createConversation(title?: string, metadata?: Record<string, unknown>): Promise<ConversationDoc> {
    const res = await fetch(`${this.baseUrl}${this.paths.conversations}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers,
      },
      body: JSON.stringify({ title, metadata }),
      credentials: 'include',
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      throw new Error(`Failed to create conversation: ${res.status} ${errorText}`);
    }

    const conv = await res.json();

    // Emit event for store
    this.emit('conversation.created', { conversation: conv } as any);

    return conv;
  }

  async listConversations(): Promise<ConversationDoc[]> {
    const res = await fetch(`${this.baseUrl}${this.paths.conversations}`, {
      headers: this.headers,
      credentials: 'include',
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      throw new Error(`Failed to list conversations: ${res.status} ${errorText}`);
    }

    return res.json();
  }

  async getConversation(id: Id): Promise<ConversationDoc> {
    const res = await fetch(`${this.baseUrl}${this.paths.conversations}/${id}`, {
      headers: this.headers,
      credentials: 'include',
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      throw new Error(`Failed to get conversation: ${res.status} ${errorText}`);
    }

    return res.json();
  }

  async updateConversation(id: Id, updates: Partial<ConversationDoc>): Promise<ConversationDoc> {
    const res = await fetch(`${this.baseUrl}${this.paths.conversations}/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers,
      },
      body: JSON.stringify(updates),
      credentials: 'include',
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      throw new Error(`Failed to update conversation: ${res.status} ${errorText}`);
    }

    const conv = await res.json();

    // Emit event for store
    this.emit('conversation.updated', { conversation: conv } as any);

    return conv;
  }

  async archiveConversation(id: Id): Promise<void> {
    const res = await fetch(`${this.baseUrl}${this.paths.conversations}/${id}`, {
      method: 'DELETE',
      headers: this.headers,
      credentials: 'include',
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      throw new Error(`Failed to archive conversation: ${res.status} ${errorText}`);
    }

    // Emit event for store
    this.emit('conversation.archived', { conversationId: id } as any);
  }

  // Message Streaming (per-message SSE)
  async sendMessage(
    conversationId: Id | null,
    text: string,
    options?: {
      attachments?: Id[];
      metadata?: Record<string, unknown>;
      onEvent?: (event: { type: string; data: any }) => void;
    }
  ): Promise<MessageDoc> {
    const messageId = crypto.randomUUID();
    const controller = new AbortController();
    this.activeStreams.set(messageId, controller);

    try {
      // Determine endpoint
      const endpoint = conversationId
        ? this.paths.messages.replace(':id', conversationId)
        : this.paths.autoCreate;

      const url = `${this.baseUrl}${endpoint}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          ...this.headers,
        },
        body: JSON.stringify({
          clientMessageId: messageId,
          text,
          attachments: options?.attachments,
          metadata: options?.metadata,
        }),
        signal: controller.signal,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      // Parse SSE stream
      await this.parseSSEStream(response, options?.onEvent);

      // Return empty message - actual data is in store via events
      return {} as MessageDoc;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Message cancelled');
      }
      throw error;
    } finally {
      this.activeStreams.delete(messageId);
    }
  }

  private async parseSSEStream(
    response: Response,
    onEvent?: (event: { type: string; data: any }) => void
  ): Promise<void> {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Split on double newline (SSE standard)
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          if (!part.trim()) continue;

          const event = this.parseSSEMessage(part);
          if (event) {
            // Emit to internal listeners (store)
            this.emit(event.type as AllEventType, event.data);

            // Call optional external handler
            onEvent?.(event);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private parseSSEMessage(message: string): { type: string; data: any } | null {
    let eventType = 'message';
    let data = '';

    const lines = message.split('\n');
    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventType = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        data += line.slice(5).trim();
      }
    }

    if (!data) return null;

    try {
      return {
        type: eventType,
        data: JSON.parse(data),
      };
    } catch {
      console.warn('Failed to parse SSE data:', data);
      return null;
    }
  }

  async getMessages(conversationId: Id): Promise<MessageDoc[]> {
    const endpoint = this.paths.messages.replace(':id', conversationId);
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: this.headers,
      credentials: 'include',
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      throw new Error(`Failed to get messages: ${res.status} ${errorText}`);
    }

    return res.json();
  }

  async cancelMessage(conversationId: Id, messageId: Id): Promise<void> {
    // Abort local stream
    const controller = this.activeStreams.get(messageId);
    if (controller) {
      controller.abort();
      this.activeStreams.delete(messageId);
    }

    // Notify backend
    const endpoint = this.paths.messages.replace(':id', conversationId);
    const res = await fetch(`${this.baseUrl}${endpoint}/${messageId}`, {
      method: 'DELETE',
      headers: this.headers,
      credentials: 'include',
    });

    if (!res.ok) {
      console.warn(`Failed to notify backend of cancellation: ${res.status}`);
    }
  }

  close(): void {
    // Abort all active streams
    this.activeStreams.forEach((controller) => controller.abort());
    this.activeStreams.clear();
    this.listeners.clear();
  }
}

export default SseAgClient;
