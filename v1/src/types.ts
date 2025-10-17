// Shared data structures for solid-ag-chat
// Aligns with AG-UI concepts: lifecycle, events, messages, tools, state

export type Id = string;

export type Role = 'user' | 'assistant' | 'tool' | 'system' | 'developer';
export type MessageStatus = 'streaming' | 'completed' | 'errored' | 'canceled';
export type AttachmentState = 'uploaded' | 'processing' | 'available' | 'failed';

export interface ConversationDoc {
  id: Id;
  title: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  revision: string; // server-monotonic per session
  status: 'active' | 'archived';
  metadata?: Record<string, unknown>;
}

export interface UsageDoc {
  prompt?: number;
  completion?: number;
  total?: number;
}

export type TextPart = { kind: 'text'; text: string };
export type ImagePart = { kind: 'image'; url?: string; data?: string; mime: string; alt?: string };
export type AudioPart = { kind: 'audio'; url?: string; data?: string; mime: string };
export type FilePart = { kind: 'file'; id: Id; name: string; mime: string; url: string };
export type ToolCallPart = { kind: 'tool_call'; id: Id; name: string; args: unknown };
export type ToolResultPart = { kind: 'tool_result'; id: Id; name: string; result?: unknown; error?: string };
export type Part = TextPart | ImagePart | AudioPart | FilePart | ToolCallPart | ToolResultPart;

export interface MessageDoc {
  id: Id;
  clientMessageId?: Id; // idempotency for optimistic sends
  conversationId: Id;
  role: Role;
  status: MessageStatus;
  parts: Part[];
  attachments: Id[]; // attachment ids
  usage?: UsageDoc;
  createdAt: string; // ISO
  metadata?: Record<string, unknown>;
}

export interface AttachmentDoc {
  id: Id;
  name: string;
  mime: string;
  size: number;
  url: string; // download URL
  state: AttachmentState;
  metadata?: Record<string, unknown>;
}

export interface ToolDefinition {
  name: string;
  description?: string;
  inputSchema?: unknown;
  outputSchema?: unknown;
}

export interface McpServerRef {
  name: string;
  transport: 'stdio' | 'sse' | 'ws';
  uri?: string;
  metadata?: Record<string, unknown>;
}

export interface AgentDescriptor {
  id: Id;
  name: string;
  model?: string;
  tools?: ToolDefinition[];
  mcp?: McpServerRef[];
  capabilities?: Record<string, boolean>;
  metadata?: Record<string, unknown>;
}

export interface StateSnapshot {
  sessionId: string;
  revision: string;
  conversations: ConversationDoc[];
  messages: MessageDoc[];
  attachments: AttachmentDoc[];
  activeConversationId?: Id;
  agent?: AgentDescriptor;
}

// Event payloads (server -> client)
export interface EventPayloads {
  'client.ready': { sessionId: string };
  'client.resume': { sessionId: string; sinceRevision?: string };
  'client.heartbeat': { ts: string };
  'client.closed': { reason?: string };
  'state.snapshot': StateSnapshot;

  'conversation.created': { conversation: ConversationDoc };
  'conversation.updated': { conversation: ConversationDoc };
  'conversation.archived': { conversationId: Id };

  'message.created': { message: MessageDoc };
  'message.delta': { messageId: Id; textDelta?: string; partDelta?: Part; usageDelta?: Partial<UsageDoc> };
  'message.completed': { messageId: Id; usage?: UsageDoc };
  'message.errored': { messageId: Id; error: { code: string; message: string; details?: unknown } };
  'message.canceled': { messageId: Id };
  'message.tool_call': { messageId: Id; part: ToolCallPart };
  'message.tool_result': { messageId: Id; part: ToolResultPart };

  'attachment.available': { attachment: AttachmentDoc };
  'attachment.failed': { id: Id; error: { code: string; message: string; details?: unknown } };
}

export type EventType = keyof EventPayloads;

// Intent payloads (client -> server)
export interface IntentPayloads {
  'state.request_snapshot': { sinceRevision?: string };

  'conversation.create': { title?: string; metadata?: Record<string, unknown> };
  'conversation.select': { conversationId: Id };
  'conversation.archive': { conversationId: Id };

  'message.send': {
    clientMessageId: Id;
    conversationId?: Id;
    text?: string;
    parts?: Part[];
    attachments?: Id[];
    metadata?: Record<string, unknown>;
  };
  'message.abort': { messageId?: Id };

  'attachment.register': { id: Id; name: string; mime: string; size: number; url: string; metadata?: Record<string, unknown> };
}

export type IntentType = keyof IntentPayloads;

// Minimal client interface the library expects from the consumer app
export interface AgUiClient {
  on<E extends EventType>(type: E, handler: (payload: EventPayloads[E]) => void): () => void;
  off<E extends EventType>(type: E, handler: (payload: EventPayloads[E]) => void): void;
  send<I extends IntentType>(type: I, payload: IntentPayloads[I]): Promise<void>;
  close(): void;
}

// ---- Official AG-UI spec event shapes (subset), per llms-full.txt ----

export type AgRole = 'developer' | 'system' | 'assistant' | 'user' | 'tool';

export interface JsonPatchOp {
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
  path: string;
  value?: unknown;
  from?: string;
}

export interface AgSpecEventPayloads {
  // Lifecycle
  RUN_STARTED: { threadId?: string; runId?: string };
  RUN_FINISHED: { threadId?: string; runId?: string; outcome?: 'success' | 'interrupt'; interrupt?: unknown };
  RUN_ERROR: { threadId?: string; runId?: string; error: { code?: string; message: string; details?: unknown } };
  STEP_STARTED: { stepName: string };
  STEP_FINISHED: { stepName: string };

  // Text messages
  TEXT_MESSAGE_START: { messageId: Id; role: AgRole };
  TEXT_MESSAGE_CONTENT: { messageId: Id; delta: string };
  TEXT_MESSAGE_END: { messageId: Id };
  TEXT_MESSAGE_CHUNK: { messageId?: Id; role?: AgRole; delta?: string };

  // Tools
  TOOL_CALL_START: { toolCallId: Id; toolCallName: string; parentMessageId?: Id };
  TOOL_CALL_ARGS: { toolCallId: Id; delta: string };
  TOOL_CALL_END: { toolCallId: Id };
  TOOL_CALL_RESULT: { messageId: Id; toolCallId: Id; content: unknown; role?: 'tool' };

  // State and history
  STATE_SNAPSHOT: StateSnapshot;
  STATE_DELTA: { patch: JsonPatchOp[] };
  MESSAGES_SNAPSHOT: { messages: MessageDoc[] };

  // Reasoning (draft)
  REASONING_STARTED: { messageId: Id; encryptedContent?: string };
  REASONING_MESSAGE_START: { messageId: Id; role: AgRole };
  REASONING_MESSAGE_CONTENT: { messageId: Id; delta: string };
  REASONING_MESSAGE_END: { messageId: Id };
  REASONING_MESSAGE_CHUNK: { messageId?: Id; delta?: string };
  REASONING_END: { messageId: Id };

  // Misc
  RAW: { rawEvent: unknown };
  CUSTOM: { type: string; payload?: unknown };
}

export type AgSpecEventType = keyof AgSpecEventPayloads;
