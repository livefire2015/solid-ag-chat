/**
 * AG-UI Core Compatibility Layer
 *
 * This file provides compatibility between the current custom AG-UI implementation
 * and the official @ag-ui/core package. It allows for gradual migration while
 * maintaining backward compatibility.
 */

// Import official AG-UI core types (when @ag-ui/core is installed)
// For now, we'll define compatible types that match the AG-UI core spec
// These will be replaced with actual imports when @ag-ui/core is available

// AG-UI EventType enum (complete set)
export enum EventType {
  RUN_STARTED = 'RUN_STARTED',
  RUN_FINISHED = 'RUN_FINISHED',
  TEXT_MESSAGE_START = 'TEXT_MESSAGE_START',
  TEXT_MESSAGE_CONTENT = 'TEXT_MESSAGE_CONTENT',
  TEXT_MESSAGE_END = 'TEXT_MESSAGE_END',
  TEXT_MESSAGE_DELTA = 'TEXT_MESSAGE_DELTA',
  TOOL_CALL_START = 'TOOL_CALL_START',
  TOOL_CALL_ARGS = 'TOOL_CALL_ARGS',
  TOOL_CALL_END = 'TOOL_CALL_END',
  TOOL_CALL_RESULT = 'TOOL_CALL_RESULT',
  TOOL_CALL_DELTA = 'TOOL_CALL_DELTA',
  TOOL_OUTPUT = 'TOOL_OUTPUT',
  STATE_SNAPSHOT = 'STATE_SNAPSHOT',
  STATE_DELTA = 'STATE_DELTA',
  ERROR = 'ERROR',
  AGENT_PROPOSAL = 'AGENT_PROPOSAL',
  AGENT_PROPOSAL_APPROVED = 'AGENT_PROPOSAL_APPROVED',
  AGENT_PROPOSAL_REJECTED = 'AGENT_PROPOSAL_REJECTED',
  HUMAN_INPUT_REQUIRED = 'HUMAN_INPUT_REQUIRED',
  CONTEXT_UPDATE = 'CONTEXT_UPDATE'
}

export type AGUIEventType = EventType;

// AG-UI Role type
export type Role = 'user' | 'assistant' | 'system' | 'tool' | 'developer';

// AG-UI Message types
export interface Message {
  role: Role;
  content: string;
}

export interface UserMessage extends Message {
  role: 'user';
}

export interface AssistantMessage extends Message {
  role: 'assistant';
}

export interface SystemMessage extends Message {
  role: 'system';
}

export interface ToolMessage extends Message {
  role: 'tool';
}

// AG-UI ToolCall interface
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

// AG-UI RunAgentInput interface
export interface RunAgentInput {
  threadId: string;
  runId: string;
  state: any;
  messages: Message[];
  tools: Tool[];
  context: Context[];
  forwardedProps: any;
}

// AG-UI State interface
export interface State {
  [key: string]: any;
}

// AG-UI Context interface
export interface Context {
  [key: string]: any;
}

// AG-UI Tool interface
export interface Tool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

// EventSchemas placeholder (will be replaced when @ag-ui/core is available)
export const EventSchemas = null;

// All types are now defined above - no need for re-exports

// Type aliases for backward compatibility
export type AGUIMessage = Message;
export type AGUIToolCall = ToolCall;
export type AGUIRequest = RunAgentInput;
export type AgentState = State;

// EventType is now defined above

// Legacy event type constants for backward compatibility
export const AG_UI_EVENT_TYPES = [
  'RUN_STARTED',
  'RUN_FINISHED',
  'TEXT_MESSAGE_START',
  'TEXT_MESSAGE_CONTENT',
  'TEXT_MESSAGE_END',
  'TEXT_MESSAGE_DELTA',
  'TOOL_CALL_START',
  'TOOL_CALL_ARGS',
  'TOOL_CALL_END',
  'TOOL_CALL_RESULT',
  'TOOL_CALL_DELTA',
  'TOOL_OUTPUT',
  'STATE_SNAPSHOT',
  'STATE_DELTA',
  'ERROR',
  'AGENT_PROPOSAL',
  'AGENT_PROPOSAL_APPROVED',
  'AGENT_PROPOSAL_REJECTED',
  'HUMAN_INPUT_REQUIRED',
  'CONTEXT_UPDATE',
] as const;

// Legacy event type union for compatibility (deprecated, use EventType enum above)
export type LegacyEventType = typeof AG_UI_EVENT_TYPES[number];

// Enhanced message interface that extends the official Message type
export interface EnhancedAGUIMessage extends Message {
  id: string;
  conversationId: string;
  timestamp?: string;
  toolCalls?: ToolCall[];
  attachments?: FileAttachment[];
  isMarkdown?: boolean;
  isEdited?: boolean;
  editedAt?: string;
  metadata?: Record<string, unknown>;
  streamingToolCalls?: StreamingToolCall[];
}

// Streaming tool call interface (solid-ag-chat specific)
export interface StreamingToolCall {
  id: string;
  name: string;
  arguments: string; // Raw arguments as they stream in
  parsedArguments?: Record<string, unknown>; // Parsed when complete
  result?: string;
  status: 'starting' | 'building_args' | 'executing' | 'completed' | 'error';
  parentMessageId?: string;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

// File attachment types (solid-ag-chat specific)
export interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  data?: string | ArrayBuffer;
  uploadProgress?: number;
  uploaded: boolean;
  error?: string;
  preview?: string;
}

export type FileAttachmentStatus = 'pending' | 'uploading' | 'uploaded' | 'error';

// Base event interface matching AG-UI core pattern
export interface BaseEvent {
  type: EventType;
  timestamp?: number;
  rawEvent?: any;
}

