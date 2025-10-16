# @livefire2015/solid-ag-chat

SolidJS chat components for AG-UI protocol integration with PydanticAI.

[![npm version](https://badge.fury.io/js/@livefire2015%2Fsolid-ag-chat.svg)](https://www.npmjs.com/package/@livefire2015/solid-ag-chat)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ChatInterface Props Reference (v0.4.1+)

### Core Props
```tsx
interface ChatInterfaceProps {
  apiUrl?: string;           // Backward compatibility only
  mode?: 'local' | 'remote' | 'controlled';
  config?: Partial<ChatConfig>;
  onEvents?: Partial<ChatEventHandlers>;
}
```

### Config Object
```tsx
interface ChatConfig {
  // API & Storage Configuration
  apiConfig?: {
    baseUrl: string;
    headers?: Record<string, string>;
    endpoints?: {
      streamMessage?: string;                      // '/agent/stream'
      getConversations?: string;                   // '/api/chat/conversations'
      getConversation?: string;                    // '/api/chat/c/{conversationId}'
      createConversation?: string;                 // '/api/chat/conversations'
      createConversationWithMessage?: string;      // '/api/chat/conversations/with-message'
      updateConversation?: string;                 // '/api/chat/c/{conversationId}'
      deleteConversation?: string;                 // '/api/chat/c/{conversationId}'
      generateTitle?: string;                      // '/api/chat/c/{conversationId}/generate-title'
      getMessages?: string;                        // '/api/chat/c/{conversationId}/messages'
      sendMessage?: string;                        // '/api/chat/c/{conversationId}/messages'
    };
  };

  storageConfig?: ApiConfig; // Falls back to apiConfig if not provided

  // Services (for dependency injection)
  chatService?: ChatService;
  storageAdapter?: StorageAdapter;

  // Conversation behavior
  conversationId?: string;
  autoTitle?: boolean;
  createOnFirstMessage?: boolean;

  // UI Configuration
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
```

### Event Handlers
```tsx
interface ChatEventHandlers {
  // Status monitoring
  onStatusChange?: (status: ServiceStatus) => void;

  // Navigation
  onNewConversation?: () => void;

  // Conversation lifecycle (for controlled mode)
  onConversationCreate?: (data: Partial<Conversation>) => Promise<string>;
  onConversationSelect?: (id: string) => void;
  onConversationUpdate?: (id: string, updates: Partial<Conversation>) => Promise<void>;
  onConversationDelete?: (id: string) => Promise<void>;
}
```

### Supporting Types
```tsx
interface SuggestionItem {
  id: string;
  icon?: string;
  category: string;
  title: string;
  description: string;
}

interface ServiceStatus {
  loading: boolean;
  error?: string;
  lastUpdated?: string;
  details?: Record<string, unknown>;
}
```

### Usage Modes

- **`local`**: Data stored in browser localStorage, no backend required
- **`remote`**: Full backend integration with conversation persistence
- **`controlled`**: External state management, you control all data operations

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

### Simple Configuration (v0.4.1+)

```tsx
import { ChatInterface } from '@livefire2015/solid-ag-chat';

function App() {
  return (
    <ChatInterface
      mode="remote"
      config={{
        apiConfig: {
          baseUrl: 'https://api.myapp.com',
          headers: { 'Authorization': `Bearer ${token}` }
        },
        userName: 'Developer',
        autoTitle: true
      }}
      onEvents={{
        onStatusChange: (status) => showToast(status.error),
        onNewConversation: () => navigate('/chat')
      }}
    />
  );
}
```

### Local Chat (v0.4.1+)

```tsx
function LocalChatPage() {
  return (
    <ChatInterface
      mode="local"
      config={{
        userName: 'Developer',
        suggestions: [
          {
            id: "help",
            icon: "❓",
            category: "General",
            title: "What can you help me with?",
            description: "Get an overview of my capabilities"
          }
        ]
      }}
    />
  );
}
```

### Controlled Mode (v0.4.1+)

```tsx
function ControlledChatPage() {
  const [conversations, setConversations] = createSignal([]);
  const [currentId, setCurrentId] = createSignal(null);

  return (
    <ChatInterface
      mode="controlled"
      config={{
        conversations: conversations(),
        currentConversationId: currentId()
      }}
      onEvents={{
        onConversationCreate: async (data) => {
          const response = await fetch('/api/conversations', {
            method: 'POST',
            body: JSON.stringify(data)
          });
          const conv = await response.json();
          setConversations([conv, ...conversations()]);
          setCurrentId(conv.id);
          return conv.id;
        },
        onConversationSelect: (id) => {
          setCurrentId(id);
          navigate(`/chat/${id}`);
        }
      }}
    />
  );
}
```

### New Chat Homepage (v0.4.1+)

For a seamless new chat experience where conversations are created on first message:

```tsx
import { ChatInterface } from '@livefire2015/solid-ag-chat';

function HomePage() {
  return (
    <ChatInterface
      mode="remote"
      config={{
        apiConfig: {
          baseUrl: 'http://localhost:8000',
          endpoints: {
            streamMessage: '/api/chat/c/{conversationId}/stream',
            createConversationWithMessage: '/api/chat/conversations/with-message',
            generateTitle: '/api/chat/c/{conversationId}/generate-title'
          }
        },
        autoTitle: true,
        createOnFirstMessage: true
      }}
    />
  );
}
```

### With Suggestions and Empty State (v0.4.1+)

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
      config={{
        apiConfig: {
          baseUrl: 'http://localhost:8000',
          endpoints: { streamMessage: '/agent/stream' }
        },
        userName: 'Developer',
        suggestions,
        disclaimerText: 'AI can make mistakes. Please verify important information.'
      }}
    />
  );
}
```

### New Chat Mode (v0.4.1+)

For new chat interfaces that don't need to load existing conversations:

```tsx
import { ChatInterface } from '@livefire2015/solid-ag-chat';

