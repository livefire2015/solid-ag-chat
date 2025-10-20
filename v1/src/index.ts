// ============================================================================
// AG-UI Protocol Types
// ============================================================================
export type {
  Id,
  Role,
  MessageStatus,
  AttachmentState,
  ConversationDoc,
  UsageDoc,
  TextPart,
  ImagePart,
  AudioPart,
  FilePart,
  ToolCallPart,
  ToolResultPart,
  Part,
  MessageDoc,
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
} from './types';

// ============================================================================
// Transport (SSE + REST)
// ============================================================================
export type { SseAgClientOptions } from './transport/sse';
export { SseAgClient } from './transport/sse';

// ============================================================================
// State Management (Low-level)
// ============================================================================
export type { ChatState } from './store/state';
export {
  initStateFromSnapshot,
  toSnapshot,
  applyJsonPatch,
  applyNormalizedEvent,
  applySpecEvent,
} from './store/state';

export type { AgUiStore } from './store/createAgUiStore';
export { createAgUiStore } from './store/createAgUiStore';

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
