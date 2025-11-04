// =============================================================================
// AG-UI Protocol Types
// Imports official types from @ag-ui/core and adds custom extensions
// =============================================================================

// Re-export official AG-UI core types
export type {
  // Base types
  Role,
  Message as AgMessage, // Rename to avoid conflict with our extended version
  UserMessage as AgUserMessage,
  AssistantMessage as AgAssistantMessage,
  ToolMessage as AgToolMessage,
  SystemMessage as AgSystemMessage,
  DeveloperMessage as AgDeveloperMessage,
  ToolCall,
  FunctionCall,
  Tool,
  Context,
  State,
  RunAgentInput,

  // Event types
  EventType,
  BaseEvent,
  TextMessageStartEvent,
  TextMessageContentEvent,
  TextMessageEndEvent,
  TextMessageChunkEvent,
  ToolCallStartEvent,
  ToolCallArgsEvent,
  ToolCallEndEvent,
  ToolCallChunkEvent,
  ToolCallResultEvent,
  StateSnapshotEvent,
  StateDeltaEvent,
  MessagesSnapshotEvent,
  RawEvent,
  CustomEvent,
  RunStartedEvent,
  RunFinishedEvent,
  RunErrorEvent,
  StepStartedEvent,
  StepFinishedEvent,
  ThinkingStartEvent,
  ThinkingEndEvent,
} from '@ag-ui/core';

import type {
  EventType,
  BaseEvent,
  Message as AgMessage,
  Role,
  ToolCall as AgToolCall,
  TextMessageStartEvent,
  TextMessageContentEvent,
  TextMessageEndEvent,
  TextMessageChunkEvent,
  ToolCallStartEvent,
  ToolCallArgsEvent,
  ToolCallEndEvent,
  ToolCallChunkEvent,
  ToolCallResultEvent,
  StateSnapshotEvent,
  StateDeltaEvent,
  MessagesSnapshotEvent,
  RunStartedEvent,
  RunFinishedEvent,
  RunErrorEvent,
  StepStartedEvent,
  StepFinishedEvent,
  ThinkingStartEvent,
  ThinkingEndEvent,
  RawEvent,
  CustomEvent,
} from '@ag-ui/core';

// =============================================================================
// Custom Extensions for SolidJS AG-UI Client
// =============================================================================

export type Id = string;

// Message status for streaming lifecycle
export type MessageStatus = 'streaming' | 'completed' | 'errored' | 'canceled';

// Usage tracking (custom extension)
export interface UsageDoc {
  prompt?: number;
  completion?: number;
  total?: number;
}

// Extended Message type with conversation context
// Combines official AG-UI Message with custom metadata
export type Message = AgMessage & {
  // Custom fields for conversation management
  conversationId?: Id; // Optional for compatibility
  clientMessageId?: Id; // For idempotency
  status?: MessageStatus; // For streaming state
  usage?: UsageDoc; // Token usage
  createdAt?: string; // ISO timestamp
  metadata?: Record<string, unknown>;
  attachments?: Id[]; // Attachment IDs (references to AttachmentDoc)

  // Official AG-UI fields (explicitly added for compatibility)
  toolCalls?: AgToolCall[]; // Tool calls in assistant messages
  toolCallId?: Id; // Tool call ID for tool result messages (role === 'tool')

  // NOTE: Official AG-UI uses 'content' (string) and 'toolCalls' (ToolCall[])
  // No more parts[] - multimodal content is handled via official Message structure
};

// For backward compatibility - MessageDoc is now Message
export type MessageDoc = Message;

// Conversation management (not in official AG-UI spec)
export interface ConversationDoc {
  id: Id;
  title: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  revision: string; // server-monotonic per session
  status: 'active' | 'archived';
  metadata?: Record<string, unknown>;
}

// Attachment management (custom extension)
export type AttachmentState = 'pending' | 'uploading' | 'uploaded' | 'processing' | 'available' | 'failed';

export interface AttachmentDoc {
  id: Id;
  name: string;
  mime: string;
  size: number;
  url: string; // download URL
  state: AttachmentState;
  metadata?: Record<string, unknown>;
}

// Tool definition (keep for compatibility with old code)
export interface ToolDefinition {
  name: string;
  description?: string;
  inputSchema?: unknown;
  outputSchema?: unknown;
}

// MCP Server reference (custom extension)
export interface McpServerRef {
  name: string;
  transport: 'stdio' | 'sse' | 'ws';
  uri?: string;
  metadata?: Record<string, unknown>;
}

// Agent descriptor (custom extension)
export interface AgentDescriptor {
  id: Id;
  name: string;
  model?: string;
  tools?: ToolDefinition[];
  mcp?: McpServerRef[];
  capabilities?: Record<string, boolean>;
  metadata?: Record<string, unknown>;
}

// State snapshot (extends official State with custom fields)
export interface StateSnapshot {
  sessionId: string;
  revision: string;
  conversations: ConversationDoc[];
  messages: Message[];
  attachments: AttachmentDoc[];
  activeConversationId?: Id;
  agent?: AgentDescriptor;
  state?: any; // Optional custom state from official AG-UI State
}