// Event interfaces based on AG-UI core specifications
export interface TextMessageStartEvent extends BaseEvent {
  type: EventType.TEXT_MESSAGE_START;
  messageId: string;
  role: 'assistant' | 'user' | 'system';
}

export interface TextMessageContentEvent extends BaseEvent {
  type: EventType.TEXT_MESSAGE_CONTENT;
  messageId: string;
  delta: string;
}

export interface TextMessageEndEvent extends BaseEvent {
  type: EventType.TEXT_MESSAGE_END;
  messageId: string;
}

export interface TextMessageDeltaEvent extends BaseEvent {
  type: EventType.TEXT_MESSAGE_DELTA;
  delta: string;
}

export interface ToolCallStartEvent extends BaseEvent {
  type: EventType.TOOL_CALL_START;
  toolCallId: string;
  toolCallName: string;
  parentMessageId?: string;
}

export interface ToolCallArgsEvent extends BaseEvent {
  type: EventType.TOOL_CALL_ARGS;
  toolCallId: string;
  delta: string;
}

export interface ToolCallEndEvent extends BaseEvent {
  type: EventType.TOOL_CALL_END;
  toolCallId: string;
}

export interface ToolCallResultEvent extends BaseEvent {
  type: EventType.TOOL_CALL_RESULT;
  messageId: string;
  toolCallId: string;
  content: string;
  role?: string;
}

export interface RunStartedEvent extends BaseEvent {
  type: EventType.RUN_STARTED;
  runId: string;
  runTimestamp: string;
}

export interface RunFinishedEvent extends BaseEvent {
  type: EventType.RUN_FINISHED;
  runId: string;
  runTimestamp: string;
}

export interface StateSnapshotEvent extends BaseEvent {
  type: EventType.STATE_SNAPSHOT;
  state: State;
}

export interface StateDeltaEvent extends BaseEvent {
  type: EventType.STATE_DELTA;
  delta: Array<import('fast-json-patch').Operation>; // JSON Patch operations
}

export interface ErrorEvent extends BaseEvent {
  type: EventType.ERROR;
  error: string;
  code?: string;
}

// Legacy Tool Call Events (keeping for backward compatibility)
export interface ToolCallDeltaEvent extends BaseEvent {
  type: EventType.TOOL_CALL_DELTA;
  toolCallId: string;
  delta: Partial<ToolCall>;
}

export interface ToolOutputEvent extends BaseEvent {
  type: EventType.TOOL_OUTPUT;
  toolCallId: string;
  output: unknown;
}

// Additional solid-ag-chat specific events
export interface AgentProposal {
  id: string;
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  requiresApproval: boolean;
  timestamp: string;
}

export interface AgentProposalEvent extends BaseEvent {
  type: EventType.AGENT_PROPOSAL;
  proposal: AgentProposal;
}

export interface AgentProposalApprovedEvent extends BaseEvent {
  type: EventType.AGENT_PROPOSAL_APPROVED;
  proposalId: string;
}

export interface AgentProposalRejectedEvent extends BaseEvent {
  type: EventType.AGENT_PROPOSAL_REJECTED;
  proposalId: string;
  reason?: string;
}

export interface HumanInputRequiredEvent extends BaseEvent {
  type: EventType.HUMAN_INPUT_REQUIRED;
  prompt: string;
  inputId: string;
}

export interface ContextUpdateEvent extends BaseEvent {
  type: EventType.CONTEXT_UPDATE;
  context: Record<string, unknown>;
}

// Union type for all AG-UI events
export type AGUIEvent =
  | TextMessageStartEvent
  | TextMessageContentEvent
  | TextMessageEndEvent
  | TextMessageDeltaEvent
  | ToolCallStartEvent
  | ToolCallArgsEvent
  | ToolCallEndEvent
  | ToolCallResultEvent
  | ToolCallDeltaEvent
  | ToolOutputEvent
  | RunStartedEvent
  | RunFinishedEvent
  | StateSnapshotEvent
  | StateDeltaEvent
  | ErrorEvent
  | AgentProposalEvent
  | AgentProposalApprovedEvent
  | AgentProposalRejectedEvent
  | HumanInputRequiredEvent
  | ContextUpdateEvent;

// Converter functions for migrating between types
export function convertToOfficialMessage(legacyMessage: EnhancedAGUIMessage): Message {
  const { role, content } = legacyMessage;

  const baseMessage = {
    role,
    content,
  } as Message;

  // Add tool calls if present
  if (legacyMessage.toolCalls) {
    (baseMessage as any).tool_calls = legacyMessage.toolCalls;
  }

  return baseMessage;
}

export function convertFromOfficialMessage(officialMessage: Message, additionalProps?: Partial<EnhancedAGUIMessage>): EnhancedAGUIMessage {
  return {
    ...officialMessage,
    id: additionalProps?.id || crypto.randomUUID(),
    conversationId: additionalProps?.conversationId || 'default',
    timestamp: additionalProps?.timestamp || new Date().toISOString(),
    isMarkdown: additionalProps?.isMarkdown ?? false,
    isEdited: additionalProps?.isEdited ?? false,
    ...additionalProps
  } as EnhancedAGUIMessage;
}

export function convertToOfficialRunInput(
  messages: EnhancedAGUIMessage[],
  options: {
    threadId: string;
    runId: string;
    state?: any;
    tools?: Tool[];
    context?: Context[];
    forwardedProps?: any;
  }
): RunAgentInput {
  return {
    threadId: options.threadId,
    runId: options.runId,
    state: options.state || null,
    messages: messages.map(convertToOfficialMessage),
    tools: options.tools || [],
    context: options.context || [],
    forwardedProps: options.forwardedProps || null,
  };
}