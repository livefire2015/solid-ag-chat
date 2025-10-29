import { createContext, useContext, JSX, onMount } from 'solid-js';
import type { AgUiClient, AttachmentDoc } from '../types';
import { createAgUiStore, AgUiStore } from '../store/createAgUiStore';

export interface ChatProviderProps {
  client: AgUiClient;
  upload?: (files: File[]) => Promise<AttachmentDoc[]>;
  sessionId?: string;
  initialConversationId?: string;
  children: JSX.Element;
}

export interface ChatContextValue extends AgUiStore {
  upload?: (files: File[]) => Promise<AttachmentDoc[]>;
  sessionId?: string;
  initialConversationId?: string;
  on: AgUiClient['on'];
  off: AgUiClient['off'];
}

const ChatContext = createContext<ChatContextValue>();

export function ChatProvider(props: ChatProviderProps) {
  const store = createAgUiStore(props.client);

  const contextValue: ChatContextValue = {
    ...store,
    upload: props.upload,
    sessionId: props.sessionId,
    initialConversationId: props.initialConversationId,
    on: (event, handler) => props.client.on(event, handler),
    off: (event, handler) => props.client.off(event, handler),
  };

  // Initialize store on mount
  onMount(async () => {
    // Load conversations from backend
    await store.loadConversations();

    // If initialConversationId provided, set as active and load messages
    if (props.initialConversationId) {
      store.setActiveConversation(props.initialConversationId);
      await store.loadMessages(props.initialConversationId);
    }
  });

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
