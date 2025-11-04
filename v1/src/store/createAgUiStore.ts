import { createStore } from 'solid-js/store';
import { createSignal, createEffect, onCleanup } from 'solid-js';
import type { AgUiClient, Id, ConversationDoc } from '../types';
import type { ChatState } from './state';
import { initStateFromSnapshot, applyNormalizedEvent } from './state';
import { loadAgentState, debouncedSaveAgentState, clearPersistedState, viewPersistedState, getStorageStats } from './persistence';

export interface AgUiStore {
  state: ChatState;
  isConnected: () => boolean;

  // Conversation management
  loadConversations: () => Promise<void>;
  createConversation: (title?: string, metadata?: Record<string, unknown>) => Promise<ConversationDoc>;
  setActiveConversation: (id: Id) => void;
  updateConversation: (id: Id, updates: Partial<ConversationDoc>) => Promise<ConversationDoc>;
  archiveConversation: (id: Id) => Promise<void>;

  // Message management
  loadMessages: (conversationId: Id) => Promise<void>;
  sendMessage: (conversationId: Id | null, text: string, options?: {
    attachments?: Id[];
    metadata?: Record<string, unknown>;
  }) => Promise<void>;
  cancelMessage: (conversationId: Id, messageId: Id) => Promise<void>;

  close: () => void;

  // Debug tools (for development)
  _debug: {
    clearPersistedState: () => void;
    viewPersistedState: () => any;
    getStorageStats: () => { used: number; total: number; percentage: number };
  };
}

