import type {
  Id,
  ConversationDoc,
  MessageDoc,
  AttachmentDoc,
  StateSnapshot,
  EventPayloads,
  AgSpecEventPayloads,
  AgSpecEventType,
  UsageDoc,
} from '../types';
import { EventType } from '@ag-ui/core';
import type { ToolCall } from '@ag-ui/core';
import { applyPatch, Operation } from 'fast-json-patch';

// Tool call tracking for in-progress tool calls
interface ToolCallInProgress {
  id: string;
  name: string;
  args: string; // Accumulated JSON string
  messageId: string;
}

export interface ChatState {
  sessionId?: string;
  revision: string;
  conversations: Record<Id, ConversationDoc>;
  messages: Record<Id, MessageDoc>;
  attachments: Record<Id, AttachmentDoc>;
  messagesByConversation: Record<Id, Id[]>;
  streaming: Record<Id, { text: string }>;
  toolCallsInProgress: Record<string, ToolCallInProgress>; // toolCallId -> tool call
  activeConversationId?: Id;
}

export function initStateFromSnapshot(snap: StateSnapshot): ChatState {
  const conversations: Record<Id, ConversationDoc> = {};
  const messages: Record<Id, MessageDoc> = {};
  const attachments: Record<Id, AttachmentDoc> = {};
  const messagesByConversation: Record<Id, Id[]> = {};
  for (const c of snap.conversations) conversations[c.id] = c;
  for (const m of snap.messages) {
    messages[m.id] = m;
    if (m.conversationId) {
      const arr = messagesByConversation[m.conversationId] || (messagesByConversation[m.conversationId] = []);
      arr.push(m.id);
    }
  }
  for (const a of snap.attachments) attachments[a.id] = a;
  return {
    sessionId: snap.sessionId,
    revision: snap.revision,
    conversations,
    messages,
    attachments,
    messagesByConversation,
    streaming: {},
    toolCallsInProgress: {},
    activeConversationId: snap.activeConversationId,
  };
}

export function toSnapshot(state: ChatState): StateSnapshot {
  return {
    sessionId: state.sessionId || '',
    revision: state.revision,
    conversations: Object.values(state.conversations),
    messages: Object.values(state.messages),
    attachments: Object.values(state.attachments),
    activeConversationId: state.activeConversationId,
  };
}

// Note: applyJsonPatch removed - using fast-json-patch library instead

// Normalized event reducer
export function applyNormalizedEvent(state: ChatState, type: string, payload: any): ChatState {
  switch (type) {
    case 'state.snapshot': {
      return initStateFromSnapshot(payload as any as StateSnapshot);
    }
    case 'conversation.created': {
      const c = (payload as any).conversation as ConversationDoc;
      state.conversations[c.id] = c;
      state.activeConversationId = c.id;
      return state;
    }
    case 'conversation.updated': {
      const c = (payload as any).conversation as ConversationDoc;
      state.conversations[c.id] = c;
      return state;
    }
    case 'conversation.archived': {
      const id = (payload as any).conversationId as Id;
      const c = state.conversations[id];
      if (c) c.status = 'archived';
      return state;
    }
    case 'message.created': {
      const m = (payload as any).message as MessageDoc;
      state.messages[m.id] = m;
      if (m.conversationId) {
        const arr = state.messagesByConversation[m.conversationId] || (state.messagesByConversation[m.conversationId] = []);
        if (!arr.includes(m.id)) arr.push(m.id);
      }
      return state;
    }
    case 'message.delta': {
      const { messageId, textDelta } = (payload as any) as { messageId: Id; textDelta?: string };
      if (textDelta) {
        const s = state.streaming[messageId] || (state.streaming[messageId] = { text: '' });
        s.text += textDelta;
      }
      return state;
    }
    case 'message.completed': {
      const { messageId, usage } = (payload as any) as { messageId: Id; usage?: UsageDoc };
      const m = state.messages[messageId];
      if (m) {
        const s = state.streaming[messageId];
        if (s && s.text) {
          // Set content from streaming text (official AG-UI field)
          m.content = s.text;
          delete state.streaming[messageId];
        }
        m.status = 'completed';
        if (usage) m.usage = usage;
      }
      return state;
    }
    case 'message.errored': {
      const { messageId } = (payload as any) as { messageId: Id };
      const m = state.messages[messageId];
      if (m) m.status = 'errored';
      return state;
    }
    case 'message.canceled': {
      const { messageId } = (payload as any) as { messageId: Id };
      const m = state.messages[messageId];
      if (m) m.status = 'canceled';
      return state;
    }
    case 'attachment.available': {
      const { attachment } = (payload as any) as { attachment: AttachmentDoc };
      state.attachments[attachment.id] = attachment;
      return state;
    }
    case 'attachment.failed': {
      // Optionally track errors
      return state;
    }
    default:
      return state;
  }
}