function NewChatPage() {
  return (
    <ChatInterface
      mode="local"
      config={{
        createOnFirstMessage: true,
        showSidebar: false,
        suggestions
      }}
    />
  );
}
```

### With Routing (v0.4.1+)

Using SolidJS Router to handle conversation URLs:

```tsx
import { useParams } from '@solidjs/router';

function ChatPage() {
  const params = useParams();

  return (
    <ChatInterface
      mode="remote"
      config={{
        conversationId: params.conversationId,
        autoTitle: true,
        apiConfig: {
          baseUrl: import.meta.env.VITE_API_BASE_URL,
          endpoints: {
            getConversation: '/api/chat/c/{conversationId}',
            streamMessage: '/api/chat/c/{conversationId}/stream'
          }
        }
      }}
    />
  );
}
```

### With Custom New Conversation Handler (v0.4.1+)

For routing-based navigation without API calls when creating new conversations:

```tsx
import { useNavigate } from '@solidjs/router';

function ChatPage() {
  const navigate = useNavigate();

  return (
    <ChatInterface
      mode="remote"
      config={{
        apiConfig: {
          baseUrl: 'http://localhost:3001',
          endpoints: {
            streamMessage: '/api/chat/c/{conversationId}/stream'
          }
        }
      }}
      onEvents={{
        onNewConversation: () => {
          // Navigate to new chat page without making API calls
          navigate('/chat');
        }
      }}
    />
  );
}
```

### With Dependency Injection (v0.4.1+)

Inject pre-configured services for custom auth, retries, or caching:

```tsx
import { ChatInterface } from '@livefire2015/solid-ag-chat';
import { createAGUIService } from '@livefire2015/solid-ag-chat';
import { createRemoteStorageAdapter } from '@livefire2015/solid-ag-chat';

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

  return (
    <ChatInterface
      config={{
        chatService,
        storageAdapter
      }}
      onEvents={{
        onStatusChange: (status) => {
          if (status.error) {
            showNotification(`Chat error: ${status.error}`);
          }
        }
      }}
    />
  );
}
```

### With Split API Configuration (v0.4.1+)

Use different hosts for streaming vs CRUD operations:

```tsx
function MultiHostChatPage() {
  return (
    <ChatInterface
      mode="remote"
      config={{
        // Streaming chat goes to one service
        apiConfig: {
          baseUrl: 'https://chat-stream.myapp.com',
          headers: { 'Authorization': `Bearer ${getChatToken()}` },
          endpoints: {
            streamMessage: '/v1/stream'
          }
        },
        // CRUD operations go to another service
        storageConfig: {
          baseUrl: 'https://api.myapp.com',
          headers: { 'Authorization': `Bearer ${getApiToken()}` },
          endpoints: {
            getConversations: '/v2/conversations',
            createConversationWithMessage: '/v2/conversations/create'
          }
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

**Props (v0.4.1+):**

```tsx
interface ChatInterfaceProps {
  apiUrl?: string;           // Backward compatibility only
  mode?: 'local' | 'remote' | 'controlled';
  config?: Partial<ChatConfig>;
  onEvents?: Partial<ChatEventHandlers>;
}
```

**Core Props:**
- `apiUrl` (optional, backward compatibility): Direct API endpoint (deprecated, use `config.apiConfig` instead)
- `mode` (optional): Chat mode - `'local'` | `'remote'` | `'controlled'`. Auto-detected if not specified
- `config` (optional): Configuration object containing all chat settings
- `onEvents` (optional): Event handlers object containing all callbacks

**ChatConfig Options:**
```tsx
interface ChatConfig {
  // API & Storage
  apiConfig?: ApiConfig;
  storageConfig?: ApiConfig; // Falls back to apiConfig if not provided

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
```

**ChatEventHandlers Options:**
```tsx
interface ChatEventHandlers {
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
```

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

This package implements the AG-UI protocol for streaming agent interactions using official `@ag-ui/core` types (v0.5.0+). The protocol supports:

- **TEXT_MESSAGE_START/END**: Message lifecycle events
- **TEXT_MESSAGE_CONTENT**: Full message updates
- **TEXT_MESSAGE_DELTA**: Incremental message updates
- **STATE_SNAPSHOT**: Complete agent state
- **STATE_DELTA**: Partial agent state updates
- **TOOL_CALL_START/ARGS/END/RESULT**: Tool execution events
- **ERROR**: Error handling

**Official AG-UI Integration (v0.5.0+):**
- Uses official `EventType` enum from `@ag-ui/core`
- Runtime validation with official `EventSchemas` (when available)
- Full compatibility with the AG-UI ecosystem
- Enhanced type safety and IntelliSense support

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
  mode="remote"
  config={{
    autoTitle: true,
    apiConfig: {
      endpoints: {
        generateTitle: '/api/chat/c/{conversationId}/generate-title'
      }
    }
  }}
/>
```

### Lazy Conversation Creation

Perfect for homepage/landing page where you want the conversation to be created only when the user sends their first message:

```tsx
<ChatInterface
  config={{
    createOnFirstMessage: true
  }}
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

### v0.4.1 (Latest) - Dramatic API Simplification 🎯
**BREAKING CHANGES - Simplified API:**
- 🔥 **30+ props → 4 props**: Eliminated "prop soup" for cleaner API
- 📦 **Consolidated Configuration**: All options now in single `config` object
- 🎯 **Event Handlers**: All callbacks consolidated into `onEvents` object
- 🧭 **Smart Mode Detection**: Automatic mode detection based on configuration
- 🔄 **Cleaner Separation**: Clear distinction between storage location and state control

**New Clean API:**
```tsx
interface ChatInterfaceProps {
  apiUrl?: string;           // Backward compatibility only
  mode?: 'local' | 'remote' | 'controlled';
  config?: Partial<ChatConfig>;
  onEvents?: Partial<ChatEventHandlers>;
}
```

### v0.4.0 - Major Architecture Refactor 🚀
**Breaking Changes & Major Improvements:**
- 🏗️ **Dependency Injection**: Inject pre-configured `chatService`, `storageManager`, `storageAdapter`
- 🔄 **Memoized Storage**: Fixed cache-wiping issue in remote storage adapters
- 🎛️ **Controlled Mode**: Full external control over conversation lifecycle
- 📡 **Split API Configs**: Separate `chatApiConfig` and `storageApiConfig` for different concerns
- 📊 **Enhanced Loading States**: Proper loading propagation to all UI components
- 🔔 **Status Callbacks**: `onStatusChange`, `onChatStatusChange`, `onStorageStatusChange`
- 🧭 **Production Ready**: Designed for real-world remote API integrations

**Migration Guide:** See [Migration Guides](#migration-guides) below.

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

## Migration Guides

### v0.5.0 Migration Guide - @ag-ui/core Integration

**NEW**: v0.5.0 integrates with the official `@ag-ui/core` TypeScript types and events for improved standardization and future compatibility.

**What Changed:**
- Added `@ag-ui/core` dependency for official AG-UI protocol types
- Created compatibility layer for gradual migration
- Enhanced runtime validation with official EventSchemas (when available)
- Improved type safety and IntelliSense support

**Benefits:**
- **Standardization**: Uses official AG-UI protocol types
- **Future-Proofing**: Seamless transition when `@ag-ui/core` API stabilizes
- **Type Safety**: Enhanced TypeScript support with official interfaces
- **Validation**: Runtime event validation with official schemas
- **Backward Compatibility**: All existing code continues to work

**No Breaking Changes:**
All v0.4.x code continues to work unchanged. The migration is fully backward compatible.

**Enhanced Features:**
```tsx
// Official AG-UI types are now used internally
import type {
  EventType,           // Official AG-UI event enum
  AGUIMessage,         // Official message interface
  AGUIEvent,          // Official event union type
  EnhancedAGUIMessage, // Extended with solid-ag-chat features
} from '@livefire2015/solid-ag-chat';

// Runtime validation automatically uses official schemas when available
const chatService = createAGUIService({
  baseUrl: 'http://localhost:8000',
  // EventSchemas validation is applied automatically
});
```

**Migration Benefits:**
- **Immediate**: Better TypeScript IntelliSense and type checking
- **Future**: Automatic compatibility with official AG-UI ecosystem
- **Performance**: Optimized event handling with official types
- **Validation**: Runtime safety with official event schemas

### v0.4.1 Migration Guide - Dramatic API Simplification

**BREAKING CHANGES**: v0.4.1 dramatically simplifies the API from 30+ props to just 4 props.

**Before (v0.4.0 and earlier) - "Prop Soup":**
```tsx
<ChatInterface
  storageMode="remote"
  conversationId={params.conversationId}
  autoGenerateTitle={true}
  createConversationOnFirstMessage={true}
  userName="Developer"
  suggestions={suggestions}
  showEmptyState={true}
  disclaimerText="AI can make mistakes"
  onNewConversation={() => navigate('/chat')}
  onStatusChange={(status) => showToast(status.error)}
  chatApiConfig={{
    baseUrl: 'https://api.myapp.com',
    headers: { 'Authorization': `Bearer ${token}` }
  }}
  storageApiConfig={{
    baseUrl: 'https://storage.myapp.com'
  }}
/>
```

**After (v0.4.1) - Clean & Simple:**
```tsx
<ChatInterface
  mode="remote"
  config={{
    conversationId: params.conversationId,
    autoTitle: true,
    createOnFirstMessage: true,
    userName: 'Developer',
    suggestions,
    disclaimerText: 'AI can make mistakes',
    apiConfig: {
      baseUrl: 'https://api.myapp.com',
      headers: { 'Authorization': `Bearer ${token}` }
    },
    storageConfig: {
      baseUrl: 'https://storage.myapp.com'
    }
  }}
  onEvents={{
    onNewConversation: () => navigate('/chat'),
    onStatusChange: (status) => showToast(status.error)
  }}
/>
```

**Key Changes:**
1. **30+ props → 4 props**: `mode`, `config`, `onEvents`, `apiUrl` (legacy)
2. **Smart Mode Detection**: Auto-detects mode based on configuration
3. **Consolidated Config**: All settings in single `config` object
4. **Event Consolidation**: All callbacks in single `onEvents` object
5. **Backward Compatibility**: `apiUrl` prop still works

### v0.4.0 Migration Guide - Architecture Refactor

**Storage Adapter Improvements:**
- Storage adapters are now memoized and persistent across component lifecycle
- Fixes cache-wiping issues that caused duplicate API calls

**Enhanced Loading States:**
- Loading states now properly propagate to all UI components

**New Features:**
- Dependency injection for `chatService` and `storageAdapter`
- Split API configuration for different concerns
- Controlled mode for external state management
- Enhanced status callbacks

**Backward Compatibility:**
All v0.3.x code continues to work with deprecation warnings.

## License

MIT

## Author

livefire2015
