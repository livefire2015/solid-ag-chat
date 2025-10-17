// AG-UI Protocol Event Types
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

export type EventType = typeof AG_UI_EVENT_TYPES[number];

// Message Types
export interface AGUIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  toolCalls?: AGUIToolCall[];
}

export interface AGUIToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
}

// Enhanced Tool Call with streaming state
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

// Event Interfaces
export interface TextMessageStartEvent {
  type: 'TEXT_MESSAGE_START';
  messageId: string;
  role: 'assistant' | 'user' | 'system';
}

export interface TextMessageContentEvent {
  type: 'TEXT_MESSAGE_CONTENT';
  messageId: string;
  delta: string;
}

export interface TextMessageEndEvent {
  type: 'TEXT_MESSAGE_END';
  messageId: string;
}

export interface TextMessageDeltaEvent {
  type: 'TEXT_MESSAGE_DELTA';
  delta: string;
}

// New Tool Call Events
export interface ToolCallStartEvent {
  type: 'TOOL_CALL_START';
  toolCallId: string;
  toolCallName: string;
  parentMessageId?: string;
}

export interface ToolCallArgsEvent {
  type: 'TOOL_CALL_ARGS';
  toolCallId: string;
  delta: string;
}

export interface ToolCallEndEvent {
  type: 'TOOL_CALL_END';
  toolCallId: string;
}

export interface ToolCallResultEvent {
  type: 'TOOL_CALL_RESULT';
  messageId: string;
  toolCallId: string;
  content: string;
  role?: string;
}

// Legacy Tool Call Events (keeping for backward compatibility)
export interface ToolCallDeltaEvent {
  type: 'TOOL_CALL_DELTA';
  toolCallId: string;
  delta: Partial<AGUIToolCall>;
}

export interface ToolOutputEvent {
  type: 'TOOL_OUTPUT';
  toolCallId: string;
  output: unknown;
}

export interface RunStartedEvent {
  type: 'RUN_STARTED';
  runId: string;
  timestamp: string;
}

export interface RunFinishedEvent {
  type: 'RUN_FINISHED';
  runId: string;
  timestamp: string;
}

export interface StateSnapshotEvent {
  type: 'STATE_SNAPSHOT';
  state: AgentState;
}

export interface StateDeltaEvent {
  type: 'STATE_DELTA';
  delta: Array<import('fast-json-patch').Operation>; // JSON Patch operations
}

export interface ErrorEvent {
  type: 'ERROR';
  error: string;
  code?: string;
}

export interface AgentProposalEvent {
  type: 'AGENT_PROPOSAL';
  proposal: AgentProposal;
}

export interface AgentProposalApprovedEvent {
  type: 'AGENT_PROPOSAL_APPROVED';
  proposalId: string;
}

export interface AgentProposalRejectedEvent {
  type: 'AGENT_PROPOSAL_REJECTED';
  proposalId: string;
  reason?: string;
}

export interface HumanInputRequiredEvent {
  type: 'HUMAN_INPUT_REQUIRED';
  prompt: string;
  inputId: string;
}

export interface ContextUpdateEvent {
  type: 'CONTEXT_UPDATE';
  context: Record<string, unknown>;
}

// Union type for all events
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

// Agent State Types
export interface AgentState {
  [key: string]: any; // Support arbitrary state structure
  // Common fields that might be used:
  currentThought?: string;
  workingMemory?: Record<string, unknown>;
  reasoningChain?: string[];
  nextActions?: string[];
  progress?: number;
  version?: string;
  lastUpdated?: string;
}

export interface AgentProposal {
  id: string;
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  requiresApproval: boolean;
  timestamp: string;
}

// Stream Event Type
export interface StreamEvent {
  event: string;
  data: string;
}

// Request Types
export interface AGUIRequest {
  threadId: string;
  runId: string;
  state: any;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  tools: Array<any>;
  context: Array<any>;
  forwardedProps: any;
}

// Tool Definition
export interface AGUITool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

// File Attachment Types
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

// Enhanced Message Types
export interface EnhancedAGUIMessage extends AGUIMessage {
  id: string;
  conversationId: string;
  attachments?: FileAttachment[];
  isMarkdown?: boolean;
  isEdited?: boolean;
  editedAt?: string;
  metadata?: Record<string, unknown>;
  streamingToolCalls?: StreamingToolCall[];
}

export type MessageAction = 'copy' | 'edit' | 'delete' | 'retry' | 'react';

// Conversation Types
export interface Conversation {
  id: string;
  title: string;
  description?: string;
  messages: EnhancedAGUIMessage[];
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  archived?: boolean;
  starred?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ConversationSummary {
  id: string;
  title: string;
  description?: string;
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
  tags?: string[];
  archived?: boolean;
  starred?: boolean;
}

// Theme Types
export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  error: string;
  warning: string;
  success: string;
  info: string;
}

export interface Theme {
  mode: ThemeMode;
  colors: {
    light: ThemeColors;
    dark: ThemeColors;
  };
  borderRadius: string;
  fontFamily: string;
  fontSize: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

// Storage Types
export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}

// Event Types
export interface ChatEvent {
  type: string;
  payload?: unknown;
  timestamp: string;
}

export type EventCallback = (event: ChatEvent) => void;

// Markdown Types
export interface MarkdownOptions {
  enableCodeHighlighting?: boolean;
  enableTables?: boolean;
  enableTaskLists?: boolean;
  enableMath?: boolean;
}

// Configuration Types
export interface ChatConfiguration {
  apiUrl: string;
  maxFileSize: number;
  allowedFileTypes: string[];
  enableMarkdown: boolean;
  enableFileAttachments: boolean;
  enableConversationHistory: boolean;
  enableThemes: boolean;
  autoSave: boolean;
  maxConversations: number;
  theme: Theme;
  features: {
    messageActions: boolean;
    conversationSearch: boolean;
    exportConversations: boolean;
    voiceInput: boolean;
    notifications: boolean;
  };
}

// Plugin Types
export interface Plugin {
  name: string;
  version: string;
  description: string;
  initialize: (config: ChatConfiguration) => void;
  destroy: () => void;
  onMessageSent?: (message: EnhancedAGUIMessage) => void;
  onMessageReceived?: (message: EnhancedAGUIMessage) => void;
  onConversationCreated?: (conversation: Conversation) => void;
}

// Suggestion Types
export interface SuggestionItem {
  id: string;
  icon?: string;
  category: string;
  title: string;
  description: string;
}

// UI State Types
export interface UIState {
  sidebarOpen: boolean;
  statePanelOpen: boolean;
  currentConversationId: string | null;
  selectedMessages: string[];
  searchQuery: string;
  filterTags: string[];
  loading: boolean;
  error: string | null;
}

// Export API types
export * from './types/api';