// Mapping from AG-UI spec events to normalized state updates
export function applySpecEvent(state: ChatState, type: AgSpecEventType, payload: AgSpecEventPayloads[AgSpecEventType]): ChatState {
  switch (type) {
    case 'STATE_SNAPSHOT': {
      return initStateFromSnapshot(payload as any as StateSnapshot);
    }
    case 'STATE_DELTA': {
      const snap = toSnapshot(state);
      const patch = (payload as any).delta as Operation[]; // Official AG-UI uses 'delta' field
      applyPatch(snap as any, patch);
      return initStateFromSnapshot(snap);
    }
    case 'MESSAGES_SNAPSHOT': {
      // Replace messages and indexes, keep other fields
      const msgs = (payload as any).messages as MessageDoc[];
      state.messages = {} as any;
      state.messagesByConversation = {} as any;
      for (const m of msgs) {
        state.messages[m.id] = m;
        if (m.conversationId) {
          const arr = state.messagesByConversation[m.conversationId] || (state.messagesByConversation[m.conversationId] = []);
          arr.push(m.id);
        }
      }
      return state;
    }
    case 'TEXT_MESSAGE_START': {
      const p = payload as any;
      const m: MessageDoc = {
        id: p.messageId,
        role: (p.role || 'assistant') as any,
        content: '', // Official AG-UI field
        conversationId: state.activeConversationId,
        status: 'streaming',
        attachments: [],
        createdAt: new Date().toISOString()
      };
      state.messages[m.id] = m;
      if (m.conversationId) {
        const arr = state.messagesByConversation[m.conversationId] || (state.messagesByConversation[m.conversationId] = []);
        if (!arr.includes(m.id)) arr.push(m.id);
      }
      state.streaming[m.id] = { text: '' };
      return state;
    }
    case 'TEXT_MESSAGE_CONTENT': {
      const { messageId, delta } = payload as any;
      const s = state.streaming[messageId] || (state.streaming[messageId] = { text: '' });
      s.text += delta || '';
      return state;
    }
    case 'TEXT_MESSAGE_END': {
      const { messageId } = payload as any;
      const m = state.messages[messageId];
      if (m) {
        const s = state.streaming[messageId];
        // Set content from accumulated streaming text (official AG-UI field)
        if (s && s.text) m.content = s.text;
        m.status = 'completed';
        delete state.streaming[messageId];
      }
      return state;
    }
    case 'TEXT_MESSAGE_CHUNK': {
      const { messageId, role, delta } = payload as any;
      const id = messageId || `m_${Math.random().toString(36).slice(2, 8)}`;
      const start: AgSpecEventPayloads['TEXT_MESSAGE_START'] = { type: EventType.TEXT_MESSAGE_START, messageId: id, role: (role || 'assistant') as any };
      state = applySpecEvent(state, EventType.TEXT_MESSAGE_START, start);
      if (delta) state = applySpecEvent(state, EventType.TEXT_MESSAGE_CONTENT, { type: EventType.TEXT_MESSAGE_CONTENT, messageId: id, delta } as any);
      state = applySpecEvent(state, EventType.TEXT_MESSAGE_END, { type: EventType.TEXT_MESSAGE_END, messageId: id } as any);
      return state;
    }
    case 'TOOL_CALL_START': {
      const { messageId, toolCallId, toolName } = payload as any;
      state.toolCallsInProgress[toolCallId] = {
        id: toolCallId,
        name: toolName,
        args: '',
        messageId,
      };
      return state;
    }
    case 'TOOL_CALL_ARGS': {
      const { toolCallId, delta } = payload as any;
      const tc = state.toolCallsInProgress[toolCallId];
      if (tc) {
        tc.args += delta || '';
      }
      return state;
    }
    case 'TOOL_CALL_END': {
      const { toolCallId } = payload as any;
      const tc = state.toolCallsInProgress[toolCallId];
      if (tc) {
        // Add completed tool call to message.toolCalls array
        const msg = state.messages[tc.messageId];
        if (msg) {
          const toolCall: ToolCall = {
            id: tc.id,
            type: 'function',
            function: {
              name: tc.name,
              arguments: tc.args,
            },
          };
          msg.toolCalls = [...(msg.toolCalls || []), toolCall];
        }
        // Cleanup
        delete state.toolCallsInProgress[toolCallId];
      }
      return state;
    }
    case 'TOOL_CALL_RESULT': {
      // Tool results in official AG-UI are separate tool-role messages
      // Can be handled here if needed for UI display
      return state;
    }
    default:
      return state;
  }
}
