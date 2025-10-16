# @livefire2015/solid-ag-chat

SolidJS chat components for AG-UI protocol integration with PydanticAI.

[![npm version](https://badge.fury.io/js/@livefire2015%2Fsolid-ag-chat.svg)](https://www.npmjs.com/package/@livefire2015/solid-ag-chat)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🚀 Built with SolidJS for reactive, performant UI
- 💬 Complete chat interface with message history
- 🔄 Real-time streaming support via Server-Sent Events (SSE)
- 🧠 Agent state visualization panel
- 🤖 Auto-title generation for conversations
- 🆕 Lazy conversation creation for seamless new chat experience
- 🔗 Full REST API integration with remote storage
- 💾 Multiple storage modes (local, remote, hybrid)
- 📦 TypeScript support out of the box
- 🎨 Styled with Tailwind CSS classes

## Installation

```bash
npm install @livefire2015/solid-ag-chat
```

## Peer Dependencies

This package requires SolidJS as a peer dependency:

```bash
npm install solid-js
```

## Quick Start

### Basic Usage

```tsx
import { ChatInterface } from '@livefire2015/solid-ag-chat';

function App() {
  return (
    <ChatInterface apiUrl="http://localhost:8000/agent/stream" />
  );
}
```

### New Chat Homepage (v0.3.1+)

For a seamless new chat experience where conversations are created on first message:

```tsx
import { ChatInterface } from '@livefire2015/solid-ag-chat';

function HomePage() {
  return (
    <ChatInterface
      newChatMode={true}
      autoGenerateTitle={true}
      storageMode="remote"
      apiConfig={{
        baseUrl: 'http://localhost:8000',
        endpoints: {
          streamMessage: '/api/chat/c/{conversationId}/stream',
          createConversationWithMessage: '/api/chat/conversations/with-message',
          generateTitle: '/api/chat/c/{conversationId}/generate-title'
        }
      }}
    />
  );
}
```

### With Suggestions and Empty State (v0.3.2+)

Create an engaging welcome experience with suggestion cards:

```tsx
import { ChatInterface } from '@livefire2015/solid-ag-chat';

function ChatPage() {
  const suggestions = [
    {
      id: "help",
      icon: "❓",
      category: "General",
      title: "What can you help me with?",
      description: "Get an overview of my capabilities"
    },
    {
      id: "explain",
      icon: "🧠",
      category: "Learning",
      title: "Explain a technical concept",
      description: "Break down complex topics into simple terms"
    },
    {
      id: "coding",
      icon: "💻",
      category: "Development",
      title: "Help me with coding",
      description: "Get assistance with programming tasks"
    }
  ];

  return (
    <ChatInterface
      apiUrl="http://localhost:8000/agent/stream"
      userName="Developer"
      suggestions={suggestions}
      showEmptyState={true}
      disclaimerText="AI can make mistakes. Please verify important information."
    />
  );
}
```

### New Chat Mode (v0.3.5+)

For new chat interfaces that don't need to load existing conversations:

```tsx
import { ChatInterface } from '@livefire2015/solid-ag-chat';

function NewChatPage() {
  return (
    <ChatInterface
      newChatMode={true}
      loadConversationsOnMount={false}
      showSidebar={false}
      createConversationOnFirstMessage={true}
      storageMode="local"
      suggestions={suggestions}
      showEmptyState={true}
    />
  );
}
```

### With Routing

Using SolidJS Router to handle conversation URLs:

```tsx
import { useParams } from '@solidjs/router';

function ChatPage() {
  const params = useParams();

  return (
    <ChatInterface
      conversationId={params.conversationId}
      autoGenerateTitle={true}
      apiConfig={{
        baseUrl: import.meta.env.VITE_API_BASE_URL,
        endpoints: {
          getConversation: '/api/chat/c/{conversationId}',
          streamMessage: '/api/chat/c/{conversationId}/stream'
        }
      }}
    />
  );
}
```

### With Custom New Conversation Handler (v0.3.7+)

For routing-based navigation without API calls when creating new conversations:

```tsx
import { useNavigate } from '@solidjs/router';

function ChatPage() {
  const navigate = useNavigate();

  return (
    <ChatInterface
      storageMode="remote"
      onNewConversation={() => {
        // Navigate to new chat page without making API calls
        navigate('/chat');
      }}
      apiConfig={{
        baseUrl: 'http://localhost:3001',
        endpoints: {
          streamMessage: '/api/chat/c/{conversationId}/stream'
        }
      }}
    />
  );
}
```

### With Dependency Injection (v0.4.0+)

Inject pre-configured services for custom auth, retries, or caching:

```tsx
import { ChatInterface } from '@livefire2015/solid-ag-chat';
import { createAGUIService } from '@livefire2015/solid-ag-chat';
import { createRemoteStorageAdapter, StorageManager } from '@livefire2015/solid-ag-chat';

function ProductionChatPage() {
  // Create auth-aware chat service
  const chatService = createAGUIService({
    baseUrl: 'https://api.myapp.com',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'X-App-Version': '1.0.0'
    },
    endpoints: {
      streamMessage: '/chat/stream'
    }
  });

  // Create persistent storage adapter with custom config
  const storageAdapter = createRemoteStorageAdapter({
    baseUrl: 'https://api.myapp.com',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`
    },
    endpoints: {
      getConversations: '/conversations',
      getConversation: '/conversations/{conversationId}',
      createConversationWithMessage: '/conversations/create'
    }
  });

  const storageManager = new StorageManager(storageAdapter);

  return (
    <ChatInterface
      chatService={chatService}
      storageManager={storageManager}
      onStatusChange={(status) => {
        if (status.error) {
          showNotification(`Chat error: ${status.error}`);
        }
      }}
    />
  );
}
```

### With Split API Configuration (v0.4.0+)

Use different hosts for streaming vs CRUD operations:

```tsx
function MultiHostChatPage() {
  return (
    <ChatInterface
      // Streaming chat goes to one service
      chatApiConfig={{
        baseUrl: 'https://chat-stream.myapp.com',
        headers: { 'Authorization': `Bearer ${getChatToken()}` },
        endpoints: {
          streamMessage: '/v1/stream'
        }
      }}
      // CRUD operations go to another service
      storageApiConfig={{
        baseUrl: 'https://api.myapp.com',
        headers: { 'Authorization': `Bearer ${getApiToken()}` },
        endpoints: {
          getConversations: '/v2/conversations',
          createConversationWithMessage: '/v2/conversations/create'
        }
      }}
      storageMode="remote"
    />
  );
}
```

### With Controlled Mode (v0.4.0+)

Take full control over conversation state management:

```tsx
function ControlledChatPage() {
  const [conversations, setConversations] = createSignal([]);
  const [currentConversationId, setCurrentConversationId] = createSignal(null);

  const handleConversationCreate = async (data) => {
    const response = await fetch('/api/conversations', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    const newConversation = await response.json();

    setConversations([newConversation, ...conversations()]);
    setCurrentConversationId(newConversation.id);
    navigate(`/chat/${newConversation.id}`);

    return newConversation.id;
  };

  return (
    <ChatInterface
      controlled={true}
      conversations={conversations()}
      currentConversationId={currentConversationId()}
      onConversationCreate={handleConversationCreate}
      onConversationSelect={(id) => {
        setCurrentConversationId(id);
        navigate(`/chat/${id}`);
      }}
      onConversationUpdate={async (id, updates) => {
        await fetch(`/api/conversations/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(updates)
        });
        // Update local state...
      }}
    />
  );
}
```

## Components

### ChatInterface

The main chat component that includes all sub-components.

```tsx
import { ChatInterface } from '@livefire2015/solid-ag-chat';

<ChatInterface apiUrl="http://localhost:8000/agent/stream" />
```

**Props:**

**Legacy Props (Backward Compatible):**
- `apiUrl` (optional, deprecated): The API endpoint for the AG-UI stream. Use `chatApiConfig` instead
- `apiConfig` (optional, deprecated): API configuration object. Use `chatApiConfig` and `storageApiConfig` instead

**Core Configuration:**
- `storageMode` (optional): Storage mode - `'local'` | `'remote'` | `'hybrid'`. Defaults to `'local'`
- `conversationId` (optional): Specific conversation ID to load (useful for routing)
- `newChatMode` (optional): Enable new chat mode for homepage. Defaults to `false`
- `autoGenerateTitle` (optional): Automatically generate conversation titles after assistant response. Defaults to `true`
- `createConversationOnFirstMessage` (optional): Create conversation on first message send. Defaults to `false`
- `loadConversationsOnMount` (optional): Whether to load conversations on component mount. Defaults to `true`
- `showSidebar` (optional): Whether to show the conversation sidebar. Defaults to `true`

**UI Configuration:**
- `title` (optional): Chat interface title. Defaults to `"Nova Chat"`
- `description` (optional): Chat interface description. Defaults to `"Let language become the interface"`
- `userName` (optional): User name displayed in empty state
- `suggestions` (optional): Array of suggestion items for empty state
- `showEmptyState` (optional): Whether to show empty state with suggestions. Defaults to `true`
- `disclaimerText` (optional): Custom disclaimer text in footer

**Event Handlers:**
- `onNewConversation` (optional): Custom handler for new conversation creation

**Dependency Injection (v0.4.0+):**
- `chatService` (optional): Pre-configured chat service with custom auth/headers
- `storageManager` (optional): Pre-configured storage manager with custom adapter
- `storageAdapter` (optional): Custom storage adapter implementation

**Split API Configuration (v0.4.0+):**
- `chatApiConfig` (optional): API config for streaming chat operations
- `storageApiConfig` (optional): API config for CRUD conversation operations

**Status Callbacks (v0.4.0+):**
- `onStatusChange` (optional): Global status change callback for loading/error states
- `onChatStatusChange` (optional): Chat-specific status change callback
- `onStorageStatusChange` (optional): Storage-specific status change callback

**Controlled Mode (v0.4.0+):**
- `controlled` (optional): Explicitly enable controlled mode
- `conversations` (optional): External conversation list (enables controlled mode)
- `currentConversationId` (optional): External current conversation ID
- `onConversationChange` (optional): Callback when conversation selection changes
- `onConversationCreate` (optional): Callback for creating new conversations
- `onConversationUpdate` (optional): Callback for updating conversations
- `onConversationDelete` (optional): Callback for deleting conversations
- `onConversationSelect` (optional): Callback for selecting conversations
- `onConversationDuplicate` (optional): Callback for duplicating conversations
- `onConversationArchive` (optional): Callback for archiving conversations
- `onConversationStar` (optional): Callback for starring conversations

### MessageList

Displays the list of chat messages.

```tsx
import { MessageList } from '@livefire2015/solid-ag-chat';

<MessageList
  messages={messages()}
  isLoading={isLoading()}
/>
```

### MessageInput

Text input for sending messages.

```tsx
import { MessageInput } from '@livefire2015/solid-ag-chat';

<MessageInput
  onSendMessage={handleSend}
  disabled={isLoading()}
/>
```

### StatePanel

Side panel for visualizing agent state.

```tsx
import { StatePanel } from '@livefire2015/solid-ag-chat';

<StatePanel agentState={agentState()} />
```

### EmptyState

Welcome screen with personalized greeting and suggestion cards (v0.3.2+).

```tsx
import { EmptyState } from '@livefire2015/solid-ag-chat';

const suggestions = [
  {
    id: "help",
    category: "General",
    title: "What can you help me with?",
    description: "Get an overview of my capabilities"
  }
];

<EmptyState
  userName="Developer"
  suggestions={suggestions}
  onSuggestionClick={(suggestion) => {
    // Handle suggestion click
    console.log('Clicked:', suggestion.title);
  }}
/>
```

### SuggestionCard

Interactive suggestion cards that populate the message input (v0.3.2+).

```tsx
import { SuggestionCard } from '@livefire2015/solid-ag-chat';

<SuggestionCard
  suggestion={{
    id: "coding",
    icon: "💻",
    category: "Development",
    title: "Help me with coding",
    description: "Get assistance with programming tasks"
  }}
  onClick={() => {
    // Handle click
  }}
/>
```

## Services

### createAGUIService

A reactive service for managing chat state and AG-UI protocol communication.

```tsx
import { createAGUIService } from '@livefire2015/solid-ag-chat';

const chatService = createAGUIService({
  baseUrl: 'http://localhost:8000',
  endpoints: {
    streamMessage: '/agent/stream'
  }
});

// Access reactive state
const messages = chatService.messages();
const isLoading = chatService.isLoading();
const error = chatService.error();
const agentState = chatService.agentState();

// Send messages
await chatService.sendMessage('Hello!', undefined, conversationId);

// Set auto-title generation callback (v0.3.1+)
chatService.setAutoTitleCallback(async (convId) => {
  // Your auto-title generation logic
});

// Clear state
chatService.clearMessages();
chatService.clearAgentState();
```

## Storage Modes (v0.3.1+)

### Local Storage (Default)
Data is stored in the browser's localStorage. Conversations persist across browser sessions but are device-specific.

### Remote Storage
Data is stored on your backend server. Requires implementing the REST API endpoints.

### Hybrid Storage (Coming Soon)
Combines local caching with remote sync for offline capability.

## API Endpoints (v0.3.1+)

When using `storageMode="remote"`, implement these REST endpoints:

```typescript
const endpoints = {
  // Conversation Management
  getConversations: '/api/chat/conversations',
  getConversation: '/api/chat/c/{conversationId}',
  createConversation: '/api/chat/conversations',
  createConversationWithMessage: '/api/chat/conversations/with-message',
  updateConversation: '/api/chat/c/{conversationId}',
  deleteConversation: '/api/chat/c/{conversationId}',
  generateTitle: '/api/chat/c/{conversationId}/generate-title',

  // Message Management
  getMessages: '/api/chat/c/{conversationId}/messages',
  sendMessage: '/api/chat/c/{conversationId}/messages',
  streamMessage: '/api/chat/c/{conversationId}/stream',
  getMessage: '/api/chat/c/{conversationId}/messages/{messageId}',
  updateMessage: '/api/chat/c/{conversationId}/messages/{messageId}',
  deleteMessage: '/api/chat/c/{conversationId}/messages/{messageId}'
}
```

## AG-UI Protocol

This package implements the AG-UI protocol for streaming agent interactions. The protocol supports:

- **TEXT_MESSAGE_START/END**: Message lifecycle events
- **TEXT_MESSAGE_CONTENT**: Full message updates
- **TEXT_MESSAGE_DELTA**: Incremental message updates
- **STATE_SNAPSHOT**: Complete agent state
- **STATE_DELTA**: Partial agent state updates
- **TOOL_CALL_START/ARGS/END/RESULT**: Tool execution events
- **ERROR**: Error handling

## Types

All TypeScript types are exported for use in your application:

```tsx
import type {
  AGUIMessage,
  AGUIEvent,
  AgentState,
  ChatService,
  SuggestionItem,
  ApiConfig
} from '@livefire2015/solid-ag-chat';
```

## Styling

Components use Tailwind CSS classes. Ensure your project has Tailwind CSS configured:

```bash
npm install -D tailwindcss
```

## Advanced Usage

### Auto-Title Generation

The library can automatically generate conversation titles after the assistant's first response:

```tsx
<ChatInterface
  autoGenerateTitle={true}
  storageMode="remote"
  apiConfig={{
    endpoints: {
      generateTitle: '/api/chat/c/{conversationId}/generate-title'
    }
  }}
/>
```

### Lazy Conversation Creation

Perfect for homepage/landing page where you want the conversation to be created only when the user sends their first message:

```tsx
<ChatInterface
  createConversationOnFirstMessage={true}
  newChatMode={true}
/>
```

### Custom Storage Adapter

You can create your own storage adapter:

```tsx
import { StorageAdapter } from '@livefire2015/solid-ag-chat';

class MyCustomAdapter implements StorageAdapter {
  async get(key: string) { /* ... */ }
  async set(key: string, value: any) { /* ... */ }
  async remove(key: string) { /* ... */ }
  async clear() { /* ... */ }
  async keys() { /* ... */ }
}
```

## Development

```bash
# Build the package
npm run build

# Watch mode
npm run dev
```

## Changelog

### v0.4.0 (Latest) - Major Architecture Refactor 🚀
**Breaking Changes & Major Improvements:**
- 🏗️ **Dependency Injection**: Inject pre-configured `chatService`, `storageManager`, `storageAdapter`
- 🔄 **Memoized Storage**: Fixed cache-wiping issue in remote storage adapters
- 🎛️ **Controlled Mode**: Full external control over conversation lifecycle
- 📡 **Split API Configs**: Separate `chatApiConfig` and `storageApiConfig` for different concerns
- 📊 **Enhanced Loading States**: Proper loading propagation to all UI components
- 🔔 **Status Callbacks**: `onStatusChange`, `onChatStatusChange`, `onStorageStatusChange`
- 🧭 **Production Ready**: Designed for real-world remote API integrations

**Migration Guide:** See [v0.4.0 Migration](#v040-migration-guide) below.

### v0.3.7
- ✨ Added onNewConversation prop for custom new conversation handling
- 🧭 Enables pure frontend navigation without API calls for new chat creation
- 🔄 Maintains backward compatibility with default conversation creation behavior

### v0.3.6
- 🔧 Improved prop evaluation to prevent unwanted API calls in new chat mode
- 📝 Fixed reactive computation timing issues with showSidebar prop

### v0.3.5
- 🚫 Fixed loadConversationsOnMount prop to prevent unnecessary API calls in new chat mode
- 🎛️ Added showSidebar prop to control conversation sidebar visibility
- 🔧 Improved new chat flow with zero API calls until first message
- 📝 Added documentation for new chat mode usage patterns

### v0.3.4
- 🔧 Fixed remote storage conversation creation and list refresh issues
- 📝 Resolved PATCH request errors for new conversations
- 🔄 Added proper conversation list refresh after creation

### v0.3.3
- 🔧 Fixed apiUrl prop to handle complete endpoint URIs correctly
- 📝 Improved backwards compatibility documentation

### v0.3.2
- 🎨 Added EmptyState component with personalized welcome experience
- 💡 Added SuggestionCard component for interactive conversation starters
- 🎯 New props: `userName`, `suggestions`, `showEmptyState`, `disclaimerText`
- 🔄 Enhanced ChatInterface with suggestion click handling

### v0.3.1
- ✨ Auto-title generation for conversations after assistant response
- 🆕 Lazy conversation creation for homepage new chat flow
- 🔗 Full REST API implementation in RemoteStorageAdapter
- 📝 New API endpoints: `createConversationWithMessage`, `generateTitle`
- 🎯 New props: `newChatMode`, `autoGenerateTitle`, `createConversationOnFirstMessage`

### v0.3.0
- 🔌 API configuration support with custom endpoints
- 💾 Multiple storage modes (local/remote/hybrid)
- 🆔 UUID-based conversation and message routing
- ⚠️ Deprecated `apiUrl` in favor of `apiConfig`

### v0.2.x
- Initial release with core chat functionality
- AG-UI protocol implementation
- Local storage support

## v0.4.0 Migration Guide

### Breaking Changes

**1. Storage Adapter Behavior**
- Storage adapters are now memoized and persistent across component lifecycle
- Fixes cache-wiping issues that caused duplicate API calls
- **Action Required**: None for basic usage, but performance will improve

**2. Enhanced Loading States**
- Loading states now properly propagate to all UI components
- **Action Required**: Update any custom loading indicators to use new status callbacks

### New Features You Should Adopt

**1. Split API Configuration (Recommended)**
```tsx
// Before (v0.3.x)
<ChatInterface
  apiConfig={{
    baseUrl: 'http://localhost:3001',
    endpoints: {
      streamMessage: '/chat/stream',
      getConversations: '/conversations'
    }
  }}
/>

// After (v0.4.0) - Better separation of concerns
<ChatInterface
  chatApiConfig={{
    baseUrl: 'https://chat-api.myapp.com',
    endpoints: { streamMessage: '/v1/stream' }
  }}
  storageApiConfig={{
    baseUrl: 'https://api.myapp.com',
    endpoints: { getConversations: '/v2/conversations' }
  }}
/>
```

**2. Dependency Injection for Production Apps**
```tsx
// Before (v0.3.x) - No control over service creation
<ChatInterface apiConfig={config} />

// After (v0.4.0) - Full control with auth, retries, etc.
const chatService = createAGUIService({
  ...config,
  headers: { 'Authorization': `Bearer ${token}` },
  timeout: 30000
});

<ChatInterface chatService={chatService} />
```

**3. Controlled Mode for Complex Apps**
```tsx
// Before (v0.3.x) - Limited external control
<ChatInterface
  onNewConversation={() => navigate('/chat')}
/>

// After (v0.4.0) - Full external control
<ChatInterface
  controlled={true}
  conversations={myConversations}
  currentConversationId={currentId}
  onConversationCreate={handleCreate}
  onConversationSelect={handleSelect}
/>
```

**4. Status Callbacks for Better UX**
```tsx
// New in v0.4.0 - Monitor loading/error states
<ChatInterface
  onStatusChange={(status) => {
    if (status.loading) showGlobalSpinner();
    if (status.error) showErrorToast(status.error);
  }}
  onChatStatusChange={(status) => {
    // Handle chat-specific status
  }}
  onStorageStatusChange={(status) => {
    // Handle storage-specific status
  }}
/>
```

### Backward Compatibility

All v0.3.x code continues to work in v0.4.0 with these deprecation warnings:
- `apiUrl` prop → Use `chatApiConfig` instead
- `apiConfig` prop → Use `chatApiConfig` and `storageApiConfig` instead

### Performance Improvements

**Before v0.4.0 Issues:**
- Remote storage adapters recreated on every call (cache loss)
- Loading states not properly propagated
- No way to inject auth-aware services

**After v0.4.0 Benefits:**
- ✅ Persistent adapters preserve caches
- ✅ Proper loading state propagation
- ✅ Full service dependency injection
- ✅ Split concerns for streaming vs CRUD
- ✅ Production-ready architecture

## License

MIT

## Author

livefire2015
