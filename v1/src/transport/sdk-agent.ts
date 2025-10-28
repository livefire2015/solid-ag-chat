/**
 * AG-UI SDK Client Wrapper
 *
 * Wraps the official @ag-ui/client HttpAgent to provide backward-compatible
 * conversation management while using the official SDK protocol.
 */
import { HttpAgent } from '@ag-ui/client';
import type { Message, RunAgentInput } from '@ag-ui/core';
import type { AgUiClient, Id, ConversationDoc, MessageDoc } from '../types';

export interface SdkAgentOptions {
  baseUrl: string;
  headers?: Record<string, string>;
  agentEndpoint?: string; // Defaults to '/agent/run'
  conversationsEndpoint?: string; // For conversation CRUD
}

/**
 * SDK-compliant AG-UI client with conversation management
 */
export class SdkAgClient implements AgUiClient {
  private agent: HttpAgent;
  private baseUrl: string;
  private headers: Record<string, string>;
  private conversationsEndpoint: string;
  private listeners = new Map<string, Set<Function>>();

  // Client-side state management
  private threadId: string | null = null;
  private conversationHistoryByThread = new Map<string, Message[]>();

  // Streaming content accumulation (messageId -> accumulated content)
  private streamingContent = new Map<string, string>();

  // Tool calls accumulation (messageId -> tool calls array)
  private streamingToolCalls = new Map<string, any[]>();

  // Tool call arguments accumulation (toolCallId -> {id, name, args})
  private toolCallsInProgress = new Map<string, { id: string; name: string; args: string; messageId: string }>();

  // Active subscriptions for cancellation (messageId -> subscription)
  private activeSubscriptions = new Map<string, any>();

  constructor(options: SdkAgentOptions) {
    this.baseUrl = options.baseUrl;
    this.headers = options.headers || {};
    this.conversationsEndpoint = options.conversationsEndpoint || '/conversations';

    // Create SDK HttpAgent
    this.agent = new HttpAgent({
      url: `${options.baseUrl}${options.agentEndpoint || '/agent/run'}`,
      headers: this.headers,
    });

    // Subscribe to SDK events and re-emit for store
    this.subscribeToAgentEvents();
  }

  private subscribeToAgentEvents() {
    // The agent.run() method returns an RxJS observable
    // We'll subscribe to events when sendMessage is called
  }

  // ============================================================================
  // Event Handling (AgUiClient interface)
  // ============================================================================

  on<E extends string>(type: E, handler: Function): () => void {
    const set = this.listeners.get(type) || new Set();
    set.add(handler);
    this.listeners.set(type, set);
    return () => this.off(type, handler);
  }

  off<E extends string>(type: E, handler: Function): void {
    const set = this.listeners.get(type);
    set?.delete(handler);
  }

  private emit<E extends string>(type: E, payload: any) {
    const set = this.listeners.get(type);
    if (!set) return;
    set.forEach((fn) => {
      try {
        fn(payload);
      } catch (e) {
        console.error(`Error in handler for ${type}:`, e);
      }
    });
  }

  // ============================================================================
  // Conversation Management (REST APIs)
  // ============================================================================

