// AG-UI Protocol Event Types
export const AG_UI_EVENT_TYPES = [
  'RUN_STARTED',
  'RUN_FINISHED',
  'TEXT_MESSAGE_CONTENT',
  'TEXT_MESSAGE_DELTA',
  'TOOL_CALL_START',
  'TOOL_CALL_DELTA',
  'TOOL_CALL_END',
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

// Event Interfaces
export interface TextMessageContentEvent {
  type: 'TEXT_MESSAGE_CONTENT';
  content: string;
  role?: 'user' | 'assistant' | 'system';
  timestamp?: string;
}

export interface TextMessageDeltaEvent {
  type: 'TEXT_MESSAGE_DELTA';
  delta: string;
}

export interface ToolCallStartEvent {
  type: 'TOOL_CALL_START';
  toolCall: AGUIToolCall;
}

export interface ToolCallDeltaEvent {
  type: 'TOOL_CALL_DELTA';
  toolCallId: string;
  delta: Partial<AGUIToolCall>;
}

export interface ToolCallEndEvent {
  type: 'TOOL_CALL_END';
  toolCallId: string;
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
  delta: Partial<AgentState>;
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
  | TextMessageContentEvent
  | TextMessageDeltaEvent
  | ToolCallStartEvent
  | ToolCallDeltaEvent
  | ToolCallEndEvent
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
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
}

// Tool Definition
export interface AGUITool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}
