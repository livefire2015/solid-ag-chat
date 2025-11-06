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
  getConversationState?: (conversationId: string) => any; // Optional state getter
  getGlobalState?: () => any; // Optional global state getter (for attachments, etc.)
}

/**
 * SDK-compliant AG-UI client with conversation management
 */
export class SdkAgClient implements AgUiClient {
  private agent: HttpAgent;
  private baseUrl: string;
  private headers: Record<string, string>;
  private conversationsEndpoint: string;
  private agentEndpointPath: string;
  private getConversationState?: (conversationId: string) => any;
  private getGlobalState?: () => any;
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

  // Map assistant messageId -> runId for server-side cancellation
  private activeRunByMessageId = new Map<string, string>();

  // Token refresh state management
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<void> | null = null;

  constructor(options: SdkAgentOptions) {
    this.baseUrl = options.baseUrl;
    this.headers = options.headers || {};
    this.conversationsEndpoint = options.conversationsEndpoint || '/conversations';
    this.agentEndpointPath = options.agentEndpoint || '/agent/run';
    this.getConversationState = options.getConversationState;
    this.getGlobalState = options.getGlobalState;

    // Create SDK HttpAgent
    this.agent = new HttpAgent({
      url: `${options.baseUrl}${this.agentEndpointPath}`,
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

  emit<E extends string>(type: E, payload: any): void {
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
  // Token Refresh (Automatic Authentication)
  // ============================================================================

  /**
   * Refresh access token using refresh token from HTTP-only cookie
   */
  private async refreshTokens(): Promise<void> {
    try {
      console.log('[SdkAgClient] Refreshing tokens...');
      const response = await fetch(`${this.baseUrl}/nova/idm/auth/token/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('[SdkAgClient] Token refresh failed, redirecting to login');
        // Redirect to login if refresh fails
        window.location.href = '/supernova/login';
        throw new Error('Token refresh failed');
      }

      console.log('[SdkAgClient] Token refresh successful');
    } catch (error) {
      console.error('[SdkAgClient] Error during token refresh:', error);
      // Redirect to login on refresh failure
      window.location.href = '/supernova/login';
      throw error;
    }
  }

  /**
   * Fetch wrapper with automatic token refresh on 401
   */
  private async fetchWithAuth(
    url: string,
    options: RequestInit = {},
    retryCount: number = 0
  ): Promise<Response> {
    const config: RequestInit = {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers,
        ...options.headers,
      },
    };

    const response = await fetch(url, config);

    // Handle 401 with automatic token refresh
    if (response.status === 401 && retryCount === 0) {
      console.log('[SdkAgClient] Received 401, attempting token refresh...');

      // If a refresh is already in progress, wait for it
      if (this.isRefreshing && this.refreshPromise) {
        await this.refreshPromise;
      } else {
        // Start a new refresh
        this.isRefreshing = true;
        this.refreshPromise = this.refreshTokens().finally(() => {
          this.isRefreshing = false;
          this.refreshPromise = null;
        });
        await this.refreshPromise;
      }

      // Retry the original request once after refresh
      return this.fetchWithAuth(url, options, retryCount + 1);
    }

    return response;
  }

  // ============================================================================
  // Conversation Management (REST APIs)
  // ============================================================================

  async createConversation(title?: string, metadata?: Record<string, unknown>): Promise<ConversationDoc> {
    const res = await this.fetchWithAuth(`${this.baseUrl}${this.conversationsEndpoint}`, {
      method: 'POST',
      body: JSON.stringify({ title, metadata }),
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
    const res = await this.fetchWithAuth(`${this.baseUrl}${this.conversationsEndpoint}`);

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      throw new Error(`Failed to list conversations: ${res.status} ${errorText}`);
    }

    const data = await res.json();
    return data.conversations || [];
  }

  async getConversation(id: Id): Promise<ConversationDoc> {
    const res = await this.fetchWithAuth(`${this.baseUrl}${this.conversationsEndpoint}/${id}`);

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      throw new Error(`Failed to get conversation: ${res.status} ${errorText}`);
    }

    return res.json();
  }

  async updateConversation(id: Id, updates: Partial<ConversationDoc>): Promise<ConversationDoc> {
    const res = await this.fetchWithAuth(`${this.baseUrl}${this.conversationsEndpoint}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
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
    const res = await this.fetchWithAuth(`${this.baseUrl}${this.conversationsEndpoint}/${id}`, {
      method: 'DELETE',
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
    console.log('[SdkAgClient.sendMessage] Called with text:', text, 'conversationId:', conversationId, 'threadId:', this.threadId);

    // Auto-create conversation if needed
    if (!conversationId && !this.threadId) {
      console.log('[SdkAgClient.sendMessage] Auto-creating conversation');
      const conv = await this.createConversation();
      conversationId = conv.id;
      console.log('[SdkAgClient.sendMessage] Created conversation:', conversationId);
    }

    const threadId = conversationId || this.threadId!;
    console.log('[SdkAgClient.sendMessage] Using threadId:', threadId);

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

    // Get current agent state for this conversation
    const conversationState = this.getConversationState
      ? this.getConversationState(threadId)
      : {};

    // Get global state for attachments (pending uploads)
    const globalState = this.getGlobalState ? this.getGlobalState() : {};

    // Merge attachments from three sources:
    // 1. Previously sent attachments from conversation state
    // 2. New pending uploads from global state
    // 3. Specific attachment IDs from options parameter
    const mergedAttachments: Record<string, any> = {
      // Start with conversation's existing attachments
      ...(conversationState.attachments || {}),
    };

    // Add new attachments from options (if provided)
    if (options?.attachments && options.attachments.length > 0) {
      options.attachments.forEach((id) => {
        // Try global state first (new uploads), then conversation state (previously sent)
        const attachment = globalState?.attachments?.[id] || conversationState.attachments?.[id];
        if (attachment) {
          mergedAttachments[id] = attachment;
        }
      });
    }

    // Build state with merged attachments
    const stateWithAttachments = {
      ...conversationState,
      ...(Object.keys(mergedAttachments).length > 0 ? { attachments: mergedAttachments } : {})
    };

    // Prepare RunAgentInput with conversation-specific history and state
    const input: RunAgentInput = {
      threadId,
      runId: `run_${crypto.randomUUID()}`,
      state: stateWithAttachments, // Include agent state + attachments
      messages: [...conversationHistory],
      tools: [],
      context: [],
      forwardedProps: options?.metadata || {},
    };

    // Log state being sent for debugging
    if (conversationState && Object.keys(conversationState).length > 0) {
      console.log('[SdkAgClient.sendMessage] Sending state:', conversationState);
    }

    try {
      let assistantMessageId: string | null = null;

      console.log('[SdkAgClient.sendMessage] Calling this.agent.run() with runId:', input.runId);

      // Run agent and subscribe to events
      const subscription = this.agent.run(input).subscribe({
        next: (event: any) => {
          // Accumulate streaming content for conversation history
          if (event.type === 'TEXT_MESSAGE_START') {
            assistantMessageId = event.messageId;
            this.streamingContent.set(event.messageId, '');
            this.streamingToolCalls.set(event.messageId, []);

            // Track runId for this assistant message for server-side cancellation
            if (input.runId) {
              this.activeRunByMessageId.set(event.messageId, input.runId);
            }

            // Track subscription by assistant message ID for cancellation
            this.activeSubscriptions.set(event.messageId, subscription);
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
            console.log('[SdkAgClient] TOOL_CALL_END event received for toolCallId:', event.toolCallId);
            const tc = this.toolCallsInProgress.get(event.toolCallId);
            if (tc) {
              const toolCalls = this.streamingToolCalls.get(tc.messageId) || [];
              console.log('[SdkAgClient] Current tool calls for message', tc.messageId, ':', toolCalls.map(t => t.id));

              // Check for duplicates before adding
              const exists = toolCalls.some(existing => existing.id === tc.id);
              if (exists) {
                console.warn('[SdkAgClient] Duplicate TOOL_CALL_END for tool call ID:', tc.id, '- SKIPPING');
              } else {
                toolCalls.push({
                  id: tc.id,
                  type: 'function',
                  function: {
                    name: tc.name,
                    arguments: tc.args,
                  },
                });
                console.log('[SdkAgClient] Added tool call, new count:', toolCalls.length);
              }

              this.streamingToolCalls.set(tc.messageId, toolCalls);
              this.toolCallsInProgress.delete(event.toolCallId);
            } else {
              console.warn('[SdkAgClient] TOOL_CALL_END received but no tool call in progress for ID:', event.toolCallId);
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
            this.activeSubscriptions.delete(assistantMessageId);
          }

          // Cleanup any incomplete tool calls
          this.toolCallsInProgress.forEach((tc, tcId) => {
            if (tc.messageId === assistantMessageId) {
              this.toolCallsInProgress.delete(tcId);
            }
          });

          // Cleanup run mapping
          if (assistantMessageId) {
            this.activeRunByMessageId.delete(assistantMessageId);
          }

          this.emit('message.errored', {
            messageId: assistantMessageId || userMessage.id,
            error: error.message
          });
        },
        complete: () => {
          // Cleanup on completion
          if (assistantMessageId) {
            this.streamingContent.delete(assistantMessageId);
            this.streamingToolCalls.delete(assistantMessageId);
            this.activeSubscriptions.delete(assistantMessageId);
            this.activeRunByMessageId.delete(assistantMessageId);
          }

          console.log('Agent run completed');
        },
      });

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
    // EXCLUDE from history:
    // 1. Tool result messages (role: 'tool') - orphaned without toolCalls in assistant messages
    // 2. Assistant messages immediately followed by tool messages - these are incomplete
    //    (e.g., "I'll help..." before tool execution). Keep only the FINAL assistant message
    //    after tool completion (e.g., "Great! I found your data...")
    //
    // This prevents incomplete conversation sequences that confuse the LLM when switching
    // between conversations.
    const history: Message[] = [];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const nextMsg = i < messages.length - 1 ? messages[i + 1] : null;

      // Skip tool result messages
      if (msg.role === 'tool') {
        continue;
      }

      // Skip assistant messages immediately followed by tool messages
      // (keep only the final assistant message after tool execution completes)
      if (msg.role === 'assistant' && nextMsg && nextMsg.role === 'tool') {
        continue;
      }

      // Keep all other messages (user, final assistant responses)
      const message: Message = {
        id: msg.id,
        role: msg.role as any,
        content: msg.content,
      };

      history.push(message);
    }

    // Update the conversation history Map
    this.conversationHistoryByThread.set(conversationId, history);
    console.log(`Synced ${history.length} messages to conversation ${conversationId} history (excluded ${messages.length - history.length} tool/incomplete messages)`);
  }

  async getMessages(conversationId: Id): Promise<MessageDoc[]> {
    const endpoint = `${this.conversationsEndpoint}/${conversationId}/messages`;
    const res = await this.fetchWithAuth(`${this.baseUrl}${endpoint}`);

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
    // 1. Get partial content before cleanup
    const partialContent = this.streamingContent.get(messageId);

    // 2. Abort active subscription
    const subscription = this.activeSubscriptions.get(messageId);
    if (subscription) {
      subscription.unsubscribe();
      this.activeSubscriptions.delete(messageId);
    }

    // 2b. Best-effort server-side cancel by runId (if known)
    try {
      const runId = this.activeRunByMessageId.get(messageId);
      if (runId && this.agentEndpointPath.includes('/ag-ui')) {
        const cancelUrl = `${this.baseUrl}${this.agentEndpointPath}/cancel`;
        await this.fetchWithAuth(cancelUrl, {
          method: 'POST',
          body: JSON.stringify({ runId }),
        }).catch(() => void 0);
      }
    } catch {
      // ignore
    }

    // 3. Save partial message to backend with canceled status
    if (partialContent) {
      try {
        const endpoint = `${this.conversationsEndpoint}/${conversationId}/messages/${messageId}`;
        await this.fetchWithAuth(`${this.baseUrl}${endpoint}`, {
          method: 'PATCH',
          body: JSON.stringify({
            content: partialContent,
            status: 'canceled'
          }),
        });
        console.log('[cancelMessage] Saved partial content to backend:', partialContent.length, 'chars');
      } catch (error) {
        console.error('[cancelMessage] Failed to save canceled message to backend:', error);
        // Don't throw - cancellation should still work even if save fails
      }
    }

    // 4. Cleanup streaming state
    this.streamingContent.delete(messageId);
    this.streamingToolCalls.delete(messageId);
    this.toolCallsInProgress.delete(messageId);
    this.activeRunByMessageId.delete(messageId);

    // 5. Emit canceled event
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
