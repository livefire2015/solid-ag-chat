import { createContext, useContext, JSX, createEffect, onCleanup } from 'solid-js';
import type { AgUiClient, AttachmentDoc, RegisteredTool } from '../types';
import { createAgUiStore, AgUiStore } from '../store/createAgUiStore';
import { ToolExecutor } from '../tool-executor';

export interface ChatProviderProps {
  client: AgUiClient;
  upload?: (files: File[]) => Promise<AttachmentDoc[]>;
  sessionId?: string;
  initialConversationId?: string;
  // V2: Tool registration
  tools?: RegisteredTool[]; // Provider-level tools available to all conversations
  children: JSX.Element;
}

export interface ChatContextValue extends AgUiStore {
  upload?: (files: File[]) => Promise<AttachmentDoc[]>;
  sessionId?: string;
  initialConversationId?: string;
}

const ChatContext = createContext<ChatContextValue>();

export function ChatProvider(props: ChatProviderProps) {
  // V2: Create tool executor if tools are provided
  const toolExecutor = props.tools ? new ToolExecutor() : undefined;

  // Register provider-level tools
  createEffect(() => {
    if (toolExecutor && props.tools) {
      for (const { tool, handler } of props.tools) {
        toolExecutor.registerTool(tool, handler);
      }
    }
  });

  // Cleanup tool executor on unmount
  onCleanup(() => {
    toolExecutor?.destroy();
  });

  const store = createAgUiStore({
    client: props.client,
    toolExecutor,
  });

  const contextValue: ChatContextValue = {
    ...store,
    upload: props.upload,
    sessionId: props.sessionId,
    initialConversationId: props.initialConversationId,
  };

  return (
    <ChatContext.Provider value={contextValue}>
      {props.children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within ChatProvider');
  }
  return context;
}
