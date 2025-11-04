import type { AgUiClient, AllEventType, StateSnapshot, ConversationDoc, MessageDoc, AttachmentDoc, Id } from '../types';

type Handler<E extends AllEventType> = (payload: any) => void;

class Emitter {
  private map = new Map<string, Set<Function>>();
  on(type: string, fn: Function) { if (!this.map.has(type)) this.map.set(type, new Set()); this.map.get(type)!.add(fn); }
  off(type: string, fn: Function) { this.map.get(type)?.delete(fn); }
  emit(type: string, payload: any) { this.map.get(type)?.forEach(fn => { try { fn(payload); } catch (e) { /* noop */ } }); }
  clear(){ this.map.clear(); }
}

export interface MockClientOptions {
  sessionId?: string;
  initialSnapshot?: Partial<StateSnapshot>;
  // Generate assistant reply tokens from user text
  replyGenerator?: (userText: string) => string[];
  // Artificial delay between tokens (ms)
  tokenDelayMs?: number;
}

export class MockAgClient implements AgUiClient {
  private emitter = new Emitter();
  private closed = false;
  private sessionId: string;
  private revision = 0;
  private conversations = new Map<Id, ConversationDoc>();
  private messages = new Map<Id, MessageDoc>();
  private attachments = new Map<Id, AttachmentDoc>();
  private messagesByConversation = new Map<Id, Id[]>();
  private activeConversationId: Id | undefined;
  private agent: StateSnapshot['agent'] | undefined;
  private replyGenerator: (t: string) => string[];
  private tokenDelayMs: number;

  constructor(opts: MockClientOptions = {}) {
    this.sessionId = opts.sessionId || this.randId('sess_');
    this.replyGenerator = opts.replyGenerator || ((t) => this.defaultGenerator(t));
    this.tokenDelayMs = opts.tokenDelayMs ?? 20;
    if (opts.initialSnapshot) this.hydrate(opts.initialSnapshot);
    // No auto-emit of client.ready/state.snapshot in REST mode
  }

  on<E extends AllEventType>(type: E, handler: Handler<E>): () => void {
    this.emitter.on(type, handler as any);
    return () => this.off(type, handler);
  }

  off<E extends AllEventType>(type: E, handler: Handler<E>): void {
    this.emitter.off(type, handler as any);
  }

  // Conversation management
  async createConversation(title?: string, metadata?: Record<string, unknown>): Promise<ConversationDoc> {
    if (this.closed) throw new Error('Client closed');
    const id = this.randId('c_');
    const now = this.now();
    const conv: ConversationDoc = {
      id,
      title: title || 'New Chat',
      createdAt: now,
      updatedAt: now,
      revision: this.bumpRev(),
      status: 'active',
      metadata,
    };
    this.conversations.set(id, conv);
    this.activeConversationId = id;
    this.emit('conversation.created', { conversation: conv });
    return conv;
  }

  async listConversations(): Promise<ConversationDoc[]> {
    if (this.closed) throw new Error('Client closed');
    return [...this.conversations.values()].filter(c => c.status === 'active');
  }

  async getConversation(id: Id): Promise<ConversationDoc> {
    if (this.closed) throw new Error('Client closed');
    const conv = this.conversations.get(id);
    if (!conv) throw new Error(`Conversation ${id} not found`);
    return conv;
  }

  async updateConversation(id: Id, updates: Partial<ConversationDoc>): Promise<ConversationDoc> {
    if (this.closed) throw new Error('Client closed');
    const conv = this.conversations.get(id);
    if (!conv) throw new Error(`Conversation ${id} not found`);
    Object.assign(conv, updates);
    conv.updatedAt = this.now();
    conv.revision = this.bumpRev();
    this.emit('conversation.updated', { conversation: conv });
    return conv;
  }

  async archiveConversation(id: Id): Promise<void> {
    if (this.closed) throw new Error('Client closed');
    const conv = this.conversations.get(id);
    if (conv) {
      conv.status = 'archived';
      conv.updatedAt = this.now();
      conv.revision = this.bumpRev();
      this.emit('conversation.updated', { conversation: conv });
      this.emit('conversation.archived', { conversationId: id });
    }
  }

  // Message management
  async sendMessage(
    conversationId: Id | null,
    text: string,
    options?: {
      attachments?: Id[];
      metadata?: Record<string, unknown>;
      onEvent?: (event: { type: string; data: any }) => void;
    }
  ): Promise<MessageDoc> {
    if (this.closed) throw new Error('Client closed');
    let cid: Id;
    if (conversationId) {
      cid = conversationId;
    } else {
      const conv = await this.createConversation();
      cid = conv.id;
    }
    const now = this.now();

    // Echo user message
    const userId = this.randId('m_');
    const userMsg: MessageDoc = {
      id: userId,
      clientMessageId: crypto.randomUUID(),
      conversationId: cid,
      role: 'user',
      content: text,
      status: 'completed',
      attachments: options?.attachments ?? [],
      createdAt: now,
      metadata: options?.metadata,
    };
    this.messages.set(userId, userMsg);
    this.pushMsgId(cid, userId);
    this.emit('message.created', { message: userMsg });
    options?.onEvent?.({ type: 'message.created', data: { message: userMsg } });

    // Create assistant placeholder
    const asstId = this.randId('m_');
    const asstMsg: MessageDoc = {
      id: asstId,
      conversationId: cid,
      role: 'assistant',
      content: '',
      status: 'streaming',
      attachments: [],
      createdAt: now,
    };
    this.messages.set(asstId, asstMsg);
    this.pushMsgId(cid, asstId);
    this.emit('message.created', { message: asstMsg });
    options?.onEvent?.({ type: 'message.created', data: { message: asstMsg } });

    // Stream tokens
    const tokens = this.replyGenerator(text);
    void this.streamTokens(asstId, tokens, cid, options?.onEvent);

    return {} as MessageDoc; // Matches real client behavior
  }

