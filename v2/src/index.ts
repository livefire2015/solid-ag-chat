// ============================================================================
// AG-UI Protocol Types (Official + Extensions)
// ============================================================================
export type {
  Id,
  Role,
  MessageStatus,
  AttachmentState,
  ConversationDoc,
  UsageDoc,
  MessageDoc,
  Message, // Official AG-UI Message type
  AttachmentDoc,
  ToolDefinition,
  McpServerRef,
  AgentDescriptor,
  StateSnapshot,
  EventPayloads,
  EventType,
  AgUiClient,
  AgRole,
  JsonPatchOp,
  AgSpecEventPayloads,
  AgSpecEventType,
  // V2: Tool Execution Types
  ToolHandler,
  ToolExecutionStatus,
  ToolExecution,
  RegisteredTool,
} from './types';

// Re-export official AG-UI types from core
export type {
  ToolCall,
  FunctionCall,
  Tool,
  Context,
  State,
  RunAgentInput,
  BaseEvent,
  TextMessageStartEvent,
  TextMessageContentEvent,
  TextMessageEndEvent,
  ToolCallStartEvent,
  ToolCallArgsEvent,
  ToolCallEndEvent,
  ToolCallResultEvent,
  StateSnapshotEvent,
  StateDeltaEvent,
  MessagesSnapshotEvent,
  RunStartedEvent,
  RunFinishedEvent,
  RunErrorEvent,
} from '@ag-ui/core';

// ============================================================================
// Transport (Official SDK + Legacy)
// ============================================================================

// NEW: Official AG-UI SDK client
export type { SdkAgentOptions } from './transport/sdk-agent';
export { SdkAgClient, createSdkAgent } from './transport/sdk-agent';

// LEGACY: Custom SSE client (deprecated - use createSdkAgent instead)
export type { SseAgClientOptions } from './transport/sse';
export { SseAgClient } from './transport/sse';

// ============================================================================
// State Management (Low-level)
// ============================================================================
export type { ChatState } from './store/state';
export {
  initStateFromSnapshot,
  toSnapshot,
  applyNormalizedEvent,
  applySpecEvent,
} from './store/state';

// NOTE: applyJsonPatch removed - use fast-json-patch library directly:
// import { applyPatch } from 'fast-json-patch';

export type { AgUiStore } from './store/createAgUiStore';
export { createAgUiStore } from './store/createAgUiStore';

// ============================================================================
// V2: Tool Execution Engine
// ============================================================================
export { ToolExecutor } from './tool-executor';

// ============================================================================
// SolidJS Primitives (Recommended API)
// ============================================================================
export {
  ChatProvider,
  useChatContext,
  useChat,
  useConversationList,
  useConversation,
  useMessages,
  useStreamingText,
  // V2: Tool Execution Primitives
  useToolCalls,
  useToolExecution,
  usePendingTools,
} from './primitives';

export type {
  ChatProviderProps,
  ChatContextValue,
  UseChatReturn,
  UseConversationListReturn,
  UseConversationReturn,
} from './primitives';

// ============================================================================
// Testing Utilities
// ============================================================================
export type { MockClientOptions } from './testing/mockClient';
export { MockAgClient } from './testing/mockClient';
export { runBasicScenario } from './testing/scenarios';
