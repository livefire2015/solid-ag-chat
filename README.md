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

## Components

### ChatInterface

The main chat component that includes all sub-components.

```tsx
import { ChatInterface } from '@livefire2015/solid-ag-chat';

<ChatInterface apiUrl="http://localhost:8000/agent/stream" />
```

**Props:**
- `apiUrl` (optional, deprecated): The API endpoint for the AG-UI stream. Use `apiConfig` instead
- `apiConfig` (optional): API configuration object with `baseUrl` and custom `endpoints`
- `storageMode` (optional): Storage mode - `'local'` | `'remote'` | `'hybrid'`. Defaults to `'local'`
- `conversationId` (optional): Specific conversation ID to load (useful for routing)
- `newChatMode` (optional): Enable new chat mode for homepage (v0.3.1+). Defaults to `false`
- `autoGenerateTitle` (optional): Automatically generate conversation titles after assistant response (v0.3.1+). Defaults to `true`
- `createConversationOnFirstMessage` (optional): Create conversation on first message send (v0.3.1+). Defaults to `false`
- `title` (optional): Chat interface title. Defaults to `"Nova Chat"`
- `description` (optional): Chat interface description. Defaults to `"Let language become the interface"`
- `userName` (optional): User name displayed in empty state (v0.3.2+)
- `suggestions` (optional): Array of suggestion items for empty state (v0.3.2+)
- `showEmptyState` (optional): Whether to show empty state with suggestions. Defaults to `true`
- `disclaimerText` (optional): Custom disclaimer text in footer (v0.3.2+)
- `loadConversationsOnMount` (optional): Whether to load conversations on component mount. Defaults to `true` (v0.3.5+)
- `showSidebar` (optional): Whether to show the conversation sidebar. Defaults to `true` (v0.3.5+)
- `onNewConversation` (optional): Custom handler for new conversation creation, useful for routing without API calls (v0.3.7+)

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

### v0.3.7 (Latest)
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

## License

MIT

## Author

livefire2015
