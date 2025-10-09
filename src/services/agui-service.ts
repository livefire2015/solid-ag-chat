import { createSignal } from 'solid-js';
import type {
  AGUIMessage,
  EnhancedAGUIMessage,
  AGUIEvent,
  AgentState,
  AGUIRequest,
  StreamingToolCall,
} from './types';

export interface ChatService {
  messages: () => EnhancedAGUIMessage[];
  isLoading: () => boolean;
  error: () => string | null;
  agentState: () => AgentState | null;
  sendMessage: (message: string, attachments?: File[]) => Promise<void>;
  clearMessages: () => void;
  clearAgentState: () => void;
  loadMessages: (messages: EnhancedAGUIMessage[]) => void;
}

export function createAGUIService(apiUrl: string = 'http://localhost:8000/agent/stream'): ChatService {
  const [messages, setMessages] = createSignal<EnhancedAGUIMessage[]>([], { equals: false });
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [agentState, setAgentState] = createSignal<AgentState | null>(null);
  // Persistent threadId for the entire conversation
  const [threadId] = createSignal(crypto.randomUUID());
  // Track active tool calls
  const [activeToolCalls, setActiveToolCalls] = createSignal<Map<string, StreamingToolCall>>(new Map());

  const sendMessage = async (message: string, attachments?: File[]) => {
    if (!message.trim()) return;

    setIsLoading(true);
    setError(null);

    // Add user message immediately
    const userMessage: EnhancedAGUIMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conversationId: 'default', // For now, using default conversation
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      isMarkdown: false,
      isEdited: false,
    };
    setMessages((prev) => [...prev, userMessage]);

    let currentAssistantMessage = '';
    let assistantMessageStarted = false;

    try {
      // Send full conversation history (all messages including the new one)
      const allMessages = [...messages(), userMessage];
      const request: AGUIRequest = {
        threadId: threadId(), // Persistent thread ID for conversation
        runId: crypto.randomUUID(), // New run ID for each message
        state: null,
        messages: allMessages.map(msg => ({
          id: crypto.randomUUID(), // Generate unique ID for each message
          role: msg.role,
          content: msg.content,
        })),
        tools: [],
        context: [],
        forwardedProps: null,
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;

          try {
            const data = line.slice(6); // Remove 'data: ' prefix
            if (data === '[DONE]') continue;

            const event: AGUIEvent = JSON.parse(data);

            // Handle different event types
            switch (event.type) {
              case 'TEXT_MESSAGE_START':
                // Initialize new assistant message
                if (!assistantMessageStarted) {
                  const assistantMsg: EnhancedAGUIMessage = {
                    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    conversationId: 'default',
                    role: 'assistant',
                    content: '',
                    timestamp: new Date().toISOString(),
                    isMarkdown: true, // Assistant messages are typically markdown
                    isEdited: false,
                  };
                  setMessages((prev) => [...prev, assistantMsg]);
                  assistantMessageStarted = true;
                  currentAssistantMessage = '';
                }
                break;

              case 'TEXT_MESSAGE_CONTENT':
                currentAssistantMessage += event.delta;
                setMessages((prev) => {
                  const updated = [...prev];
                  const lastIdx = updated.length - 1;
                  if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
                    updated[lastIdx] = {
                      ...updated[lastIdx],
                      content: currentAssistantMessage
                    };
                  }
                  return updated;
                });
                break;

              case 'TEXT_MESSAGE_END':
                // Message is complete
                console.log('Message ended:', currentAssistantMessage);
                break;

              case 'TEXT_MESSAGE_DELTA':
                currentAssistantMessage += event.delta;
                setMessages((prev) => {
                  const updated = [...prev];
                  const lastIdx = updated.length - 1;

                  if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
                    // Create NEW object instead of mutating for SolidJS reactivity
                    updated[lastIdx] = {
                      ...updated[lastIdx],
                      content: currentAssistantMessage
                    };
                  } else {
                    updated.push({
                      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                      conversationId: 'default',
                      role: 'assistant',
                      content: currentAssistantMessage,
                      timestamp: new Date().toISOString(),
                      isMarkdown: true,
                      isEdited: false,
                    });
                    assistantMessageStarted = true;
                  }
                  return updated;
                });
                break;

              case 'STATE_SNAPSHOT':
                setAgentState(event.state);
                break;

              case 'STATE_DELTA':
                setAgentState((prev) => ({
                  ...prev,
                  ...event.delta,
                }));
                break;

              case 'ERROR':
                setError(event.error);
                break;

              case 'TOOL_CALL_START':
                // Start a new tool call
                const newToolCall: StreamingToolCall = {
                  id: event.toolCallId,
                  name: event.toolCallName,
                  arguments: '',
                  status: 'starting',
                  parentMessageId: event.parentMessageId,
                  startedAt: new Date().toISOString(),
                };

                setActiveToolCalls(prev => {
                  const updated = new Map(prev);
                  updated.set(event.toolCallId, newToolCall);
                  return updated;
                });

                // Add tool call to the current assistant message or create one
                setMessages(prev => {
                  const updated = [...prev];
                  const lastIdx = updated.length - 1;

                  if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
                    updated[lastIdx] = {
                      ...updated[lastIdx],
                      streamingToolCalls: [...(updated[lastIdx].streamingToolCalls || []), newToolCall]
                    };
                  } else {
                    // Create new assistant message for tool calls
                    updated.push({
                      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                      conversationId: 'default',
                      role: 'assistant',
                      content: '',
                      timestamp: new Date().toISOString(),
                      isMarkdown: false,
                      isEdited: false,
                      streamingToolCalls: [newToolCall]
                    });
                  }
                  return updated;
                });
                break;

              case 'TOOL_CALL_ARGS':
                // Append argument data to the tool call
                setActiveToolCalls(prev => {
                  const updated = new Map(prev);
                  const toolCall = updated.get(event.toolCallId);
                  if (toolCall) {
                    updated.set(event.toolCallId, {
                      ...toolCall,
                      arguments: toolCall.arguments + event.delta,
                      status: 'building_args'
                    });
                  }
                  return updated;
                });

                // Update the tool call in messages
                setMessages(prev => {
                  const updated = [...prev];
                  for (let i = updated.length - 1; i >= 0; i--) {
                    if (updated[i].streamingToolCalls) {
                      const toolCallIndex = updated[i].streamingToolCalls!.findIndex(tc => tc.id === event.toolCallId);
                      if (toolCallIndex !== -1) {
                        const updatedToolCalls = [...updated[i].streamingToolCalls!];
                        updatedToolCalls[toolCallIndex] = {
                          ...updatedToolCalls[toolCallIndex],
                          arguments: updatedToolCalls[toolCallIndex].arguments + event.delta,
                          status: 'building_args'
                        };
                        updated[i] = {
                          ...updated[i],
                          streamingToolCalls: updatedToolCalls
                        };
                        break;
                      }
                    }
                  }
                  return updated;
                });
                break;

              case 'TOOL_CALL_END':
                // Mark tool call as executing (args complete)
                setActiveToolCalls(prev => {
                  const updated = new Map(prev);
                  const toolCall = updated.get(event.toolCallId);
                  if (toolCall) {
                    try {
                      // Try to parse arguments as JSON
                      const parsedArguments = JSON.parse(toolCall.arguments);
                      updated.set(event.toolCallId, {
                        ...toolCall,
                        parsedArguments,
                        status: 'executing'
                      });
                    } catch {
                      // Keep arguments as string if JSON parsing fails
                      updated.set(event.toolCallId, {
                        ...toolCall,
                        status: 'executing'
                      });
                    }
                  }
                  return updated;
                });

                // Update tool call status in messages
                setMessages(prev => {
                  const updated = [...prev];
                  for (let i = updated.length - 1; i >= 0; i--) {
                    if (updated[i].streamingToolCalls) {
                      const toolCallIndex = updated[i].streamingToolCalls!.findIndex(tc => tc.id === event.toolCallId);
                      if (toolCallIndex !== -1) {
                        const updatedToolCalls = [...updated[i].streamingToolCalls!];
                        const toolCall = updatedToolCalls[toolCallIndex];
                        try {
                          const parsedArguments = JSON.parse(toolCall.arguments);
                          updatedToolCalls[toolCallIndex] = {
                            ...toolCall,
                            parsedArguments,
                            status: 'executing'
                          };
                        } catch {
                          updatedToolCalls[toolCallIndex] = {
                            ...toolCall,
                            status: 'executing'
                          };
                        }
                        updated[i] = {
                          ...updated[i],
                          streamingToolCalls: updatedToolCalls
                        };
                        break;
                      }
                    }
                  }
                  return updated;
                });
                break;

              case 'TOOL_CALL_RESULT':
                // Add tool result and mark as completed
                setActiveToolCalls(prev => {
                  const updated = new Map(prev);
                  const toolCall = updated.get(event.toolCallId);
                  if (toolCall) {
                    updated.set(event.toolCallId, {
                      ...toolCall,
                      result: event.content,
                      status: 'completed',
                      completedAt: new Date().toISOString()
                    });
                  }
                  return updated;
                });

                // Update tool call result in messages
                setMessages(prev => {
                  const updated = [...prev];
                  for (let i = updated.length - 1; i >= 0; i--) {
                    if (updated[i].streamingToolCalls) {
                      const toolCallIndex = updated[i].streamingToolCalls!.findIndex(tc => tc.id === event.toolCallId);
                      if (toolCallIndex !== -1) {
                        const updatedToolCalls = [...updated[i].streamingToolCalls!];
                        updatedToolCalls[toolCallIndex] = {
                          ...updatedToolCalls[toolCallIndex],
                          result: event.content,
                          status: 'completed',
                          completedAt: new Date().toISOString()
                        };
                        updated[i] = {
                          ...updated[i],
                          streamingToolCalls: updatedToolCalls
                        };
                        break;
                      }
                    }
                  }
                  return updated;
                });
                break;

              case 'RUN_STARTED':
              case 'RUN_FINISHED':
              case 'TOOL_CALL_DELTA':
              case 'TOOL_OUTPUT':
                // Handle legacy events if needed
                console.log('Event:', event);
                break;
            }
          } catch (parseError) {
            console.error('Error parsing SSE event:', parseError);
          }
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error sending message:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const clearMessages = () => {
    setMessages([]);
    setError(null);
  };

  const clearAgentState = () => {
    setAgentState(null);
  };

  const loadMessages = (newMessages: EnhancedAGUIMessage[]) => {
    setMessages(newMessages);
    setError(null);
  };

  return {
    messages,
    isLoading,
    error,
    agentState,
    sendMessage,
    clearMessages,
    clearAgentState,
    loadMessages,
  };
}