  async getMessages(conversationId: Id): Promise<MessageDoc[]> {
    if (this.closed) throw new Error('Client closed');
    const msgIds = this.messagesByConversation.get(conversationId) || [];
    return msgIds.map(id => this.messages.get(id)!).filter(Boolean);
  }

  async cancelMessage(conversationId: Id, messageId: Id): Promise<void> {
    if (this.closed) throw new Error('Client closed');
    const msg = this.messages.get(messageId);
    if (msg) {
      msg.status = 'canceled';
      this.emit('message.canceled', { messageId });
    }
  }

  close(): void {
    this.closed = true;
    this.emitter.clear();
  }

  // Helpers
  private hydrate(snap: Partial<StateSnapshot>) {
    if (snap.conversations) snap.conversations.forEach(c => this.conversations.set(c.id, c));
    if (snap.messages) snap.messages.forEach(m => this.messages.set(m.id, m));
    if (snap.attachments) snap.attachments.forEach(a => this.attachments.set(a.id, a));
    if (snap.activeConversationId) this.activeConversationId = snap.activeConversationId;
    if (snap.revision) this.revision = Number(snap.revision);
    this.agent = snap.agent;
    // Build index
    for (const m of this.messages.values()) {
      if (m.conversationId) this.pushMsgId(m.conversationId, m.id);
    }
  }

  private buildSnapshot(): StateSnapshot {
    return {
      sessionId: this.sessionId,
      revision: String(this.revision),
      conversations: [...this.conversations.values()],
      messages: [...this.messages.values()],
      attachments: [...this.attachments.values()],
      activeConversationId: this.activeConversationId,
      agent: this.agent,
    };
  }

  emit<E extends AllEventType>(type: E, payload: any): void {
    this.emitter.emit(type, payload);
  }

  private randId(prefix = ''): Id { return prefix + Math.random().toString(36).slice(2, 10); }
  private now(): string { return new Date().toISOString(); }
  private bumpRev(): string { this.revision += 1; return String(this.revision); }
  private pushMsgId(cid: Id, mid: Id) {
    const arr = this.messagesByConversation.get(cid) || [];
    arr.push(mid);
    this.messagesByConversation.set(cid, arr);
  }
  private ensureConversation(): Id {
    const id = this.randId('c_');
    const now = this.now();
    const conv: ConversationDoc = { id, title: 'New Chat', createdAt: now, updatedAt: now, revision: this.bumpRev(), status: 'active' };
    this.conversations.set(id, conv);
    this.activeConversationId = id;
    this.emit('conversation.created', { conversation: conv });
    return id;
  }
  // NOTE: partsToText removed - using message.content directly now
  private defaultGenerator(text: string): string[] {
    const base = text && text.trim().length > 0 ? `Mock reply: ${text}` : 'Hello from mock agent!';
    // naive tokenization: split into ~5 char chunks
    const chunks: string[] = [];
    for (let i = 0; i < base.length; i += 5) chunks.push(base.slice(i, i + 5));
    return chunks;
  }
  private async streamTokens(asstId: Id, tokens: string[], cid: Id, onEvent?: (event: { type: string; data: any }) => void) {
    let full = '';
    for (const tok of tokens) {
      full += tok;
      const delta = { messageId: asstId, textDelta: tok };
      this.emit('message.delta', delta);
      onEvent?.({ type: 'message.delta', data: delta });
      await new Promise(r => setTimeout(r, this.tokenDelayMs));
    }
    // complete
    const msg = this.messages.get(asstId);
    if (msg) {
      msg.status = 'completed';
      msg.content = full; // Official AG-UI field
      const completed = { messageId: asstId, usage: { completion: full.split(/\s+/).filter(Boolean).length } };
      this.emit('message.completed', completed);
      onEvent?.({ type: 'message.completed', data: completed });
    }
    // auto-title if needed
    const conv = this.conversations.get(cid);
    if (conv && conv.title === 'New Chat') {
      conv.title = full.slice(0, 40) || 'Conversation';
      conv.updatedAt = this.now();
      conv.revision = this.bumpRev();
      const updated = { conversation: conv };
      this.emit('conversation.updated', updated);
      onEvent?.({ type: 'conversation.updated', data: updated });
    }
  }
}

export default MockAgClient;