// Extended event payloads for custom lifecycle events
export interface ExtendedEventPayloads {
  // Client lifecycle
  'client.ready': { sessionId: string };
  'client.resume': { sessionId: string; sinceRevision?: string };
  'client.heartbeat': { ts: string };
  'client.closed': { reason?: string };

  // State management
  'state.snapshot': StateSnapshot;

  // Conversation management (custom)
  'conversation.created': { conversation: ConversationDoc };
  'conversation.updated': { conversation: ConversationDoc };
  'conversation.archived': { conversationId: Id };

  // Message lifecycle (custom - deprecated, use official AG-UI events instead)
  'message.created': { message: Message };
  'message.delta': { messageId: Id; textDelta?: string; usageDelta?: Partial<UsageDoc> };
  'message.completed': { messageId: Id; usage?: UsageDoc };
  'message.errored': { messageId: Id; error: { code: string; message: string; details?: unknown } };
  'message.canceled': { messageId: Id };

  // Attachment events (custom)
  'attachment.uploading': { attachment: AttachmentDoc };
  'attachment.progress': { fileId: Id; progress: { percentage: number; loaded: number; total: number } };
  'attachment.available': { attachment: AttachmentDoc };
  'attachment.failed': { fileId: Id; attachment?: AttachmentDoc; error: { code: string; message: string; details?: unknown } };
  'attachments.persisted': { conversationId: Id; attachments: Record<Id, AttachmentDoc> };
}

export type ExtendedEventType = keyof ExtendedEventPayloads;

// Map of AG-UI event types to their specific event interfaces
export interface AgEventPayloadMap {
  TEXT_MESSAGE_START: TextMessageStartEvent;
  TEXT_MESSAGE_CONTENT: TextMessageContentEvent;
  TEXT_MESSAGE_END: TextMessageEndEvent;
  TEXT_MESSAGE_CHUNK: TextMessageChunkEvent;
  TOOL_CALL_START: ToolCallStartEvent;
  TOOL_CALL_ARGS: ToolCallArgsEvent;
  TOOL_CALL_END: ToolCallEndEvent;
  TOOL_CALL_CHUNK: ToolCallChunkEvent;
  TOOL_CALL_RESULT: ToolCallResultEvent;
  STATE_SNAPSHOT: StateSnapshotEvent;
  STATE_DELTA: StateDeltaEvent;
  MESSAGES_SNAPSHOT: MessagesSnapshotEvent;
  RUN_STARTED: RunStartedEvent;
  RUN_FINISHED: RunFinishedEvent;
  RUN_ERROR: RunErrorEvent;
  STEP_STARTED: StepStartedEvent;
  STEP_FINISHED: StepFinishedEvent;
  THINKING_START: ThinkingStartEvent;
  THINKING_END: ThinkingEndEvent;
  THINKING_TEXT_MESSAGE_START: ThinkingStartEvent;
  THINKING_TEXT_MESSAGE_CONTENT: ThinkingEndEvent;
  THINKING_TEXT_MESSAGE_END: ThinkingEndEvent;
  RAW: RawEvent;
  CUSTOM: CustomEvent;
}

// Include both official AG-UI EventType enum values and string literal types for custom events
export type AllEventType = EventType | ExtendedEventType | keyof AgEventPayloadMap;

// Combined event payload type
export type AllEventPayloads = ExtendedEventPayloads & AgEventPayloadMap;

// For backward compatibility
export type EventPayloads = ExtendedEventPayloads;
export type AgSpecEventPayloads = AllEventPayloads;
export type AgSpecEventType = AllEventType;
export type AgRole = Role;

// JSON Patch type for state deltas
export interface JsonPatchOp {
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
  path: string;
  value?: unknown;
  from?: string;
}

// REST + SSE client interface
export interface AgUiClient {
  // Event handling (supports both official AG-UI events and custom events)
  on<E extends AllEventType>(type: E, handler: (payload: any) => void): () => void;
  off<E extends AllEventType>(type: E, handler: (payload: any) => void): void;
  emit<E extends ExtendedEventType>(type: E, payload: any): void; // For custom client-side events

  // Conversation management (custom extension)
  createConversation(title?: string, metadata?: Record<string, unknown>): Promise<ConversationDoc>;
  listConversations(): Promise<ConversationDoc[]>;
  getConversation(id: Id): Promise<ConversationDoc>;
  updateConversation(id: Id, updates: Partial<ConversationDoc>): Promise<ConversationDoc>;
  archiveConversation(id: Id): Promise<void>;
  setActiveThread?(threadId: string): void; // Set the active conversation thread for SDK client

  // Message management (uses extended Messages with conversation context)
  sendMessage(
    conversationId: Id | null, // null for auto-create
    text: string,
    options?: {
      attachments?: Id[];
      metadata?: Record<string, unknown>;
      onEvent?: (event: { type: string; data: any }) => void;
    }
  ): Promise<Message>;

  getMessages(conversationId: Id): Promise<Message[]>;
  cancelMessage(conversationId: Id, messageId: Id): Promise<void>;

  // Cleanup
  close(): void;
}
