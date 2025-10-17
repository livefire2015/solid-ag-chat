import type {
  Id,
  ConversationDoc,
  MessageDoc,
  AttachmentDoc,
  StateSnapshot,
  EventPayloads,
  EventType,
  AgSpecEventPayloads,
  AgSpecEventType,
  UsageDoc,
  Part,
  ToolResultPart,
} from '../types';

export interface ChatState {
  sessionId?: string;
  revision: string;
  conversations: Record<Id, ConversationDoc>;
  messages: Record<Id, MessageDoc>;
  attachments: Record<Id, AttachmentDoc>;
  messagesByConversation: Record<Id, Id[]>;
  streaming: Record<Id, { text: string }>;
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
    const arr = messagesByConversation[m.conversationId] || (messagesByConversation[m.conversationId] = []);
    arr.push(m.id);
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

// Minimal JSON Patch (RFC6902) applier for add/replace/remove ops over a plain object
export function applyJsonPatch<T extends object>(target: T, patch: { op: string; path: string; value?: any }[]): T {
  const get = (obj: any, path: string, create = false) => {
    const parts = path.split('/').slice(1); // remove leading ''
    let parent: any = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const key = unescape(parts[i]);
      if (!(key in parent)) {
        if (create) parent[key] = {};
        else return [undefined, undefined];
      }
      parent = parent[key];
    }
    return [parent, unescape(parts[parts.length - 1])];
  };
  const unescape = (s: string) => s.replaceAll('~1', '/').replaceAll('~0', '~');

  for (const op of patch) {
    const { op: kind, path, value } = op as any;
    if (kind === 'add' || kind === 'replace') {
      const [parent, key] = get(target as any, path, true);
      if (parent !== undefined) parent[key] = value;
    } else if (kind === 'remove') {
      const [parent, key] = get(target as any, path);
      if (parent && key in parent) delete parent[key];
    }
  }
  return target;
}

// Normalized event reducer
export function applyNormalizedEvent(state: ChatState, type: EventType, payload: EventPayloads[EventType]): ChatState {
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
      const arr = state.messagesByConversation[m.conversationId] || (state.messagesByConversation[m.conversationId] = []);
      if (!arr.includes(m.id)) arr.push(m.id);
      return state;
    }
    case 'message.delta': {
      const { messageId, textDelta, partDelta } = (payload as any) as { messageId: Id; textDelta?: string; partDelta?: Part };
      if (textDelta) {
        const s = state.streaming[messageId] || (state.streaming[messageId] = { text: '' });
        s.text += textDelta;
      }
      if (partDelta) {
        const m = state.messages[messageId];
        if (m) m.parts = [...(m.parts || []), partDelta];
      }
      return state;
    }
    case 'message.completed': {
      const { messageId, usage } = (payload as any) as { messageId: Id; usage?: UsageDoc };
      const m = state.messages[messageId];
      if (m) {
        const s = state.streaming[messageId];
        if (s && s.text) {
          const textPart: Part = { kind: 'text', text: s.text } as any;
          m.parts = m.parts && m.parts.length ? m.parts : [textPart];
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
    case 'message.tool_call': {
      const { messageId, part } = (payload as any) as { messageId: Id; part: Part };
      const m = state.messages[messageId];
      if (m) m.parts = [...(m.parts || []), part];
      return state;
    }
    case 'message.tool_result': {
      const { messageId, part } = (payload as any) as { messageId: Id; part: ToolResultPart };
      const m = state.messages[messageId];
      if (m) m.parts = [...(m.parts || []), part];
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
      applyJsonPatch(snap as any, (payload as any).patch);
      return initStateFromSnapshot(snap);
    }
    case 'MESSAGES_SNAPSHOT': {
      // Replace messages and indexes, keep other fields
      const msgs = (payload as any).messages as MessageDoc[];
      state.messages = {} as any;
      state.messagesByConversation = {} as any;
      for (const m of msgs) {
        state.messages[m.id] = m;
        const arr = state.messagesByConversation[m.conversationId] || (state.messagesByConversation[m.conversationId] = []);
        arr.push(m.id);
      }
      return state;
    }
    case 'TEXT_MESSAGE_START': {
      const p = payload as any;
      const m: MessageDoc = { id: p.messageId, conversationId: state.activeConversationId || '', role: (p.role || 'assistant') as any, status: 'streaming', parts: [], attachments: [], createdAt: new Date().toISOString() };
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
        if (s && s.text) m.parts = [{ kind: 'text', text: s.text } as any];
        m.status = 'completed';
        delete state.streaming[messageId];
      }
      return state;
    }
    case 'TEXT_MESSAGE_CHUNK': {
      const { messageId, role, delta } = payload as any;
      const id = messageId || `m_${Math.random().toString(36).slice(2, 8)}`;
      const start: AgSpecEventPayloads['TEXT_MESSAGE_START'] = { messageId: id, role: (role || 'assistant') as any };
      state = applySpecEvent(state, 'TEXT_MESSAGE_START', start);
      if (delta) state = applySpecEvent(state, 'TEXT_MESSAGE_CONTENT', { messageId: id, delta } as any);
      state = applySpecEvent(state, 'TEXT_MESSAGE_END', { messageId: id } as any);
      return state;
    }
    case 'TOOL_CALL_START': {
      // You can create a tool_call part placeholder if desired
      return state;
    }
    case 'TOOL_CALL_ARGS': {
      // Optional: accumulate args for UI
      return state;
    }
    case 'TOOL_CALL_END': {
      return state;
    }
    case 'TOOL_CALL_RESULT': {
      const { messageId, content } = payload as any;
      const m = state.messages[messageId];
      if (m) m.parts = [...(m.parts || []), { kind: 'tool_result', id: `tr_${Date.now()}`, name: 'tool', result: content } as any];
      return state;
    }
    default:
      return state;
  }
}
