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
} from './types';

// Shared State Types
export type {
  SuggestedQuestions,
  ChatAgentState,
  AgentStateMap,
} from './types/state';

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

// Persistence utilities (for debugging and advanced use cases)
export {
  clearPersistedState,
  viewPersistedState,
  getStorageStats,
} from './store/persistence';

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
  useSuggestedQuestions,
  useFileUpload,
} from './primitives';

export type {
  ChatProviderProps,
  ChatContextValue,
  UseChatReturn,
  UseConversationListReturn,
  UseConversationReturn,
  UseSuggestedQuestionsReturn,
  UseSuggestedQuestionsOptions,
  UseFileUploadConfig,
  FileUploadState,
} from './primitives';

// ============================================================================
// File Upload Services
// ============================================================================
export { FileUploadApi, FileUploadApiError } from './services/fileUploadApi';
export type {
  InitiateUploadRequest,
  InitiateUploadResponse,
  UploadCompleteRequest,
  UploadCompleteResponse,
} from './services/fileUploadApi';

export { uploadToPresignedUrl, UploadError } from './services/uploadToPresignedUrl';
export type {
  UploadProgress,
  ProgressCallback,
  UploadOptions,
} from './services/uploadToPresignedUrl';

// ============================================================================
// UI Components
// ============================================================================
export { MessageRenderer, ConfirmDialog } from './components';
export type { MessageRendererProps, ConfirmDialogProps } from './components';

// ============================================================================
// Testing Utilities
// ============================================================================
export type { MockClientOptions } from './testing/mockClient';
export { MockAgClient } from './testing/mockClient';
export { runBasicScenario } from './testing/scenarios';
