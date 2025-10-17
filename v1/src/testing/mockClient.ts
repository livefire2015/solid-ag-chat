import type { AgUiClient, EventPayloads, EventType, IntentPayloads, IntentType, StateSnapshot, ConversationDoc, MessageDoc, AttachmentDoc, Id } from '../types';

type Handler<E extends EventType> = (payload: EventPayloads[E]) => void;

class Emitter {
  private map = new Map<string, Set<Function>>();
  on(type: string, fn: Function) { if (!this.map.has(type)) this.map.set(type, new Set()); this.map.get(type)!.add(fn); }
  off(type: string, fn: Function) { this.map.get(type)?.delete(fn); }
  emit(type: string, payload: any) { this.map.get(type)?.forEach(fn => { try { fn(payload); } catch (e) { /* noop */ } }); }
  clear(){ this.map.clear(); }
}

export interface MockClientOptions {
  sessionId?: string;
  autoReady?: boolean;
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
    if (opts.autoReady ?? true) {
      queueMicrotask(() => {
        this.emit('client.ready', { sessionId: this.sessionId });
        this.emit('state.snapshot', this.buildSnapshot());
      });
    }
  }

  on<E extends EventType>(type: E, handler: Handler<E>): () => void {
    this.emitter.on(type, handler as any);
    return () => this.off(type, handler);
  }

  off<E extends EventType>(type: E, handler: Handler<E>): void {
    this.emitter.off(type, handler as any);
  }

  async send<I extends IntentType>(type: I, payload: IntentPayloads[I]): Promise<void> {
    if (this.closed) return;
    switch (type) {
      case 'state.request_snapshot': {
        this.emit('state.snapshot', this.buildSnapshot());
        return;
      }
      case 'conversation.create': {
        const id = this.randId('c_');
        const now = this.now();
        const conv: ConversationDoc = {
          id,
          title: (payload as any).title || 'New Chat',
          createdAt: now,
          updatedAt: now,
          revision: this.bumpRev(),
          status: 'active',
          metadata: (payload as any).metadata,
        };
        this.conversations.set(id, conv);
        this.activeConversationId = id;
        this.emit('conversation.created', { conversation: conv });
        return;
      }
      case 'conversation.select': {
        this.activeConversationId = (payload as any).conversationId;
        return;
      }
      case 'conversation.archive': {
        const cid = (payload as any).conversationId as Id;
        const conv = this.conversations.get(cid);
        if (conv) {
          conv.status = 'archived';
          conv.updatedAt = this.now();
          conv.revision = this.bumpRev();
          this.emit('conversation.updated', { conversation: conv });
          this.emit('conversation.archived', { conversationId: cid });
        }
        return;
      }
      case 'attachment.register': {
        const att = payload as any as AttachmentDoc;
        this.attachments.set(att.id, att);
        this.emit('attachment.available', { attachment: att });
        return;
      }
      case 'message.abort': {
        // Minimal: no active stream tracking; left as an exercise
        return;
      }
      case 'message.send': {
        const p = payload as IntentPayloads['message.send'];
        const cid = p.conversationId ?? this.activeConversationId ?? this.ensureConversation();
        const now = this.now();
        // Echo user message
        const userId = this.randId('m_');
        const userText = (p.text ?? this.partsToText(p.parts)) ?? '';
        const userMsg: MessageDoc = {
          id: userId,
          clientMessageId: p.clientMessageId,
          conversationId: cid,
          role: 'user',
          status: 'completed',
          parts: p.parts ?? [{ kind: 'text', text: userText }],
          attachments: p.attachments ?? [],
          createdAt: now,
        };
        this.messages.set(userId, userMsg);
        this.pushMsgId(cid, userId);
        this.emit('message.created', { message: userMsg });

        // Create assistant placeholder
        const asstId = this.randId('m_');
        const asstMsg: MessageDoc = {
          id: asstId,
          conversationId: cid,
          role: 'assistant',
          status: 'streaming',
          parts: [],
          attachments: [],
          createdAt: now,
        };
        this.messages.set(asstId, asstMsg);
        this.pushMsgId(cid, asstId);
        this.emit('message.created', { message: asstMsg });

        // Stream tokens
        const tokens = this.replyGenerator(userText);
        void this.streamTokens(asstId, tokens, cid);
        return;
      }
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
    for (const m of this.messages.values()) this.pushMsgId(m.conversationId, m.id);
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

  private emit<E extends EventType>(type: E, payload: EventPayloads[E]) {
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
  private partsToText(parts?: MessageDoc['parts']): string | undefined {
    if (!parts) return undefined;
    const t = parts.find(p => p.kind === 'text') as any;
    return t?.text as string | undefined;
  }
  private defaultGenerator(text: string): string[] {
    const base = text && text.trim().length > 0 ? `Mock reply: ${text}` : 'Hello from mock agent!';
    // naive tokenization: split into ~5 char chunks
    const chunks: string[] = [];
    for (let i = 0; i < base.length; i += 5) chunks.push(base.slice(i, i + 5));
    return chunks;
  }
  private async streamTokens(asstId: Id, tokens: string[], cid: Id) {
    let full = '';
    for (const tok of tokens) {
      full += tok;
      this.emit('message.delta', { messageId: asstId, textDelta: tok });
      await new Promise(r => setTimeout(r, this.tokenDelayMs));
    }
    // complete
    const msg = this.messages.get(asstId);
    if (msg) {
      msg.status = 'completed';
      msg.parts = [{ kind: 'text', text: full } as any];
      this.emit('message.completed', { messageId: asstId, usage: { completion: full.split(/\s+/).filter(Boolean).length } });
    }
    // auto-title if needed
    const conv = this.conversations.get(cid);
    if (conv && conv.title === 'New Chat') {
      conv.title = full.slice(0, 40) || 'Conversation';
      conv.updatedAt = this.now();
      conv.revision = this.bumpRev();
      this.emit('conversation.updated', { conversation: conv });
    }
  }
}

export default MockAgClient;
