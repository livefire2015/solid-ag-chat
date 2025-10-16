// Import official AG-UI types and compatibility layer
import {
  EventType,
  AG_UI_EVENT_TYPES,
  AGUIMessage,
  AGUIToolCall,
  AGUIRequest,
  AgentState,
  EnhancedAGUIMessage,
  StreamingToolCall,
  FileAttachment,
  FileAttachmentStatus,
  // Event interfaces
  BaseEvent,
  TextMessageStartEvent,
  TextMessageContentEvent,
  TextMessageEndEvent,
  TextMessageDeltaEvent,
  ToolCallStartEvent,
  ToolCallArgsEvent,
  ToolCallEndEvent,
  ToolCallResultEvent,
  ToolCallDeltaEvent,
  ToolOutputEvent,
  RunStartedEvent,
  RunFinishedEvent,
  StateSnapshotEvent,
  StateDeltaEvent,
  ErrorEvent,
  AgentProposal,
  AgentProposalEvent,
  AgentProposalApprovedEvent,
  AgentProposalRejectedEvent,
  HumanInputRequiredEvent,
  ContextUpdateEvent,
  AGUIEvent,
  // EventSchemas for validation
  EventSchemas
} from './types/ag-ui-compat';

// Re-export for backward compatibility
export {
  EventType,
  AG_UI_EVENT_TYPES,
  EventSchemas
};
export type {
  AGUIMessage,
  AGUIToolCall,
  AGUIRequest,
  AgentState,
  EnhancedAGUIMessage,
  StreamingToolCall,
  FileAttachment,
  FileAttachmentStatus,
  // Event interfaces
  BaseEvent,
  TextMessageStartEvent,
  TextMessageContentEvent,
  TextMessageEndEvent,
  TextMessageDeltaEvent,
  ToolCallStartEvent,
  ToolCallArgsEvent,
  ToolCallEndEvent,
  ToolCallResultEvent,
  ToolCallDeltaEvent,
  ToolOutputEvent,
  RunStartedEvent,
  RunFinishedEvent,
  StateSnapshotEvent,
  StateDeltaEvent,
  ErrorEvent,
  AgentProposal,
  AgentProposalEvent,
  AgentProposalApprovedEvent,
  AgentProposalRejectedEvent,
  HumanInputRequiredEvent,
  ContextUpdateEvent,
  AGUIEvent
};

// All event interfaces are now imported from ag-ui-compat.ts
// This provides compatibility with @ag-ui/core while maintaining backward compatibility

// The following types are now imported from the compatibility layer.
// We don't need to redefine them here since they're properly exported from ag-ui-compat.ts

// Stream Event Type (not part of AG-UI core, solid-ag-chat specific)
export interface StreamEvent {
  event: string;
  data: string;
}

// Tool Definition (legacy, use Tool from ag-ui-compat instead)
export interface AGUITool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
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

// Service Status Types (v0.4.0+)
export interface ServiceStatus {
  loading: boolean;
  error?: string;
  lastUpdated?: string;
  details?: Record<string, unknown>;
}

export type StatusChangeCallback = (status: ServiceStatus) => void;

// Chat Service Types (v0.4.0+)
export interface ChatService {
  messages: () => EnhancedAGUIMessage[];
  isLoading: () => boolean;
  error: () => string | null;
  agentState: () => AgentState | null;
  sendMessage: (content: string, files?: any[], conversationId?: string) => Promise<void>;
  loadMessages: (messages: EnhancedAGUIMessage[]) => void;
  clearMessages: () => void;
  clearAgentState: () => void;
  setAutoTitleCallback?: (callback: (conversationId: string) => Promise<void>) => void;
}

export interface ChatServiceConfig {
  apiConfig: import('./types/api').ApiConfig;
  onAutoTitle?: (conversationId: string) => Promise<void>;
  onStatusChange?: StatusChangeCallback;
}

// Note: StorageManager is a class imported from '../services/storage'
// No interface needed here since we use the actual class

export interface StorageManagerConfig {
  adapter: StorageAdapter;
  onStatusChange?: StatusChangeCallback;
}

// Simplified Chat Configuration (v0.4.1+)
export interface ChatConfig {
  // API & Storage
  apiConfig?: import('./types/api').ApiConfig;
  storageConfig?: import('./types/api').ApiConfig; // Falls back to apiConfig if not provided

  // Services (for dependency injection)
  chatService?: ChatService;
  storageAdapter?: StorageAdapter;

  // Conversation behavior
  conversationId?: string;
  autoTitle?: boolean;
  createOnFirstMessage?: boolean;

  // UI
  title?: string;
  description?: string;
  userName?: string;
  suggestions?: SuggestionItem[];
  showSidebar?: boolean;
  disclaimerText?: string;

  // Controlled mode data
  conversations?: ConversationSummary[];
  currentConversationId?: string;
}

// Simplified Event Handlers (v0.4.1+)
export interface ChatEventHandlers {
  // Status
  onStatusChange?: (status: ServiceStatus) => void;

  // Navigation
  onNewConversation?: () => void;

  // Conversation lifecycle (for controlled mode)
  onConversationCreate?: (data: Partial<Conversation>) => Promise<string>;
  onConversationSelect?: (id: string) => void;
  onConversationUpdate?: (id: string, updates: Partial<Conversation>) => Promise<void>;
  onConversationDelete?: (id: string) => Promise<void>;
}

// Chat Mode Types (v0.4.1+)
export type ChatMode = 'local' | 'remote' | 'controlled';

// Export API types
export * from './types/api';