  async createConversation(title?: string, metadata?: Record<string, unknown>): Promise<ConversationDoc> {
    const res = await fetch(`${this.baseUrl}${this.conversationsEndpoint}`, {
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

    // Set as active thread
    this.threadId = conv.id;
    this.conversationHistoryByThread.set(conv.id, []);

    // Emit event for store
    this.emit('conversation.created', { conversation: conv });

    return conv;
  }

  async listConversations(): Promise<ConversationDoc[]> {
    const res = await fetch(`${this.baseUrl}${this.conversationsEndpoint}`, {
      headers: this.headers,
      credentials: 'include',
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      throw new Error(`Failed to list conversations: ${res.status} ${errorText}`);
    }

    const data = await res.json();
    return data.conversations || [];
  }

  async getConversation(id: Id): Promise<ConversationDoc> {
    const res = await fetch(`${this.baseUrl}${this.conversationsEndpoint}/${id}`, {
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
    const res = await fetch(`${this.baseUrl}${this.conversationsEndpoint}/${id}`, {
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
    this.emit('conversation.updated', { conversation: conv });
    return conv;
  }

  async archiveConversation(id: Id): Promise<void> {
    const res = await fetch(`${this.baseUrl}${this.conversationsEndpoint}/${id}`, {
      method: 'DELETE',
      headers: this.headers,
      credentials: 'include',
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      throw new Error(`Failed to archive conversation: ${res.status} ${errorText}`);
    }

    this.emit('conversation.archived', { conversationId: id });
  }

  // ============================================================================
  // Conversation State Management
  // ============================================================================

  /**
   * Set the active thread/conversation
   * This should be called when switching conversations to ensure proper context
   */
  setActiveThread(threadId: string): void {
    this.threadId = threadId;

    // Initialize history Map for this conversation if it doesn't exist
    if (!this.conversationHistoryByThread.has(threadId)) {
      this.conversationHistoryByThread.set(threadId, []);
    }

    console.log(`Set active thread to ${threadId}`);
  }

  // ============================================================================
  // Message Handling (SDK Agent Pattern)
  // ============================================================================

  async sendMessage(
    conversationId: Id | null,
    text: string,
    options?: {
      attachments?: Id[];
      metadata?: Record<string, unknown>;
      onEvent?: (event: { type: string; data: any }) => void;
    }
  ): Promise<MessageDoc> {
    // Auto-create conversation if needed
    if (!conversationId && !this.threadId) {
      const conv = await this.createConversation();
      conversationId = conv.id;
    }

    const threadId = conversationId || this.threadId!;

    // Get or create conversation-specific history
    const conversationHistory = this.conversationHistoryByThread.get(threadId) || [];

    // Create user message with timestamp for proper ordering
    const timestamp = new Date().toISOString();
    const userMessage: Message = {
      id: `msg_${crypto.randomUUID()}`,
      role: 'user',
      content: text,
    };

    // Add to conversation's history
    conversationHistory.push(userMessage);
    this.conversationHistoryByThread.set(threadId, conversationHistory);

    // Emit user message created (reuse same timestamp for consistency)
    const userMessageDoc: MessageDoc = {
      ...userMessage,
      conversationId: threadId,
      status: 'completed',
      createdAt: timestamp,
    };
    this.emit('message.created', { message: userMessageDoc });

    // Prepare RunAgentInput with conversation-specific history
    const input: RunAgentInput = {
      threadId,
      runId: `run_${crypto.randomUUID()}`,
      state: {},
      messages: [...conversationHistory],
      tools: [],
      context: [],
      forwardedProps: options?.metadata || {},
    };

    try {
      let assistantMessageId: string | null = null;

      // Run agent and subscribe to events
      const subscription = this.agent.run(input).subscribe({
        next: (event: any) => {
          // Accumulate streaming content for conversation history
          if (event.type === 'TEXT_MESSAGE_START') {
            assistantMessageId = event.messageId;
            this.streamingContent.set(event.messageId, '');
            this.streamingToolCalls.set(event.messageId, []);
          }

          if (event.type === 'TEXT_MESSAGE_CONTENT') {
            const current = this.streamingContent.get(event.messageId) || '';
            this.streamingContent.set(event.messageId, current + (event.delta || ''));
          }

          // Accumulate tool calls for conversation history
          if (event.type === 'TOOL_CALL_START') {
            this.toolCallsInProgress.set(event.toolCallId, {
              id: event.toolCallId,
              name: event.toolName,
              args: '',
              messageId: event.messageId,
            });
          }

          if (event.type === 'TOOL_CALL_ARGS') {
            const tc = this.toolCallsInProgress.get(event.toolCallId);
            if (tc) {
              tc.args += event.delta || '';
            }
          }

          if (event.type === 'TOOL_CALL_END') {
            const tc = this.toolCallsInProgress.get(event.toolCallId);
            if (tc) {
              const toolCalls = this.streamingToolCalls.get(tc.messageId) || [];
              toolCalls.push({
                id: tc.id,
                type: 'function',
                function: {
                  name: tc.name,
                  arguments: tc.args,
                },
              });
              this.streamingToolCalls.set(tc.messageId, toolCalls);
              this.toolCallsInProgress.delete(event.toolCallId);
            }
          }

          if (event.type === 'TEXT_MESSAGE_END') {
            // Push complete assistant message with full content and tool calls to history
            const assistantMessage: Message = {
              id: event.messageId,
              role: 'assistant',
              content: this.streamingContent.get(event.messageId) || '',
            };

            // Add tool calls if any
            const toolCalls = this.streamingToolCalls.get(event.messageId);
            if (toolCalls && toolCalls.length > 0) {
              assistantMessage.toolCalls = toolCalls;
            }

            // Add to conversation-specific history
            const history = this.conversationHistoryByThread.get(threadId) || [];
            history.push(assistantMessage);
            this.conversationHistoryByThread.set(threadId, history);

            // Cleanup streaming state
            this.streamingContent.delete(event.messageId);
            this.streamingToolCalls.delete(event.messageId);
          }

          // Handle tool result messages - add them to conversation history
          // These provide context about tool executions without resending tool_use blocks
          if (event.type === 'TOOL_CALL_RESULT') {
            const toolResultMessage: Message = {
              id: event.messageId,
              role: 'tool',
              content: event.content || '',
              toolCallId: event.toolCallId,
            };

            // Add to conversation-specific history
            const history = this.conversationHistoryByThread.get(threadId) || [];
            history.push(toolResultMessage);
            this.conversationHistoryByThread.set(threadId, history);

            console.log(`Added tool result message ${event.messageId} for tool call ${event.toolCallId} to conversation ${threadId} history`);
          }

          // Forward to external handler
          options?.onEvent?.({ type: event.type, data: event });

          // Emit to internal listeners for store with conversation context
          // Add conversationId to event so store can associate messages correctly
          const enrichedEvent = { ...event, conversationId: threadId };
          this.emit(event.type, enrichedEvent);
        },
        error: (error: Error) => {
          console.error('Agent error:', error);

          // Cleanup on error
          if (assistantMessageId) {
            this.streamingContent.delete(assistantMessageId);
            this.streamingToolCalls.delete(assistantMessageId);
            this.activeSubscriptions.delete(userMessage.id);
          }

          // Cleanup any incomplete tool calls
          this.toolCallsInProgress.forEach((tc, tcId) => {
            if (tc.messageId === assistantMessageId) {
              this.toolCallsInProgress.delete(tcId);
            }
          });

          this.emit('message.errored', {
            messageId: userMessage.id,
            error: error.message
          });
        },
        complete: () => {
          // Cleanup on completion
          if (assistantMessageId) {
            this.streamingContent.delete(assistantMessageId);
            this.streamingToolCalls.delete(assistantMessageId);
          }
          this.activeSubscriptions.delete(userMessage.id);
          console.log('Agent run completed');
        },
      });

      // Track subscription for cancellation
      this.activeSubscriptions.set(userMessage.id, subscription);

      return {} as MessageDoc; // Actual message comes from events
    } catch (error: any) {
      this.emit('message.errored', {
        messageId: userMessage.id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Sync loaded messages to the conversation history Map
   * This ensures the SDK client has the full history when sending new messages
   *
   * IMPORTANT: We exclude tool calls from the synced history because:
   * - Tool calls are stored for UI display only
   * - When sent back to the API, they would create duplicate tool_use IDs
   * - The API reconstructs tool interactions from tool result messages
   */
  private syncMessagesToHistory(conversationId: string, messages: MessageDoc[]) {
    const history: Message[] = messages.map(msg => {
      // Handle tool messages specially (they require toolCallId)
      if (msg.role === 'tool') {
        const toolMessage: Message = {
          id: msg.id,
          role: 'tool',
          content: msg.content,
          toolCallId: msg.toolCallId || '',
        };
        return toolMessage;
      }

      // For other message types
      const message: Message = {
        id: msg.id,
        role: msg.role as any,
        content: msg.content,
      };

      // DO NOT include tool calls in the history that will be sent to the API
      // Tool calls are only for display in the UI
      // The API will reject requests with duplicate tool_use IDs

      return message;
    });

    // Update the conversation history Map
    this.conversationHistoryByThread.set(conversationId, history);
    console.log(`Synced ${history.length} messages to conversation ${conversationId} history`);
  }

  async getMessages(conversationId: Id): Promise<MessageDoc[]> {
    const endpoint = `${this.conversationsEndpoint}/${conversationId}/messages`;
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: this.headers,
      credentials: 'include',
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      throw new Error(`Failed to get messages: ${res.status} ${errorText}`);
    }

    const data = await res.json();
    const messages = data.messages || [];

    // Sync loaded messages to conversation history Map
    if (messages.length > 0) {
      this.syncMessagesToHistory(conversationId, messages);
    }

    return messages;
  }

  async cancelMessage(conversationId: Id, messageId: Id): Promise<void> {
    // 1. Abort active subscription
    const subscription = this.activeSubscriptions.get(messageId);
    if (subscription) {
      subscription.unsubscribe();
      this.activeSubscriptions.delete(messageId);
    }

    // 2. Cleanup streaming state for any messages being accumulated
    this.streamingContent.clear();
    this.streamingToolCalls.clear();
    this.toolCallsInProgress.clear();

    // 3. Emit canceled event
    this.emit('message.canceled', { messageId });
  }

  close(): void {
    // Unsubscribe from all active subscriptions
    this.activeSubscriptions.forEach(sub => sub.unsubscribe());
    this.activeSubscriptions.clear();

    // Clear streaming state
    this.streamingContent.clear();
    this.streamingToolCalls.clear();
    this.toolCallsInProgress.clear();

    // Clear other state
    this.listeners.clear();
    this.conversationHistoryByThread.clear();
    this.threadId = null;
  }
}

/**
 * Factory function for creating SDK agent
 */
export function createSdkAgent(options: SdkAgentOptions): AgUiClient {
  return new SdkAgClient(options);
}

export default createSdkAgent;
