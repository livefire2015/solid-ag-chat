import { createStore } from 'solid-js/store';
import { createSignal } from 'solid-js';
import type { AgUiClient, Id, ConversationDoc } from '../types';
import type { ChatState } from './state';
import { initStateFromSnapshot, applyNormalizedEvent } from './state';

export interface AgUiStore {
  state: ChatState;
  isConnected: () => boolean;

  // Conversation management
  loadConversations: () => Promise<void>;
  createConversation: (title?: string, metadata?: Record<string, unknown>) => Promise<ConversationDoc>;
  setActiveConversation: (id: Id) => void;
  archiveConversation: (id: Id) => Promise<void>;

  // Message management
  loadMessages: (conversationId: Id) => Promise<void>;
  sendMessage: (conversationId: Id | null, text: string, options?: {
    attachments?: Id[];
    metadata?: Record<string, unknown>;
  }) => Promise<void>;
  cancelMessage: (conversationId: Id, messageId: Id) => Promise<void>;

  close: () => void;
}

export function createAgUiStore(client: AgUiClient): AgUiStore {
  // Initialize empty state
  const [state, setState] = createStore<ChatState>({
    revision: '0',
    conversations: {},
    messages: {},
    attachments: {},
    messagesByConversation: {},
    streaming: {},
    toolCallsInProgress: {},
  });

  const [isConnected, setIsConnected] = createSignal(true); // Always connected in REST mode

  // Subscribe to all normalized events
  client.on('conversation.created', (payload) => {
    const c = (payload as any).conversation;
    setState('conversations', c.id, c);
    setState('activeConversationId', c.id);
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
      conversationId: state.activeConversationId,
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
    setState('messages', messageId, 'status', 'canceled');
  });

  // Official AG-UI events for tool calls
  client.on('TOOL_CALL_START', (payload) => {
    const { parentMessageId, toolCallId, toolCallName } = payload as any;

    // Auto-create parent message if it doesn't exist
    // (PydanticAI's handle_ag_ui_request doesn't send TEXT_MESSAGE_START for tool-calling messages)
    if (!state.messages[parentMessageId]) {
      console.log('[TOOL_CALL_START] Creating implicit parent message', parentMessageId);
      const parentMessage = {
        id: parentMessageId,
        role: 'assistant' as const,
        content: '',
        conversationId: state.activeConversationId,
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
          const updated = [...arr, toolCall];
          console.log('[TOOL_CALL_END] Updated toolCalls array', updated);
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

  client.on('attachment.available', (payload) => {
    const { attachment } = payload as any;
    setState('attachments', attachment.id, attachment);
  });

  client.on('attachment.failed', () => {
    // Optionally track errors
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
  };

  const archiveConversation = async (id: Id) => {
    await client.archiveConversation(id);
  };

  // Message management methods
  const loadMessages = async (conversationId: Id) => {
    const messages = await client.getMessages(conversationId);
    messages.forEach(m => {
      setState('messages', m.id, m);
      const cid = m.conversationId || conversationId;
      setState('messagesByConversation', cid, (arr = []) =>
        arr.includes(m.id) ? arr : [...arr, m.id]
      );
    });
  };

  const sendMessage = async (
    conversationId: Id | null,
    text: string,
    options?: {
      attachments?: Id[];
      metadata?: Record<string, unknown>;
    }
  ) => {
    await client.sendMessage(conversationId, text, options);
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
    archiveConversation,
    loadMessages,
    sendMessage,
    cancelMessage,
    close: () => client.close(),
  };
}