export function createAgUiStore(client: AgUiClient): AgUiStore {
  // Load persisted agent state from localStorage
  const persistedAgentState = loadAgentState();

  // Initialize state (with persisted agent state if available)
  const [state, setState] = createStore<ChatState>({
    revision: '0',
    conversations: {},
    messages: {},
    attachments: {},
    messagesByConversation: {},
    streaming: {},
    toolCallsInProgress: {},
    agentStateByConversation: persistedAgentState || {}, // Restore from localStorage
  });

  const [isConnected, setIsConnected] = createSignal(true); // Always connected in REST mode

  // Track which conversations have been loaded from server to prevent duplicate loads
  const loadedConversations = new Set<string>();

  // If client is SdkAgClient, provide state getters for bidirectional state flow
  if ('getConversationState' in client && typeof (client as any).getConversationState === 'undefined') {
    (client as any).getConversationState = (conversationId: string) => {
      return state.agentStateByConversation[conversationId] || {};
    };
  }

  // Provide global state getter for attachments and other global state
  if ('getGlobalState' in client && typeof (client as any).getGlobalState === 'undefined') {
    (client as any).getGlobalState = () => {
      return state;
    };
  }

  // NOTE: Auto-save moved to ChatProvider.tsx where it runs in proper reactive context
  // createEffect outside a component doesn't track dependencies properly

  // Multi-tab synchronization via storage events
  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === 'solid-ag-chat:agentState' && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue);
        if (parsed.version === 1) {
          console.log('[store] Syncing agent state from another tab');

          // Update state with data from other tab
          // Note: This will trigger auto-save in ChatProvider, which is fine
          // Storage events only fire in OTHER tabs, not the one that made the change
          setState('agentStateByConversation', parsed.data);
        }
      } catch (error) {
        console.error('[store] Failed to sync from storage event:', error);
      }
    }
  };

  // Register storage event listener
  window.addEventListener('storage', handleStorageChange);

  // Subscribe to all normalized events
  client.on('conversation.created', (payload) => {
    const c = (payload as any).conversation;
    setState('conversations', c.id, c);
    setState('activeConversationId', c.id);

    // Attachments are now scoped per conversation
    // No auto-copy from global state to prevent attachment pollution
  });

  client.on('conversation.updated', (payload) => {
    const c = (payload as any).conversation;
    setState('conversations', c.id, c);
  });

  client.on('conversation.archived', (payload) => {
    const id = (payload as any).conversationId;
    setState('conversations', id, 'status', 'archived');
  });

  // Legacy event for user messages (backward compatibility)
  // TODO: Migrate to TEXT_MESSAGE_* events for user messages too
  client.on('message.created', (payload) => {
    const m = (payload as any).message;
    setState('messages', m.id, m);
    setState('messagesByConversation', m.conversationId, (arr = []) =>
      arr.includes(m.id) ? arr : [...arr, m.id]
    );
  });

  // Official AG-UI events for text streaming
  client.on('TEXT_MESSAGE_START', (payload) => {
    const p = payload as any;
    const msg = {
      id: p.messageId,
      role: p.role || 'assistant',
      content: '',
      conversationId: p.conversationId || state.activeConversationId,
      status: 'streaming' as const,
      createdAt: new Date().toISOString(),
    };
    setState('messages', msg.id, msg);
    if (msg.conversationId) {
      setState('messagesByConversation', msg.conversationId, (arr = []) =>
        arr.includes(msg.id) ? arr : [...arr, msg.id]
      );
    }
    setState('streaming', msg.id, { text: '' });
  });

  client.on('TEXT_MESSAGE_CONTENT', (payload) => {
    const { messageId, delta } = payload as any;
    setState('streaming', messageId, (s = { text: '' }) => ({
      text: s.text + (delta || '')
    }));
  });

  client.on('TEXT_MESSAGE_END', (payload) => {
    const { messageId } = payload as any;
    const streamingText = state.streaming[messageId]?.text;
    if (streamingText) {
      setState('messages', messageId, 'content', streamingText);
    }
    setState('streaming', messageId, undefined!);
    setState('messages', messageId, 'status', 'completed');
  });

  client.on('message.errored', (payload) => {
    const { messageId } = payload as any;
    setState('messages', messageId, 'status', 'errored');
  });

  client.on('message.canceled', (payload) => {
    const { messageId } = payload as any;

    // Preserve the partial streaming text before marking as canceled
    // This ensures the UI can display what was generated before stopping
    const streamingState = state.streaming[messageId];
    if (streamingState?.text) {
      setState('messages', messageId, 'content', streamingState.text);
    }

    setState('messages', messageId, 'status', 'canceled');
  });

  // Official AG-UI events for tool calls
  client.on('TOOL_CALL_START', (payload) => {
    const { parentMessageId, toolCallId, toolCallName, conversationId } = payload as any;

    // Auto-create parent message if it doesn't exist
    // (PydanticAI's handle_ag_ui_request doesn't send TEXT_MESSAGE_START for tool-calling messages)
    if (!state.messages[parentMessageId]) {
      console.log('[TOOL_CALL_START] Creating implicit parent message', parentMessageId);
      const parentMessage = {
        id: parentMessageId,
        role: 'assistant' as const,
        content: '',
        conversationId: conversationId || state.activeConversationId,
        status: 'completed' as const,
        createdAt: new Date().toISOString(),
      };
      setState('messages', parentMessageId, parentMessage);

      // Add to conversation's message list
      if (parentMessage.conversationId) {
        setState('messagesByConversation', parentMessage.conversationId, (arr = []) =>
          arr.includes(parentMessageId) ? arr : [...arr, parentMessageId]
        );
      }
    }

    setState('toolCallsInProgress', toolCallId, {
      id: toolCallId,
      name: toolCallName,
      args: '',
      messageId: parentMessageId,
    });
  });

  client.on('TOOL_CALL_ARGS', (payload) => {
    const { toolCallId, delta } = payload as any;
    setState('toolCallsInProgress', toolCallId, 'args', (args = '') => args + (delta || ''));
  });

  client.on('TOOL_CALL_END', (payload) => {
    const { toolCallId } = payload as any;
    const tc = state.toolCallsInProgress[toolCallId];
    console.log('[TOOL_CALL_END] Received', {
      toolCallId,
      toolCallInProgress: tc,
      messageExists: tc ? !!state.messages[tc.messageId] : false,
      allMessages: Object.keys(state.messages)
    });

    if (tc) {
      const msg = state.messages[tc.messageId];
      if (msg) {
        const toolCall = {
          id: tc.id,
          type: 'function' as const,
          function: {
            name: tc.name,
            arguments: tc.args,
          },
        };
        console.log('[TOOL_CALL_END] Adding toolCall to message', tc.messageId, toolCall);
        setState('messages', tc.messageId, 'toolCalls', (arr = []) => {
          // Check if toolCall already exists to prevent duplicates
          const exists = arr.some(existing => existing.id === toolCall.id);
          const updated = exists ? arr : [...arr, toolCall];
          console.log('[TOOL_CALL_END] Updated toolCalls array', { exists, updated });
          return updated;
        });
        console.log('[TOOL_CALL_END] Message after update', state.messages[tc.messageId]);
      } else {
        console.error('[TOOL_CALL_END] Message not found for ID:', tc.messageId);
      }
      setState('toolCallsInProgress', toolCallId, undefined!);
    } else {
      console.error('[TOOL_CALL_END] No tool call in progress for ID:', toolCallId);
    }
  });

  // Handle tool result messages
  client.on('TOOL_CALL_RESULT', (payload) => {
    const { messageId, toolCallId, content, role } = payload as any;

    // Find parent message to get conversationId
    const parentMessage = Object.values(state.messages).find(m =>
      m.toolCalls?.some(tc => tc.id === toolCallId)
    );
    const conversationId = parentMessage?.conversationId || state.activeConversationId;

    // Create tool result message
    const toolMessage = {
      id: messageId,
      role: role || 'tool',  // Should be "tool"
      content: content || '',
      toolCallId: toolCallId,
      conversationId: conversationId,
      status: 'completed' as const,
      createdAt: new Date().toISOString(),
    };

    // Add to messages
    setState('messages', messageId, toolMessage);

    // Add to conversation's message list
    if (toolMessage.conversationId) {
      setState('messagesByConversation', toolMessage.conversationId, (arr = []) =>
        arr.includes(messageId) ? arr : [...arr, messageId]
      );
    }
  });

  // Attachment upload events
  client.on('attachment.uploading', (payload) => {
    const { attachment } = payload as any;

    // Store in global state for UI display
    setState('attachments', attachment.id, attachment);

    // IMMEDIATELY store in conversation's shared state if conversation exists
    const conversationId = state.activeConversationId;
    if (conversationId) {
      setState('agentStateByConversation', conversationId, (prevState = {}) => ({
        ...prevState,
        attachments: {
          ...(prevState.attachments || {}),
          [attachment.id]: attachment,
        },
      }));
      console.log('[attachment.uploading] Stored in conversation shared state:', conversationId, attachment.id);
    } else {
      console.log('[attachment.uploading] No active conversation, stored in global only:', attachment.id);
    }
  });

  client.on('attachment.progress', (payload) => {
    const { fileId, progress } = payload as any;
    // Update progress if needed (optional - can be handled in components)
    if (state.attachments[fileId]) {
      setState('attachments', fileId, 'metadata', (meta = {}) => ({
        ...meta,
        progress: progress,
      }));
    }
  });

  client.on('attachment.available', (payload) => {
    const { attachment } = payload as any;

    // Update in global state
    setState('attachments', attachment.id, attachment);

    // IMMEDIATELY update in conversation's shared state if conversation exists
    const conversationId = state.activeConversationId;
    if (conversationId) {
      setState('agentStateByConversation', conversationId, (prevState = {}) => ({
        ...prevState,
        attachments: {
          ...(prevState.attachments || {}),
          [attachment.id]: attachment,
        },
      }));
      console.log('[attachment.available] Updated in conversation shared state:', conversationId, attachment.id);
    } else {
      console.log('[attachment.available] No active conversation, updated global only:', attachment.id);
    }
  });

  client.on('attachment.failed', (payload) => {
    const { fileId, error } = payload as any;

    // Mark attachment as failed in global state
    if (state.attachments[fileId]) {
      setState('attachments', fileId, 'state', 'failed');
      setState('attachments', fileId, 'metadata', (meta = {}) => ({
        ...meta,
        error: error || 'Upload failed',
      }));
    }

    // Also update in conversation's shared state if conversation exists
    const conversationId = state.activeConversationId;
    if (conversationId && state.agentStateByConversation[conversationId]?.attachments?.[fileId]) {
      setState('agentStateByConversation', conversationId, 'attachments', fileId, 'state', 'failed');
      setState('agentStateByConversation', conversationId, 'attachments', fileId, 'metadata', (meta = {}) => ({
        ...meta,
        error: error || 'Upload failed',
      }));
      console.log('[attachment.failed] Updated in conversation shared state:', conversationId, fileId);
    }
  });

  // Handle STATE_SNAPSHOT events for agent state (suggested questions, etc.)
  client.on('STATE_SNAPSHOT', (payload) => {
    const p = payload as any;
    console.log('[STATE_SNAPSHOT] Received agent state update:', p);

    // Extract conversation ID from payload or use active conversation
    const conversationId = p.conversationId || state.activeConversationId;

    if (conversationId && p.snapshot) {
      // Update agent state for this conversation
      // Use merge pattern to trigger reactivity (same as attachments)
      setState('agentStateByConversation', conversationId, (prevState = {}) => ({
        ...prevState,
        ...p.snapshot,
      }));
      console.log('[STATE_SNAPSHOT] Updated state for conversation:', conversationId);
    } else {
      console.warn('[STATE_SNAPSHOT] No conversationId or snapshot in payload:', p);
    }
  });

  // Conversation management methods
  const loadConversations = async () => {
    const conversations = await client.listConversations();
    const conversationsMap: Record<string, any> = {};
    conversations.forEach(c => {
      conversationsMap[c.id] = c;
    });
    setState('conversations', conversationsMap);
  };

  const createConversation = async (title?: string, metadata?: Record<string, unknown>) => {
    return await client.createConversation(title, metadata);
  };

  const setActiveConversation = (id: Id) => {
    setState('activeConversationId', id);

    // Clear global attachments when switching conversations
    // Each conversation should have its own attachments in agentStateByConversation
    setState('attachments', {});

    // Also set active thread in SDK client if supported
    if (client.setActiveThread) {
      client.setActiveThread(id);
    }
  };

  const updateConversation = async (id: Id, updates: Partial<ConversationDoc>) => {
    return await client.updateConversation(id, updates);
  };

  const archiveConversation = async (id: Id) => {
    await client.archiveConversation(id);
  };

  // Message management methods
  const loadMessages = async (conversationId: Id, force = false) => {
    console.log('[loadMessages] Loading messages for conversation:', conversationId, 'force:', force);

    // Skip if already loaded (unless forced)
    if (!force && loadedConversations.has(conversationId)) {
      console.log('[loadMessages] Already loaded, skipping');
      return;
    }

    // Set active thread when loading messages for a conversation
    if (client.setActiveThread) {
      client.setActiveThread(conversationId);
    }

    // Get current messages to preserve optimistic/streaming ones
    const currentMessageIds = state.messagesByConversation[conversationId] || [];
    const currentMessages = currentMessageIds
      .map(id => state.messages[id])
      .filter(Boolean);

    console.log('[loadMessages] Current messages before fetch:', currentMessages.length);

    const messages = await client.getMessages(conversationId);
    console.log('[loadMessages] Received', messages.length, 'messages from API');

    // REPLACE strategy with PRESERVATION:
    // Keep messages that are:
    // 1. Still streaming (status='streaming')
    // 2. Optimistic user messages (id starts with 'msg_')
    const preserveMessages = currentMessages.filter(m =>
      m.status === 'streaming' || m.id.startsWith('msg_')
    );
    console.log('[loadMessages] Preserving', preserveMessages.length, 'optimistic/streaming messages:', preserveMessages.map(m => m.id));

    // Combine: preserved + server messages (dedupe by ID, server takes precedence)
    const serverIds = new Set(messages.map(m => m.id));
    const finalMessages = [
      ...preserveMessages.filter(m => !serverIds.has(m.id)),
      ...messages
    ];

    // Sort by createdAt to maintain chronological order
    finalMessages.sort((a, b) =>
      new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
    );

    console.log('[loadMessages] Final message count:', finalMessages.length, 'IDs:', finalMessages.map(m => m.id));

    // 1. Clear message IDs for this conversation
    setState('messagesByConversation', conversationId, []);

    // 2. Add all messages (preserved + server)
    const messageIds: string[] = [];
    finalMessages.forEach(m => {
      setState('messages', m.id, m);
      messageIds.push(m.id);
    });

    // 3. Set the new message ID array (ordered)
    setState('messagesByConversation', conversationId, messageIds);

    // 4. Mark as loaded
    loadedConversations.add(conversationId);

    console.log('[loadMessages] Replaced with', finalMessages.length, 'messages (', preserveMessages.filter(m => !serverIds.has(m.id)).length, 'preserved +', messages.length, 'from server)');
  };

  const sendMessage = async (
    conversationId: Id | null,
    text: string,
    options?: {
      attachments?: Id[];
      metadata?: Record<string, unknown>;
    }
  ) => {
    console.log('[createAgUiStore.sendMessage] Called with text:', text, 'conversationId:', conversationId, 'activeConversationId:', state.activeConversationId);

    // If no conversation ID provided and no active conversation, wait for auto-creation
    if (!conversationId && !state.activeConversationId) {
      console.log('[sendMessage] No conversation provided, will auto-create');
    }

    console.log('[createAgUiStore.sendMessage] Calling client.sendMessage');
    await client.sendMessage(conversationId, text, options);
    console.log('[createAgUiStore.sendMessage] client.sendMessage completed');

    // After sending, ensure active conversation is set if it was auto-created
    // The conversation.created event should have already set this, but double-check
    if (!conversationId && !state.activeConversationId) {
      console.warn('[sendMessage] Conversation was created but activeConversationId not set');
    }
  };

  const cancelMessage = async (conversationId: Id, messageId: Id) => {
    await client.cancelMessage(conversationId, messageId);
  };

  return {
    state,
    isConnected,
    loadConversations,
    createConversation,
    setActiveConversation,
    updateConversation,
    archiveConversation,
    loadMessages,
    sendMessage,
    cancelMessage,
    close: () => {
      // Cleanup storage event listener
      window.removeEventListener('storage', handleStorageChange);
      client.close();
    },

    // Debug tools (exposed for development)
    _debug: {
      clearPersistedState,
      viewPersistedState,
      getStorageStats,
    },
  };
}
