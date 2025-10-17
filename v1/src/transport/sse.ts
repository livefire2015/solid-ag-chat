import type {
  AgUiClient,
  EventPayloads,
  EventType,
  IntentPayloads,
  IntentType,
  StateSnapshot,
} from '../types';

type Handler<E extends EventType> = (payload: EventPayloads[E]) => void;

export interface SseAgClientOptions {
  baseUrl: string; // e.g., '' or 'https://api.example.com'
  sessionId?: string; // provided via cookie or query param
  sinceRevision?: string;
  // If you need auth and cannot rely on cookies, append token as query param
  tokenParam?: string; // e.g., 'token=...'
  // Optional: customize endpoint paths
  paths?: Partial<{
    events: string;
    intents: string;
  }>;
}

interface SseAgClientInternalOptions {
  baseUrl: string;
  sessionId: string;
  sinceRevision: string;
  tokenParam: string;
  paths: {
    events: string;
    intents: string;
  };
}

export class SseAgClient implements AgUiClient {
  private eventSource?: EventSource;
  private listeners = new Map<string, Set<Function>>();
  private closed = false;
  private opts: SseAgClientInternalOptions;

  constructor(options: SseAgClientOptions) {
    this.opts = {
      baseUrl: options.baseUrl,
      tokenParam: options.tokenParam || '',
      sessionId: options.sessionId || '',
      sinceRevision: options.sinceRevision || '',
      paths: {
        events: options.paths?.events || '/events',
        intents: options.paths?.intents || '/intents',
      },
    };
    this.connect();
  }

  on<E extends EventType>(type: E, handler: Handler<E>): () => void {
    const set = this.listeners.get(type) || new Set();
    set.add(handler as any);
    this.listeners.set(type, set);
    return () => this.off(type, handler);
  }

  off<E extends EventType>(type: E, handler: Handler<E>): void {
    const set = this.listeners.get(type);
    set?.delete(handler as any);
  }

  async send<I extends IntentType>(type: I, payload: IntentPayloads[I]): Promise<void> {
    const { paths } = this.opts;

    // All intents go to /intents endpoint with intent type in body
    const body = JSON.stringify({
      intent: type,
      sessionId: this.opts.sessionId || undefined,
      ...payload
    });

    await this.post(paths.intents, body);
  }

  close(): void {
    this.closed = true;
    try { this.eventSource?.close(); } catch {}
    this.listeners.clear();
  }

  // Internal
  private connect() {
    const { paths } = this.opts;
    const url = this.url(paths.events, this.opts.sinceRevision ? { sinceRevision: this.opts.sinceRevision } : undefined);
    const es = new EventSource(url, { withCredentials: true });
    this.eventSource = es;

    // Generic message fallback (unnamed events)
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        // If backend uses `{ type, data }` envelope, support it
        if (data && typeof data === 'object' && 'type' in data && 'data' in data) {
          this.emit(data.type as EventType, data.data);
        }
      } catch {}
    };

    // Error handling + retry is handled by browser; you can add debug logs here
    es.onerror = () => {
      // noop; could add backoff or notify UI via custom event
    };

    // Bind all known event types to dispatchers
    const allEvents: string[] = [
      'client.ready', 'client.resume', 'client.heartbeat', 'client.closed', 'state.snapshot',
      'conversation.created', 'conversation.updated', 'conversation.archived',
      'message.created', 'message.delta', 'message.completed', 'message.errored', 'message.canceled', 'message.tool_call', 'message.tool_result',
      'attachment.available', 'attachment.failed',
      // Spec events (if server uses these names)
      'RUN_STARTED','RUN_FINISHED','RUN_ERROR','STEP_STARTED','STEP_FINISHED',
      'TEXT_MESSAGE_START','TEXT_MESSAGE_CONTENT','TEXT_MESSAGE_END','TEXT_MESSAGE_CHUNK',
      'TOOL_CALL_START','TOOL_CALL_ARGS','TOOL_CALL_END','TOOL_CALL_RESULT',
      'STATE_SNAPSHOT','STATE_DELTA','MESSAGES_SNAPSHOT',
      'REASONING_STARTED','REASONING_MESSAGE_START','REASONING_MESSAGE_CONTENT','REASONING_MESSAGE_END','REASONING_MESSAGE_CHUNK','REASONING_END',
      'RAW','CUSTOM',
    ];
    for (const name of allEvents) {
      es.addEventListener(name, (ev: MessageEvent) => {
        try {
          const data = JSON.parse(ev.data);
          this.emit(name as EventType, data);
        } catch {}
      });
    }
  }

  private url(path: string, params?: Record<string, string>): string {
    const q: string[] = [];
    if (this.opts.sessionId) q.push(`sessionId=${encodeURIComponent(this.opts.sessionId)}`);
    if (this.opts.tokenParam) q.push(this.opts.tokenParam);
    if (params) for (const [k, v] of Object.entries(params)) q.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
    const qs = q.length ? `?${q.join('&')}` : '';
    return `${this.opts.baseUrl}${path}${qs}`;
  }

  private async post(path: string, body: string): Promise<void> {
    const url = this.url(path);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      credentials: 'include',
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`POST ${path} failed: ${res.status} ${text}`);
    }
  }

  private emit<E extends EventType>(type: E, payload: EventPayloads[E]) {
    const set = this.listeners.get(type);
    if (!set) return;
    set.forEach((fn) => { try { (fn as any)(payload); } catch {} });
  }
}

export default SseAgClient;
