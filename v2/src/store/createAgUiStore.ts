import { createStore } from 'solid-js/store';
import { createSignal } from 'solid-js';
import type { AgUiClient, Id, ConversationDoc } from '../types';
import type { Tool } from '@ag-ui/core';
import type { ChatState } from './state';
import { initStateFromSnapshot, applyNormalizedEvent } from './state';
import { ToolExecutor } from '../tool-executor';

export interface AgUiStore {
  state: ChatState;
  isConnected: () => boolean;

  // V2: Tool executor
  toolExecutor?: ToolExecutor;

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
    tools?: Tool[]; // V2: Pass tools for this message
  }) => Promise<void>;
  cancelMessage: (conversationId: Id, messageId: Id) => Promise<void>;

  close: () => void;
}

export interface CreateAgUiStoreOptions {
  client: AgUiClient;
  toolExecutor?: ToolExecutor; // V2: Optional tool executor for bidirectional tools
}

export function createAgUiStore(clientOrOptions: AgUiClient | CreateAgUiStoreOptions): AgUiStore {
  // Support both old API (client only) and new API (options object)
  const client = 'on' in clientOrOptions ? clientOrOptions : clientOrOptions.client;
  const toolExecutor = 'on' in clientOrOptions ? undefined : clientOrOptions.toolExecutor;
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
    const { messageId, toolCallId, toolName } = payload as any;
    setState('toolCallsInProgress', toolCallId, {
      id: toolCallId,
      name: toolName,
      args: '',
      messageId,
    });
  });

  client.on('TOOL_CALL_ARGS', (payload) => {
    const { toolCallId, delta } = payload as any;
    setState('toolCallsInProgress', toolCallId, 'args', (args = '') => args + (delta || ''));
  });

  client.on('TOOL_CALL_END', async (payload) => {
    const { toolCallId } = payload as any;
    const tc = state.toolCallsInProgress[toolCallId];
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
        setState('messages', tc.messageId, 'toolCalls', (arr = []) => [...arr, toolCall]);

        // V2: If tool executor is available, execute the tool
        if (toolExecutor) {
          try {
            // Parse tool arguments
            const args = JSON.parse(tc.args || '{}');

            // Execute tool in frontend
            const result = await toolExecutor.executeTool(
              tc.id,
              tc.name,
              args,
              msg.conversationId || state.activeConversationId || '',
              tc.messageId
            );

            // Send tool result back to agent to resume execution
            // Note: This requires the client to have a sendToolResult method
            if ('sendToolResult' in client && typeof (client as any).sendToolResult === 'function') {
              await (client as any).sendToolResult(
                msg.conversationId || state.activeConversationId,
                tc.id,
                result
              );
            }
          } catch (error) {
            console.error(`Tool execution failed for ${tc.name}:`, error);
            // TODO: Emit tool execution error event
          }
        }
      }
      setState('toolCallsInProgress', toolCallId, undefined!);
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
      tools?: Tool[]; // V2: Pass tools
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
    toolExecutor, // V2: Expose tool executor
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
